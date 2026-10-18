// Editor saving, end to end (PR "Editor saving"): two tabs never overwrite each other, leaving right
// after a change keeps it, failed and offline saves retry, leaving while unsaved asks first.
// LOCAL ONLY. Needs a running build and its local database:
//   BASE=http://localhost:3001 DATABASE_URL=postgres://jb:jb@localhost:5432/<db> node tools/screens/editor-save.cjs
const { chromium } = require('playwright-core');
const sparticuz = require('@sparticuz/chromium').default;
const { execFileSync } = require('child_process');

const BASE = process.env.BASE || 'http://localhost:8080';
const DB = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) {
  console.error('Set DATABASE_URL to a LOCAL database (localhost).');
  process.exit(2);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('psql', [DB, '-At', '-F', ' | ', '-c', q]).toString().trim();
const results = [];
function check(name, ok, detail = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`);
  console.log(results[results.length - 1]);
}
async function until(fn, ms = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) break;
    await sleep(200);
  }
  return Date.now() - t0;
}
function watch(page, tag, log) {
  page.on('pageerror', (e) => log.push(`[${tag}] PAGEERROR ${e.message.slice(0, 200)}`));
}
async function launch() {
  return chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter((a) => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    headless: true,
  });
}
async function newUser(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  const status = await page.evaluate(async (email) => {
    const res = await fetch('/api/auth/sign-up/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'local-test-pass-123', name: 'Tester' }) });
    return res.status;
  }, email);
  if (status !== 200) throw new Error('sign-up ' + status);
  return { ctx, page };
}
async function createGift(page, { name, occasion, style }) {
  await page.goto(BASE + '/create', { waitUntil: 'networkidle' });
  await sleep(1500);
  await page.keyboard.press('Escape').catch(() => {});
  await page.fill('#gift-for', name);
  await page.getByRole('radio', { name: occasion, exact: true }).first().click();
  await sleep(300);
  if (!(await page.locator(`label[data-style="${style}"]`).count())) await page.getByRole('button', { name: /Show all|other styles/ }).first().click();
  await page.locator(`label[data-style="${style}"]`).first().click();
  await page.getByRole('button', { name: 'Create the gift' }).click();
  await page.waitForURL(/\/sites\//, { timeout: 30000 });
  await page.getByRole('button', { name: /Words/ }).first().waitFor({ timeout: 60000 });
  await sleep(1500);
  return page.url().split('/sites/')[1].split(/[?#]/)[0];
}
async function settings(page) {
  for (let i = 0; i < 3 && !(await page.locator('label[data-style]').count()); i++) {
    await page.getByRole('button', { name: /Gift settings/ }).first().click();
    await sleep(1200);
  }
}
async function pick(page, style) {
  await settings(page);
  if (!(await page.locator(`label[data-style="${style}"]`).count())) await page.getByRole('button', { name: /Show all|other styles/ }).first().click();
  await page.locator(`label[data-style="${style}"]`).first().click();
  await page.getByRole('button', { name: 'Switch', exact: true }).click();
}
async function words(page) {
  await page.getByRole('button', { name: /Words/ }).first().click();
  await sleep(600);
}
const label = (page) => page.evaluate(() => [...document.querySelectorAll('header [role=status]')].map((e) => e.textContent.trim()).join(' | '));
const toasts = (page) => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map((t) => t.textContent.trim()).join(' / '));

async function twoTabsLeavingOffline() {
  const L = { BASE, sql, watch, launch, newUser, createGift };

  const b = await L.launch();
  const log = [];
  const { page: A, ctx } = await L.newUser(b, `pr1-${Date.now()}@test.local`);
  L.watch(A, 'A', log);
  A.setDefaultTimeout(60000);
  const id = await L.createGift(A, { name: 'Kai', occasion: 'Birthday', style: 'cake' });
  const db = (cols) => L.sql(`select ${cols} from gift_sites where id='${id}'`);

  // ---------- 1a. Two tabs ----------
  const B = await ctx.newPage();
  L.watch(B, 'B', log);
  B.setDefaultTimeout(60000);
  await B.goto(L.BASE + '/sites/' + id, { waitUntil: 'networkidle' });
  await B.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1500);

  await pick(A, 'love-letter');
  const took = await until(() => db('style') === 'love-letter');
  check('tab A switches Cake → Love Letter', db('style') === 'love-letter', `${db('style')}, saved in ${took}ms`);

  const heading = B.locator('label:has-text("Heading") input').first();
  await heading.click();
  await B.keyboard.press('End');
  await B.keyboard.type('!');
  await sleep(2500);
  check('tab B (opened before) adds "!" to the heading: both changes kept', db("style||' / '||(custom_text->>'heading')") === 'love-letter / Happy birthday, Kai!', db("style||' / '||(custom_text->>'heading')"));
  const bChip = await B.evaluate(() => document.querySelector('header')?.innerText ?? '');
  check('tab B now shows Love Letter too', /Love Letter/i.test(bChip), bChip.replace(/\s+/g, ' ').slice(0, 80));

  await A.getByRole('radio', { name: 'Thank you', exact: true }).first().click();
  await sleep(2500);
  check('tab A changes the occasion: B\'s "!" survives', db("style||' / '||occasion||' / '||(custom_text->>'heading')") === 'love-letter / thank-you / Happy birthday, Kai!', db("style||' / '||occasion||' / '||(custom_text->>'heading')"));

  // A clash: A moves to Storybook; B (hasn't seen it) picks Comic.
  await pick(A, 'storybook');
  await sleep(2500);
  check('tab A switches to Storybook', db('style') === 'storybook', db('style'));
  await pick(B, 'comic');
  await sleep(2500);
  const notice = await B.locator('[role=alertdialog]').filter({ hasText: 'changed somewhere else' }).count();
  check('stale tab B gets "This gift was changed somewhere else"', notice === 1);
  check('nothing overwritten: still Storybook', db('style') === 'storybook', db('style'));
  await B.getByRole('button', { name: 'Load the latest' }).click();
  await sleep(2000);
  const bAfter = await B.evaluate(() => document.querySelector('header')?.innerText ?? '');
  check('"Load the latest" shows Storybook in tab B', /Storybook/i.test(bAfter) && !(await B.locator('[role=alertdialog]').count()), bAfter.replace(/\s+/g, ' ').slice(0, 80));
  await pick(B, 'comic');
  await sleep(2500);
  check('tab B can carry on: Comic saves', db('style') === 'comic', db('style'));
  await B.close();

  // ---------- 1b. Leaving right after a change ----------
  await A.reload({ waitUntil: 'networkidle' });
  await A.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1500);
  await pick(A, 'love-letter');
  await sleep(300);
  await A.reload({ waitUntil: 'networkidle' });
  await sleep(1500);
  check('switch style, reload after 300ms: kept', db('style') === 'love-letter', db('style'));

  await A.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1000);
  await words(A);
  const h = A.locator('label:has-text("Heading") input').first();
  await h.click();
  await A.keyboard.press('End');
  await A.keyboard.type(' x');
  await sleep(300);
  await A.reload({ waitUntil: 'networkidle' });
  await sleep(1500);
  check('type in the heading, reload after 300ms: kept', /Kai! x$/.test(db("custom_text->>'heading'")), db("custom_text->>'heading'"));

  await A.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1000);
  await pick(A, 'scrapbook');
  await sleep(300);
  await A.getByRole('link', { name: /All gifts/ }).first().click();
  await A.waitForURL(/\/dashboard/);
  await sleep(1500);
  check('switch style, tap "All gifts" after 300ms: kept', db('style') === 'scrapbook', db('style'));

  // Intro and cast go through the same save now.
  await A.goto(L.BASE + '/sites/' + id, { waitUntil: 'networkidle' });
  await A.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1500);
  await words(A);
  await A.locator('label:has-text("Small line on top") input').first().fill('Just for you');
  await A.locator('label:has-text("Button") input').first().fill('Open me');
  await sleep(2000);
  check('opening words save', db("(intro_settings->>'badge_text')||' / '||(intro_settings->>'button_text')") === 'Just for you / Open me', db("intro_settings::text").slice(0, 120));
  await A.getByRole('button', { name: /Look/ }).first().click();
  await sleep(1000);
  await A.getByRole('button', { name: /Surprise me/ }).first().click();
  await sleep(2000);
  check('characters (Surprise me) save', db("coalesce(character::text, icon_set::text, 'none')") !== 'none', db("coalesce(character::text,'-')||' '||coalesce(icon_set::text,'-')").slice(0, 100));

  // ---------- 1c. Offline ----------
  const before = db("background_style");
  const target = before === 'clean' ? 'Formal' : 'Clean';
  await ctx.setOffline(true);
  await A.getByRole('button', { name: new RegExp(`^${target}$`) }).first().click();
  await sleep(4000);
  const offLabel = await label(A);
  const offToasts = await toasts(A);
  check('offline change: top bar says it isn\'t saved yet', /Not saved|Offline/.test(offLabel), offLabel);
  check('offline change: no raw error toast', !/fetch|Failed/i.test(offToasts), offToasts || 'no toast');
  check('offline change: database unchanged for now', db('background_style') === before, db('background_style'));
  await ctx.setOffline(false);
  await sleep(4000);
  check('back online: saved', db('background_style') === target.toLowerCase(), db('background_style'));
  check('back online: top bar says Saved', /Saved/.test(await label(A)), await label(A));

  console.log('--- page errors:\n' + (log.join('\n') || 'none'));
  await b.close();
}

async function retriesAndLeaving() {
  const L = { BASE, sql, watch, launch, newUser, createGift };

  const b = await L.launch();
  const log = [];
  const { page: A, ctx } = await L.newUser(b, `pr1e-${Date.now()}@test.local`);
  L.watch(A, 'A', log);
  A.setDefaultTimeout(60000);
  const id = await L.createGift(A, { name: 'Ivy', occasion: 'Birthday', style: 'cake' });
  const db = (cols) => L.sql(`select ${cols} from gift_sites where id='${id}'`);
  const heading = () => A.locator('label:has-text("Heading") input').first();

  // 1. The server fails twice, then works: retried, and the top bar says so meanwhile.
  let fails = 2;
  const saves = [];
  await A.route('**/_serverFn/**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST' && (req.postData() || '').includes('patch')) {
      saves.push(Date.now());
      if (fails > 0) {
        fails--;
        return route.fulfill({ status: 503, body: '' });
      }
    }
    return route.continue();
  });
  await heading().click();
  await A.keyboard.press('End');
  await A.keyboard.type(' A');
  await sleep(1500);
  const during = await label(A);
  check('server error: top bar says "Not saved yet, retrying"', /Not saved yet, retrying/.test(during), during);
  const took = await until(() => /Ivy A$/.test(db("custom_text->>'heading'")), 15000);
  const gaps = saves.slice(1).map((t, i) => t - saves[i]);
  check('server error: saved on a later try', /Ivy A$/.test(db("custom_text->>'heading'")), `after ${took}ms, gaps between tries ${gaps.join(', ')}ms`);
  check('server error: waits about 2s then 5s between tries', gaps.length >= 2 && gaps[0] >= 1800 && gaps[1] >= 4500, gaps.join(', '));
  await sleep(500);
  check('server error: top bar back to Saved', /Saved/.test(await label(A)), await label(A));
  await A.unroute('**/_serverFn/**');

  // 2. Typing steadily on a slow connection: saves overlap typing but never clash with themselves.
  const cdp = await ctx.newCDPSession(A);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 1200, downloadThroughput: -1, uploadThroughput: -1 });
  await heading().click();
  await A.keyboard.press('End');
  for (const ch of ' slow typing here') {
    await A.keyboard.type(ch);
    await sleep(260);
  }
  await until(() => /slow typing here$/.test(db("custom_text->>'heading'")), 15000);
  await sleep(3000);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  check('slow connection: every letter saved', /Ivy A slow typing here$/.test(db("custom_text->>'heading'")), db("custom_text->>'heading'"));
  check('slow connection: no "changed somewhere else"', !(await A.locator('[role=alertdialog]').count()));
  check('slow connection: the field still shows everything typed', /slow typing here$/.test(await heading().inputValue()), await heading().inputValue());

  // 3. Another tab changes something; this tab, hidden and shown again, picks it up without saving.
  const B = await ctx.newPage();
  await B.goto(L.BASE + '/sites/' + id, { waitUntil: 'networkidle' });
  await B.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1500);
  const bh = B.locator('label:has-text("Heading") input').first();
  await bh.fill('Ivy turns 30');
  await until(() => db("custom_text->>'heading'") === 'Ivy turns 30');
  await B.close();
  await A.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  });
  await until(async () => (await heading().inputValue()) === 'Ivy turns 30');
  check('coming back to the tab shows the other tab\'s change', (await heading().inputValue()) === 'Ivy turns 30', await heading().inputValue());

  // 4. Offline with an unsaved change: leaving inside the app asks first; staying keeps it.
  await ctx.setOffline(true);
  await heading().click();
  await A.keyboard.press('End');
  await A.keyboard.type('!');
  await sleep(2500);
  let asked = '';
  A.once('dialog', async (d) => {
    asked = d.type() + ': ' + d.message();
    await d.dismiss();
  });
  await A.getByRole('link', { name: /All gifts/ }).first().click();
  await sleep(2500);
  check('offline, tap "All gifts": asks before leaving', /Leave anyway/.test(asked), asked);
  check('offline, stay: still in the editor with the change', /\/sites\//.test(A.url()) && (await heading().inputValue()) === 'Ivy turns 30!', A.url());

  // 5. Offline, closing the tab: the browser's "leave site?" prompt shows.
  let unloadAsked = '';
  A.once('dialog', async (d) => {
    unloadAsked = d.type();
    await d.dismiss();
  });
  await A.close({ runBeforeUnload: true });
  await sleep(1500);
  check('offline, close the tab: browser asks first', unloadAsked === 'beforeunload', unloadAsked || 'no prompt');

  // 6. Online, close the tab right after a change: no prompt, and it's saved.
  await ctx.setOffline(false);
  const C = await ctx.newPage();
  L.watch(C, 'C', log);
  await C.goto(L.BASE + '/sites/' + id, { waitUntil: 'networkidle' });
  await C.getByRole('button', { name: /Words/ }).first().waitFor();
  await sleep(1500);
  const ch = C.locator('label:has-text("Heading") input').first();
  await ch.fill('Ivy turns 31');
  await sleep(200);
  let closeAsked = '';
  C.once('dialog', async (d) => {
    closeAsked = d.type();
    await d.accept();
  });
  await C.close({ runBeforeUnload: true });
  await until(() => db("custom_text->>'heading'") === 'Ivy turns 31');
  check('online, close the tab 200ms after typing: saved', db("custom_text->>'heading'") === 'Ivy turns 31', db("custom_text->>'heading'"));
  check('online, close the tab: no prompt', !closeAsked, closeAsked || 'none');

  console.log('--- page errors:\n' + (log.join('\n') || 'none'));
  await b.close();
}

(async () => {
  await twoTabsLeavingOffline();
  await retriesAndLeaving();
  console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})().catch((e) => {
  console.error('ERROR', e.message.split('\n')[0]);
  process.exit(2);
});
