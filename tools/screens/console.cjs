// Prints console errors and page errors for a URL. node console.cjs <url> [w] [h]
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: +(process.argv[3] || 1440), height: +(process.argv[4] || 900) }, timezoneId: process.env.TZID || 'UTC', locale: process.env.LOCALE || 'en-US', storageState: process.env.STATE || undefined })).newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type().toUpperCase(), m.text().slice(0, 300)); });
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 400)));
  await p.goto(process.argv[2], { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  console.log('done', p.url());
  await b.close();
})();
