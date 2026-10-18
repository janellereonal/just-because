// Performs every gesture on /dev/themes?tab=gestures with mouse, then with keyboard, and prints which completed.
// node gestures.cjs [baseUrl]
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const base = process.argv[2] || 'http://localhost:8080';
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1400 } })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 200)));
  await p.goto(base + '/dev/themes?tab=gestures', { waitUntil: 'load' });
  await p.waitForTimeout(6000);
  const pads = await p.$$eval('[data-gesture]', (els) => els.map((e) => e.getAttribute('data-gesture')));
  const done = async (k) => p.$eval(`[data-gesture="${k}"]`, (el) => el.parentElement.querySelector('.ml-auto').textContent);
  const box = async (k) => (await p.$(`[data-gesture="${k}"]`)).boundingBox();
  const drag = async (k, pts, holdMs = 0) => {
    const r = await box(k);
    const at = ([u, v]) => [r.x + u * r.width, r.y + v * r.height];
    await p.mouse.move(...at(pts[0]));
    await p.mouse.down();
    if (holdMs) await p.waitForTimeout(holdMs);
    for (const pt of pts.slice(1)) await p.mouse.move(...at(pt), { steps: 8 });
    await p.mouse.up();
    await p.waitForTimeout(500);
  };
  const results = {};
  for (const k of pads) {
    if (['tear', 'untie'].includes(k)) await drag(k, [[0.1, 0.5], [0.95, 0.5], [1.3, 0.5]]);
    else if (k === 'pull' || k === 'unfold') { await drag(k, [[0.5, 0.05], [0.5, 1.1], [0.5, 1.4]]); if (k === 'unfold') await drag(k, [[0.5, 0.05], [0.5, 1.1], [0.5, 1.4]]); }
    else if (k === 'slide') await drag(k, [[0.5, 0.95], [0.5, -0.1], [0.5, -0.4]]);
    else if (k === 'peel') await drag(k, [[0.05, 0.05], [0.6, 0.6], [1.1, 1.1], [1.3, 1.3]]);
    else if (k === 'spin') { const c = [[0.5, 0.1]]; for (let a = -90; a <= 300; a += 20) c.push([0.5 + 0.4 * Math.cos(a * Math.PI / 180), 0.5 + 0.4 * Math.sin(a * Math.PI / 180)]); await drag(k, c); }
    else if (k === 'scratch' || k === 'wipe') { const z = []; for (let i = 0; i <= 12; i++) z.push([i % 2 ? 0.95 : 0.05, i / 12]); await drag(k, z); }
    else if (k === 'hold') await drag(k, [[0.5, 0.5], [0.5, 0.5]], 1400);
    else { for (let i = 0; i < 6; i++) { const r = await box(k); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(120); } }
    results[k] = { mouse: await done(k) };
  }
  // Keyboard: reset, focus, press.
  for (const k of pads) {
    await p.$eval(`[data-gesture="${k}"]`, (el) => [...el.parentElement.querySelectorAll('button')].find((x) => x.textContent === 'Reset').click());
    await p.waitForTimeout(150);
    await p.focus(`[data-gesture="${k}"]`);
    if (k === 'hold') { await p.keyboard.down('Enter'); await p.waitForTimeout(1400); await p.keyboard.up('Enter'); }
    else for (let i = 0; i < 6; i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(150); }
    await p.waitForTimeout(400);
    results[k].keys = await done(k);
  }
  console.log(JSON.stringify(results, null, 0));
  await b.close();
})();
