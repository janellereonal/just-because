// Plays through every body with sound on, the way a recipient would: opens notes, turns
// pages, plays the tape, scratches a ticket, unwraps gifts. Reports page errors and the
// number of sounds made (by counting audio nodes started). One browser per body.
// Usage: node body-play.cjs <base> [w] [h] [formats]
const sparticuz = require("@sparticuz/chromium").default;
const { chromium } = require("playwright-core");
const [base = "http://localhost:8080", w = "390", h = "844", only = ""] = process.argv.slice(2);
const FORMATS = only ? only.split(",") : ["scrapbook", "storybook", "comic", "bento", "hunt", "zine", "mixtape", "scratch", "handwritten", "stars"];

const PLAY = {
  async storybook(p) {
    for (let i = 0; i < 4; i++) await p.locator('button[aria-label="Next page"]').click({ timeout: 4000 }).then(() => p.waitForTimeout(700));
  },
  async comic(p) {
    for (let i = 0; i < 3; i++) await p.keyboard.press("ArrowRight").then(() => p.waitForTimeout(700));
  },
  async mixtape(p) {
    await p.locator(".mix-root button").nth(2).click({ timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(800);
    await p.getByRole("button", { name: /side b/i }).click({ timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(1000);
  },
  async scratch(p) {
    const box = await p.locator(".scr-foil canvas, canvas").first().boundingBox();
    if (box) {
      await p.mouse.move(box.x + 10, box.y + 10);
      await p.mouse.down();
      for (let i = 0; i < 30; i++) await p.mouse.move(box.x + 10 + ((i * 37) % box.width), box.y + 10 + ((i * 53) % box.height), { steps: 2 });
      await p.mouse.up();
    }
    await p.getByRole("button", { name: /^reveal$/i }).first().click({ timeout: 4000 }).catch(() => {});
    await p.waitForTimeout(800);
  },
  async hunt(p) {
    for (let i = 0; i < 3; i++) {
      await p.locator(".hunt-box").nth(i).click({ timeout: 4000 }).catch(() => {});
      await p.waitForTimeout(700);
      await p.keyboard.press("Escape");
      await p.waitForTimeout(300);
    }
  },
};

async function openNotes(p, sel, n = 2) {
  for (let i = 0; i < n; i++) {
    const el = p.locator(sel).nth(i);
    if (!(await el.count())) return;
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await el.click({ timeout: 4000, force: true }).catch(() => {});
    await p.waitForTimeout(600);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
  }
}

(async () => {
  for (const f of FORMATS) {
    const b = await chromium.launch({
      executablePath: await sparticuz.executablePath(),
      args: [...sparticuz.args.filter((a) => !a.startsWith("--use-gl") && !a.startsWith("--use-angle")), "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"],
      headless: true,
    });
    const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: false });
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem("jb-intro-seen", "1");
        localStorage.setItem("jb-sound", "1");
      } catch {}
      // Count every sound source that starts.
      window.__jbSounds = 0;
      for (const C of [window.OscillatorNode, window.AudioBufferSourceNode]) {
        if (!C) continue;
        const start = C.prototype.start;
        C.prototype.start = function (...a) {
          window.__jbSounds++;
          return start.apply(this, a);
        };
      }
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    page.on("console", (m) => {
      if (m.type() === "error" && !/ERR_TUNNEL|fontshare|Failed to load resource|AudioContext was not allowed/.test(m.text())) errs.push(m.text().slice(0, 160));
    });
    await page.goto(`${base}/dev/format?kind=birthday&format=${f}&p=0&cover=false`, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(6000);
    await page.mouse.click(5, 5); // a first gesture, so audio may start
    if (PLAY[f]) await PLAY[f](page).catch((e) => errs.push("play " + e.message.slice(0, 80)));
    await openNotes(page, "button.bento-tile:not(.bento-hero), .zine-note, .zine-card, [aria-label$='Open it.'], .hw-more, .scr-prize, .nsk-star", 2);
    const sounds = await page.evaluate(() => window.__jbSounds);
    console.log(f.padEnd(12), "sounds:", String(sounds).padStart(4), errs.length ? "ERR " + errs.slice(0, 3).join(" | ") : "ok");
    await b.close();
  }
})();
