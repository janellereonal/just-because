import { upload } from "@vercel/blob/client";
import { NOTE_RULES_COPY, UPLOAD_COPY } from "@/copy/strings";
import { MEDIA_LIMITS } from "@/lib/limits";
import { fileFits } from "@/lib/noteRules";

export type UploadKind = "contribution" | "calendar" | "theme" | "intro";
/** What's in the file, so the server can give it the right size limit. */
export type MediaKind = "photo" | "voice" | "video";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-80);
}

/** An upload problem with a message that's fine to show as is. */
export class UploadError extends Error {}

/* ---------- Photos: smaller, upright and private before they leave the phone ---------- */

/** Longest side of a stored photo, and of its small copy for grids and previews. */
export const PHOTO_MAX_SIDE = 1600;
export const THUMB_SIDE = 400;
const PHOTO_QUALITY = 0.8;
const THUMB_QUALITY = 0.72;

export function mediaKindOf(file: File): MediaKind {
  if (file.type.startsWith("audio/")) return "voice";
  if (file.type.startsWith("video/")) return "video";
  return "photo";
}

function isHeic(file: File) {
  return /^image\/hei[cf]/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/**
 * Reads a photo into something we can draw, turned the right way up. Safari reads iPhone HEIC
 * photos itself (and iPhones hand the browser a JPEG anyway when you pick from Photos). Other
 * browsers can't, and a HEIC most people can't view shouldn't end up in a gift, so we ask for a
 * JPG instead. (A HEIC decoder needs WebAssembly, which the site's security policy blocks.)
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    if (isHeic(file)) throw new UploadError(UPLOAD_COPY.heic);
    // Not a picture the browser can open (a broken file, or something renamed .jpg).
    throw new UploadError(UPLOAD_COPY.cantOpen);
  }
}

/** Gives up on `work` after `ms`, so a stuck phone never leaves "Preparing photo" up forever. */
function within<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), ms);
    work.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e: unknown) => (clearTimeout(timer), reject(e instanceof Error ? e : new Error(String(e)))),
    );
  });
}

/** Draws the photo at most `side` px on its longest side (never bigger) and saves it as WebP. */
async function encode(bitmap: ImageBitmap, side: number, quality: number, alpha = false): Promise<Blob | null> {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  // Older Safari can't write WebP and quietly hands back a PNG: use a JPEG then. A JPEG would
  // turn see-through parts (cut-out people, stickers) black, so those keep the original.
  if (webp && webp.type === "image/webp" && webp.size > 0) return webp;
  if (alpha) return null;
  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality + 0.05));
}

export type PreparedPhoto = { file: File; thumb: File | null; before: number; after: number; compressed: boolean };

/**
 * Makes a photo ready to store: longest side 1600 px, WebP at 80% quality, the right way up,
 * and redrawn, which drops all EXIF data (camera, time and GPS location). Also makes a 400 px
 * copy for grids. GIFs keep their animation and are sent as they are. If anything else fails
 * or takes over 20 seconds, the original file is used (the 8 MB limit still applies).
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const same: PreparedPhoto = { file, thumb: null, before: file.size, after: file.size, compressed: false };
  if (typeof createImageBitmap === "undefined") return same;
  // A .heic the system didn't even give a type to is one this browser can't open: say so now.
  if (!file.type && isHeic(file)) throw new UploadError(UPLOAD_COPY.heic);
  if (!file.type.startsWith("image/") && !isHeic(file)) return same;
  if (file.type === "image/gif") {
    // GIFs go as they are (to keep the animation), but only if they open.
    const bitmap = await within(decode(file), 10000).catch((error: unknown) => {
      if (error instanceof UploadError) throw error;
      return null;
    });
    bitmap?.close?.();
    return same;
  }
  try {
    return await within(shrink(file, same), 20000);
  } catch (error) {
    if (error instanceof UploadError) throw error;
    return same;
  }
}

async function shrink(file: File, same: PreparedPhoto): Promise<PreparedPhoto> {
  const bitmap = await decode(file);
  const alpha = file.type === "image/png" || file.type === "image/webp";
  const main = await encode(bitmap, PHOTO_MAX_SIDE, PHOTO_QUALITY, alpha);
  const small = await encode(bitmap, THUMB_SIDE, THUMB_QUALITY, alpha);
  bitmap.close?.();
  if (!main || main.size === 0) return same;
  const base = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "photo";
  const thumbOf = (b: Blob | null) => (b ? new File([b], `${base}-thumb.${b.type === "image/webp" ? "webp" : "jpg"}`, { type: b.type, lastModified: Date.now() }) : null);
  // A small PNG that wouldn't get any smaller: keep what they picked. JPEGs and HEICs are
  // always redrawn, since those carry the camera's EXIF data (GPS location included).
  if (alpha && main.size >= file.size) return { ...same, thumb: thumbOf(small) };
  const ext = main.type === "image/webp" ? "webp" : "jpg";
  const out = new File([main], `${base}.${ext}`, { type: main.type, lastModified: Date.now() });
  return { file: out, thumb: thumbOf(small), before: file.size, after: out.size, compressed: true };
}

/* ---------- Voice notes and videos: checked before they upload ---------- */

