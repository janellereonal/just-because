// Opens a gift link, screenshots the opening, presses its button, screenshots what follows.
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const { useLocalFonts } = require("./fonts.cjs");
const [base, slug, out, button] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await useLocalFonts(ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
  await page.goto(`${base}/g/${slug}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${out}/${slug}-1.png`, timeout: 15000 }).catch(() => {});
  const btn = page.getByRole("button", { name: button, exact: true }).first();
  console.log(slug, "button found:", await btn.count());
  await btn.click({ timeout: 5000 }).catch((e) => console.log("click", e.message.slice(0, 80)));
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${out}/${slug}-2.png`, timeout: 15000 }).catch(() => {});
  const text = await page.evaluate(() => document.body.innerText.slice(0, 300).replace(/\s+/g, " "));
  console.log("after:", text, errs.length ? "| ERR " + errs.join(" | ") : "");
  await b.close();
})();
