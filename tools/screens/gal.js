const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080/themes', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2000);
  await p.screenshot({ path: '../op/gal-0.png' });
  const cards = p.locator('article[role=button]');
  await cards.nth(0).hover();
  for (let i=1;i<5;i++){ await p.waitForTimeout(2200); await cards.nth(0).screenshot({ path: `../op/gal-${i}.png` }); }
  await cards.nth(0).click(); await p.waitForTimeout(1500);
  await p.evaluate(()=>{const b=[...document.querySelectorAll('[role=dialog] .jb-opening button')].filter(b=>!/Skip|Sound|sound/.test(b.textContent+b.getAttribute('aria-label'))).pop(); b&&b.click();});
  await p.waitForTimeout(5000);
  await p.screenshot({ path: '../op/gal-modal.png' });
  console.log(errs.join('\n')||'no errors'); await b.close();
})();
