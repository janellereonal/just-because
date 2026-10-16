// Screenshots an engine theme's opening: at rest, after the gesture, and with a note open.
// node engine-shots.cjs <themeId> <outDir> [w] [h] [extraQuery]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { useLocalFonts } = require('./fonts.cjs');
const sp = require('@sparticuz/chromium').default;
const [id, out, W = '390', H = '844', extra = ''] = process.argv.slice(2);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: +W < 700, recordVideo: process.env.VIDEO ? { dir: out, size: { width: +W, height: +H } } : undefined });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto(`http://localhost:8080/dev/themes?theme=${id}&bare=1${extra}`, { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  const tag = `${id}-${W}x${H}${extra.replace(/[^a-z0-9]+/gi, '-')}`;
  await p.screenshot({ path: path.join(out, `${tag}-1-rest.png`) });
  // Do the gesture with the keyboard on the object (works for every gesture), like a person would with Tab.
  const target = await p.$('[data-testid=stage] [role=button][tabindex="0"]');
  if (target) {
    await target.focus();
    if ((await target.getAttribute('aria-label') || '').startsWith('Press and hold')) { await p.keyboard.down('Enter'); await p.waitForTimeout(1600); await p.keyboard.up('Enter'); }
    else for (let i = 0; i < 4; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(260); }
  }
  await p.waitForTimeout(1200);
  await p.screenshot({ path: path.join(out, `${tag}-2-mid.png`) });
  // Close any note the keyboard opened, then use the plain button if the gesture isn't finished.
  await p.keyboard.press('Escape');
  const plain = await p.$('[data-testid=stage] button:text-is("Open it"), [data-testid=stage] button:text-is("Light it all up"), [data-testid=stage] button:text-is("Light all 18")');
  if (plain) await plain.click().catch(() => {});
  await p.waitForTimeout(2200);
  await p.screenshot({ path: path.join(out, `${tag}-3-done.png`) });
  // Open the first note inside, if the theme has them.
  const note = await p.$('[data-testid=stage] button[aria-label^="Note from"]:not([disabled])');
  if (note) { await note.click(); await p.waitForTimeout(900); await p.screenshot({ path: path.join(out, `${tag}-4-note.png`) }); }
  await ctx.close();
  await b.close();
})();
