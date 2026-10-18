// Contact sheet for the style polish pass: every style's opening at rest, mid-play,
// and its body, at one size. One browser, sequential pages.
// Usage: node style-sheet.cjs <base> <outDir> [w] [h] [only=style1,style2]
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const { useLocalFonts } = require("./fonts.cjs");
const [base = "http://localhost:8080", out = "/tmp/sheet", w = "390", h = "844", only = "", parts = "1,2,3"] = process.argv.slice(2);

// style id -> [opening query, body format, kind for the body's look]
const STYLES = {
  cake: ["kind=birthday", "scrapbook", "birthday"],
  "love-letter": ["kind=valentine", "storybook", "valentine"],
  "boarding-pass": ["kind=voyage", "scrapbook", "voyage"],
  "gift-box": ["kind=christmas", "scrapbook", "christmas"],
  countdown: ["kind=newyear", "stars", "newyear"],
  "record-player": ["kind=anniversary", "storybook", "anniversary"],
  invitation: ["kind=wedding", "storybook", "wedding"],
  "crib-mobile": ["kind=baby", "scrapbook", "baby"],
  fetch: ["kind=pets", "bento", "pets"],
  "board-game": ["kind=game", "hunt", "game"],
  arcade: ["kind=pixel", "bento", "pixel"],
  handwritten: ["kind=handwritten", "handwritten", "handwritten"],
  scrapbook: ["style=scrapbook&pal=berry", "scrapbook", "birthday"],
  storybook: ["style=storybook&pal=berry", "storybook", "birthday"],
  comic: ["style=comic&pal=berry", "comic", "birthday"],
  bento: ["style=bento&pal=berry", "bento", "birthday"],
  hunt: ["style=hunt&pal=berry", "hunt", "birthday"],
  zine: ["style=zine&pal=berry", "zine", "birthday"],
  mixtape: ["style=mixtape&pal=berry", "mixtape", "birthday"],
  scratch: ["style=scratch&pal=berry", "scratch", "birthday"],
  stars: ["style=stars&pal=night", "stars", "birthday"],
};

const launch = async () =>
  chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter((a) => !a.startsWith("--use-gl") && !a.startsWith("--use-angle")), "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    headless: true,
  });
(async () => {
  const pick = only ? only.split(",") : Object.keys(STYLES);
  for (const id of pick) {
    const [oq, body, kind] = STYLES[id];
    const shots = [
      ["1-rest", `${base}/dev/openings?${oq}`, 4000, false],
      ["2-play", `${base}/dev/openings?${oq}&auto=1&stay=1`, 9000, false],
      ["3-body", `${base}/dev/format?kind=${kind}&format=${body}&p=0&cover=false`, 7000, "both"],
    ];
    for (const [tag, url, wait, full] of shots.filter(([t]) => parts.split(",").includes(t[0]))) {
      const b = await launch();
      const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, hasTouch: +w < 700 });
      await useLocalFonts(ctx);
      await ctx.addInitScript((SOUND) => {
        try {
          sessionStorage.setItem("jb-intro-seen", "1");
          if (SOUND) localStorage.setItem("jb-sound", "1");
        } catch {}
      }, !!process.env.SOUND);
      const page = await ctx.newPage();
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
      page.on("console", (m) => {
        if (m.type() === "error" && !/ERR_TUNNEL|fontshare|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 160));
      });
      await page.goto(url, { waitUntil: "load", timeout: 90000 }).catch((e) => errs.push("goto " + e.message.slice(0, 80)));
      await page.waitForTimeout(wait);
      await page.screenshot({ path: `${out}/${id}-${tag}.png`, timeout: 30000 }).catch((e) => errs.push("shot " + e.message.slice(0, 60)));
      if (full) await page.screenshot({ path: `${out}/${id}-4-body-full.png`, fullPage: true, timeout: 30000 }).catch((e) => errs.push("full " + e.message.slice(0, 60)));
      console.log(id, tag, errs.length ? "ERR " + errs.slice(0, 3).join(" | ") : "ok");
      await b.close();
    }
  }
})();
