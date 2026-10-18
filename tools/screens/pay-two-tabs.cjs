// Two tabs, one gift: start Sweet in tab A, Keepsake in tab B, then try to pay both.
// Expected: tab A's checkout is closed (it can't be paid), tab B pays, the gift ends up on Keepsake,
// and the same plan in two tabs hands out one checkout.
//
// Local only. Run the app (prod build) against the fake PayMongo with its pay page:
//   WEBHOOK_TARGET=$BASE/api/webhooks/paymongo PORT=8783 bun tools/payments/fake-paymongo.ts
//   BASE=http://localhost:3003 DATABASE_URL=postgres://jb:jb@localhost:5432/<db> node tools/screens/pay-two-tabs.cjs
// The gift is made straight in the database (DATABASE_URL must be localhost), with one approved note.
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;

const BASE = process.env.BASE || 'http://localhost:8080';
const DB = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) throw new Error('DATABASE_URL must point at a local database.');
const sql = (q) => execFileSync('psql', [DB, '-At', '-F', ' | ', '-c', q]).toString().trim();

async function startPlan(page, siteId, plan) {
  await page.goto(`${BASE}/sites/${siteId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.keyboard.press('Escape').catch(() => {});
  await page.getByRole('button', { name: 'Wrap it up' }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Wrap it up' }).last().click();
  await page.getByRole('button', { name: `Choose ${plan}` }).click();
  await page.waitForURL(/\/pay\/cs_/, { timeout: 30000 });
  return page.url();
}

async function payHere(page) {
  await page.reload();
  if (await page.locator('#pay').isDisabled()) return `not paid: ${await page.locator('#state').textContent()}`;
  await page.click('#pay');
  await page.waitForTimeout(1500);
  if (/\/pay\//.test(page.url())) return `not paid: ${await page.locator('#state').textContent()}`;
  await page.waitForFunction(() => !/Confirming your payment/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  return `paid: ${(await page.locator('h1').first().textContent()).trim()}`;
}

async function signedInGift(browser, recipient) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  const email = `two-tabs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;
  const status = await page.evaluate(
    async (email) => (await fetch('/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'local-test-pass-123', name: 'Tester' }) })).status,
    email,
  );
  if (status !== 200) throw new Error(`sign up failed: ${status}`);
  const userId = sql(`select id from "user" where email = '${email}'`);
  const slug = `tabs-${Math.random().toString(36).slice(2, 9)}`;
  const siteId = sql(`insert into gift_sites (creator_id, title, slug, custom_text) values ('${userId}', 'For ${recipient}', '${slug}', '{"recipient_name":"${recipient}"}') returning id`).split('\n')[0];
  sql(`insert into contributions (site_id, module_type, author_name, text_content, status) values ('${siteId}', 'letter', 'Mia', 'Hello ${recipient}', 'approved')`);
  return { ctx, page, siteId };
}

(async () => {
  const browser = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });

  const { ctx, page: a, siteId } = await signedInGift(browser, 'Ana');
  const b = await ctx.newPage();
  await startPlan(a, siteId, 'Sweet');
  await startPlan(b, siteId, 'Keepsake');
  console.log('tab A (Sweet):', await payHere(a));
  console.log('tab B (Keepsake):', await payHere(b));
  console.log('orders:\n' + sql(`select tier, amount, status from orders where site_id = '${siteId}' order by created_at`));
  console.log('gift:', sql(`select status, tier from gift_sites where id = '${siteId}'`));

  const { ctx: ctx2, page: c, siteId: site2 } = await signedInGift(browser, 'Ben');
  const d = await ctx2.newPage();
  const first = await startPlan(c, site2, 'Sweet');
  const second = await startPlan(d, site2, 'Sweet');
  console.log('same plan in two tabs, same checkout:', first === second, '| orders:', sql(`select count(*) from orders where site_id = '${site2}'`));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
