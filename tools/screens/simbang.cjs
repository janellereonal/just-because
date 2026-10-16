// Opens a Simbang Gabi gift on a given date and counts the notes shown. node simbang.cjs <slug> <iso> <out.png>
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
(async () => {
  const [slug, iso, out] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Manila' });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  if (iso !== 'now') await p.clock.setFixedTime(new Date(iso));
  await p.goto('http://localhost:8080/g/' + slug, { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  await p.screenshot({ path: out.replace('.png', '-opening.png') });
  const skip = p.locator('button', { hasText: 'Skip intro' });
  if (await skip.count()) await skip.first().click();
  await p.waitForTimeout(3000);
  const n = await p.evaluate(() => (document.body.innerText.match(/Night note number \d+/g) || []).length);
  const banner = await p.evaluate(() => [...document.querySelectorAll('p')].map((x) => x.textContent).find((t) => /Night \d of 9|Simbang Gabi starts/.test(t || '')) || '');
  console.log(iso, 'notes shown:', n, '| banner:', banner);
  await p.screenshot({ path: out });
  await b.close();
})();
