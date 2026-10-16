// Every theme's opening, at rest and late in its story, phone and desktop.
// usage: node openings.js <outdir> [kinds,comma,separated] [label]
// Needs the dev server (uses the dev-only /dev/openings route).
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const fs = require('fs');

const ALL = ['valentine', 'anniversary', 'birthday', 'wedding', 'bridal', 'baby', 'christmas', 'newyear', 'voyage', 'pets', 'default'];
// The "after" shot: the gesture plays by itself and the stage holds its last
// moment (dev-only stay=1), so every beat's effects have run. Waits are long
// because the software GPU here is slow.
const MID = { valentine: 9000, anniversary: 9000, birthday: 9000, wedding: 9000, bridal: 9000, baby: 9000, christmas: 9000, newyear: 7600, voyage: 10000, pets: 11000, default: 9000 };

(async () => {
  const [out = '../op/openings', only = '', label = ''] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const kinds = only ? only.split(',') : ALL;
  // A fresh browser per theme: the software GPU here can fall over on heavy pages.
  const launch = async () => chromium.launch({
    executablePath: await sp.executablePath(),
    args: [...sp.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const sizes = [['phone', 390, 844, true], ['desk', 1280, 800, false]].filter(([t]) => !process.env.SIZES || process.env.SIZES.split(',').includes(t));
  const skipRest = process.env.ONLY === 'open', skipOpen = process.env.ONLY === 'rest';
  for (const [tag, w, h, touch] of sizes) {
    const errs = [];
    for (const k of kinds) {
    const b = await launch();
    try {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, deviceScaleFactor: tag === 'phone' ? 2 : 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error' && !/vibrate|TUNNEL/.test(m.text())) errs.push(m.text().slice(0, 200)); });
      if (!skipRest) {
        await page.goto(`http://localhost:8080/dev/openings?kind=${k}`, { waitUntil: 'networkidle', timeout: 90000 });
        await page.waitForTimeout(2600);
        await page.screenshot({ path: `${out}/${k}-${tag}-rest${label}.png` });
      }
      const beat = MID[k];
      if (beat != null && !skipOpen) {
        await page.goto(`http://localhost:8080/dev/openings?kind=${k}&auto=1&stay=1`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.waitForSelector('.jb-opening', { timeout: 90000 });
        await page.waitForTimeout(beat);
        await page.screenshot({ path: `${out}/${k}-${tag}-open${label}.png` });
      }
    } catch (e) { console.log(tag, k, 'FAILED', e.message.slice(0, 120)); }
    await b.close().catch(() => {});
    }
    if (errs.length) console.log(tag, [...new Set(errs)].slice(0, 6).join('\n'));
  }
  console.log('done', out);
})();
