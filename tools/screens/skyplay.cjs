// usage: node skyplay.cjs <url> <outprefix> <w> <h>
const { chromium } = require('playwright-core');
const { useLocalFonts } = require('./fonts.cjs');
const sparticuz = require('@sparticuz/chromium').default;
(async () => {
  const [url, out, w = '390', h = '844'] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700 });
  await useLocalFonts(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL')) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  await page.addInitScript(() => { try { sessionStorage.setItem('jb-intro-seen', '1'); localStorage.setItem('jb-sound', '1'); } catch {} });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(8000);
  const n = await page.locator('.nsk-star').count();
  console.log('stars', n, 'ready', await page.locator('.nsk-wrap.is-ready').count());
  const close = async () => { const b = page.locator('button[aria-label="Close"], [data-sheet-close], button:has-text("Close")').first(); if (await b.count()) await b.click({ timeout: 2000 }).catch(() => page.keyboard.press('Escape')); else await page.keyboard.press('Escape'); await page.waitForTimeout(300); };
  const half = Math.floor(n / 2);
  const order = [...Array(n).keys()].sort((a, b) => ((a * 7919) % 31) - ((b * 7919) % 31) || a - b);
  for (let k = 0; k < n; k++) {
    const i = order[k];
    const info = await page.locator('.nsk-star').nth(i).evaluate((b) => { const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), op: b.style.opacity, pe: b.style.pointerEvents, top: top === b ? 'self' : (top?.className?.baseVal ?? top?.className ?? top?.tagName) }; });
    if (info.top !== 'self') console.log(i, JSON.stringify(info));
    await page.locator('.nsk-star').nth(i).click({ timeout: 5000, force: true });
    await page.waitForTimeout(450);
    await close();
    if (k === half) { await page.waitForTimeout(1200); await page.screenshot({ path: out + '-half.png' }); }
  }
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out + '-done.png' });
  console.log('lines', await page.locator('.nsk-line').count(), 'lit', await page.locator('.nsk-star.is-lit').count());
  const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw.sw > sw.cw) console.log('HSCROLL', JSON.stringify(sw));
  errors.slice(0, 10).forEach(e => console.log(e));
  await browser.close();
})();
