// Walks the "start without an account" flow (flag guestStart) on a LOCAL server:
// /create as a guest -> make a gift -> editor (banner, invite asks to sign in, plan picker asks
// to sign in) -> sign up in the same browser -> the gift is now on the new account.
// node guest.cjs <base> <outDir> [w] [h]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
(async () => {
  const [base, outDir, W = '390', H = '844'] = process.argv.slice(2);
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) throw new Error('Local servers only');
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, isMobile: +W < 700, hasTouch: +W < 700 });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 160)));
  const shot = (n) => p.screenshot({ path: path.join(outDir, `${n}-${W}.png`) });
  const click = (re) =>
    p.evaluate((src) => {
      const r = new RegExp(src, 'i');
      const els = [...document.querySelectorAll('button,a,[role=tab]')].filter((x) => x.offsetParent && r.test((x.getAttribute('aria-label') || x.textContent || '').trim()));
      const el = els[els.length - 1];
      if (el) el.click();
      return !!el;
    }, re.source);

  await p.goto(`${base}/create`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(7000);
  console.log('landed on', new URL(p.url()).pathname);
  await shot('1-create-as-guest');
  // Fill "Who's it for?" and create.
  const nameBox = await p.$('input[placeholder="Ana"], input[placeholder="Sam"]');
  if (nameBox) await nameBox.fill('Mika');
  await p.waitForTimeout(500);
  console.log('style', await p.evaluate(() => { const l = document.querySelector('label[data-style] input[type=radio]:not([disabled])'); if (l) l.click(); return !!l; }));
  await p.waitForTimeout(800);
  console.log('create', await click(/^create the gift$/));
  await p.waitForTimeout(8000);
  console.log('now at', new URL(p.url()).pathname);
  const siteId = (new URL(p.url()).pathname.match(/\/sites\/([\w-]+)/) || [])[1];
  await shot('2-editor-banner');
  console.log('notes tab', await click(/notes$/));
  await p.waitForTimeout(1500);
  await shot('3-invite-asks-sign-in');
  console.log('wrap tab', await click(/^wrap it up$/));
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelectorAll('[role=checkbox][aria-checked=false]').forEach((e) => e.offsetParent && e.click()));
  console.log('wrap', await click(/^wrap it up$/));
  await p.waitForTimeout(2500);
  await shot('4-plan-asks-sign-in');
  await p.keyboard.press('Escape');
  // Sign up in the same browser: the guest's gift should move to the new account.
  const email = `guest-claim-${Date.now()}@example.test`;
  const r = await p.evaluate(async (email) => {
    const res = await fetch('/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'local-test-' + Math.random().toString(36).slice(2), name: 'Claim Tester' }) });
    return res.status;
  }, email);
  console.log('signup', r, email);
  await p.goto(`${base}/sites/${siteId}`, { waitUntil: 'load' });
  await p.waitForTimeout(7000);
  await shot('5-after-sign-in');
  console.log(JSON.stringify({ siteId, email }));
  await b.close();
})();
