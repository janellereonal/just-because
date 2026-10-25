import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash, createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { requireAdmin, requireSiteOwner } from "./guards";
import { MEDIA_LIMITS } from "@/lib/limits";

export type UploadKind = "contribution" | "calendar" | "theme" | "intro";
export type MediaKind = "photo" | "voice" | "video";

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
const VIDEO = ["video/mp4", "video/quicktime", "video/webm"];
const AUDIO = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav", "audio/webm", "audio/ogg"];

export function uploadPathname(kind: UploadKind, targetId: string, filename: string) {
  const folder = kind === "theme" ? "themes" : "gifts";
  const clean = filename.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-80);
  return `${folder}/${targetId}/${kind === "calendar" ? "calendar-" : kind === "intro" ? "intro-" : ""}${clean}`;
}

function r2Config() {
  const { R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) return null;
  const publicUrl = new URL(R2_PUBLIC_URL);
  if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) throw new Error("R2_PUBLIC_URL must be a clean HTTPS URL");
  return { accountId: R2_ACCOUNT_ID, bucket: R2_BUCKET, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, publicUrl: publicUrl.toString().replace(/\/$/, "") };
}

const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const hmac = (key: string | Buffer, value: string) => createHmac("sha256", key).update(value).digest();
function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}
function r2Path(bucket: string, key = "") {
  return `/${awsEncode(bucket)}${key ? `/${key.split("/").map(awsEncode).join("/")}` : ""}`;
}
function signingKey(secret: string, date: string, region: string, service: string) {
  const dateKey = hmac(`AWS4${secret}`, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

/** Build an authenticated R2 request URL (R2 uses the S3 SigV4 API). */
async function r2Request(method: string, key = "", body?: Buffer, contentType?: string) {
  const config = r2Config();
  if (!config) throw new Error("R2 storage is not configured");
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const pathName = r2Path(config.bucket, key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const scope = `${date}/auto/s3/aws4_request`;
  const payloadHash = body ? sha256(body) : sha256("");
  const headers: Record<string, string> = { host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
  if (contentType) headers["content-type"] = contentType;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name]}\n`).join("");
  const canonicalRequest = [method, pathName, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(config.secretAccessKey, date, "auto", "s3")).update(stringToSign).digest("hex");
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${pathName}`, { method, headers, ...(body ? { body: new Uint8Array(body) } : {}) });
  if (!response.ok) throw new Error(`R2 ${method} failed (${response.status})`);
  return response;
}

function r2MediaUrl(key: string) {
  const config = r2Config();
  if (!config) throw new Error("R2 storage is not configured");
  return `${config.publicUrl}/${key.split("/").map(awsEncode).join("/")}`;
}

function randomKey(kind: UploadKind, targetId: string, filename: string) {
  return `${uploadPathname(kind, targetId, filename).replace(/([^/]+)$/, (_, name: string) => `${randomUUID()}-${name}`)}`;
}

function isR2MediaUrl(value: string) {
  const config = r2Config();
  if (!config) return false;
  try {
    return new URL(value).origin === new URL(config.publicUrl).origin;
  } catch {
    return false;
  }
}

export function getR2PublicUrl() {
  return r2Config()?.publicUrl ?? null;
}

export function isStoredMediaUrl(value: string) {
  return BLOB_HOST.test(value) || isR2MediaUrl(value) || DEV_URL.test(value);
}

/** Receives files through the app so actual byte length and content type are enforced before R2 storage. */
export async function saveR2Upload(request: Request) {
  if (!r2Config()) return Response.json({ error: "R2 storage isn't configured." }, { status: 500 });
  const maxRequestBytes = 50 * 1024 * 1024 + 1024 * 1024;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxRequestBytes) return Response.json({ error: "File too large" }, { status: 413 });
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind")) as UploadKind;
  const targetId = String(form.get("targetId"));
  const rawMedia = String(form.get("media") ?? "");
  const media = rawMedia === "photo" || rawMedia === "voice" || rawMedia === "video" ? rawMedia : null;
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  try {
    if (!["contribution", "calendar", "theme", "intro"].includes(kind) || !/^[0-9a-f-]{36}$/i.test(targetId)) throw new Error("Invalid upload target");
    const rules = await authorizeUpload(kind, targetId, media);
    if (!file.size || file.size > rules.maxBytes) throw new Error("File too large");
    if (!rules.contentTypes.includes(file.type)) throw new Error("File type not allowed");
    const key = randomKey(kind, targetId, file.name);
    await r2Request("PUT", key, Buffer.from(await file.arrayBuffer()), file.type);
    return Response.json({ url: r2MediaUrl(key) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload refused" }, { status: 400 });
  }
}

const MB = 1024 * 1024;

/** Stored files never change (each has a random suffix), so browsers and the CDN can keep them for a year. */
export const UPLOAD_CACHE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Who may upload: friends to any existing gift, creators to their own calendar, admins to themes.
 * Friends' files get the limit of what they say they are (photo, voice note or video), and only
 * those file types are accepted, so a "photo" can't be a 50 MB video.
 */
export async function authorizeUpload(kind: UploadKind, targetId: string, media: MediaKind | null = null) {
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
  if (media === "photo") return { contentTypes: IMAGE, maxBytes: MEDIA_LIMITS.photo.mb * MB };
  if (media === "voice") return { contentTypes: AUDIO, maxBytes: MEDIA_LIMITS.voice.mb * MB };
  // Video messages are the biggest thing a friend sends: up to a minute on a phone. Only videos.
  if (media === "video") return { contentTypes: VIDEO, maxBytes: MEDIA_LIMITS.video.mb * MB };
  // Older pages that don't say what the file is.
  return { contentTypes: [...IMAGE, ...AUDIO, ...VIDEO], maxBytes: MEDIA_LIMITS.video.mb * MB };
}

/* ---- local development only: no Vercel Blob token ---- */

const DEV_DIR = path.join(process.cwd(), ".dev-uploads");

export async function saveDevUpload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind")) as UploadKind;
  const targetId = String(form.get("targetId"));
  const m = String(form.get("media") ?? "");
  const media = m === "photo" || m === "voice" || m === "video" ? m : null;
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  try {
    const rules = await authorizeUpload(kind, targetId, media);
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
 * Deletes stored files we own (Vercel Blob, R2, or local dev uploads). Anything
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
  const r2Urls = ours.filter(isR2MediaUrl);
  if (r2Urls.length && r2Config()) {
    try {
      for (const url of r2Urls) {
        const key = new URL(url).pathname.slice(1).split("/").map(decodeURIComponent).join("/");
        if (key) await r2Request("DELETE", key);
      }
    } catch (error) {
      console.error("[uploads] couldn't delete R2 objects", error);
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
  if (r2Config()) {
    try {
      const config = r2Config()!;
      for (const prefix of [`gifts/${siteId}/`, `themes/${siteId}/`]) {
        let continuationToken: string | undefined;
        do {
          const query = new URLSearchParams({ "list-type": "2", prefix });
          if (continuationToken) query.set("continuation-token", continuationToken);
          // Sign the canonical query as part of this R2 ListObjectsV2 request.
          const host = `${config.accountId}.r2.cloudflarestorage.com`;
          const pathName = r2Path(config.bucket);
          const now = new Date();
          const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
          const date = amzDate.slice(0, 8);
          const scope = `${date}/auto/s3/aws4_request`;
          const payloadHash = sha256("");
          const headers: Record<string, string> = { host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate };
          const signedHeaders = Object.keys(headers).sort().join(";");
          const canonicalHeaders = Object.keys(headers).sort().map((name) => `${name}:${headers[name]}\n`).join("");
          const canonicalQuery = [...query.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`).join("&");
          const canonicalRequest = ["GET", pathName, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join("\n");
          const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
          const signature = createHmac("sha256", signingKey(config.secretAccessKey, date, "auto", "s3")).update(stringToSign).digest("hex");
          headers.authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
          const response = await fetch(`https://${host}${pathName}?${canonicalQuery}`, { headers });
          if (!response.ok) throw new Error(`R2 listing failed (${response.status})`);
          const xml = await response.text();
          const decodeXml = (value: string) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
          const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => decodeXml(m[1]!)).filter(Boolean);
          for (const key of keys) await r2Request("DELETE", key);
          const next = /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/.exec(xml)?.[1];
          continuationToken = next ? decodeXml(next) : undefined;
        } while (continuationToken);
      }
    } catch (error) {
      console.error("[uploads] couldn't delete a gift's R2 objects", error);
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
