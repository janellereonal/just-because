const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 390, height: 760 } })).newPage();
  await p.goto('http://localhost:8080/example/sam', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{ window.__log=[]; const t0=performance.now(); const tick=()=>{const o=document.querySelector('.jb-opening'); if(o) window.__log.push([Math.round(performance.now()-t0), (o.style.maskImage||'').slice(36,50), o.style.opacity, (o.style.maskImage||'').slice(0,30)]); if(performance.now()-t0<7000) requestAnimationFrame(tick)}; tick();
    const bt=[...document.querySelectorAll('.jb-opening button')].find(b=>/Tear/.test(b.textContent)); bt.click(); });
  await p.waitForTimeout(7200);
  const log = await p.evaluate(()=>window.__log);
  console.log(log.filter(r=>r[3]!=='none'||r[2]!=='1').map(r=>r.join(' ')).join('\n'));
  await b.close();
})();
