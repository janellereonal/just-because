// usage: node thanks.cjs <base> <slug> <outDir> [w] [h]
// Walks through "Say thanks to everyone" (flag thankYou) on a LOCAL open gift: the recipient
// sends one, a second device can't overwrite it, a friend sees it on their link, and the
// organiser (STATE=../state.json) sees it on the dashboard. Local servers only.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { useLocalFonts } = require('./fonts.cjs');
const sparticuz = require('@sparticuz/chromium').default;
(async () => {
  const [base = 'http://localhost:8080', slug, out = '../op/thanks', w = '390', h = '844'] = process.argv.slice(2);
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('Local servers only');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    headless: true,
  });
  const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}-${w}.png`) });
  const newPage = async (state) => {
    const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, storageState: state });
    await useLocalFonts(ctx);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
    return page;
  };
  const openGift = async (page) => {
    await page.goto(`${base}/g/${slug}`, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(2500);
    const skip = page.getByRole('button', { name: /skip intro/i });
    if (await skip.count()) await skip.first().click().catch(() => {});
    await page.waitForTimeout(1500);
  };
  const cta = (page) => page.getByRole('button', { name: 'Say thanks to everyone' });

  // 1. The recipient.
  const r = await newPage(undefined);
  await openGift(r);
  await cta(r).scrollIntoViewIfNeeded();
  await r.waitForTimeout(600);
  await shot(r, '1-cta');
  await cta(r).click();
  await r.waitForTimeout(700);
  await r.getByRole('textbox').fill('I read every single one, twice. Thank you for the cake, the songs and for remembering the library pen. Dinner on me when I am back.');
  await shot(r, '2-form');
  await r.getByRole('button', { name: 'Send it' }).click();
  await r.waitForTimeout(1500);
  await shot(r, '3-sent');
  console.log('recipient sees:', (await r.locator('section[aria-label="Say thanks to everyone"]').innerText()).replace(/\n/g, ' | '));
  console.log('page leaks thanks_key:', (await r.content()).includes('thanks_key'));

  // 2. Another device can't overwrite it, and doesn't get the button.
  const other = await newPage(undefined);
  await openGift(other);
  console.log('second device sees the button:', await cta(other).count());

  // 3. A friend on their link.
  const f = await newPage(undefined);
  await f.goto(`${base}/contribute/${slug}`, { waitUntil: 'networkidle', timeout: 120000 });
  await f.waitForTimeout(2000);
  await shot(f, '4-friend');
  console.log('friend page leaks thanks_key:', (await f.content()).includes('thanks_key'));

  // 4. The organiser.
  if (process.env.STATE) {
    const o = await newPage(process.env.STATE);
    await o.goto(`${base}/dashboard`, { waitUntil: 'networkidle', timeout: 120000 });
    await o.waitForTimeout(2500);
    const card = o.locator('article', { hasText: 'said thanks' }).first();
    if (await card.count()) await card.scrollIntoViewIfNeeded();
    await shot(o, '5-dashboard');
    await openGift(o);
    console.log('organiser sees the button on the gift:', await cta(o).count());
  }
  await Promise.race([browser.close(), new Promise((res) => setTimeout(res, 5000))]);
})();
