const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080/', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(1500);
  console.log(await p.evaluate(()=>{const b=[...document.querySelectorAll('.demo-phone button')].find(x=>/Skip intro/.test(x.textContent));if(!b)return 'none';b.click();return 'clicked'}));
  for (let i=0;i<6;i++){ await p.waitForTimeout(3000); await p.locator('.demo-phone').screenshot({ path: `../op/tour-${i}.png` }); }
  const bento = p.locator('text=Open-when letters').first();
  await bento.scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  await p.evaluate(()=>window.scrollBy(0,-500)); await p.waitForTimeout(800);
  await p.screenshot({ path: '../op/bento-1.png' });
  await p.evaluate(()=>window.scrollBy(0,700)); await p.waitForTimeout(2500);
  await p.screenshot({ path: '../op/bento-2.png' });
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
