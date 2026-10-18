import { UPLOAD_COPY } from "@/copy/strings";

const PHOTO_MISSING = UPLOAD_COPY.photoMissing;
const THUMB_W = 400;
const FULL_W = 1600;

/**
 * Responsive photo props: with a small copy (photos uploaded since Oct 2026), the browser picks
 * the 400 px version for small spots like grids and previews, and the full photo only where it
 * shows big. Older photos have no small copy and just use the full one. A photo that can't load
 * shows a plain grey card instead of a broken-image icon.
 */
export function photoProps(url: string | null | undefined, thumb: string | null | undefined, sizes: string) {
  if (!url) return {};
  if (!thumb) return { src: url, onError: onPhotoError };
  return { src: url, srcSet: `${thumb} ${THUMB_W}w, ${url} ${FULL_W}w`, sizes, onError: onPhotoError };
}

/** A soft grey card with a small picture outline, shown where a photo can't load (no words, any language). */
export const BROKEN_PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#EFE8DE"/>' +
      '<g fill="none" stroke="#B9AC9C" stroke-width="8" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="150" y="110" width="100" height="80" rx="10"/><path d="M158 180l30-32 22 22 14-14 18 24"/></g>' +
      '<circle cx="222" cy="134" r="9" fill="#B9AC9C"/></svg>',
  );

/** For a photo <img>: if the file is broken or gone, show the grey card instead of a broken-image icon. */
export function onPhotoError(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget;
  if (img.dataset["broken"]) return;
  img.dataset["broken"] = "1";
  img.removeAttribute("srcset");
  img.alt = PHOTO_MISSING;
  img.src = BROKEN_PHOTO;
}

/** The small copy saved with a photo note, if there is one. */
export function thumbOf(data: Record<string, unknown> | null | undefined): string | null {
  const t = data?.["thumb"];
  return typeof t === "string" ? t : null;
}
