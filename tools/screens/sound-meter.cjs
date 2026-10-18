// Renders sounds offline in a real browser and reports loudness and brightness, so new
// sounds can be matched to the ones that already feel right (the openings' foley).
// Usage: node sound-meter.cjs <base>   (needs the dev server: it imports /src modules)
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const [base = "http://localhost:8080"] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  const page = await (await b.newContext()).newPage();
  await page.goto(base + "/dev/openings?kind=voyage", { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(3000);
  // play.ts keeps one audio context for the page, so each sound gets a fresh page.
  const list = [
    ...["rip", "thunk", "paper", "crunch"].map((k) => ["/src/lib/play.ts", "foley", k]),
    ...["pageTurn", "coverThump", "slide", "slap", "tape", "flip", "lid", "cassette", "tapeHiss", "scratch", "unroll", "scribble", "panel", "unfold"].map((k) => ["/src/lib/sound/material.ts", "material", k]),
  ];
  const rows = [];
  for (const [path, fn, k] of list) {
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1500);
    rows.push(
      await page.evaluate(
        async ([path, fn, k]) => {
          localStorage.setItem("jb-sound", "1");
          const SR = 44100;
          const off = new OfflineAudioContext(2, SR * 2.5, SR);
          off.resume = async () => {};
          window.AudioContext = function () {
            return off;
          };
          const m = await import(path);
          m[fn](k);
          const buf = await off.startRendering();
          const d = buf.getChannelData(0);
          let peak = 0, sum = 0, n = 0, cross = 0, last = 0, end = 0;
          for (let i = 0; i < d.length; i++) {
            const v = d[i];
            const a = Math.abs(v);
            if (a > peak) peak = a;
            if (a > 0.002) { sum += v * v; n++; end = i; }
            if ((v >= 0) !== (last >= 0)) cross++;
            last = v;
          }
          const rms = Math.sqrt(sum / Math.max(1, n));
          const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : "-inf");
          return { label: fn + ":" + k, peakDb: db(peak), rmsDb: db(rms), lengthMs: Math.round((end / SR) * 1000), brightnessHz: Math.round(cross / 2 / ((end || 1) / SR)) };
        },
        [path, fn, k],
      ),
    );
  }
  for (const r of rows) console.log(`${r.label.padEnd(22)} peak ${String(r.peakDb).padStart(6)} dB  rms ${String(r.rmsDb).padStart(6)} dB  ${String(r.lengthMs).padStart(5)} ms  bright ~${r.brightnessHz} Hz`);
  await b.close();
})();
