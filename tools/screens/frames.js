const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const path = require('path'); const fs = require('fs');
(async () => {
  const [html, name, secs, outdir] = process.argv.slice(2);
  fs.mkdirSync(outdir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto('file://' + path.resolve(html));
  await p.evaluate(() => document.fonts.ready);
  const n = Math.round(+secs * 24);
  for (let i = 0; i < n; i++) {
    await p.evaluate(([nm, t]) => window.render(nm, t), [name, i / 24]);
    await p.locator('#v').screenshot({ path: `${outdir}/${String(i).padStart(4, '0')}.png` });
  }
  await b.close();
})();
