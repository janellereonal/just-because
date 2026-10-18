// Walks the plan picker with a discount code: Wrap it up -> Have a code? -> Apply -> pick a plan.
// node codes.cjs <base> <siteId> <code> <plan-button-regex> <outDir> [w] [h]
// Local only: run the app against tools/payments/fake-paymongo.ts.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');

(async () => {
  const [base, siteId, code, planRe, outDir, W = '1440', H = '900'] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), headless: true, args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, storageState: '../state.json', isMobile: +W < 700, hasTouch: +W < 700 });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  const tag = `${code.toLowerCase()}-${W}`;
  const click = (re, scope = 'button,[role=tab],[role=menuitem],a') =>
    p.evaluate(
      ([src, sel]) => {
        const r = new RegExp(src, 'i');
        const els = [...document.querySelectorAll(sel)].filter((x) => x.offsetParent && r.test((x.getAttribute('aria-label') || x.textContent || '').trim()));
        const el = els[els.length - 1];
        if (el) el.click();
        return !!el;
      },
      [re.source, scope],
    );
  await p.goto(`${base}/sites/${siteId}`, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(6000);
  console.log('wrap tab', await click(/^wrap it up$/));
  await p.waitForTimeout(1500);
  // Tick the "ready" boxes in the wrap panel.
  const ticked = await p.evaluate(() => {
    let n = 0;
    for (const el of document.querySelectorAll('[role=checkbox][aria-checked=false], input[type=checkbox]:not(:checked)')) {
      if (el.offsetParent) {
        el.click();
        n++;
      }
    }
    return n;
  });
  console.log('ticked', ticked);
  await p.waitForTimeout(800);
  console.log('wrap', await click(/^wrap it up$/));
  await p.waitForTimeout(3000);
  await p.screenshot({ path: path.join(outDir, `1-picker-${tag}.png`) });
  console.log('have a code', await click(/^have a code\?$/));
  await p.waitForTimeout(400);
  await p.fill('#plan-code', code);
  await click(/^apply$/);
  await p.waitForTimeout(2500);
  const alert = await p.evaluate(() => document.querySelector('#plan-code-error')?.textContent ?? null);
  if (alert) console.log('code error:', alert);
  await p.screenshot({ path: path.join(outDir, `2-applied-${tag}.png`) });
  if (planRe !== '-') {
    console.log('pick', await click(new RegExp(planRe)));
    await p.waitForTimeout(6000);
    console.log('went to', p.url());
    await p.screenshot({ path: path.join(outDir, `3-after-${tag}.png`) });
  }
  await b.close();
})();
