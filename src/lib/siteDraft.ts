/**
 * How the editor saves a gift: only what changed, field by field.
 *
 * The editor keeps three copies of the editable fields, flattened to one level
 * (`custom_text.heading`, `intro_settings.stickers`, `palette_id`...):
 *
 *  - draft: what's on screen now
 *  - sent:  what this tab last saved (so it knows what's still unsaved)
 *  - known: what the server last told this tab (so the server can tell whether
 *           someone else changed a field since)
 *
 * A save sends the changed fields plus the `known` value of each. The server
 * refuses (409) if one of those fields now holds something else, so a second
 * tab or a phone never silently overwrites a change it hasn't seen. Fields
 * nobody else touched merge, key by key for the JSON columns. Words the editor
 * changed by itself (`soft` keys, see checkSave) never cause a 409: if they
 * changed elsewhere, the server keeps its value and saves the rest.
 *
 * Shared by the editor (src/hooks/useGiftSaver.ts) and updateSite in api.ts.
 */
import { normalizeIntroSettings } from "@/lib/intro";
import { normalizeCharacter } from "@/themes/_shared/cast/types";
import { normalizeIconSetting } from "@/themes/_shared/iconSets";

/** Columns the editor saves as a whole. `status` is only sent by Publish/Unpublish. */
export const WHOLE_FIELDS = [
  "title",
  "font_choice",
  "countdown_date",
  "countdown_at",
  "calendar_locked",
  "intro_text",
  "background_style",
  "tree_reveal_date",
  "palette_id",
  "share_notes",
  "solo",
  "format",
  "style",
  "occasion",
  "character",
  "icon_set",
] as const;

/** JSON columns saved key by key, so two places changing different keys both keep theirs. */
export const KEYED_FIELDS = ["custom_text", "custom_colors", "intro_settings", "format_settings"] as const;

export type WholeField = (typeof WHOLE_FIELDS)[number];
export type KeyedField = (typeof KEYED_FIELDS)[number];
export type Flat = Record<string, unknown>;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Empty, null and missing all mean "nothing here". */
export function isBlank(v: unknown) {
  return v === undefined || v === null || v === "";
}

/** JSON with object keys sorted, so the same value always reads the same. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (isObject(v)) {
    return `{${Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/** Same value? Blank equals blank; objects compare by content. */
export function same(a: unknown, b: unknown) {
  if (isBlank(a) || isBlank(b)) return isBlank(a) && isBlank(b);
  return a === b || stable(a) === stable(b);
}

/**
 * The editable fields of a gift (or of a patch) as one flat map. Only fields
 * present on `source` are included, so it works for partial patches too.
 */
export function flatten(source: Record<string, unknown>): Flat {
  const out: Flat = {};
  for (const f of WHOLE_FIELDS) if (f in source && source[f] !== undefined) out[f] = source[f];
  for (const f of KEYED_FIELDS) {
    const obj = source[f];
    if (!isObject(obj)) continue;
    for (const [k, v] of Object.entries(obj)) out[`${f}.${k}`] = v;
  }
  return out;
}

/**
 * A stored gift row (snake_case) cleaned the same way the editor's copy is
 * (normalizeSite in src/lib/gift.ts), so the server compares like with like.
 */
export function canonicalFields(row: Record<string, unknown>): Record<string, unknown> {
  const at = row["countdown_at"];
  return {
    ...row,
    custom_text: isObject(row["custom_text"]) ? row["custom_text"] : {},
    custom_colors: isObject(row["custom_colors"]) ? row["custom_colors"] : {},
    intro_settings: normalizeIntroSettings(row["intro_settings"]),
    format_settings: isObject(row["format_settings"]) ? row["format_settings"] : {},
    character: normalizeCharacter(row["character"]),
    icon_set: normalizeIconSetting(row["icon_set"]),
    countdown_at: at ? new Date(at as string).toISOString() : null,
  };
}

/** Keys whose value differs between two flat maps. */
export function changedKeys(a: Flat, b: Flat): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => !same(a[k], b[k])).sort();
}

/** Turns flat keys back into a patch: `{ title, custom_text: { heading } }`. Blank nested keys are sent as null (remove). */
export function toPatch(keys: string[], flat: Flat): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const dot = key.indexOf(".");
    const v = flat[key];
    if (dot < 0) {
      out[key] = isBlank(v) ? null : v;
      continue;
    }
    const field = key.slice(0, dot);
    const sub = key.slice(dot + 1);
    const obj = (out[field] ??= {}) as Record<string, unknown>;
    obj[sub] = isBlank(v) ? null : v;
  }
  return out;
}

