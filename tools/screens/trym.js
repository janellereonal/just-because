const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080/themes/8aa15b0e-faa0-4597-8392-c51160602036', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500);
  const btn = p.getByRole('button', { name: /Open-when letters/ }).first();
  await btn.scrollIntoViewIfNeeded(); await btn.click(); await p.waitForTimeout(2500);
  await p.screenshot({ path: '../op/trym.png' });
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
