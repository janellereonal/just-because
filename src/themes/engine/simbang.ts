/**
 * Simbang Gabi: the nine dawn masses before Christmas, 16 to 24 December. As
 * a gift mode (on Parol Christmas), one part of the gift opens each night at
 * the viewer's own local midnight, nine in total, the last on Christmas Eve.
 * With more than nine notes they're grouped per night; with fewer, they're
 * spread out so the last one still opens on Christmas Eve.
 */

export const SIMBANG_NIGHTS = 9;

/**
 * How many nights have opened at `now` (viewer's local time), 0 to 9, for a
 * gift made for Christmas of `year`. Before that year: 0. After it: all 9.
 */
export function simbangNight(now: Date, year: number): number {
  const y = now.getFullYear();
  if (y > year) return SIMBANG_NIGHTS;
  if (y < year) return 0;
  if (now.getMonth() !== 11) return 0; // not December yet
  return Math.max(0, Math.min(SIMBANG_NIGHTS, now.getDate() - 15));
}

/** Which night (1 to 9) the note at `index` of `total` opens on. */
export function nightOfNote(index: number, total: number): number {
  if (total <= 0) return SIMBANG_NIGHTS;
  return Math.min(SIMBANG_NIGHTS, Math.max(1, Math.ceil(((index + 1) * SIMBANG_NIGHTS) / total)));
}

/** The notes that have opened by `night`, in their order. */
export function openedNotes<T>(notes: T[], night: number): T[] {
  return notes.filter((_, i) => nightOfNote(i, notes.length) <= night);
}

/** Notes grouped by night: index 0 is night 1. */
export function notesByNight<T>(notes: T[]): T[][] {
  const out: T[][] = Array.from({ length: SIMBANG_NIGHTS }, () => []);
  notes.forEach((n, i) => out[nightOfNote(i, notes.length) - 1]!.push(n));
  return out;
}

/** The gift's Christmas year: this year, or next year once Christmas has passed and it's not December. */
export function simbangYear(createdAt: string | null | undefined, now = new Date()): number {
  const made = createdAt ? new Date(createdAt) : now;
  const y = Number.isNaN(made.getTime()) ? now.getFullYear() : made.getFullYear();
  // A gift made after Christmas (27 to 31 December) is for next Christmas.
  if (made.getMonth() === 11 && made.getDate() > 26) return y + 1;
  return y;
}
