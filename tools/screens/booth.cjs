// Walks through the photobooth with a fake camera and screenshots each step.
// node booth.cjs <contribute-url> <outDir> [w] [h] [fake.y4m]
// Uses Chrome's fake camera (a looping .y4m file, or its built-in test pattern).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [url, outDir, W = '390', H = '844', y4m] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const args = [...sp.args, '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
  if (y4m) args.push(`--use-file-for-fake-video-capture=${y4m}`);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, permissions: ['camera'] });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  const tag = `${W}`;
  const shot = async (name) => {
    await p.screenshot({ path: path.join(outDir, `${name}-${tag}.png`) });
    console.log('shot', name);
  };
  const click = (re) =>
    p.evaluate((src) => {
      const r = new RegExp(src, 'i');
      const el = [...document.querySelectorAll('button,[role=tab],[role=radio],label')].find(
        (x) => x.offsetParent && r.test((x.getAttribute('aria-label') || x.textContent || '').trim()),
      );
      if (el) el.click();
      return !!el;
    }, re.source);

  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  console.log('photos tab', await click(/^photo/));
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('button')].find((x) => /photobooth/i.test(x.textContent || ''));
    el?.scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(500);
  await shot('1-form');
  console.log('open booth', await click(/take one in the photobooth/));
  await p.waitForTimeout(3500);
  await shot('2-camera');
  await click(/^four in a row$/);
  await p.waitForTimeout(400);
  await click(/^take four$/);
  await p.waitForTimeout(1500);
  await shot('3-countdown');
  await p.waitForTimeout(9000);
  await p.fill('#booth-message', 'Happy birthday, Kai. Love, the whole crew');
  await p.waitForTimeout(800);
  await shot('4-four-instant');
  for (const f of ['Film', 'Party', 'Hearts', 'Postcard', 'No frame']) {
    await click(new RegExp(`^${f}$`));
    await p.waitForTimeout(700);
    await shot(`5-four-${f.toLowerCase().replace(' ', '-')}`);
  }
  await click(/^retake$/);
  await p.waitForTimeout(3000);
  await click(/^one photo$/);
  await click(/^take the photo$/);
  await p.waitForTimeout(4500);
  await p.fill('#booth-message', 'Game on, Kai');
  for (const f of ['Instant', 'Party', 'Postcard', 'No frame']) {
    await click(new RegExp(`^${f}$`));
    await p.waitForTimeout(700);
    await shot(`6-one-${f.toLowerCase().replace(' ', '-')}`);
  }
  await click(/^use this photo$/);
  await p.waitForTimeout(1500);
  await shot('7-back-in-form');
  if (process.env.SEND) {
    // Send it, then look at it inside the gift preview.
    await p.fill('input[placeholder="Who\'s this from?"]', 'Booth Tester');
    await click(/^send it$/);
    await p.waitForTimeout(6000);
    await p.evaluate(() => document.querySelector("[data-mine='true']")?.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(1500);
    await shot('8-in-the-gift');
  }
  await b.close();
})();
