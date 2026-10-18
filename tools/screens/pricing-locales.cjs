// Screenshots the landing pricing section as visitors from different places (locale + time zone).
// Usage: node pricing-locales.cjs <base> <outDir>
const sparticuz = require("@sparticuz/chromium").default;
const { chromium: pw } = require("playwright-core");
const { useLocalFonts } = require("./fonts.cjs");
const [base = "http://localhost:8080", out = "../op"] = process.argv.slice(2);
const visitors = [
  ["manila", "en-US", "Asia/Manila"],
  ["london", "en-GB", "Europe/London"],
  ["dubai", "en-AE", "Asia/Dubai"],
  ["newyork", "en-US", "America/New_York"],
];
const sizes = [["phone", 390, 844], ["desktop", 1440, 756]];
(async () => {
  for (const [name, locale, timezoneId] of visitors) {
    for (const [size, w, h] of sizes) {
      // One browser per shot: this Chromium runs single-process and dies when a context closes.
      const browser = await pw.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
      const ctx = await browser.newContext({ locale, timezoneId, viewport: { width: w, height: h }, deviceScaleFactor: 2, reducedMotion: "reduce" });
      await useLocalFonts(ctx);
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      await page.goto(`${base}/#pricing`, { waitUntil: "load", timeout: 30000 });
      await page.evaluate(() => sessionStorage.setItem("jb-intro-seen", "1")).catch(() => {});
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(3500);
      const el = await page.$("#pricing");
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await el.screenshot({ path: `${out}/pricing-${name}-${size}.png` });
      const text = await el.innerText();
      const approx = text.match(/≈ \S+/g);
      console.log(name, size, "guides:", approx?.join(" ") ?? "-", "| footer:", text.split("\n").find((l) => /pesos/.test(l)), "");
      const real = errors.filter((e) => !/ERR_TUNNEL|ERR_NAME|fonts\.g/.test(e));
      if (real.length) console.log("  ", real.slice(0, 3).join("\n   "));
      await browser.close();
    }
  }
})();
