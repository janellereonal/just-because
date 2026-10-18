// Screenshots openings from /dev/openings: each style at rest and after playing.
// Usage: node openings-batch.cjs <base> <outDir> <w> <h> <pal> style1,style2,...
// A theme opening instead of a style: kind:christmas. Extra query (e.g. &char=bear): EXTRA env.
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const { useLocalFonts } = require("./fonts.cjs");
const [base, out, w = "390", h = "844", pal = "berry", list = ""] = process.argv.slice(2);
(async () => {
  for (const style of list.split(",").filter(Boolean)) {
    for (const [tag, q, wait] of [["rest", "", 3500], ["open", "&auto=1&stay=1", 7000]]) {
      const b = await chromium.launch({ executablePath: await sparticuz.executablePath(), args: sparticuz.args, headless: true });
      const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
      await useLocalFonts(ctx);
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message.slice(0, 140)));
      const target = style.startsWith("kind:") ? `kind=${style.slice(5)}` : `style=${style}`;
      await page.goto(`${base}/dev/openings?${target}&pal=${pal}${q}${process.env.EXTRA || ""}`, { waitUntil: "load", timeout: 60000 });
      await page.waitForTimeout(wait);
      await page.screenshot({ path: `${out}/${style.replace(":", "-")}-${tag}-${w}.png`, timeout: 15000 }).catch((e) => errs.push("shot: " + e.message.slice(0, 60)));
      console.log(style, tag, errs.length ? "ERR " + errs.join(" | ") : "ok");
      await b.close();
    }
  }
})();
