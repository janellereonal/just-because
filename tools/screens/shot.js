// usage: node shot.js <url> <out.png> [width] [height] [waitMs] [js-to-eval-before-shot] [fullPage]
const { chromium } = require('playwright-core');
const { useLocalFonts } = require('./fonts.cjs');
const sparticuz = require('@sparticuz/chromium').default;
(async () => {
  const [url, out, w = '390', h = '844', wait = '2500', evalJs = '', full = ''] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700, storageState: process.env.STATE || undefined });
  await useLocalFonts(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { try { sessionStorage.setItem('jb-intro-seen', '1'); } catch {} });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(e => errors.push('GOTO ' + e.message));
  await page.waitForTimeout(+wait);
  if (evalJs) { const r = await page.evaluate(evalJs).catch(e => 'EVALERR ' + e.message); if (r !== undefined) console.log('EVAL:', typeof r === 'string' ? r : JSON.stringify(r)); await page.waitForTimeout(800); }
  const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw.sw > sw.cw) console.log('HSCROLL', JSON.stringify(sw));
  await page.screenshot({ path: out, fullPage: !!full });
  errors.slice(0, 8).forEach(e => console.log(e));
  await browser.close();
})();
