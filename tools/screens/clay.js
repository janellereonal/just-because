// Renders every clay character with three.js (via /dev/clay) and saves PNG stills.
// usage: node clay.js <outDir> [px]   then: python3 clay_webp.py <outDir> ../../public/clay
// ONLY=snail,fox node clay.js ...   renders just those.
// PEOPLE=1 node clay.js <outDir>   renders the ready-made people instead (then clay_webp.py <outDir> ../../public/clay/people).
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
  const people = process.env.PEOPLE === '1';
  if (people) await p.waitForFunction(() => Array.isArray(window.__peopleIds), null, { timeout: 120000 });
  const ids = (await p.evaluate((pp) => (pp ? window.__peopleIds : window.__clayIds), people)).filter((id) => !only.length || only.includes(id));
  for (const id of ids) {
    const url = await p.evaluate(([id, px, pp]) => (pp ? window.__person(id, px) : window.__clay(id, px)), [id, Number(px), people]);
    fs.writeFileSync(path.join(out, `${id}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', id);
  }
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
  process.exit(0);
})();
