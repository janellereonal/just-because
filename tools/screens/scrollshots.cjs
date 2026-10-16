// Viewport screenshots down a long page. node scrollshots.cjs <url> <outPrefix> <w> <h> <count> [step]
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
(async () => {
  const [url, out, w, h, count, step] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700 });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  const st = +(step || h * 0.9);
  for (let i = 0; i < +count; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), i * st);
    await p.waitForTimeout(1600);
    await p.screenshot({ path: `${out}-${i}.png`, timeout: 60000 });
  }
  console.log('height', await p.evaluate(() => document.scrollingElement.scrollHeight));
  await b.close();
})();
