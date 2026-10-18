import { upload } from "@vercel/blob/client";

export type UploadKind = "contribution" | "calendar" | "theme" | "intro";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-80);
}

/** Limits that match src/server/uploads.ts, so people hear about a problem before the upload starts. */
const MAX_MB: Record<UploadKind, number> = { contribution: 60, calendar: 15, theme: 10, intro: 8 };

/** An upload problem with a message that's fine to show as is. */
export class UploadError extends Error {}

const REENCODE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIDE = 2560;

/**
 * Photos are redrawn on a canvas before they leave the device. That drops the
 * EXIF data (camera, time and GPS location), turns the photo the right way up
 * and keeps big phone photos to a sensible size. GIFs (animation) and HEIC
 * (most browsers can't read it) are sent as they are. If anything goes wrong
 * the original file is used.
 */
export async function preparePhoto(file: File): Promise<File> {
  if (!REENCODE.has(file.type) || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    // PNG keeps its transparency; everything else becomes a JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.88));
    if (!blob || blob.size === 0) return file;
    // A PNG that grew (a photo saved as PNG) is better as a JPEG.
    const out = type === "image/png" && blob.size > file.size * 1.5 ? await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88)) : blob;
    if (!out) return file;
    const ext = out.type === "image/png" ? "png" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([out], `${base}.${ext}`, { type: out.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

/**
 * Uploads a file and returns its public URL. In production this goes straight
 * to Vercel Blob; locally (no Blob token) the server saves it to disk.
 */
export async function uploadFile(original: File, kind: UploadKind, targetId: string): Promise<string> {
  const file = await preparePhoto(original);
  if (file.size > MAX_MB[kind] * 1024 * 1024) {
    throw new UploadError(`That file is over ${MAX_MB[kind]} MB. Try a shorter clip or a smaller photo.`);
  }
  const folder = kind === "theme" ? "themes" : "gifts";
  const pathname = `${folder}/${targetId}/${kind === "calendar" ? "calendar-" : kind === "intro" ? "intro-" : ""}${safeName(file.name)}`;
  if (import.meta.env.DEV || import.meta.env["VITE_DEV_UPLOADS"] === "1") {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("targetId", targetId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new UploadError(friendlyUploadError(json.error));
    return json.url;
  }
  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      clientPayload: JSON.stringify({ kind, targetId }),
      ...(file.type ? { contentType: file.type } : {}),
    });
    return blob.url;
  } catch (error) {
    throw new UploadError(friendlyUploadError(error instanceof Error ? error.message : ""));
  }
}

/** Turns what the upload service says into something a person can act on. */
export function friendlyUploadError(raw: string | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (/too large|maximum|size/.test(m)) return "That file is too big. Try a smaller photo or a shorter clip.";
  if (/type|content.?type|not allowed/.test(m)) return "That kind of file can't go in a gift. Photos (JPG, PNG, HEIC), voice notes and short videos work.";
  if (/couldn't find|not found/.test(m)) return "We couldn't find this gift. The link may be old.";
  if (/network|fetch|failed to fetch|offline/.test(m)) return "The upload didn't go through. Check your connection and try again.";
  return "That file couldn't be uploaded. Please try again.";
}
