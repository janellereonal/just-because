/**
 * Wax Seal: an envelope sealed in wax, then a quiet page in coffee tones.
 *
 * What the creator can set, and where it's kept:
 *  - `intro_settings.seal`    the opening: the seal's initial, the "for ana" line, the card's
 *                             line and the event date (cleaned by `normalizeSeal`).
 *  - `format_settings.event`  the day itself: time, place, address, who it's from, the plan
 *                             for the day and what's on the table (cleaned by `normalizeEvent`).
 *
 * Pure and safe on the server and in the browser. Dates are plain days (YYYY-MM-DD) and
 * times are wall-clock times at the place ("14:00"), never converted between zones: the
 * party is at 2 pm where the party is.
 */
import type { OccasionId } from "@/lib/occasions";

/** The six colors every Wax Seal gift wears. */
export const WAX = {
  espresso: "#261a17",
  mocha: "#4a382f",
  taupe: "#74665a",
  greige: "#e7e2dc",
  white: "#f5f2ee",
  black: "#0b0b0b",
  cream: "#efe9e1",
  ink: "#1f1915",
  muted: "#a89e93",
} as const;

export const WAX_FONTS = {
  script: '"Sacramento", "Snell Roundhand", "Segoe Script", cursive',
  serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  mono: '"DM Mono", ui-monospace, "SFMono-Regular", Menlo, monospace',
};

/** Google Fonts query for Sacramento, Instrument Serif and DM Mono Light (loaded by the opening and the body). */
export const WAX_FONT_QUERY =
  "DM+Mono:wght@300;400&family=Instrument+Serif:ital@0;1&family=Sacramento";

/* ---------- the opening ---------- */

export type SealSettings = {
  /** One or two letters on the wax. Empty: the first letter of their name. */
  initial?: string;
  /** The line over the envelope. Empty: "for ana". */
  for_line?: string;
  /** The big line on the card. Empty: one that fits the occasion. */
  card_line?: string;
  /** The event's day, YYYY-MM-DD. Shown on the card, in the header and in the details. */
  date?: string;
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isDay(v: unknown): v is string {
  return typeof v === "string" && DAY.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
}

export function normalizeSeal(value: unknown): SealSettings | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  const out: SealSettings = {};
  const initial = [...str(v["initial"], 8)]
    .filter((ch) => /[\p{L}\p{N}&]/u.test(ch))
    .slice(0, 2)
    .join("");
  if (initial) out.initial = initial;
  const forLine = str(v["for_line"], 40);
  if (forLine) out.for_line = forLine;
  const card = str(v["card_line"], 40);
  if (card) out.card_line = card;
  if (isDay(v["date"])) out.date = v["date"] as string;
  return Object.keys(out).length ? out : undefined;
}

/** The small line above the card's big one, and the big line when the creator left it empty. */
export function cardWords(occasion: string | null | undefined, name: string) {
  const n = name.trim().toLocaleLowerCase();
  switch (occasion as OccasionId | null | undefined) {
    case "bridal-shower":
      return { kicker: "you’re invited to", line: "a little shower" };
    case "wedding":
    case "engagement":
      return { kicker: "you’re invited to", line: "a little celebration" };
    case "baby-shower":
      return { kicker: "you’re invited to", line: "a little shower" };
    case "birthday":
      return { kicker: "a little something for", line: n ? `${n}’s birthday` : "your birthday" };
    case "send-off":
      return { kicker: "before you go,", line: "a little send-off" };
    default:
      return { kicker: "a little something for", line: n || "you" };
  }
}

/** First letter of their name for the wax, lower case like the reference card. */
export function sealInitial(seal: SealSettings | undefined, name: string) {
  const own = seal?.initial?.trim();
  if (own) return own.toLocaleLowerCase();
  const first = [...name.trim()][0];
  return first ? first.toLocaleLowerCase() : "♡";
}

/** "11.17.26" in the viewer's own order of day and month (17.11.26 in most places). */
export function shortDate(day: string | undefined | null): string {
  if (!isDay(day)) return "";
  const d = new Date(`${day}T12:00:00Z`);
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).formatToParts(d);
    const order = parts
      .filter((p) => p.type === "day" || p.type === "month" || p.type === "year")
      .map((p) => p.value);
    return order.join(".");
  } catch {
    return day.slice(2).split("-").join(".");
  }
}

