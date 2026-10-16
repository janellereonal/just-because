// Calls a server function from a real page and prints the result or error. node fn.cjs "<js expression returning a promise>"
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ storageState: process.env.STATE || undefined });
  const p = await ctx.newPage();
  const statuses = [];
  p.on('response', (r) => r.url().includes('/_serverFn/') && statuses.push(r.status()));
  await p.goto('http://localhost:8080/privacy', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const out = await p.evaluate(async (expr) => {
    try { return 'OK ' + JSON.stringify(await eval(expr)).slice(0, 300); } catch (e) { return 'ERR ' + (e && e.message); }
  }, process.argv[2]);
  console.log(out, 'status', statuses.join(','));
  await b.close();
})();
