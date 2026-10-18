// For every style in /styles: open its preview, play the opening if there is one,
// and report whether an opening showed and whether pages (notes) followed.
// Usage: node styles-audit.cjs <base> <outDir>
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const [base = "http://localhost:8080", out = "../op"] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(base + "/styles", { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(6000);
  const titles = await page.$$eval("h3", (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
  const rows = [];
  for (const title of titles) {
    const card = page.locator(`[aria-label$="full screen"]:has(h3:text-is("${title}")), [aria-label]:has(h3:text-is("${title}"))`).first();
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await card.click({ timeout: 5000, position: { x: 40, y: 60 } }).catch((e) => console.log("click fail", title, e.message.slice(0, 60)));
    await page.waitForTimeout(2500);
    const dlg = page.locator('[role="dialog"]').last();
    const hasDialog = await dlg.count();
    // An opening shows a big call-to-action button inside the dialog before the notes.
    const btns = hasDialog ? await dlg.locator("button").allTextContents() : [];
    const opening = btns.map((t) => t.trim()).filter((t) => t && !/close|skip|use|again|details|^$/i.test(t));
    let bodyText = 0;
    if (hasDialog) {
      const skip = dlg.getByRole("button", { name: /skip/i }).first();
      if (await skip.count()) await skip.click().catch(() => {});
      await page.waitForTimeout(3000);
      bodyText = await dlg.evaluate((d) => d.innerText.length);
      await page.screenshot({ path: `${out}/audit-${title.replace(/\W+/g, "-").toLowerCase()}.png`, timeout: 8000 }).catch(() => {});
    }
    rows.push({ title, dialog: !!hasDialog, openingButton: opening.slice(0, 2).join(" / "), bodyChars: bodyText });
    await page.keyboard.press("Escape");
    await page.locator('button[aria-label="Close"]').last().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  for (const r of rows) console.log(`${r.title.padEnd(16)} dialog=${r.dialog} opening="${r.openingButton}" bodyChars=${r.bodyChars}`);
  await b.close();
})();
