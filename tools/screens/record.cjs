// Records an engine theme's opening (autoplay) as an MP4 from screenshots. node record.cjs <themeId> <out.mp4> [w] [h] [seconds]
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');
const sp = require('@sparticuz/chromium').default;
const { useLocalFonts } = require('./fonts.cjs');
(async () => {
  const [id, out, W = '390', H = '844', secs = '7'] = process.argv.slice(2);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rec-'));
  const b = await chromium.launch({ executablePath: await sp.executablePath(), args: sp.args });
  const ctx = await b.newContext({ viewport: { width: +W, height: +H } });
  await useLocalFonts(ctx);
  const p = await ctx.newPage();
  await p.goto(`http://localhost:8080/dev/themes?theme=${id}&bare=1&autoplay=1`, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  // Chrome's screencast streams frames as they're painted, far faster than screenshots.
  const cdp = await ctx.newCDPSession(p);
  let i = 0;
  cdp.on('Page.screencastFrame', async (f) => {
    fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    i += 1;
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: +W, maxHeight: +H, everyNthFrame: 1 });
  await p.waitForTimeout(+secs * 1000);
  await cdp.send('Page.stopScreencast').catch(() => {});
  const fps = Math.max(2, Math.round(i / +secs));
  await b.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '28', out]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(out, `${i} frames at ${fps} fps`);
})();
