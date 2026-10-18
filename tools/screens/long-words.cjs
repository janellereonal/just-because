// Long words and pasted links on gift pages (LOCAL ONLY).
// Makes a paid + published gift with every section filled with a 300-character word and a long link,
// then opens /g/ as a visitor for every style at 390 and 1440 px and reports anything wider than the
// screen or than the box it sits in. Pass = no rows marked FAIL.
//
// Usage (from tools/screens, with the app running on BASE and the same local DATABASE_URL):
//   BASE=http://localhost:3005 DATABASE_URL=postgres://jb:jb@localhost:5432/jbs node long-words.cjs [style,style]
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const { execFileSync } = require("child_process");

const BASE = process.env.BASE || "http://localhost:8080";
const DB = process.env.DATABASE_URL || "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) throw new Error("DATABASE_URL must point at a local database.");
const sql = (q) => execFileSync("psql", [DB, "-At", "-v", "ON_ERROR_STOP=1", "-c", q]).toString().trim();
const lit = (s) => (s === null ? "null" : `'${String(s).replace(/'/g, "''")}'`);
const json = (o) => (o === null ? "null" : `${lit(JSON.stringify(o))}::jsonb`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LONG = "Supercalifragilisticexpialidocious".repeat(10).slice(0, 300);
const LINK = "https://www.example.com/photos/albums/2026/birthday-surprise/ana-and-friends-at-the-beach-final-final-v2?ref=share";
const w = (n) => LONG.slice(0, n);
const STYLES = [
  ["cake", "scrapbook", "Happy Birthday"], ["love-letter", "storybook", "Valentine's"], ["boarding-pass", "scrapbook", "Bon Voyage"],
  ["gift-box", "scrapbook", "Christmas"], ["countdown", "stars", "New Year"], ["record-player", "storybook", "Anniversary"],
  ["invitation", "storybook", "Weddings"], ["crib-mobile", "scrapbook", "Baby Shower"], ["fetch", "bento", "Pets"],
  ["board-game", "hunt", "Game Night"], ["arcade", "bento", "Pixel"], ["handwritten", "handwritten", "Handwritten"],
  ["winter-window", "scrapbook", "Winter Cabin Christmas"], ["care-package", "scrapbook", "Care Package"],
  ["parol", "scrapbook", "Parol Christmas"], ["debut", "storybook", "Debut"],
  ["scrapbook", "scrapbook", null], ["storybook", "storybook", null], ["comic", "comic", null], ["bento", "bento", null],
  ["hunt", "hunt", null], ["zine", "zine", null], ["mixtape", "mixtape", null], ["scratch", "scratch", null], ["stars", "stars", null],
];

async function seed() {
  const email = `long-words-${Date.now()}@test.local`;
  const res = await fetch(BASE + "/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: "local-test-pass-123", name: "Tester" }),
  });
  if (res.status !== 200) throw new Error("sign-up failed " + res.status);
  const owner = sql(`select id from "user" where email='${email}'`);
  sql(`delete from gift_sites where slug='long-words'`);
  const titles = Object.fromEntries(["letters", "photobooth", "songs", "wordcloud", "voice", "countdown", "calendar", "tree", "openwhen", "capsule", "superlatives", "quiz", "map", "coupons", "video", "doodle"].map((t) => [`${t}_title`, w(60)]));
  const text = { heading: w(80), recipient_name: w(40), intro_message: `${w(200)} ${LINK}`.slice(0, 280), footer_note: w(200), ...titles };
  const id = sql(`insert into gift_sites (creator_id, title, slug, status, format, style, custom_text, countdown_at, tier, published_at, expires_at)
    values (${lit(owner)}, 'Long words', 'long-words', 'published', 'scrapbook', 'scrapbook', ${json(text)}, now() + interval '20 days', 'keepsake', now(), now() + interval '300 days') returning id`).split("\n")[0];
  sql(`insert into site_modules (site_id, module_type, enabled) select '${id}', t, true from unnest(array[${Object.keys(titles).map((k) => lit(k.replace("_title", ""))).join(",")}]) t`);
  const photo = "/clay/bear.webp";
  const rows = [
    ["letters", `${LONG} ${LINK} and a few normal words.`, null, null, null], ["letters", LONG, null, null, null],
    ["photobooth", `${w(150)} ${LINK}`, photo, null, null], ["songs", w(250), null, "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=" + w(80), null],
    ["wordcloud", w(120), null, null, null], ["wordcloud", LINK, null, null, null], ["voice", w(280), null, null, null],
    ["openwhen", LONG, null, null, { when: w(80) }], ["capsule", LONG, null, null, { unlock_at: new Date(Date.now() - 86400000).toISOString() }],
    ["superlatives", w(280), null, null, { award: w(90) }], ["quiz", null, null, null, { question: w(140), answer: w(80), wrong: [w(79), "nope"] }],
    ["map", LONG, photo, null, { place: w(80) }], ["coupons", null, null, null, { title: w(60), fine_print: w(140) }],
    ["video", w(280), "/missing.mp4", null, {}], ["doodle", w(280), photo, null, {}],
  ];
  const values = rows.map(([t, body, media, link, data]) => `('${id}', '${t}', ${lit(w(40))}, ${lit(body)}, ${lit(media)}, ${lit(link)}, 'approved', null, 'public', ${json(data)})`);
  values.push(`('${id}', 'tree', ${lit(w(40))}, ${lit(LONG)}, null, null, 'approved', 'star', 'public', null)`);
  values.push(`('${id}', 'tree', 'Rina', ${lit(LONG)}, null, null, 'approved', 'heart', 'recipient', null)`);
  sql(`insert into contributions (site_id, module_type, author_name, text_content, media_url, external_link, status, ornament_key, visibility, data) values ${values.join(",")}`);
  sql(`insert into calendar_entries (site_id, entry_date, type, text_content) values ('${id}', current_date - 1, 'message', ${lit(LONG + " " + LINK)})`);
  return id;
}

