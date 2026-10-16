// node render.js <html> <outdir> [format=webp] — screenshots every .scene element
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { execFileSync } = require('child_process');
const path = require('path');
(async () => {
  const [html, out, fmt = 'webp'] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await b.newPage({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('err', e.message));
  await p.goto('file://' + path.resolve(html));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  const ids = await p.$$eval('.scene', els => els.map(e => e.id));
  for (const id of ids) {
    const png = `${out}/${id}.png`;
    await p.locator('#' + id).screenshot({ path: png, omitBackground: true });
    if (fmt === 'webp') { execFileSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${out}/${id}.webp', quality=84)`]); }
    console.log(id);
  }
  await b.close();
})();
