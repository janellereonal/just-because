// node scrolls.js <path> <name> [width] [height] — skip intro, scroll the page, contact sheet of viewports
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { execFileSync } = require('child_process');
(async () => {
  const [path, name, w = '390', h = '844'] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: +w < 700, isMobile: +w < 700 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await p.addInitScript(() => { try { sessionStorage.setItem('jb-intro-seen', '1'); } catch {} });
  await p.goto('http://localhost:8080' + path, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(1200);
  await p.locator('text=Skip intro').first().click({ force: true, timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const files = [];
  let y = 0, i = 0;
  while (y < total && i < 16) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    for (let k = 0; k < 3; k++) { await p.mouse.wheel(0, 1); await p.waitForTimeout(350); }
    await p.waitForTimeout(900);
    const f = `../op/${name}-${i}.png`;
    await p.screenshot({ path: f });
    files.push(f); y += +h - 60; i++;
  }
  console.log(name, 'height', total, errs.join(' | ') || 'no errors');
  await b.close();
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f) for f in fs]
cols=min(len(ims),6); rows=(len(ims)+cols-1)//cols
W=ims[0].width; H=ims[0].height
c=Image.new('RGB',(cols*(W+8),rows*(H+8)),'white')
for k,im in enumerate(ims): c.paste(im,((k%cols)*(W+8),(k//cols)*(H+8)))
s=min(1,2400/c.width); c=c.resize((int(c.width*s),int(c.height*s))); c.save(sys.argv[1])`, `../op/${name}-sheet.png`, ...files]);
})();
