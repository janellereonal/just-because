// Opens pages and prints any Content-Security-Policy violations or page errors.
// usage: STATE=../state.json node csp.cjs <path> [path...]
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: [...sp.args.filter(a => !a.startsWith('--use-gl') && !a.startsWith('--use-angle')), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const path of process.argv.slice(2)) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, storageState: process.env.STATE || undefined });
    await useLocalFonts(ctx);
    const p = await ctx.newPage();
    const out = [];
    p.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/.test(t)) out.push('CSP ' + t.slice(0, 220)); });
    p.on('pageerror', (e) => out.push('ERR ' + e.message.slice(0, 200)));
    await p.goto((process.env.BASE || 'http://localhost:8080') + path, { waitUntil: 'load', timeout: 90000 }).catch((e) => out.push('GOTO ' + e.message));
    await p.waitForTimeout(8000);
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await p.waitForTimeout(3000);
    console.log(`== ${path}: ${out.length ? '' : 'clean'}`);
    [...new Set(out)].slice(0, 12).forEach((l) => console.log('  ' + l));
    await ctx.close();
  }
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 4000))]);
  process.exit(0);
})();
