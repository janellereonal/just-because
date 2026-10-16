/**
 * The translation layer for the theme engine and new UI. English only for now:
 * `t("gesture.tear.label")`, with {placeholders} filled from `vars`. Dates,
 * numbers and money always use the visitor's own locale.
 */
import { en, type MessageKey, type Messages } from "./en";

export type { MessageKey } from "./en";

/** Languages we have strings for. Add a file next to en.ts and list it here. */
const CATALOGS: Record<string, Partial<Messages>> = { en };

let lang = "en";

/** Switch language (falls back to English for anything missing). */
export function setLanguage(code: string) {
  lang = CATALOGS[code] ? code : "en";
}

export function language() {
  return lang;
}

/** A string in the current language, with {name} placeholders filled in. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = CATALOGS[lang]?.[key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Is this a known key? Theme configs use it to check their strings. */
export function hasMessage(key: string): key is MessageKey {
  return key in en;
}

/* ---------- the visitor's own formats ---------- */

/** undefined means "the visitor's locale" for every Intl call. */
const LOCALE: string | undefined = undefined;

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(LOCALE, opts).format(n);
  } catch {
    return String(n);
  }
}

/** Money in the visitor's format, e.g. formatMoney(299, "PHP"). */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** A day like "16 Oct" or "Oct 16", depending on where the visitor is. */
export function formatShortDate(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  try {
    return new Intl.DateTimeFormat(LOCALE, opts).format(d);
  } catch {
    return d.toDateString();
  }
}

/** "18th", "21st" in English; other languages get the plain number until they have their own rule. */
export function ordinal(n: number): string {
  if (lang !== "en") return formatNumber(n);
  const rules = new Intl.PluralRules("en", { type: "ordinal" });
  const suffix: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };
  return `${n}${suffix[rules.select(n)] ?? "th"}`;
}
