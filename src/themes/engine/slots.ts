/**
 * Personalisation slots every engine theme can use, each with a sensible
 * fallback when it's empty: recipient name, age, date, place, sender's place,
 * photo, monogram (letters only) and two accent colours.
 *
 * Themes never read raw gift fields; they call `resolveSlots()` and get values
 * that are always safe to draw, plus flags saying which ones were real.
 */
import { t, formatShortDate, ordinal } from "@/i18n";
import { initialsOf } from "@/themes/_shared/iconSets";

export const SLOT_NAMES = ["recipient", "age", "date", "place", "senderPlace", "photo", "monogram", "accent", "accent2"] as const;
export type SlotName = (typeof SLOT_NAMES)[number];

/** A place: a city, a country (ISO 3166 code like "PH"), or both. */
export type Place = { city?: string | null; country?: string | null };

export type SlotInput = {
  recipient?: string | null;
  age?: number | string | null;
  /** YYYY-MM-DD or an ISO moment. */
  date?: string | null;
  place?: Place | null;
  senderPlace?: Place | null;
  photo?: string | null;
  /** Letters to use; made from the name when empty. */
  monogram?: string | null;
  accent?: string | null;
  accent2?: string | null;
};

export type ResolvedSlots = {
  recipient: string;
  /** Short form for tight spots: the first name, or the first word. */
  recipientShort: string;
  age: number | null;
  /** "18th", "30th"... or null. */
  ageOrdinal: string | null;
  date: Date | null;
  /** The date in the visitor's format ("16 Oct"), or "". */
  dateLabel: string;
  place: { city: string; country: string; countryCode: string | null; label: string };
  senderPlace: { city: string; country: string; countryCode: string | null; label: string };
  photo: string | null;
  monogram: string;
  accent: string;
  accent2: string;
  /** Which slots held real values (the rest are fallbacks). */
  given: Record<SlotName, boolean>;
};

const HEX = /^#[0-9a-f]{6}$/i;

/** A country's name in the visitor's language, from its ISO code. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code.toUpperCase()) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function resolvePlace(p: Place | null | undefined, fallback: string) {
  const city = (p?.city ?? "").trim().slice(0, 40);
  const code = (p?.country ?? "").trim().toUpperCase();
  const countryCode = /^[A-Z]{2}$/.test(code) ? code : null;
  const country = countryName(countryCode);
  const label = city && country ? `${city}, ${country}` : city || country || fallback;
  return { city, country, countryCode, label };
}

/** Letters only, at most three, upper case in the visitor's language. */
export function monogramOf(explicit: string | null | undefined, name: string): string {
  const letters = [...(explicit ?? "")].filter((ch) => /\p{L}/u.test(ch)).slice(0, 3).join("");
  if (letters) return letters.toLocaleUpperCase();
  const fromName = initialsOf(name);
  return fromName === "♥" ? "" : fromName;
}

export function resolveSlots(input: SlotInput, defaults: { accent: string; accent2: string }): ResolvedSlots {
  const rawName = (input.recipient ?? "").trim().replace(/\s+/g, " ");
  const recipient = rawName || t("slot.recipient.fallback");
  const recipientShort = rawName ? (rawName.split(/\s+(?:&|and|\+)\s+|\s+/i)[0] ?? rawName).slice(0, 16) : recipient;
  const ageNum = typeof input.age === "number" ? input.age : Number.parseInt(String(input.age ?? ""), 10);
  const age = Number.isFinite(ageNum) && ageNum > 0 && ageNum < 130 ? Math.round(ageNum) : null;
  let date: Date | null = null;
  if (input.date) {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? new Date(`${input.date}T12:00:00`) : new Date(input.date);
    if (!Number.isNaN(d.getTime())) date = d;
  }
  const photo = input.photo && /^(https?:\/\/|\/)/.test(input.photo) ? input.photo : null;
  const accent = input.accent && HEX.test(input.accent) ? input.accent : defaults.accent;
  const accent2 = input.accent2 && HEX.test(input.accent2) ? input.accent2 : defaults.accent2;
  return {
    recipient,
    recipientShort,
    age,
    ageOrdinal: age ? ordinal(age) : null,
    date,
    dateLabel: date ? formatShortDate(date) : "",
    place: resolvePlace(input.place, t("slot.place.fallback")),
    senderPlace: resolvePlace(input.senderPlace, t("slot.senderPlace.fallback")),
    photo,
    monogram: monogramOf(input.monogram, rawName),
    accent,
    accent2,
    given: {
      recipient: !!rawName,
      age: age !== null,
      date: date !== null,
      place: !!(input.place?.city || input.place?.country),
      senderPlace: !!(input.senderPlace?.city || input.senderPlace?.country),
      photo: !!photo,
      monogram: !!monogramOf(input.monogram, rawName),
      accent: accent !== defaults.accent,
      accent2: accent2 !== defaults.accent2,
    },
  };
}

/** Values that stress every slot, for the playground and the worst-case page. */
export const WORST_SLOTS: SlotInput = {
  recipient: "Anne-Marie O'Brien & Zoë 🎉 dela Cruz-Lim",
  age: 103,
  date: "2026-12-31",
  place: { city: "Llanfairpwllgwyngyll", country: "GB" },
  senderPlace: { city: "San Jose del Monte", country: "PH" },
  photo: null,
  monogram: "",
  accent: "#0B0B0B",
  accent2: "#FFFFFF",
};

export const SAMPLE_SLOTS: SlotInput = {
  recipient: "Ana",
  age: 30,
  date: "2026-12-24",
  place: { city: "Lisbon", country: "PT" },
  senderPlace: { city: "Manila", country: "PH" },
  photo: "/demo/picnic.webp",
  monogram: "",
};
