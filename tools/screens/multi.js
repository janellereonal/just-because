// usage: node multi.js plan.json
// plan: { "state": "../state.json", "outDir": "../op/x", "shots": [
//   { "name": "laptop-words", "url": "http://...", "w": 1440, "h": 900, "wait": 4000, "js": "..." , "full": false }
// ] }
// Shots that share a url and size reuse the page (js runs before each shot), so a sequence of
// clicks through one editor is quick.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sparticuz = require('@sparticuz/chromium').default;
(async () => {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  fs.mkdirSync(plan.outDir, { recursive: true });
  // A fresh browser per page: SwiftShader Chromium sometimes hangs when a context is reused.
  const launch = async () => chromium.launch({
    executablePath: await sparticuz.executablePath(),
    args: [...sparticuz.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    headless: true,
  });
  let browser = null, ctx = null, page = null, key = '';
  for (const s of plan.shots) {
    const k = `${s.url}|${s.w}|${s.h}`;
    if (k !== key) {
      if (browser) await Promise.race([browser.close(), new Promise(r => setTimeout(r, 5000))]);
      browser = await launch();
      ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1, hasTouch: s.w < 700, storageState: plan.state || undefined });
      page = await ctx.newPage();
      page.on('pageerror', e => console.log(s.name, 'PAGEERROR', e.message.slice(0, 200)));
      await page.addInitScript(() => { try { sessionStorage.setItem('jb-intro-seen', '1'); } catch {} });
      await page.goto(s.url, { waitUntil: s.until || 'networkidle', timeout: 120000 }).catch(e => console.log('GOTO', e.message));
      key = k;
    }
    if (s.js) {
      const r = await page.evaluate(s.js).catch(e => 'EVALERR ' + e.message);
      if (r !== undefined) console.log(s.name, 'EVAL:', typeof r === 'string' ? r : JSON.stringify(r));
    }
    await page.waitForTimeout(s.wait ?? 1500);
    await page.screenshot({ path: path.join(plan.outDir, s.name + '.png'), fullPage: !!s.full });
    console.log('shot', s.name);
  }
  await Promise.race([browser?.close(), new Promise(r => setTimeout(r, 5000))]);
  process.exit(0);
})();
