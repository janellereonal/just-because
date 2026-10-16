// Renders theme 3D stills into PNGs: node stills.js <outDir> kind:bg:primary:accent ...
// then convert to public/themes3d/<kind>.webp (see docs/NEXT-SESSION.md, "Re-rendering the theme 3D stills").
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
(async () => {
  const [out, ...specs] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  p.on('pageerror', (e) => console.log('err', e.message));
  await p.goto('http://localhost:8080/dev/clay', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  for (const spec of specs) {
    const [kind, background, primary, accent] = spec.split(':');
    const url = await p.evaluate(async ([kind, background, primary, accent]) => {
      const m = await import('/src/lib/theme3d/scene.ts');
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 750;
      canvas.style.cssText = 'width:1200px;height:750px;position:fixed;left:0;top:0';
      document.body.appendChild(canvas);
      const scene = m.createThemeScene(canvas, kind, { background, primary, accent }, { still: true });
      await scene.ready;
      await new Promise((r) => setTimeout(r, 600));
      const data = scene.snapshot();
      scene.dispose();
      canvas.remove();
      return data;
    }, [kind, `#${background}`, `#${primary}`, `#${accent}`]);
    fs.writeFileSync(path.join(out, `${kind}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('saved', kind);
  }
  await Promise.race([b.close(), new Promise((r) => setTimeout(r, 5000))]);
  process.exit(0);
})();
