/**
 * Performance budget for engine themes: what a gift page has to download to
 * show a theme's opening, beyond what every page already has (React, motion).
 * Bundles the engine plus each theme's object with Bun, gzips it, adds the
 * theme's listed static assets, and fails if any theme is over budget.
 *
 *   bun tools/perf/theme-budget.ts            # all engine themes
 *   bun tools/perf/theme-budget.ts kraft-parcel
 *
 * Fonts come from Google Fonts and aren't counted (they're cached across sites
 * and load with display=swap). Photos people add aren't counted either.
 */
import { gzipSync } from "bun";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ENGINE_THEMES } from "../../src/themes/engine/registry";

const BUDGET_KB = 400;
const ROOT = path.resolve(import.meta.dir, "../..");
const TMP = path.join(ROOT, "tools/perf/.tmp");
// Already on every gift page, so not part of a theme's cost.
const SHARED = ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "motion", "motion/react", "lucide-react", "@tanstack/react-router", "@tanstack/react-query"];

const only = process.argv[2];
const themes = ENGINE_THEMES.filter((t) => !only || t.id === only);
if (!themes.length) {
  console.error(`No engine theme called ${only}`);
  process.exit(1);
}
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

let failed = false;
const rows: string[] = [];
for (const theme of themes) {
  const objectFile = path.join(ROOT, "src/themes/engine/themes", theme.id, "Object.tsx");
  if (!existsSync(objectFile)) {
    console.error(`${theme.id}: expected ${path.relative(ROOT, objectFile)}`);
    failed = true;
    continue;
  }
  const entry = path.join(TMP, `${theme.id}.entry.tsx`);
  writeFileSync(entry, `export { EngineStage } from "${path.join(ROOT, "src/themes/engine/EngineStage")}";\nexport { default } from "${objectFile}";\n`);
  const out = await Bun.build({
    entrypoints: [entry],
    outdir: path.join(TMP, theme.id),
    minify: true,
    target: "browser",
    splitting: false,
    external: SHARED,
    define: { "import.meta.env.DEV": "false", "process.env.NODE_ENV": '"production"' },
    tsconfig: path.join(ROOT, "tsconfig.json"),
  } as Parameters<typeof Bun.build>[0]);
  if (!out.success) {
    console.error(`${theme.id}: build failed`, out.logs.map((l) => String(l)).join("\n"));
    failed = true;
    continue;
  }
  let js = 0;
  for (const o of out.outputs) js += gzipSync(new Uint8Array(await o.arrayBuffer())).byteLength;
  let assets = 0;
  for (const a of theme.assets ?? []) {
    const f = path.join(ROOT, "public", a.replace(/^\//, ""));
    if (!existsSync(f)) {
      console.error(`${theme.id}: asset ${a} not found in public/`);
      failed = true;
      continue;
    }
    const buf = readFileSync(f);
    // Images are already compressed; text assets get gzipped by the CDN.
    assets += /\.(webp|png|jpe?g|avif|gif|mp3|m4a|ogg|woff2?)$/i.test(f) ? statSync(f).size : gzipSync(buf).byteLength;
  }
  const total = (js + assets) / 1024;
  const ok = total <= BUDGET_KB;
  if (!ok) failed = true;
  rows.push(`${ok ? "ok  " : "OVER"} ${theme.id.padEnd(22)} js ${(js / 1024).toFixed(1).padStart(6)} KB  assets ${(assets / 1024).toFixed(1).padStart(6)} KB  total ${total.toFixed(1).padStart(6)} / ${BUDGET_KB} KB`);
}
rmSync(TMP, { recursive: true, force: true });
console.log(rows.join("\n"));
if (failed) {
  console.error("\nOver budget or broken. See docs/theme-bible.md, check 7.");
  process.exit(1);
}
