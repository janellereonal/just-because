// Signs up a brand-new local test user and screenshots the new-user guide on /create, step by step.
// node guide.cjs <base> <outDir> [w] [h]   (local server only)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [base = 'http://localhost:8080', outDir = '../op/guide', W = '390', H = '844'] = process.argv.slice(2);
  if (!/^http:\/\/localhost[:/]/.test(base)) throw new Error('local servers only');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700 });
  await useLocalFonts(ctx);
  const email = `guide-${Date.now()}@example.com`;
  const res = await ctx.request.post(`${base}/api/auth/sign-up/email`, {
    data: { email, password: 'guide-test-password-1', name: 'Guide Tester' },
    headers: { origin: base },
  });
  console.log('sign up', res.status(), email);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto(`${base}/create`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  const next = () =>
    p.evaluate(() => {
      const el = [...document.querySelectorAll('[role=dialog] button')].find((x) => /^(next|start my gift)$/i.test((x.textContent || '').trim()));
      el?.click();
      return !!el;
    });
  for (let i = 1; i <= 4; i += 1) {
    await p.screenshot({ path: path.join(outDir, `step-${i}-${W}.png`) });
    console.log('step', i, await next());
    await p.waitForTimeout(900);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(outDir, `after-${W}.png`) });
  // Reload: it shouldn't come back on its own.
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(6000);
  const shown = await p.evaluate(() => !!document.querySelector('[role=dialog]'));
  console.log('shown again after reload:', shown);
  await p.screenshot({ path: path.join(outDir, `reload-${W}.png`) });
  await b.close();
})();
