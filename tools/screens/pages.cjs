// node pages.cjs <url> <outPrefix> <w> <h> <count> [nextSelector]
// Screenshots a paged view: shot, click next, shot... (real clicks, so gestures and React see them).
const { chromium } = require('playwright-core');
const { useLocalFonts } = require('./fonts.cjs');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [url, out, w = '390', h = '844', n = '6', sel = 'button[aria-label="Next page"]'] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: [...sp.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, hasTouch: +w < 700 });
  await useLocalFonts(p);
  p.on('pageerror', e => console.log('ERR', e.message.slice(0, 200)));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(6500);
  for (let i = 0; i < +n; i++) {
    await p.screenshot({ path: `${out}-${i}.png` });
    const btn = p.locator(sel).first();
    if (!(await btn.count()) || !(await btn.isEnabled())) break;
    await btn.click();
    await p.waitForTimeout(1300);
  }
  await Promise.race([b.close(), new Promise(r => setTimeout(r, 4000))]);
  process.exit(0);
})();
