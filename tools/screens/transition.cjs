// Records a gift's opening handing off to its layout, as a GIF (plus a still of the end).
// node transition.cjs <url> <out-prefix> [w] [h] [giftSeconds] [slow]
//
// Waits for the opening, presses its plain button (every gesture has one), then captures frames
// until the layout has settled. Screenshots of a busy gift page take seconds on this machine's
// software GPU, so the page runs in slow motion while recording (`slow` times slower clocks, timers
// and CSS animations) and the GIF plays back at real speed. Writes <out>.gif and <out>-end.jpg.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

const OPEN = /^(open|unfold|unwrap|tap to open|press start|start|roll|blow|light|cut|untie|peel|pop|lift|crack|reveal|wipe|let'?s go)/i;
// Otherwise the first plain button that isn't skip, sound or the mic.
const PREFER = [/all out/i, /^open/i, OPEN, /^(?!.*(skip|sound|mic|replay)).+/i];

// A clock that can be slowed down mid-page: performance.now, Date.now, rAF timestamps and timers.
const SLOWMO = () => {
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now;
  const realRaf = window.requestAnimationFrame.bind(window);
  const realTimeout = window.setTimeout.bind(window);
  const realInterval = window.setInterval.bind(window);
  let k = 1;
  let baseReal = realPerf();
  let baseFake = baseReal;
  const now = () => baseFake + (realPerf() - baseReal) / k;
  const dateOffset = realDate() - realPerf();
  window.__slow = (next) => {
    baseFake = now();
    baseReal = realPerf();
    k = next;
  };
  performance.now = now;
  Date.now = () => Math.round(dateOffset + now());
  window.requestAnimationFrame = (cb) => realRaf(() => cb(now()));
  window.setTimeout = (fn, ms, ...a) => realTimeout(fn, (ms || 0) * k, ...a);
  window.setInterval = (fn, ms, ...a) => realInterval(fn, (ms || 0) * k, ...a);
};

(async () => {
  const [url, out, W = '390', H = '844', giftSecs = '5', slowArg = '25'] = process.argv.slice(2);
  const slow = +slowArg;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tr-'));
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700 });
  await useLocalFonts(ctx);
  await ctx.addInitScript(SLOWMO);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(5000);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Animation.enable');

  const giftTime = () => p.evaluate(() => performance.now());
  const frames = []; // [file, giftTimeMs]
  const shot = async () => {
    const t = await giftTime();
    const f = path.join(dir, `f${String(frames.length).padStart(4, '0')}.jpg`);
    await p.screenshot({ path: f, type: 'jpeg', quality: 70 });
    frames.push([f, t]);
  };
  const labels = () =>
    p.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((x) => x.offsetParent && !x.closest('[inert]'))
        .map((x) => (x.getAttribute('aria-label') || x.textContent || '').trim())
        .filter(Boolean),
    );
  const press = (label) =>
    p.evaluate((l) => {
      const el = [...document.querySelectorAll('button')].find(
        (x) => x.offsetParent && !x.closest('[inert]') && (x.getAttribute('aria-label') || x.textContent || '').trim() === l,
      );
      if (el) el.click();
    }, label);

  // Slow everything down, then press the opening's button (again if it has more than one step).
  await p.evaluate((k) => window.__slow(k), slow);
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / slow });
  const start = await giftTime();
  await shot(); // the opening, waiting
  let presses = 0;
  let lastPress = -Infinity;
  while ((await giftTime()) - start < +giftSecs * 1000) {
    const now = (await giftTime()) - start;
    if (presses < 3 && now > 400 && now - lastPress > 1400) {
      const ls = await labels();
      if (ls.some((l) => /skip/i.test(l))) {
        let pick = null;
        for (const re of PREFER) {
          pick = ls.find((l) => re.test(l) && !/skip/i.test(l)) ?? null;
          if (pick) break;
        }
        if (pick) {
          console.log('pressing:', pick);
          await press(pick);
          presses += 1;
          lastPress = now;
        }
      }
    }
    await shot();
  }
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
  await p.evaluate(() => window.__slow(1));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}-end.jpg`, quality: 80, type: 'jpeg' });
  await b.close();

  // Play back at real speed: each frame lasts as long as it did in gift time.
  const list = frames
    .map(([f, t], n) => {
      const next = frames[n + 1]?.[1] ?? t + 1500;
      return `file '${f}'\nduration ${Math.max(0.04, (next - t) / 1000).toFixed(3)}`;
    })
    .join('\n');
  fs.writeFileSync(path.join(dir, 'list.txt'), `${list}\nfile '${frames[frames.length - 1][0]}'\n`);
  const width = +W < 700 ? 300 : 720;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(dir, 'list.txt'),
    '-vf', `fps=12,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, `${out}.gif`]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${out}.gif`, `${frames.length} frames, ${presses} presses`);
})();