/** How long a voice note or video is, in seconds, or null if the browser can't tell. */
export async function mediaSeconds(file: File): Promise<number | null> {
  if (typeof document === "undefined") return null;
  const kind = mediaKindOf(file);
  if (kind === "photo") return null;
  const url = URL.createObjectURL(file);
  try {
    const el = document.createElement(kind === "video" ? "video" : "audio");
    el.preload = "metadata";
    el.muted = true;
    el.src = url;
    await new Promise<void>((resolve) => {
      el.onloadedmetadata = () => resolve();
      el.onerror = () => resolve();
      window.setTimeout(resolve, 5000);
    });
    return Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A friendly reason this file is too big or too long, or null if it's fine. */
export async function checkMedia(file: File): Promise<string | null> {
  const kind = mediaKindOf(file);
  const limit = MEDIA_LIMITS[kind];
  if (file.size > limit.mb * 1024 * 1024) return UPLOAD_COPY.tooBig(kind);
  if (kind !== "photo") {
    const secs = await mediaSeconds(file);
    if (secs !== null && secs > limit.seconds + 1) return UPLOAD_COPY.tooLong(kind);
  }
  return null;
}

/* ---------- Uploading ---------- */

export type UploadStage = "preparing" | "uploading";

async function send(file: File, kind: UploadKind, targetId: string, media: MediaKind): Promise<string> {
  const folder = kind === "theme" ? "themes" : "gifts";
  const pathname = `${folder}/${targetId}/${kind === "calendar" ? "calendar-" : kind === "intro" ? "intro-" : ""}${safeName(file.name)}`;
  if (import.meta.env.DEV || import.meta.env["VITE_DEV_UPLOADS"] === "1") {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("targetId", targetId);
    form.set("media", media);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new UploadError(friendlyUploadError(json.error, kind === "contribution" ? media : undefined));
    return json.url;
  }
  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ kind, targetId, media }),
      ...(file.type ? { contentType: file.type } : {}),
    });
    return blob.url;
  } catch (error) {
    throw new UploadError(friendlyUploadError(error instanceof Error ? error.message : "", kind === "contribution" ? media : undefined));
  }
}

/**
 * Uploads a photo, voice note or video and returns its URL, plus a small copy's URL for
 * photos. Photos are compressed first; voice notes and videos are checked against the
 * size and length limits. In production files go straight to Vercel Blob; locally (no Blob
 * token) the server saves them to disk.
 */
export async function uploadMedia(
  original: File,
  kind: UploadKind,
  targetId: string,
  opts: { onStage?: (stage: UploadStage) => void; thumb?: boolean; expect?: MediaKind | null } = {},
): Promise<{ url: string; thumbUrl: string | null }> {
  // The section decides what the file should be: an image picked for a voice note is refused here
  // (and again by the server), not stored as a voice note that can't play.
  if (opts.expect && !fileFits(original, opts.expect)) throw new UploadError(NOTE_RULES_COPY.wrongFile(opts.expect));
  const media = opts.expect ?? mediaKindOf(original);
  let file = original;
  let thumb: File | null = null;
  if (media === "photo") {
    opts.onStage?.("preparing");
    const prepared = await preparePhoto(original);
    file = prepared.file;
    thumb = opts.thumb ? prepared.thumb : null;
  }
  const problem = await checkMedia(file);
  if (problem) throw new UploadError(problem);
  opts.onStage?.("uploading");
  const url = await send(file, kind, targetId, media);
  // The small copy is a nice-to-have: if it fails, the gift just uses the full photo.
  const thumbUrl = thumb ? await send(thumb, kind, targetId, "photo").catch(() => null) : null;
  return { url, thumbUrl };
}

/** Uploads a file and returns its URL (photos are compressed first). */
export async function uploadFile(original: File, kind: UploadKind, targetId: string, opts: { onStage?: (stage: UploadStage) => void } = {}): Promise<string> {
  return (await uploadMedia(original, kind, targetId, opts)).url;
}

/** Turns what the upload service says into something a person can act on. */
export function friendlyUploadError(raw: string | undefined, expected?: MediaKind): string {
  const m = (raw ?? "").toLowerCase();
  if (/too large|maximum|size/.test(m)) return "That file is too big. Try a smaller photo or a shorter clip.";
  if (expected && /type|not allowed/.test(m)) return NOTE_RULES_COPY.wrongFile(expected);
  if (/type|content.?type|not allowed/.test(m)) return "That kind of file can't go in a gift. Photos (JPG or PNG), voice notes and short videos work.";
  if (/couldn't find|not found/.test(m)) return "We couldn't find this gift. The link may be old.";
  if (/network|fetch|failed to fetch|offline/.test(m)) return "The upload didn't go through. Check your connection and try again.";
  return "That file couldn't be uploaded. Please try again.";
}
