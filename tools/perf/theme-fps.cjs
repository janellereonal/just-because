// Smoothness check for engine themes on a mid-range Android profile: 4x CPU
// throttling and slow 4G, a 390x844 phone screen. Plays the opening by itself
// (/dev/themes?autoplay=1) and records every frame.
//
// Needs the playground: a dev server, or a production build made with
// VITE_DEV_TOOLS=1 (closer to real numbers). Software-rendered sandboxes read
// slower than real phones; compare themes against each other there.
//
//   node tools/perf/theme-fps.cjs http://localhost:8080 kraft-parcel
const path = require('path');
// The browser lives with the screenshot tools (cd tools/screens && npm install).
const from = { paths: [path.join(__dirname, '../screens')] };
const { chromium } = require(require.resolve('playwright-core', from));
const sp = require(require.resolve('@sparticuz/chromium', from)).default;
const base = process.argv[2] || 'http://localhost:8080';
const themes = (process.argv[3] || 'kraft-parcel').split(',');
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  let bad = false;
  for (const id of themes) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    // "Slow 4G" in Chrome DevTools.
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    const t0 = Date.now();
    await p.goto(`${base}/dev/themes?theme=${id}&autoplay=1&size=phone`, { waitUntil: 'load', timeout: 120000 });
    await p.waitForSelector('[data-testid=stage] button', { timeout: 60000 });
    const ready = Date.now() - t0;
    const frames = await p.evaluate(() => new Promise((resolve) => {
      const out = [];
      let last = performance.now();
      const end = last + 4500;
      const tick = (now) => { out.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(out); };
      requestAnimationFrame(tick);
    }));
    const sorted = [...frames].sort((x, y) => x - y);
    const avg = frames.reduce((s, f) => s + f, 0) / frames.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const long = frames.filter((f) => f > 50).length;
    const fps = 1000 / avg;
    // Never janky: no frame over 100 ms, and at most 5% of frames over 50 ms.
    const ok = sorted[sorted.length - 1] < 100 && long / frames.length <= 0.05;
    if (!ok) bad = true;
    console.log(`${ok ? 'ok  ' : 'JANK'} ${id.padEnd(22)} ready ${String(ready).padStart(5)} ms  avg ${fps.toFixed(0).padStart(3)} fps  p95 ${p95.toFixed(1)} ms  worst ${sorted[sorted.length - 1].toFixed(0)} ms  long frames ${long}/${frames.length}`);
    await ctx.close();
  }
  await b.close();
  process.exit(bad ? 1 : 0);
})();
