const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, storageState: '../state.json' });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080/create?theme=7799dab1-a38b-4508-ba75-0d4a8f6d7c17', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500);
  console.log(p.url());
  const items = ['Superlatives','Open-when letters','Memory map','Coupon book','Quiz'];
  const add = p.getByText('Add more').first(); if (await add.count()) { await add.click(); await p.waitForTimeout(600); }
  let i=0;
  for (const t of items) {
    const el = p.locator('button.min-w-0', { hasText: t }).first();
    if (!(await el.count())) { console.log('missing', t); continue; }
    await el.scrollIntoViewIfNeeded(); await el.click(); await p.waitForTimeout(1800);
    await p.screenshot({ path: `../op/create-${i++}.png` });
  }
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
