/**
 * Shrinks photos that were uploaded before the app compressed them in the browser.
 *
 * Same settings as src/lib/upload.ts: longest side 1600 px, WebP at 80% quality, turned the
 * right way up, EXIF (camera, time, GPS) dropped. Booth photos also get a 400 px copy for grids.
 *
 *   cd tools/media && npm install                  # sharp, only for this script
 *   DATABASE_URL=... bun compress-existing.ts       # dry run: downloads and measures, changes nothing
 *   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=... bun compress-existing.ts --apply --yes
 *
 * Options: --limit N (only the first N photos), --site <gift id>.
 *
 * What --apply does: uploads the smaller copy as a NEW file, then points the note (or calendar
 * day) at it. The original file is never deleted. Every change is written to
 * tools/op/compress-log-<time>.json (old url, new url), so it can be undone row by row.
 * Photos that wouldn't get smaller, GIFs and anything that isn't an image are skipped.
 * Local dev uploads (/api/dev-uploads/...) are read from and written to .dev-uploads/.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import sharp from "sharp";

const MAX_SIDE = 1600;
const THUMB_SIDE = 400;
const QUALITY = 80;
const THUMB_QUALITY = 72;
/** Smaller than this and already within 1600 px: not worth touching. */
const SKIP_UNDER = 300 * 1024;

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const opt = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const limit = Number(opt("--limit") ?? 0) || Infinity;
const onlySite = opt("--site");

const ROOT = path.resolve(import.meta.dir, "../..");
const DEV_DIR = path.join(ROOT, ".dev-uploads");
const DEV_PREFIX = "/api/dev-uploads/";

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) {
  console.error("Set DATABASE_URL first.");
  process.exit(1);
}
if (apply && !args.includes("--yes")) {
  console.error("This changes real rows. Run a dry run first, then add --yes to go ahead.");
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]|\/\/(localhost|127\.0\.0\.1)[:/]/.test(dbUrl);
if (apply && !local && !process.env["BLOB_READ_WRITE_TOKEN"]) {
  console.error("Set BLOB_READ_WRITE_TOKEN so the smaller copies can be uploaded.");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 2, prepare: false });

type Row = { table: "contributions" | "calendar_entries"; id: string; site_id: string; media_url: string; module: string; data: Record<string, unknown> | null };

async function load(): Promise<Row[]> {
  const site = onlySite ? sql`and site_id = ${onlySite}` : sql``;
  const notes = await sql<Row[]>`
    select 'contributions' as table, id, site_id, media_url, module_type as module, data
    from contributions where media_url is not null and media_url <> '' ${site}
    order by created_at`;
  const days = await sql<Row[]>`
    select 'calendar_entries' as table, id, site_id, media_url, type as module, null::jsonb as data
    from calendar_entries where media_url is not null and media_url <> '' and type = 'photo' ${site}
    order by created_at`;
  return [...notes, ...days];
}

async function fetchBytes(url: string): Promise<{ bytes: Buffer; type: string } | null> {
  if (url.startsWith(DEV_PREFIX)) {
    const name = url.slice(DEV_PREFIX.length);
    if (!/^[\w.-]+$/.test(name)) return null;
    try {
      const bytes = await readFile(path.join(DEV_DIR, name));
      const type = await readFile(path.join(DEV_DIR, `${name}.type`), "utf8").catch(() => "");
      return { bytes, type };
    } catch {
      return null;
    }
  }
  if (!/^https:\/\//.test(url)) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return { bytes: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "" };
}

async function store(row: Row, bytes: Buffer, suffix: string): Promise<string> {
  const name = `${Date.now()}-gifts_${row.site_id}_${row.id.slice(0, 8)}${suffix}.webp`;
  if (local && row.media_url.startsWith(DEV_PREFIX)) {
    await mkdir(DEV_DIR, { recursive: true });
    await writeFile(path.join(DEV_DIR, name), bytes);
    await writeFile(path.join(DEV_DIR, `${name}.type`), "image/webp");
    return `${DEV_PREFIX}${name}`;
  }
  const { put } = await import("@vercel/blob");
  const blob = await put(`gifts/${row.site_id}/${row.id.slice(0, 8)}${suffix}.webp`, bytes, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return blob.url;
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;

const rows = (await load()).slice(0, limit);
console.log(`${apply ? "APPLY" : "Dry run"}: ${rows.length} notes and calendar days with a file`);

let before = 0;
let after = 0;
let changed = 0;
let skipped = 0;
const log: Array<{ table: string; id: string; old: string; new: string; thumb?: string; before: number; after: number }> = [];

for (const row of rows) {
  const got = await fetchBytes(row.media_url).catch(() => null);
  if (!got) {
    skipped++;
    continue;
  }
  const meta = await sharp(got.bytes).metadata().catch(() => null);
  // Voice notes, videos, GIFs and anything sharp can't read stay as they are.
  if (!meta || !meta.width || !meta.height || meta.format === "gif" || (meta.pages ?? 1) > 1) {
    skipped++;
    continue;
  }
  const big = Math.max(meta.width, meta.height) > MAX_SIDE;
  if (!big && got.bytes.length < SKIP_UNDER && !meta.exif) {
    skipped++;
    continue;
  }
  const out = await sharp(got.bytes).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: QUALITY }).toBuffer();
  if (out.length >= got.bytes.length && !meta.exif) {
    skipped++;
    continue;
  }
  const booth = row.table === "contributions" && row.module === "photobooth";
  const thumb =
    booth && !row.data?.["thumb"]
      ? await sharp(got.bytes).rotate().resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: THUMB_QUALITY }).toBuffer()
      : null;
  before += got.bytes.length;
  after += out.length;
  changed++;
  console.log(`${row.table === "contributions" ? "note" : "day "} ${row.id.slice(0, 8)}  ${meta.width}x${meta.height} ${meta.format}  ${mb(got.bytes.length)} -> ${mb(out.length)}${thumb ? `  (+ ${Math.round(thumb.length / 1024)} KB small copy)` : ""}`);
  if (!apply) continue;

  const newUrl = await store(row, out, "");
  const thumbUrl = thumb ? await store(row, thumb, "-thumb") : undefined;
  if (row.table === "contributions") {
    const data = thumbUrl ? { ...(row.data ?? {}), thumb: thumbUrl } : row.data;
    await sql`update contributions set media_url = ${newUrl}, data = ${data ? sql.json(data as never) : null} where id = ${row.id} and media_url = ${row.media_url}`;
  } else {
    await sql`update calendar_entries set media_url = ${newUrl} where id = ${row.id} and media_url = ${row.media_url}`;
  }
  log.push({ table: row.table, id: row.id, old: row.media_url, new: newUrl, ...(thumbUrl ? { thumb: thumbUrl } : {}), before: got.bytes.length, after: out.length });
}

console.log(`\n${changed} photos ${apply ? "made smaller" : "would get smaller"}: ${mb(before)} -> ${mb(after)} (saves ${mb(before - after)}). ${skipped} skipped.`);
if (apply && log.length) {
  const dir = path.join(ROOT, "tools/op");
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `compress-log-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(file, JSON.stringify(log, null, 2));
  console.log(`Undo list: ${file}`);
}
await sql.end();
