/**
 * The newer sections friends can fill: open-when letters, a time capsule,
 * superlatives, a quiz, a memory map, a coupon book, video messages and a
 * doodle guestbook. Each keeps its extra fields in `contributions.data`
 * (jsonb). This file is shared by the browser and the server: it defines the
 * shape of that data and cleans it, so nothing unexpected is ever stored.
 * Copy lives in src/copy/strings.ts.
 */

export const NEW_SECTION_TYPES = [
  "openwhen",
  "capsule",
  "superlatives",
  "quiz",
  "map",
  "coupons",
  "video",
  "doodle",
] as const;
export type NewSectionType = (typeof NEW_SECTION_TYPES)[number];

export type OpenWhenData = { when: string };
export type CapsuleData = { unlock_at: string; locked?: boolean };
export type SuperlativeData = { award: string };
export type QuizData = { question: string; answer: string; wrong: string[] };
export type MapData = { place: string };
export type CouponData = { title: string; fine_print?: string };
export type SectionData =
  | OpenWhenData
  | CapsuleData
  | SuperlativeData
  | QuizData
  | MapData
  | CouponData
  | Record<string, never>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Open-when prompts friends can pick from (or write their own). */
export const OPEN_WHEN_PROMPTS = [
  "you can't sleep",
  "you miss home",
  "you need a laugh",
  "you did something brave",
  "it's your birthday",
  "you're having a bad day",
];

export const SUPERLATIVE_PROMPTS = [
  "Most likely to make everyone cry at a toast",
  "Best at remembering birthdays",
  "Most likely to adopt every dog",
  "Kindest in a crisis",
  "Best playlist",
  "Most likely to be late, and worth the wait",
];

/** Clean what a friend sent for a section. Returns null when it isn't valid. */
export function normalizeSectionData(type: string, raw: unknown): SectionData | null {
  const v = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<
    string,
    unknown
  >;
  switch (type) {
    case "openwhen": {
      const when = str(v["when"], 80).replace(/^open when\s*/i, "");
      return when ? { when } : null;
    }
    case "capsule": {
      const at = typeof v["unlock_at"] === "string" ? Date.parse(v["unlock_at"]) : NaN;
      if (Number.isNaN(at)) return null;
      // Between an hour and 25 years from now.
      const now = Date.now();
      if (at < now + 3600_000 || at > now + 25 * 365 * 86400_000) return null;
      return { unlock_at: new Date(at).toISOString() };
    }
    case "superlatives": {
      const award = str(v["award"], 90);
      return award ? { award } : null;
    }
    case "quiz": {
      const question = str(v["question"], 140);
      const answer = str(v["answer"], 80);
      const wrong = (Array.isArray(v["wrong"]) ? v["wrong"] : [])
        .map((w) => str(w, 80))
        .filter((w) => w && w.toLowerCase() !== answer.toLowerCase())
        .slice(0, 3);
      return question && answer && wrong.length ? { question, answer, wrong } : null;
    }
    case "map": {
      const place = str(v["place"], 80);
      return place ? { place } : null;
    }
    case "coupons": {
      const title = str(v["title"], 60);
      const fine = str(v["fine_print"], 140);
      return title ? { title, ...(fine ? { fine_print: fine } : {}) } : null;
    }
    case "video":
    case "doodle":
      return {};
    default:
      return null;
  }
}

/** What each section needs besides `data`: text, a file, or either. */
export const SECTION_NEEDS: Record<
  NewSectionType,
  {
    text: "required" | "optional" | "none";
    media: "required" | "optional" | "none";
    accept?: string;
  }
> = {
  openwhen: { text: "required", media: "none" },
  capsule: { text: "required", media: "optional", accept: "image/*" },
  superlatives: { text: "optional", media: "none" },
  quiz: { text: "none", media: "none" },
  map: { text: "required", media: "optional", accept: "image/*" },
  coupons: { text: "none", media: "none" },
  video: { text: "optional", media: "required", accept: "video/mp4,video/quicktime,video/webm" },
  doodle: { text: "optional", media: "required", accept: "image/png" },
};

export const isNewSection = (t: string): t is NewSectionType =>
  (NEW_SECTION_TYPES as readonly string[]).includes(t);

/** A time capsule row that hasn't opened yet. */
export function capsuleLocked(data: unknown, now = Date.now()) {
  const at =
    data && typeof data === "object"
      ? Date.parse(String((data as Record<string, unknown>)["unlock_at"]))
      : NaN;
  return !Number.isNaN(at) && at > now;
}

/** Group superlatives that say the same thing, most votes first. */
export function tallySuperlatives<
  T extends { data?: unknown; author_name: string; text_content?: string | null },
>(rows: T[]) {
  const groups = new Map<
    string,
    { award: string; voters: string[]; reasons: { who: string; text: string }[] }
  >();
  for (const r of rows) {
    const award = String((r.data as SuperlativeData | undefined)?.award ?? "").trim();
    if (!award) continue;
    const key = award
      .toLowerCase()
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .replace(/\s+/g, " ");
    const g = groups.get(key) ?? { award, voters: [], reasons: [] };
    g.voters.push(r.author_name);
    if (r.text_content?.trim()) g.reasons.push({ who: r.author_name, text: r.text_content.trim() });
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.voters.length - a.voters.length);
}

/** Stable pseudo-random 0..1 from a string (pins on the memory map, tilts). */
export function hash01(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * A newer section as plain text, for formats that show everything as tiles
 * (Bento, Zine, Gift Hunt…). Video and quiz are shown in their own block
 * instead, so they return null here.
 */
export function sectionAsText(
  type: string,
  data: unknown,
  text: string | null,
  formatDay: (iso: string) => string,
): string | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const body = text?.trim() ?? "";
  switch (type) {
    case "openwhen":
      return `Open when ${String(d["when"] ?? "")}\n\n${body}`.trim();
    case "capsule":
      return d["locked"]
        ? `Sealed until ${formatDay(String(d["unlock_at"]))}`
        : `From the time capsule\n\n${body}`.trim();
    case "superlatives":
      return `${String(d["award"] ?? "")}${body ? `\n\n${body}` : ""}`;
    case "map":
      return `${String(d["place"] ?? "")}\n\n${body}`.trim();
    case "coupons":
      return `Coupon: ${String(d["title"] ?? "")}${d["fine_print"] ? `\n${String(d["fine_print"])}` : ""}`;
    case "doodle":
      return body || null;
    default:
      return null;
  }
}
