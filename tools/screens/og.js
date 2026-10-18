// Renders the link-preview cards from /dev/og into public/og/ (1200x630 PNG).
// usage: node og.js [kinds...]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
const KINDS = ['birthday', 'valentine', 'anniversary', 'wedding', 'bridal', 'baby', 'christmas', 'newyear', 'voyage', 'pets', 'handwritten', 'game', 'pixel', 'default'];
(async () => {
  const only = process.argv.slice(2);
  const out = path.join(__dirname, '../../public/og');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await useLocalFonts(ctx);
  const page = await ctx.newPage();
  const jobs = [['default', 'default'], ...KINDS.flatMap((k) => [[k, 'gift'], [k, 'add']])].filter(([k]) => !only.length || only.includes(k));
  for (const [k, v] of jobs) {
    await page.goto(`http://localhost:8080/dev/og?kind=${k}&v=${v}`, { waitUntil: 'load' });
    await page.waitForSelector('#og img', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const file = v === 'default' ? 'default.png' : `${v}-${k}.png`;
    await page.locator('#og').screenshot({ path: path.join(out, file.replace('.png', '.jpg')), type: 'jpeg', quality: 86 });
    console.log('saved', file);
  }
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 4000))]);
  process.exit(0);
})();
