/**
 * Responsive photo props: with a small copy (photos uploaded since Oct 2026), the browser picks
 * the 400 px version for small spots like grids and previews, and the full photo only where it
 * shows big. Older photos have no small copy and just use the full one.
 */
const THUMB_W = 400;
const FULL_W = 1600;

export function photoProps(url: string | null | undefined, thumb: string | null | undefined, sizes: string) {
  if (!url) return {};
  if (!thumb) return { src: url };
  return { src: url, srcSet: `${thumb} ${THUMB_W}w, ${url} ${FULL_W}w`, sizes };
}

/** The small copy saved with a photo note, if there is one. */
export function thumbOf(data: Record<string, unknown> | null | undefined): string | null {
  const t = data?.["thumb"];
  return typeof t === "string" ? t : null;
}
