// Counts the calendar doors that open, in a given time zone. TZID=Asia/Manila node cal.cjs <url>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: process.env.TZID || 'UTC' })).newPage();
  await p.goto(process.argv[2], { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  const r = await p.evaluate(() => {
    const grid = [...document.querySelectorAll('div.grid')].find((g) => g.querySelectorAll(':scope > button.aspect-square').length > 2);
    if (!grid) return 'no calendar';
    const bs = [...grid.querySelectorAll(':scope > button')];
    return { doors: bs.length, open: bs.filter((x) => !x.disabled).length, labels: bs.map((x) => x.textContent.trim()).join(',') };
  });
  console.log(process.env.TZID || 'UTC', JSON.stringify(r));
  await b.close();
})();
