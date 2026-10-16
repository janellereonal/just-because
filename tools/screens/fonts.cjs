// Serves Google Fonts requests from local copies in ~/.fonts (the sandbox can't reach Google),
// so screenshots show the real theme fonts. Install a font with
//   npm i @fontsource/<name> && cp node_modules/@fontsource/<name>/files/*-latin-*-normal.woff ~/.fonts/
// Usage: await useLocalFonts(contextOrPage)
const fs = require('fs');
const path = require('path');
const os = require('os');
const DIR = process.env.FONT_DIR || path.join(os.homedir(), '.fonts');

function filesFor(family) {
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  let list = [];
  try { list = fs.readdirSync(DIR); } catch { return []; }
  return list
    .filter((f) => f.startsWith(`${slug}-latin-`) && f.endsWith('.woff') && !f.includes('latin-ext'))
    .map((f) => {
      const m = f.match(/-latin-(\d+)-(normal|italic)\.woff$/);
      return m ? { file: f, weight: m[1], style: m[2] } : null;
    })
    .filter(Boolean);
}

async function useLocalFonts(target) {
  await target.route(/fonts\.googleapis\.com\/css2?/, async (route) => {
    const url = new URL(route.request().url());
    const families = url.searchParams.getAll('family').map((f) => f.split(':')[0].replace(/\+/g, ' '));
    const css = families
      .flatMap((family) =>
        filesFor(family).map(
          (x) => `@font-face{font-family:'${family}';font-style:${x.style};font-weight:${x.weight};font-display:swap;src:url(https://local-fonts.test/${x.file}) format('woff');}`,
        ),
      )
      .join('\n');
    await route.fulfill({ status: 200, contentType: 'text/css', body: css, headers: { 'access-control-allow-origin': '*' } });
  });
  await target.route(/local-fonts\.test\//, async (route) => {
    const file = path.join(DIR, path.basename(new URL(route.request().url()).pathname));
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
    await route.fulfill({ status: 200, contentType: 'font/woff', body: fs.readFileSync(file), headers: { 'access-control-allow-origin': '*' } });
  });
  await target.route(/fonts\.gstatic\.com/, (route) => route.fulfill({ status: 404, body: '' }));
}

module.exports = { useLocalFonts };
