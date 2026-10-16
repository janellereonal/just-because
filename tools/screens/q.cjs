const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(process.argv[2], { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  console.log(await p.evaluate(process.argv[3]));
  await b.close();
})();
