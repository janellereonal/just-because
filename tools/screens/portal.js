const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [path,name]=process.argv.slice(2);
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
  const errs=[]; p.on('pageerror', e => errs.push(e.message.slice(0,200)));
  await p.goto('http://localhost:8080'+path, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(1500);
  const btns = await p.evaluate(()=>[...document.querySelectorAll('.jb-opening button')].map(b=>b.textContent.trim()||b.getAttribute('aria-label')));
  console.log(btns);
  const fs=[];
  await p.evaluate(()=>{const b=[...document.querySelectorAll('.jb-opening button')].filter(b=>!/Skip|Sound|sound/.test(b.textContent+b.getAttribute('aria-label'))).pop(); b&&b.click();});
  await p.waitForFunction(()=>{const o=document.querySelector('.jb-opening'); return !o || (o.style.maskImage && o.style.maskImage!=='none')},null,{timeout:15000, polling: 16});
  for (let i=0;i<8;i++){ const f=`../op/${name}-p${i}.png`; await p.screenshot({path:f}); fs.push(f); await p.waitForTimeout(60); }
  console.log(errs.join('\n')||'no errors'); await b.close();
  require('child_process').execFileSync('python3',['-c',`
import sys
from PIL import Image
ims=[Image.open(f) for f in sys.argv[2:]]
c=Image.new('RGB',(len(ims)*(ims[0].width+6),ims[0].height),'white')
for k,i in enumerate(ims): c.paste(i,(k*(i.width+6),0))
c=c.resize((c.width//2,c.height//2)); c.save(sys.argv[1])`,`../op/${name}-portal.png`,...fs]);
})();