/** "Tuesday, November 17, 2026" in the viewer's language. */
export function longDate(day: string | undefined | null): string {
  if (!isDay(day)) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${day}T12:00:00Z`));
  } catch {
    return day;
  }
}

/** "2:00 PM" (or "14:00") for a wall-clock time at the place. */
export function clockTime(time: string | undefined | null): string {
  if (!time || !TIME.test(time)) return "";
  const [h, m] = time.split(":").map(Number) as [number, number];
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: "UTC",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(Date.UTC(2000, 0, 1, h, m)));
  } catch {
    return time;
  }
}

/* ---------- the day ---------- */

export type PlanStep = { time: string; what: string };
export type Course = { label: string; what: string };

export type EventSettings = {
  /** Start and end, "HH:MM" at the place. */
  time?: string;
  end?: string;
  /** The creator's time zone when they set the time (for "add to calendar"). */
  tz?: string;
  place?: string;
  address?: string;
  /** Who it's from, under the invitation ("love, danielle, lia, gwyn & aye"). */
  sign?: string;
  schedule?: PlanStep[];
  menu?: Course[];
};

export const EVENT_LIMITS = { steps: 12, courses: 8 } as const;

export function normalizeEvent(value: unknown): EventSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: EventSettings = {};
  if (typeof v["time"] === "string" && TIME.test(v["time"])) out.time = v["time"];
  if (typeof v["end"] === "string" && TIME.test(v["end"])) out.end = v["end"];
  const tz = str(v["tz"], 64);
  if (tz && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/.test(tz)) out.tz = tz;
  const place = str(v["place"], 80);
  if (place) out.place = place;
  const address = str(v["address"], 140);
  if (address) out.address = address;
  const sign = str(v["sign"], 120);
  if (sign) out.sign = sign;
  // Lists keep empty rows while the creator is typing; the gift skips them.
  const rows = (raw: unknown, max: number) =>
    (Array.isArray(raw) ? raw.slice(0, max) : []).filter(
      (r) => r && typeof r === "object",
    ) as Record<string, unknown>[];
  const schedule = rows(v["schedule"], EVENT_LIMITS.steps).map((r) => ({
    time: str(r["time"], 20),
    what: str(r["what"], 120),
  }));
  if (schedule.length) out.schedule = schedule;
  const menu = rows(v["menu"], EVENT_LIMITS.courses).map((r) => ({
    label: str(r["label"], 40),
    what: str(r["what"], 140),
  }));
  if (menu.length) out.menu = menu;
  return out;
}

/** The day as the gift shows it: only filled rows, and whether there's anything to show. */
export function eventView(seal: SealSettings | undefined, raw: unknown) {
  const e = normalizeEvent(raw);
  const schedule = (e.schedule ?? []).filter((s) => s.what || s.time);
  const menu = (e.menu ?? []).filter((c) => c.what || c.label);
  const date = seal?.date ?? "";
  return {
    ...e,
    date,
    schedule,
    menu,
    hasDetails: !!(date || e.time || e.place || e.address),
  };
}

/** "the afternoon", "the morning", "the evening": what to call the plan, from when it starts. */
export function partOfDay(time: string | undefined): string {
  if (!time || !TIME.test(time)) return "the day";
  const h = Number(time.slice(0, 2));
  if (h < 12) return "the morning";
  if (h < 17) return "the afternoon";
  return "the evening";
}

const compact = (day: string) => day.replace(/-/g, "");
const compactTime = (t: string) => `${t.replace(":", "")}00`;

/** A Google Calendar link for the day, in the creator's zone when we know it. */
export function calendarLink(title: string, e: ReturnType<typeof eventView>): string | null {
  if (!isDay(e.date)) return null;
  let dates: string;
  if (e.time) {
    const end = e.end ?? addHours(e.time, 3);
    const endDay = end > e.time ? e.date : nextDay(e.date);
    dates = `${compact(e.date)}T${compactTime(e.time)}/${compact(endDay)}T${compactTime(end)}`;
  } else {
    dates = `${compact(e.date)}/${compact(nextDay(e.date))}`;
  }
  const q = new URLSearchParams({ action: "TEMPLATE", text: title, dates });
  if (e.tz) q.set("ctz", e.tz);
  const where = [e.place, e.address].filter(Boolean).join(", ");
  if (where) q.set("location", where);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/** A maps link for the place. */
export function directionsLink(e: {
  place?: string | undefined;
  address?: string | undefined;
}): string | null {
  const where = [e.place, e.address].filter(Boolean).join(" ");
  return where
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}`
    : null;
}

function addHours(time: string, h: number) {
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  return `${String((hh + h) % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function nextDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
