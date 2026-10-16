/**
 * Dates and times for a global audience. Moments (a countdown, a time capsule)
 * are stored as UTC instants and shown in the viewer's own time zone. Calendar
 * days (an advent door, a reveal date) unlock at the viewer's local midnight.
 * Formatting always goes through Intl with the viewer's locale.
 */

/** "2026-10-24" → local midnight in the viewer's zone. ISO instants pass through. */
export function momentOf(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number) as [number, number, number];
    return new Date(y, m - 1, d).getTime();
  }
  return Date.parse(value);
}

/** A date-only string as a local Date (never shifted by UTC parsing). */
export function localDate(value: string): Date {
  return new Date(momentOf(value.slice(0, 10)));
}

/** A date's day in the viewer's zone, as YYYY-MM-DD. Never use toISOString() for this: that's the UTC day. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today in the viewer's zone, as YYYY-MM-DD. */
export function localToday(): string {
  return localDateKey(new Date());
}

/** The viewer's IANA zone, e.g. "Europe/Lisbon". */
export function viewerZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** "Sat 24 Oct, 7:00 pm" in the viewer's locale and zone. */
export function formatMoment(
  value: string | number,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  const ms = typeof value === "number" ? value : momentOf(value);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(ms);
}

/** "24 Oct 2026" style, for plain dates. */
export function formatDay(
  value: string | number,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const ms = typeof value === "number" ? value : momentOf(value);
  return new Intl.DateTimeFormat(undefined, opts).format(ms);
}

/** An ISO instant → the value a <input type="datetime-local"> wants, in the viewer's zone. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(momentOf(iso));
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** The gift's countdown target: the exact moment if set, else midnight of its date. */
export function countdownTarget(site: {
  countdown_at?: string | null;
  countdown_date?: string | null;
}): string | null {
  return site.countdown_at ?? site.countdown_date ?? null;
}
