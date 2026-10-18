// Sends a photo through the friend page like a real person would, and reports what actually
// went over the wire (size, type) so you can check the in-browser compression.
// node upload.cjs <contribute-url> <photo> <outDir> [w] [h]
// The server must be a local build with VITE_DEV_UPLOADS=1 (or `bun run dev`).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [url, photo, outDir, W = '390', H = '844'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, isMobile: +W < 700 });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  const sent = [];
  p.on('request', (r) => {
    if (r.url().endsWith('/api/upload') && r.method() === 'POST') sent.push(r.postDataBuffer()?.length ?? 0);
  });
  const responses = [];
  p.on('response', async (r) => {
    if (r.url().endsWith('/api/upload')) responses.push(await r.json().catch(() => null));
  });
  const click = (re) =>
    p.evaluate((src) => {
      const r = new RegExp(src, 'i');
      const el = [...document.querySelectorAll('button,[role=tab]')].find((x) => x.offsetParent && r.test((x.getAttribute('aria-label') || x.textContent || '').trim()));
      if (el) el.click();
      return !!el;
    }, re.source);

  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  console.log('photo tab', await click(/^photo/));
  await p.waitForTimeout(1000);
  await p.setInputFiles('input[type=file][accept^="image"]', photo);
  await p.fill('input[placeholder="Who\'s this from?"]', 'Upload Tester');
  await p.waitForTimeout(800);
  await click(/^send it$/);
  // Catch the "Preparing photo" moment on the button.
  for (let i = 0; i < 20; i++) {
    const label = await p.evaluate(() => [...document.querySelectorAll('button[type=submit],button')].map((x) => x.textContent.trim()).find((t) => /preparing|uploading/i.test(t)));
    if (label) {
      console.log('button says:', label);
      await p.screenshot({ path: path.join(outDir, `upload-stage-${W}.png`) });
      break;
    }
    await p.waitForTimeout(100);
  }
  await p.waitForTimeout(1500);
  console.log("toast:", await p.evaluate(() => [...document.querySelectorAll("[data-sonner-toast]")].map((t) => t.textContent.trim()).join(" | ")));
  await p.screenshot({ path: path.join(outDir, `upload-done-${W}.png`) });
  await p.waitForTimeout(6000);
  console.log('original', (fs.statSync(photo).size / 1024 / 1024).toFixed(2), 'MB');
  console.log('requests', sent.map((n) => `${(n / 1024).toFixed(0)} KB`).join(', '));
  console.log('stored', JSON.stringify(responses));
  await b.close();
})();
