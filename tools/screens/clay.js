// Renders every clay character with three.js (via /dev/clay) and saves PNG stills.
// usage: node clay.js <outDir> [px]   then: python3 clay_webp.py <outDir> ../../public/clay
// ONLY=snail,fox node clay.js ...   renders just those.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [out = '../op/clay/png', px = '640'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args, headless: true });
  const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  await p.goto('http://localhost:8080/dev/clay', { waitUntil: 'load' });
  await p.waitForFunction(() => Array.isArray(window.__clayIds), null, { timeout: 120000 });
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const ids = (await p.evaluate(() => window.__clayIds)).filter((id) => !only.length || only.includes(id));
  for (const id of ids) {
    const url = await p.evaluate(([id, px]) => window.__clay(id, px), [id, Number(px)]);
    fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', id);
  }
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
  process.exit(0);
})();
