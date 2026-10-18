/**
 * Runs after `vite build`. Makes sure a missing file under /assets is never cached.
 *
 * Why: Nitro gives every /assets/* response "max-age=31536000, immutable", including
 * 404s. If a browser ever asks for a script that isn't there yet (for example during a
 * deploy), it keeps that 404 for a year and the site stays broken for that person
 * (Oct 18: the homepage hero stayed blank because one cached 404 stopped the page's
 * scripts from starting).
 *
 * Fix, in the Vercel build output (.vercel/output/config.json):
 *  - the year-long cache header moves to the "hit" phase, so only files that exist get it;
 *  - a missing /assets/* file gets a plain 404 with "no-store", before the server is asked
 *    (the server would add the year-long header again from Nitro's route rules).
 *
 * Does nothing when there's no Vercel output (local NITRO_PRESET=node builds).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const FILE = ".vercel/output/config.json";
const IMMUTABLE = "public, max-age=31536000, immutable";

if (!existsSync(FILE)) {
  console.log("[asset-cache] no Vercel output, nothing to do");
  process.exit(0);
}

const config = JSON.parse(readFileSync(FILE, "utf8"));
const routes = Array.isArray(config.routes) ? config.routes : [];
const isAssetHeaderRoute = (r) => r && r.src === "/assets/(.*)" && r.headers && !r.dest && !r.handle;
const fsIndex = routes.findIndex((r) => r && r.handle === "filesystem");

if (fsIndex === -1 || routes.some((r) => r && r.handle === "hit")) {
  console.warn("[asset-cache] unexpected route layout, left as is:", JSON.stringify(routes));
  process.exit(0);
}

// 1. Drop the asset header routes that run for every request (before the filesystem check).
const before = routes.slice(0, fsIndex).filter((r) => !isAssetHeaderRoute(r));
// 2. After the filesystem check (nothing found): a missing asset is a 404 nobody caches.
const missing = { src: "/assets/(.*)", status: 404, headers: { "cache-control": "no-store" } };
const after = routes.slice(fsIndex + 1).filter((r) => !isAssetHeaderRoute(r));
// 3. Files that exist get the year-long cache.
const hit = [{ handle: "hit" }, { src: "/assets/(.*)", headers: { "cache-control": IMMUTABLE }, continue: true, important: true }];

config.routes = [...before, routes[fsIndex], missing, ...after, ...hit];
writeFileSync(FILE, JSON.stringify(config, null, 2));
console.log("[asset-cache] /assets: year-long cache only for files that exist, missing ones are not cached");