function measure() {
  const W = innerWidth;
  const bad = [];
  const name = (e) => `${e.tagName.toLowerCase()}${typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).slice(0, 3).join(".") : ""}`;
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("[data-gift-underlay]")) continue;
    if (![...el.childNodes].some((n) => n.nodeType === 3 && /Supercal|example\.com|spotify\.com/.test(n.textContent))) continue;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (cs.visibility === "hidden" || !r.width || !r.height) continue;
    const ellipsis = cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none";
    if (!ellipsis && cs.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 2) { bad.push(`${name(el)} cut inside itself`); continue; }
    if (r.width > W + 1) { bad.push(`${name(el)} ${Math.round(r.width)}px wide`); continue; }
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const acs = getComputedStyle(a);
      if (acs.overflowX === "visible") continue;
      if (r.width > a.getBoundingClientRect().width + 2 && acs.textOverflow !== "ellipsis") bad.push(`${name(el)} wider than ${name(a)}`);
      break;
    }
  }
  return { overflow: document.scrollingElement.scrollWidth > W, bad };
}

(async () => {
  const only = process.argv[2] ? process.argv[2].split(",") : null;
  const id = await seed();
  const args = sparticuz.args.filter((a) => a !== "--single-process");
  const browser = await chromium.launch({ executablePath: await sparticuz.executablePath(), args, headless: true });
  let fails = 0;
  for (const [style, format, theme] of STYLES) {
    if (only && !only.includes(style)) continue;
    sql(`update gift_sites set style='${style}', format='${format}', theme_id=${theme ? `(select id from themes where name=${lit(theme)})` : "null"} where id='${id}'`);
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 700 });
      await ctx.addInitScript((gift) => { try { localStorage.setItem("jb:intro-skipped:" + gift, "1"); } catch {} }, id);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/g/long-words`, { waitUntil: "networkidle", timeout: 60000 });
      await sleep(2500);
      const h = await page.evaluate(() => document.scrollingElement.scrollHeight);
      for (let y = 0; y < h; y += 700) { await page.evaluate((top) => window.scrollTo(0, top), y); await sleep(100); }
      const m = await page.evaluate(measure);
      const ok = !m.overflow && !m.bad.length;
      if (!ok) fails++;
      console.log(`${ok ? "ok  " : "FAIL"} ${style.padEnd(14)} ${viewport.width}${ok ? "" : "  " + [m.overflow ? "page scrolls sideways" : "", ...m.bad.slice(0, 3)].filter(Boolean).join("; ")}`);
      await ctx.close();
    }
  }
  await browser.close();
  sql(`delete from gift_sites where id='${id}'`);
  console.log(fails ? `${fails} failing` : "No overflow in any style.");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
