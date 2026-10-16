// Uploads a file through the friend page's photo field and prints the stored URL. node up.cjs <slug> <file>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('response', async (r) => { if (r.url().includes('/api/upload')) console.log('upload', r.status(), (await r.text()).slice(0, 200)); });
  await p.goto('http://localhost:8080/contribute/' + process.argv[2], { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  await p.locator('button', { hasText: /^Photo$/ }).first().click();
  await p.waitForTimeout(800);
  await p.locator('input[type=file]').first().setInputFiles(process.argv[3]);
  await p.locator('input').filter({ hasNot: p.locator('[type=file]') }).first().fill('Upload Tester');
  await p.waitForTimeout(500);
  await p.locator('button[type=submit]').first().click();
  await p.waitForTimeout(6000);
  const toasts = await p.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent));
  console.log('toasts', JSON.stringify(toasts));
  await b.close();
})();
