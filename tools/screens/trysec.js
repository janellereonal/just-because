const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, storageState: '../state.json' });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080/themes/0d956836-4baf-4735-b97b-08de0aacd604', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500);
  await p.getByRole('button', { name: /Quiz/ }).first().click();
  await p.waitForTimeout(2200);
  await p.screenshot({ path: '../op/try-1.png' });
  await p.getByRole('button', { name: /Coupon book/ }).first().click();
  await p.waitForTimeout(2200);
  await p.screenshot({ path: '../op/try-2.png' });
  await p.goto('http://localhost:8080/create?theme=7799dab1-a38b-4508-ba75-0d4a8f6d7c17', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2000);
  const sw = p.getByText('Superlatives', { exact: true }).first();
  await sw.scrollIntoViewIfNeeded(); await sw.hover(); await p.waitForTimeout(1800);
  await p.screenshot({ path: '../op/create-1.png' });
  const o = p.getByText('Open-when letters', { exact: false }).first();
  if (await o.count()) { await o.hover(); await p.waitForTimeout(1800); await p.screenshot({ path: '../op/create-2.png' }); }
  else { await p.getByText('Add more').first().click(); await p.waitForTimeout(500); await p.getByText('Memory map').first().hover(); await p.waitForTimeout(1800); await p.screenshot({ path: '../op/create-2.png' }); }
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
