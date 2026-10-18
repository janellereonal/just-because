/**
 * What a note has to look like, shared by the friend page, the editor and the
 * server (src/lib/api.ts checks every note again with `noteProblem`). Pure and
 * safe in the browser and on the server.
 */
import { NOTE_RULES_COPY } from "@/copy/strings";

export type MediaKind = "photo" | "voice" | "video";

/** The kind of file a section takes, or null when it takes none. */
export function mediaKindFor(type: string): MediaKind | null {
  switch (type) {
    case "voice":
      return "voice";
    case "video":
      return "video";
    case "photobooth":
    case "capsule":
    case "map":
    case "doodle":
      return "photo";
    default:
      return null;
  }
}

const EXT: Record<MediaKind, string[]> = {
  photo: ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"],
  voice: ["mp3", "m4a", "aac", "wav", "ogg", "oga", "opus", "weba"],
  video: ["mp4", "mov", "m4v", "webm"],
};

const extOf = (name: string) => /\.([a-z0-9]{2,5})$/i.exec(name.split(/[?#]/)[0] ?? "")?.[1]?.toLowerCase() ?? "";

/** Is this file the kind the section asked for? Goes by its type, or its name when the type is missing. */
export function fileFits(file: { type: string; name: string }, kind: MediaKind): boolean {
  const type = file.type.toLowerCase();
  if (type) {
    if (kind === "photo") return type.startsWith("image/");
    if (kind === "voice") return type.startsWith("audio/") || type === "video/webm";
    return type.startsWith("video/");
  }
  return EXT[kind].includes(extOf(file.name));
}

/**
 * Song links: Spotify, YouTube or Apple Music, over https. Anything else (plain
 * text, `javascript:`, other sites) is refused.
 */
export function isSongLink(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  const ok =
    host === "open.spotify.com" ||
    host === "play.spotify.com" ||
    host === "spotify.link" ||
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "music.apple.com";
  return ok && url.pathname.length > 1;
}

/** Any other link on a note: a real https address. */
export function isWebLink(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** At least one letter or digit, in any language (",,," and "!!!" don't count). */
export const hasWord = (text: string | null | undefined) => /[\p{L}\p{N}]/u.test(text ?? "");

/**
 * A file we stored for this gift: Vercel Blob under gifts/<id>/, or (local
 * development) a .dev-uploads file named after that folder.
 */
export function isGiftMedia(url: string, siteId: string): boolean {
  if (!siteId || url.length > 2000) return false;
  const id = siteId.replace(/[^a-f0-9-]/gi, "");
  if (new RegExp(`^https://[a-z0-9-]+\\.public\\.blob\\.vercel-storage\\.com/gifts/${id}/[^/?#]+$`, "i").test(url)) return true;
  return new RegExp(`^/api/dev-uploads/[\\w.-]*gifts_${id}_[\\w.-]+$`).test(url);
}

/** A stored file whose name says it's clearly the wrong kind (a .png sent as a voice note). */
export function clearlyNot(url: string, kind: MediaKind): boolean {
  const ext = extOf(url);
  if (!ext || EXT[kind].includes(ext)) return false;
  // .webm can be a voice note or a video, .mp4 can hold sound only.
  if (kind === "voice" && (ext === "webm" || ext === "mp4")) return false;
  return (Object.keys(EXT) as MediaKind[]).some((k) => k !== kind && EXT[k].includes(ext));
}

/**
 * Why this note can't be saved, or null when it's fine. `keepMedia` is the file
 * the note already had (an edit that keeps it isn't checked again).
 */
export function noteProblem(
  type: string,
  note: { textContent?: string | null; externalLink?: string | null; mediaUrl?: string | null },
  siteId: string,
  keepMedia: string | null = null,
): string | null {
  const link = note.externalLink?.trim() ?? "";
  if (type === "songs") {
    if (!isSongLink(link)) return NOTE_RULES_COPY.songLink;
  } else if (link && !isWebLink(link)) {
    return NOTE_RULES_COPY.badLink;
  }
  if (type === "wordcloud" && !hasWord(note.textContent)) return NOTE_RULES_COPY.noWord;
  const media = note.mediaUrl ?? null;
  if (media && media !== keepMedia) {
    const kind = mediaKindFor(type);
    if (!kind) return NOTE_RULES_COPY.noFileHere;
    if (!isGiftMedia(media, siteId)) return NOTE_RULES_COPY.notThisGift;
    if (clearlyNot(media, kind)) return NOTE_RULES_COPY.wrongFile(kind);
  }
  return null;
}
