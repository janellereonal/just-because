// Clicks "Download everything" in the editor and saves the zip. node exp.cjs <siteId> <out.zip>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [id, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, storageState: '../state.json', acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto('http://localhost:8080/sites/' + id, { waitUntil: 'load' });
  await p.waitForTimeout(8000);
  // The step rail's "4 Wrap it up", not the publish button.
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && x.textContent.trim() === 'Wrap it up'); b && b.click(); });
  await p.waitForTimeout(1500);
  const btn = p.locator('button', { hasText: 'Download everything' }).first();
  console.log('button:', await btn.count());
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), btn.click()]);
  await dl.saveAs(out);
  console.log('saved', out);
  await b.close();
})();
