// Scrolls a page step by step and reports every spot where Bo (the hopping mascot) covers
// text, chips, buttons or fields. Also saves a screenshot at each overlap.
// node bocheck.cjs <url> <outDir> [w] [h] [step]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [url, outDir, W = '1440', H = '756', step = '220'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, isMobile: +W < 700 });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(4000);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  let overlaps = 0;
  let seen = 0;
  for (let y = 0; y < total - +H; y += +step) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(1600);
    const r = await p.evaluate(() => {
      const wrap = [...document.querySelectorAll('div.will-change-transform')].find((d) => d.querySelector('canvas') && d.parentElement?.getAttribute('aria-hidden') === 'true');
      if (!wrap || Number(getComputedStyle(wrap).opacity) < 0.5) return { visible: false };
      const box = wrap.getBoundingClientRect();
      const body = { x: box.left + box.width * 0.22, y: box.top + box.height * 0.15, w: box.width * 0.56, h: box.height * 0.6 };
      if (body.y + body.h < 0 || body.y > innerHeight) return { visible: false };
      const hits = new Set();
      const layer = wrap.parentElement;
      const hide = layer.style.visibility;
      layer.style.visibility = 'hidden';
      for (const fy of [0.15, 0.5, 0.85]) for (const fx of [0.15, 0.5, 0.85]) {
        const x = body.x + body.w * fx, yy = body.y + body.h * fy;
        for (const el of document.elementsFromPoint(x, yy)) {
          if (el === document.body || el === document.documentElement) break;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          const ctl = el.closest('input,textarea,select,button,a,label,[role=button]');
          if (own || ctl || ['IMG', 'VIDEO', 'IFRAME'].includes(el.tagName)) {
            hits.add((ctl || el).tagName.toLowerCase() + ': ' + ((ctl || el).textContent || '').trim().slice(0, 30));
            break;
          }
        }
      }
      layer.style.visibility = hide;
      return { visible: true, hits: [...hits] };
    });
    if (!r.visible) continue;
    seen++;
    if (r.hits.length) {
      overlaps++;
      console.log(`y=${y} OVERLAP: ${r.hits.join(' | ')}`);
      await p.screenshot({ path: path.join(outDir, `overlap-${W}-${y}.png`) });
    }
  }
  console.log(`checked ${W}px: Bo visible at ${seen} scroll positions, overlapping at ${overlaps}`);
  await b.close();
})();
