// Screenshots /dev/people?grid=hair once every cell has rendered. node hairgrid.cjs "<url>" <out.png>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [url, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: [...sp.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  const t0 = Date.now();
  // wait until every cell has an image (renders run one at a time)
  for (;;) {
    const r = await p.evaluate(() => { const c = [...document.querySelectorAll('[data-cell]')]; return [c.length, c.filter((x) => x.querySelector('image, img')).length]; });
    if ((r[0] && r[0] === r[1]) || Date.now() - t0 > 420000) { console.log('cells', r); break; }
    await p.waitForTimeout(3000);
  }
  await p.waitForTimeout(1500);
  await p.screenshot({ path: out, fullPage: true });
  await b.close();
})();
