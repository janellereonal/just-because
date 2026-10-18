// Saves each character on /dev/cast as its own image (for close checks of faces and symmetry).
// node castshots.cjs <outDir> [base]   (dev server: /dev/cast is dev only)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [outDir, base = 'http://localhost:8080'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(`${base}/dev/cast${process.env.SIZE ? '?size=' + process.env.SIZE : ''}`, { waitUntil: 'load', timeout: 180000 });
  await p.waitForTimeout(20000);
  const cards = await p.$$('div.grid.grid-cols-4 > div');
  let n = 0;
  for (const card of cards) {
    const name = (await card.$eval('p', (e) => e.textContent.trim()).catch(() => null)) || `card${n}`;
    const fig = await card.$(':scope > :first-child');
    if (!fig || !(await card.$('svg'))) continue;
    await fig.scrollIntoViewIfNeeded();
    await p.waitForTimeout(150);
    await fig.screenshot({ path: path.join(outDir, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`) });
    n++;
  }
  console.log('saved', n);
  await b.close();
})();
