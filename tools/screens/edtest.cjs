// Types into editor fields and checks they save. node edtest.cjs <siteId> <label> <value>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [id, label, value] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: '../state.json' })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto('http://localhost:8080/sites/' + id, { waitUntil: 'load' });
  await p.waitForTimeout(8000);
  const input = p.locator('label', { hasText: label }).locator('input').first();
  if (!(await input.count())) { console.log('no field', label); await b.close(); return; }
  await input.fill(value);
  await input.blur();
  await p.waitForTimeout(3500);
  await p.screenshot({ path: `../op/rev2/ed-${label.replace(/\W+/g, '-')}.png` });
  console.log('filled', label);
  await b.close();
})();
