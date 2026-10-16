import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAdmin, requireSiteOwner } from "./guards";

export type UploadKind = "contribution" | "calendar" | "theme" | "intro";

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const AUDIO = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/webm", "audio/ogg"];

export function uploadPathname(kind: UploadKind, targetId: string, filename: string) {
  const folder = kind === "theme" ? "themes" : "gifts";
  const clean = filename.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-80);
  return `${folder}/${targetId}/${kind === "calendar" ? "calendar-" : kind === "intro" ? "intro-" : ""}${clean}`;
}

/** Who may upload: friends to any existing gift, creators to their own calendar, admins to themes. */
export async function authorizeUpload(kind: UploadKind, targetId: string) {
  if (kind === "theme") {
    await requireAdmin();
    return { contentTypes: IMAGE, maxBytes: 10 * 1024 * 1024 };
  }
  if (kind === "intro") {
    // Stickers, the opening's object and its background: images only, no SVG.
    await requireSiteOwner(targetId);
    return { contentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxBytes: 8 * 1024 * 1024 };
  }
  if (kind === "calendar") {
    await requireSiteOwner(targetId);
    return { contentTypes: IMAGE, maxBytes: 15 * 1024 * 1024 };
  }
  const [site] = await getDb()
    .select({ id: schema.giftSites.id })
    .from(schema.giftSites)
    .where(eq(schema.giftSites.id, targetId));
  if (!site) throw new Error("We couldn't find that gift.");
  // Video messages are the biggest thing a friend sends: about a minute on a phone.
  return { contentTypes: [...IMAGE, ...AUDIO, ...VIDEO], maxBytes: 60 * 1024 * 1024 };
}

/* ---- local development only: no Vercel Blob token ---- */

const DEV_DIR = path.join(process.cwd(), ".dev-uploads");

export async function saveDevUpload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind")) as UploadKind;
  const targetId = String(form.get("targetId"));
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  try {
    const rules = await authorizeUpload(kind, targetId);
    if (file.size > rules.maxBytes) throw new Error("File too large");
    if (!rules.contentTypes.includes(file.type)) throw new Error("File type not allowed");
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
  const name = `${Date.now()}-${uploadPathname(kind, targetId, file.name).replace(/\//g, "_")}`;
  await mkdir(DEV_DIR, { recursive: true });
  await writeFile(path.join(DEV_DIR, name), Buffer.from(await file.arrayBuffer()));
  await writeFile(path.join(DEV_DIR, `${name}.type`), file.type);
  return Response.json({ url: `/api/dev-uploads/${name}` });
}

export async function readDevUpload(name: string) {
  if (!/^[\w.-]+$/.test(name)) return null;
  try {
    const body = await readFile(path.join(DEV_DIR, name));
    const type = await readFile(path.join(DEV_DIR, `${name}.type`), "utf8");
    return { body, type };
  } catch {
    return null;
  }
}

/* ---- removing stored files ---- */

const BLOB_HOST = /^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//;
const DEV_URL = /^\/api\/dev-uploads\/([\w.-]+)$/;

/**
 * Deletes stored files we own (Vercel Blob, or local dev uploads). Anything
 * else (a Spotify link, a demo image) is left alone. Never throws: a file that
 * can't be removed must not stop the delete that asked for it.
 */
export async function deleteMedia(urls: (string | null | undefined)[]) {
  const ours = urls.filter((u): u is string => !!u);
  const blobs = ours.filter((u) => BLOB_HOST.test(u));
  if (blobs.length && process.env["BLOB_READ_WRITE_TOKEN"]) {
    try {
      const { del } = await import("@vercel/blob");
      for (let i = 0; i < blobs.length; i += 100) await del(blobs.slice(i, i + 100));
    } catch (error) {
      console.error("[uploads] couldn't delete blobs", error);
    }
  }
  for (const u of ours) {
    const m = DEV_URL.exec(u);
    if (!m) continue;
    const { rm } = await import("node:fs/promises");
    await rm(path.join(DEV_DIR, m[1]!), { force: true }).catch(() => {});
    await rm(path.join(DEV_DIR, `${m[1]}.type`), { force: true }).catch(() => {});
  }
}

/** Deletes every file stored for a gift: friends' photos and voice notes, calendar photos, opening pictures. */
export async function deleteGiftMedia(siteId: string) {
  if (process.env["BLOB_READ_WRITE_TOKEN"]) {
    try {
      const { del, list } = await import("@vercel/blob");
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: `gifts/${siteId}/`, limit: 1000, ...(cursor ? { cursor } : {}) });
        if (page.blobs.length) await del(page.blobs.map((b) => b.url));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
    } catch (error) {
      console.error("[uploads] couldn't delete a gift's blobs", error);
    }
  }
  // Local dev: files are named after their path, gifts_<siteId>_...
  try {
    const { readdir, rm } = await import("node:fs/promises");
    for (const f of await readdir(DEV_DIR)) if (f.includes(`gifts_${siteId}_`)) await rm(path.join(DEV_DIR, f), { force: true });
  } catch {
    /* no dev uploads folder */
  }
}
