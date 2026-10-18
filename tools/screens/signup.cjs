// usage: node signup.cjs <base> <email> <out-state.json>
// Signs up a LOCAL test user through Better Auth and saves the Playwright storage state.
// Local servers only: refuses any base that isn't localhost.
const { chromium } = require('playwright-core');
const sparticuz = require('@sparticuz/chromium').default;
(async () => {
  const [base = 'http://localhost:8080', email, out = '../state.json'] = process.argv.slice(2);
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('Local servers only');
  const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const pw = 'local-test-' + Math.random().toString(36).slice(2, 10);
  const r = await page.evaluate(async ({ email, pw }) => {
    const res = await fetch('/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw, name: 'Test Organiser' }) });
    return res.status + ' ' + (await res.text()).slice(0, 200);
  }, { email, pw });
  console.log('signup', r);
  await ctx.storageState({ path: out });
  await browser.close();
})();
