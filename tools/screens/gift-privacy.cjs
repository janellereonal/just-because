// What a visitor's browser receives from the server on gift pages (LOCAL ONLY). Opens /g/ and
// /contribute/ as a guest and searches every response for secret markers:
//  - locked calendar doors and ornaments before the tree's reveal date send no words early,
//  - "only the recipient" ornaments reach /g/ (after the reveal) but never the friend page,
//  - a password gift sends no names or notes before the password.
// Usage (from tools/screens, app running on BASE with the same local DATABASE_URL):
//   BASE=http://localhost:3005 DATABASE_URL=postgres://jb:jb@localhost:5432/jbs node gift-privacy.cjs
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const BASE = process.env.BASE || "http://localhost:8080";
const DB = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) throw new Error("DATABASE_URL must point at a local database.");
const L = {
  BASE,
  sql: (q) => execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", q]).toString().trim(),
  launch: async () => chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args.filter((a) => a !== "--single-process"), headless: true }),
  signUp: async (email) => {
    const res = await fetch(BASE + "/api/auth/sign-up/email", { method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ email, password: "local-test-pass-123", name: "Tester" }) });
    if (res.status !== 200) throw new Error("sign-up failed " + res.status);
    return { id: L.sql(`select id from "user" where email='${email}'`), cookie: res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
  },
};
const q = (s) => (s === null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };

