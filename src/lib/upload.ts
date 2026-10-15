import { upload } from "@vercel/blob/client";

export type UploadKind = "contribution" | "calendar" | "theme" | "intro";

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-80);
}

/**
 * Uploads a file and returns its public URL. In production this goes straight
 * to Vercel Blob; locally (no Blob token) the server saves it to disk.
 */
export async function uploadFile(file: File, kind: UploadKind, targetId: string): Promise<string> {
  const folder = kind === "theme" ? "themes" : "gifts";
  const pathname = `${folder}/${targetId}/${kind === "calendar" ? "calendar-" : kind === "intro" ? "intro-" : ""}${safeName(file.name)}`;
  if (import.meta.env.DEV || import.meta.env["VITE_DEV_UPLOADS"] === "1") {
    const form = new FormData();
    form.set("file", file);
    form.set("kind", kind);
    form.set("targetId", targetId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
    return json.url;
  }
  const blob = await upload(pathname, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: JSON.stringify({ kind, targetId }),
    ...(file.type ? { contentType: file.type } : {}),
  });
  return blob.url;
}