/**
 * Fields a save would overwrite that changed on the server since this tab saw
 * them. A field that already holds the new value isn't a clash (a retry of a
 * save that went through, or two tabs making the same change).
 */
export function findConflicts(current: Flat, base: Flat, patch: Flat, opts: { skip?: readonly string[]; alt?: Flat } = {}): string[] {
  const clashes: string[] = [];
  for (const key of Object.keys(patch)) {
    if (opts.skip?.includes(key) || !(key in base)) continue;
    if (same(current[key], base[key]) || same(current[key], patch[key])) continue;
    // `alt`: a value this same editor still has on its way (a keepalive save can overtake it).
    if (opts.alt && key in opts.alt && same(current[key], opts.alt[key])) continue;
    clashes.push(key);
  }
  return clashes.sort();
}

/**
 * The server's check for one save. `soft` keys are words the editor changed by itself
 * (the heading following a new occasion, the opening reset by a new style), not typed.
 * One of those that changed elsewhere since isn't a clash: it's left out (`skipped`),
 * the server keeps its value, and the rest of the save goes through.
 */
export function checkSave(
  current: Flat,
  base: Flat,
  patch: Flat,
  opts: { skip?: readonly string[]; alt?: Flat; soft?: readonly string[] } = {},
): { clashes: string[]; skipped: string[] } {
  const found = findConflicts(current, base, patch, opts);
  const soft = new Set(opts.soft ?? []);
  return { clashes: found.filter((k) => !soft.has(k)), skipped: found.filter((k) => soft.has(k)) };
}

/** A patch without some flat keys (`custom_text.heading`, `title`...). */
export function withoutKeys<T extends Record<string, unknown>>(patch: T, keys: readonly string[]): T {
  const out: Record<string, unknown> = { ...patch };
  for (const key of keys) {
    const dot = key.indexOf(".");
    if (dot < 0) {
      delete out[key];
      continue;
    }
    const field = key.slice(0, dot);
    if (!isObject(out[field])) continue;
    const obj = { ...(out[field] as Record<string, unknown>) };
    delete obj[key.slice(dot + 1)];
    out[field] = obj;
  }
  return out as T;
}

/**
 * Brings a fresh copy from the server into the editor's three copies.
 *
 * - Fields this tab just saved: the server's copy becomes `known`; the screen keeps
 *   what's typed (so a trailing space the server trims doesn't vanish mid-word).
 * - Fields nobody changed: nothing moves.
 * - Fields changed somewhere else: shown here, unless this tab has its own unsaved
 *   change to them. Then it's a clash: `known` stays old, so the next save is refused
 *   instead of overwriting.
 */
export function rebase(opts: { draft: Flat; sent: Flat; known: Flat; server: Flat; saved?: ReadonlySet<string> }) {
  const draft = { ...opts.draft };
  const sent = { ...opts.sent };
  const known = { ...opts.known };
  const pulled: string[] = [];
  const clashes: string[] = [];
  const keys = new Set([...Object.keys(draft), ...Object.keys(sent), ...Object.keys(known), ...Object.keys(opts.server)]);
  for (const k of keys) {
    const fresh = opts.server[k];
    if (opts.saved?.has(k) || same(fresh, opts.known[k])) {
      setFlat(known, k, fresh);
      continue;
    }
    if (!same(opts.draft[k], opts.sent[k])) {
      clashes.push(k);
      continue;
    }
    setFlat(draft, k, fresh);
    setFlat(sent, k, fresh);
    setFlat(known, k, fresh);
    pulled.push(k);
  }
  return { draft, sent, known, pulled: pulled.sort(), clashes: clashes.sort() };
}

function setFlat(map: Flat, key: string, value: unknown) {
  if (value === undefined) delete map[key];
  else map[key] = value;
}

/** Puts flat editable fields back onto a gift object (keyed fields rebuilt from their keys). */
export function applyFlat<T extends Record<string, unknown>>(target: T, flat: Flat): T {
  const out: Record<string, unknown> = { ...target };
  for (const f of WHOLE_FIELDS) out[f] = f in flat ? flat[f] : null;
  for (const f of KEYED_FIELDS) {
    const obj: Record<string, unknown> = {};
    const prefix = `${f}.`;
    for (const [k, v] of Object.entries(flat)) {
      if (k.startsWith(prefix) && v !== undefined && v !== null) obj[k.slice(prefix.length)] = v;
    }
    out[f] = obj;
  }
  return out as T;
}