function scryptHash(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function makeGift(owner, slug, { status = 'published', tier = 'keepsake', calendarLocked = false, reveal = null, shareNotes = false, password = null } = {}) {
  L.sql(`delete from gift_sites where slug='${slug}'`);
  const pub = status === 'published';
  const id = L.sql(`insert into gift_sites (creator_id, title, slug, status, format, style, custom_text, calendar_locked, tree_reveal_date, tier, published_at, expires_at, share_notes, password_hash)
    values (${q(owner)}, 'Privacy test', '${slug}', '${status}', 'scrapbook', 'scrapbook', '{"recipient_name":"Ana"}', ${calendarLocked}, ${reveal ? `current_date + ${reveal}` : 'null'},
    ${pub ? q(tier) : 'null'}, ${pub ? 'now()' : 'null'}, ${pub ? "now() + interval '300 days'" : 'null'}, ${shareNotes}, ${q(password ? scryptHash(password) : null)}) returning id`).split('\n')[0];
  L.sql(`insert into site_modules (site_id, module_type, enabled) values ${['letters', 'calendar', 'tree'].map((t) => `('${id}', '${t}', true)`).join(',')}`);
  return id;
}

async function payloads(browser, url, { before } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const bodies = [];
  page.on('response', async (r) => {
    if (!/_serverFn|\/_server|serverFn/.test(r.url()) && r.request().resourceType() !== 'fetch' && r.request().resourceType() !== 'xhr') return;
    try { bodies.push(await r.text()); } catch {}
  });
  if (before) await before(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await sleep(1500);
  return { ctx, page, all: () => bodies.join('\n') };
}

(async () => {
  const owner = await L.signUp(`pr5-priv-${Date.now()}@test.local`);
  const b = await L.launch();

  // ---- 5c: locked calendar doors ----
  const cal = makeGift(owner.id, 'pr5-cal', { calendarLocked: true, reveal: 5 });
  L.sql(`insert into calendar_entries (site_id, entry_date, type, text_content) values
    ('${cal}', current_date - 1, 'message', 'DOOR_PAST_SECRET'),
    ('${cal}', current_date + 2, 'message', 'DOOR_FUTURE_SECRET'),
    ('${cal}', current_date + 9, 'message', 'DOOR_FAR_SECRET')`);
  L.sql(`insert into contributions (site_id, module_type, author_name, text_content, status, ornament_key, visibility) values
    ('${cal}', 'tree', 'Pia', 'ORN_PUBLIC_SECRET', 'approved', 'star', 'public'),
    ('${cal}', 'tree', 'Rina', 'ORN_RECIPIENT_SECRET', 'approved', 'heart', 'recipient'),
    ('${cal}', 'letters', 'Jo', 'LETTER_OK', 'approved', null, 'public')`);
  let r = await payloads(b, `${L.BASE}/g/pr5-cal`);
  let all = r.all();
  check(all.includes('LETTER_OK'), '5c guest on /g/ gets the approved letter (sanity)');
  check(all.includes('DOOR_PAST_SECRET'), '5c guest gets yesterday\'s door');
  check(!all.includes('DOOR_FUTURE_SECRET') && !all.includes('DOOR_FAR_SECRET'), '5c guest never receives a future door\'s surprise');
  check(!all.includes('ORN_PUBLIC_SECRET') && !all.includes('ORN_RECIPIENT_SECRET'), '5c ornaments stay wordless before tree_reveal_date');
  await r.ctx.close();
  // Owner preview still sees everything.
  r = await payloads(b, `${L.BASE}/g/pr5-cal`, { before: async (p) => p.context().addCookies(owner.cookie.split('; ').map((c) => { const [name, ...v] = c.split('='); return { name, value: v.join('='), url: L.BASE }; })) });
  all = r.all();
  check(all.includes('DOOR_FUTURE_SECRET') && all.includes('ORN_RECIPIENT_SECRET'), '5c owner preview still gets every door and ornament');
  await r.ctx.close();

  // ---- 5b: after the reveal date, the recipient reads "only the recipient" ornaments on /g/ ----
  L.sql(`update gift_sites set tree_reveal_date = current_date - 1 where id='${cal}'`);
  r = await payloads(b, `${L.BASE}/g/pr5-cal`, { before: (p) => p.addInitScript((id) => localStorage.setItem('jb:intro-skipped:' + id, '1'), cal) });
  all = r.all();
  check(all.includes('ORN_PUBLIC_SECRET'), '5b public ornament readable after the reveal date');
  check(all.includes('ORN_RECIPIENT_SECRET'), '5b "only the recipient" ornament readable on /g/');
  // Open it in the tree: the dialog shows the words, not "A private ornament".
  const orn = r.page.getByRole('button', { name: /Rina's ornament|Open Rina's ornament/ }).first();
  if (await orn.count()) {
    await orn.evaluate((el) => { el.scrollIntoView({ block: 'center' }); el.click(); });
    await sleep(900);
    const dlg = await r.page.locator('[role=dialog]').first().textContent().catch(() => '');
    check(/ORN_RECIPIENT_SECRET/.test(dlg) && /Just for you/i.test(dlg), '5b the tree opens the recipient ornament with "Just for you"');
  } else check(false, '5b found Rina\'s ornament on the tree');
  await r.ctx.close();

  // Friend page of a draft gift with "friends read each other's notes" on: never the recipient one.
  const draft = makeGift(owner.id, 'pr5-draft', { status: 'draft', shareNotes: true });
  L.sql(`insert into contributions (site_id, module_type, author_name, text_content, status, ornament_key, visibility) values
    ('${draft}', 'tree', 'Pia', 'DRAFT_PUBLIC_ORN', 'approved', 'star', 'public'),
    ('${draft}', 'tree', 'Rina', 'DRAFT_RECIPIENT_ORN', 'approved', 'heart', 'recipient')`);
  r = await payloads(b, `${L.BASE}/contribute/pr5-draft`);
  all = r.all();
  check(all.includes('DRAFT_PUBLIC_ORN'), '5b friend page shows other friends\' public ornaments (shared notes on)');
  check(!all.includes('DRAFT_RECIPIENT_ORN'), '5b friend page never receives a recipient-only ornament');
  await r.ctx.close();
  // And /g/ for that draft (not open) sends nothing.
  r = await payloads(b, `${L.BASE}/g/pr5-draft`);
  check(!r.all().includes('DRAFT_RECIPIENT_ORN'), '5b unopened gift sends no ornaments on /g/');
  await r.ctx.close();

  // ---- 5e: password gift: friends' names wait for the password ----
  const pw = makeGift(owner.id, 'pr5-pw', { password: 'open-sesame' });
  L.sql(`insert into contributions (site_id, module_type, author_name, text_content, status) values
    ('${pw}', 'letters', 'PWNAMESECRET', 'PW_LETTER_SECRET', 'approved'),
    ('${pw}', 'letters', 'PWPENDINGNAME', 'x', 'pending')`);
  r = await payloads(b, `${L.BASE}/contribute/pr5-pw`);
  all = r.all();
  check(!all.includes('PWNAMESECRET') && !all.includes('PWPENDINGNAME'), '5e friend page without the password gets no names');
  await r.ctx.close();
  r = await payloads(b, `${L.BASE}/g/pr5-pw`);
  all = r.all();
  check(!all.includes('PWNAMESECRET') && !all.includes('PW_LETTER_SECRET'), '5e gift page without the password gets no names or notes');
  // Unlock, then the friend page shows names again.
  await r.page.fill('input[type=password]', 'open-sesame');
  await r.page.getByRole('button', { name: /Open the gift/ }).click();
  await sleep(2500);
  const bodies = [];
  r.page.on('response', async (x) => { try { bodies.push(await x.text()); } catch {} });
  await r.page.goto(`${L.BASE}/contribute/pr5-pw`, { waitUntil: 'networkidle' });
  await sleep(1000);
  check(bodies.join('\n').includes('PWNAMESECRET'), '5e after the password, names come back');
  await r.ctx.close();

  await b.close();
  for (const s of ['pr5-cal', 'pr5-draft', 'pr5-pw']) L.sql(`delete from gift_sites where slug='${s}'`);
  console.log(failures ? `${failures} FAILED` : 'ALL PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error('ERROR', e); process.exit(2); });
