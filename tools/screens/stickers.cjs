// Walks the sticker canvas in the editor: select, resize, turn, move, delete, undo.
// node stickers.cjs <base> <siteId> <outDir> [w] [h]
// The gift needs the Classic opening with a few stickers (Intro panel → Classic).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [base, siteId, outDir, W = '1440', H = '756'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const phone = +W < 700;
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, storageState: path.join(__dirname, '../state.json'), isMobile: phone, hasTouch: phone });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  const shot = async (name) => {
    await p.screenshot({ path: path.join(outDir, `${name}-${W}.png`) });
    console.log('shot', name);
  };
  const count = () => p.$$eval('[data-sticker]', (els) => els.length);
  const boxOf = async (sel) => {
    const el = await p.$(sel);
    return el ? el.boundingBox() : null;
  };
  // A press-move-release with the mouse (desktop) or one finger (phone), through pointer events.
  async function drag(from, to) {
    if (phone) {
      const cdp = await ctx.newCDPSession(p);
      const pt = (x, y) => [{ x, y, id: 1 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(from.x, from.y) });
      for (let i = 1; i <= 8; i++)
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await p.mouse.move(from.x, from.y);
      await p.mouse.down();
      await p.mouse.move(to.x, to.y, { steps: 8 });
      await p.mouse.up();
    }
    await p.waitForTimeout(400);
  }
  const mid = (bx) => ({ x: bx.x + bx.width / 2, y: bx.y + bx.height / 2 });

  await p.goto(`${base}/sites/${siteId}`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  // The opening shows in the canvas on the Words step (phones start there, with the panel closed).
  if (!phone) {
    await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /^words$/i.test((x.textContent || '').trim()))?.click());
    await p.waitForTimeout(800);
  }
  await p.waitForTimeout(2500);
  console.log('stickers', await count());
  await shot('1-stickers');

  const target = '[data-sticker][aria-label^="💖"]';
  let bx = await boxOf(target);
  if (!bx) throw new Error('no 💖 sticker on the canvas');
  if (phone) await p.tap(target);
  else await p.click(target);
  await p.waitForTimeout(500);
  console.log('selected', await p.$eval(target, (e) => e.getAttribute('aria-pressed')));
  await shot('2-selected');

  // Resize from the corner handle, turn from the top handle, then move the sticker.
  const resize = await boxOf(`${target} [title="Drag to resize"]`);
  if (resize) await drag(mid(resize), { x: mid(resize).x + 30, y: mid(resize).y + 30 });
  const turn = await boxOf(`${target} [title="Drag to turn"]`);
  bx = await boxOf(target);
  if (turn && bx) await drag(mid(turn), { x: mid(bx).x + 70, y: mid(bx).y - 20 });
  bx = await boxOf(target);
  await drag(mid(bx), { x: mid(bx).x - 50, y: mid(bx).y + 70 });
  await shot('3-resized-turned-moved');

  // Delete: Backspace on desktop, the toolbar's Delete button on a phone.
  if (phone) await p.tap('[data-sticker-tools] button:has-text("Delete")');
  else await p.keyboard.press('Backspace');
  await p.waitForTimeout(600);
  console.log('after delete', await count());
  await shot('4-deleted');

  // Undo brings it back.
  await p.click('[data-sticker-tools] button:has-text("Undo")');
  await p.waitForTimeout(800);
  console.log('after undo', await count());
  await shot('5-undo');
  await p.waitForTimeout(1500); // let the autosave run
  await b.close();
})();
