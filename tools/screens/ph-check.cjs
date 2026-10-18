// Visits pages and records what PostHog tries to send through /ingest (requests are answered locally, nothing leaves).
// Usage: node ph-check.cjs <base> <path> [<path>...]
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const zlib = require("node:zlib");
const [base, ...paths] = process.argv.slice(2);
function decode(buf, url) {
  try { return JSON.parse(zlib.gunzipSync(buf).toString()); } catch {}
  try { return JSON.parse(Buffer.from(buf.toString(), "base64").toString()); } catch {}
  const s = buf.toString();
  try { return JSON.parse(s); } catch {}
  try { const p = new URLSearchParams(s); if (p.get("data")) return JSON.parse(Buffer.from(p.get("data"), "base64").toString()); } catch {}
  return s.slice(0, 200);
}
(async () => {
  const b = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
  const sent = [];
  await ctx.route("**/ingest/**", async (route) => {
    const r = route.request();
    const body = r.postDataBuffer();
    const decoded = body ? decode(body, r.url()) : null;
    if (/\/e\//.test(r.url()) && typeof decoded === "string") console.log("undecoded", r.url().slice(-60), body.length, JSON.stringify(body.slice(0, 12).toString("hex")));
    sent.push({ url: r.url().replace(base, ""), body: decoded });
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); Object.defineProperty(navigator, "userAgentData", { get: () => undefined }); });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 150)));
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "load", timeout: 30000 });
    await page.waitForTimeout(4000);
    if (process.env.CLICK) await page.locator(process.env.CLICK).first().click({ timeout: 5000, noWaitAfter: true }).catch((e) => console.log("click failed", e.message.slice(0, 80)));
    else await page.mouse.click(200, 400).catch(() => {});
    await page.waitForTimeout(1500);
  }
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide"))).catch(() => {});
  await page.waitForTimeout(1500);
  const events = [];
  for (const s of sent) {
    const list = Array.isArray(s.body) ? s.body : s.body && s.body.batch ? s.body.batch : s.body && s.body.event ? [s.body] : [];
    for (const e of list) events.push(e);
  }
  console.log("requests:", sent.length, [...new Set(sent.map((s) => s.url.split("?")[0]))].join(" "));
  for (const e of events) {
    const p = e.properties || {};
    console.log(`  ${e.event} | url=${p.$current_url ?? ""} | path=${p.$pathname ?? ""} | text_keys=${Object.keys(p).filter((k) => /text/i.test(k)).join(",")}`);
    if (p.$elements_chain) console.log("     chain:", String(p.$elements_chain).slice(0, 300));
    if (p.$el_text) console.log("     el_text:", p.$el_text);
  }
  const blob = JSON.stringify(sent);
  console.log("leaks:", /\/g\/(?!:id)[a-z0-9]/i.test(blob) || /\/contribute\/(?!:id)[a-z0-9]/i.test(blob) ? "GIFT LINK FOUND" : "none", "| snapshots:", events.filter((e) => e.event === "$snapshot").length, "| pageerrors:", errs.length ? errs.join(" | ") : 0);
  await b.close();
})();
