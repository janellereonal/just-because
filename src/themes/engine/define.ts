/**
 * The theme definition format. One config file per engine theme
 * (src/themes/engine/themes/<id>/theme.ts) says everything about it: the
 * object, the gesture, materials, effects, sound, which personalisation slots
 * it uses, its palette and fonts, categories and regions, whether it's free or
 * premium, and how it hands off to each gift format.
 *
 * Prices never live here: a premium theme names a price band, and the amounts
 * live in src/config/pricing.ts with every other price.
 */
import type { FontSpec } from "@/themes/_shared/design";
import type { IconSet } from "@/themes/_shared/iconSets";
import type { GiftFormat } from "@/lib/formats";
import { FORMAT_IDS } from "@/lib/formats";
import { hasMessage, type MessageKey } from "@/i18n";
import { GESTURES, type GestureKind, type GestureOptions, type Gesture } from "./gestures";
import { MATERIALS, type MaterialName } from "./materials";
import { PARTICLES, type ParticlePreset } from "./particles";
import { SOUND_PACKS, type SoundPackName } from "./sound";
import { SLOT_NAMES, type ResolvedSlots, type SlotName } from "./slots";

export const CATEGORIES = ["Birthdays", "Holidays", "Love", "Weddings", "Family", "Friends", "Babies", "Milestones", "Just because", "Pets", "Travel"] as const;
export type ThemeCategory = (typeof CATEGORIES)[number];

/** "global", or an ISO 3166 country code like "PH". */
export type Region = "global" | (string & {});

/** Free, or premium in a price band whose amount is set in src/config/pricing.ts. */
export type ThemePrice = { kind: "free" } | { kind: "premium"; band: "artist" | "featured" };

/**
 * What happens when the object has opened and the gift takes over, per format.
 * - reveal: the gift is already underneath and shows through the opening object (the default)
 * - fade: the object fades and the gift fades in (calmer, and the reduced-motion choice)
 * - zoom: the camera moves into the object
 */
export type Handoff = { mode: "reveal" | "fade" | "zoom"; ms?: number };

export type EnginePalette = {
  /** The room behind the object. */
  background: string;
  /** Text on the background. */
  ink: string;
  /** Main material colour of the object. */
  surface: string;
  /** Default accents (personalisation can override). */
  accent: string;
  accent2: string;
};

/** What every engine theme's object gets. */
export type EngineObjectProps = {
  theme: ThemeDefinition;
  slots: ResolvedSlots;
  palette: EnginePalette;
  /** The gesture, already set up from the theme's config. Bind it to the object. */
  gesture: Gesture;
  greeting: string;
  icons: IconSet | null;
  contributors: string[];
  interactive: boolean;
  paused: boolean;
  autoplay: boolean;
  reduced: boolean;
  /** Positioned host for particles (the whole stage). */
  hostRef: React.RefObject<HTMLDivElement | null>;
  setHint: (hint: string) => void;
};

export type EngineObject = (props: EngineObjectProps) => React.ReactNode;

export type ThemeDefinition = {
  /** Lower-case id, also the folder name. */
  id: string;
  /** Display name, and other names by region ("Balikbayan Box" for PH, "Care Package" elsewhere). */
  name: string;
  regionalNames?: Record<string, string>;
  /** The real object the recipient opens. */
  object: string;
  gesture: GestureKind;
  gestureOptions?: Omit<GestureOptions, "onDone">;
  /** The hint under the object, if the gesture's own one doesn't fit ("Pull off the tape"). */
  hint?: MessageKey;
  materials: MaterialName[];
  effects: ParticlePreset[];
  sound: SoundPackName;
  /** Slots the object draws, and the ones it can't do without (none of them should be). */
  slots: SlotName[];
  palette: EnginePalette;
  fonts: { display: FontSpec; text: FontSpec };
  categories: ThemeCategory[];
  /** Where it shows: "global" or country codes. `featured` puts it first for those countries. */
  regions: { available: Region[]; featured?: Region[] };
  price: ThemePrice;
  /** Per-format handoff; formats not listed use `default`. */
  handoff: { default: Handoff } & Partial<Record<GiftFormat, Handoff>>;
  /** The object, loaded only when the theme is shown. */
  load: () => Promise<{ default: EngineObject }>;
  /** Static files the opening needs (for the performance budget). Paths under /public. */
  assets?: string[];
  /** Strings the theme uses, so the translation check knows them. */
  strings?: MessageKey[];
  /** dev: playground only. draft: hidden behind its flag. live: in the gallery. */
  status: "dev" | "draft" | "live";
  /** Feature flag that must be on for a draft theme to show (see the PR notes). */
  flag?: string;
};

/** Identity helper so theme files get type checking and autocomplete. */
export function defineTheme(def: ThemeDefinition): ThemeDefinition {
  return def;
}

export function handoffFor(def: ThemeDefinition, format: GiftFormat): Handoff {
  return def.handoff[format] ?? def.handoff.default;
}

/** The name to show a visitor from `country` (ISO code), using regional names when set. */
export function themeNameFor(def: ThemeDefinition, country: string | null | undefined): string {
  const c = (country ?? "").toUpperCase();
  return (c && def.regionalNames?.[c]) || def.name;
}

/** Is this theme offered to visitors from `country`? */
export function availableIn(def: ThemeDefinition, country: string | null | undefined): boolean {
  return def.regions.available.includes("global") || (!!country && def.regions.available.includes(country.toUpperCase()));
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Every problem with a definition, in plain words. Empty means it's fine. */
export function validateTheme(def: ThemeDefinition): string[] {
  const out: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(def.id)) out.push(`id "${def.id}" should be lower-case letters, numbers and dashes`);
  if (!def.name.trim()) out.push("name is empty");
  if (!def.object.trim()) out.push("say what the object is (Theme Bible check 1)");
  if (!(GESTURES as readonly string[]).includes(def.gesture)) out.push(`unknown gesture "${def.gesture}"`);
  for (const m of def.materials) if (!(MATERIALS as readonly string[]).includes(m)) out.push(`unknown material "${m}"`);
  for (const e of def.effects) if (!(PARTICLES as readonly string[]).includes(e)) out.push(`unknown effect "${e}"`);
  if (!(def.sound in SOUND_PACKS)) out.push(`unknown sound pack "${def.sound}"`);
  for (const s of def.slots) if (!(SLOT_NAMES as readonly string[]).includes(s)) out.push(`unknown slot "${s}"`);
  if (!def.slots.includes("recipient")) out.push("use the recipient slot: every object should be personal (check 3)");
  for (const [k, v] of Object.entries(def.palette)) if (!HEX.test(v)) out.push(`palette.${k} should be #rrggbb`);
  if (!def.categories.length) out.push("pick at least one category");
  if (!def.regions.available.length) out.push("regions.available is empty");
  for (const r of [...def.regions.available, ...(def.regions.featured ?? [])]) {
    if (r !== "global" && !/^[A-Z]{2}$/.test(r)) out.push(`region "${r}" should be "global" or a two-letter country code`);
  }
  for (const f of Object.keys(def.handoff)) if (f !== "default" && !(FORMAT_IDS as readonly string[]).includes(f)) out.push(`handoff for unknown format "${f}"`);
  if (def.hint && !hasMessage(def.hint)) out.push(`hint "${def.hint}" isn't in src/i18n/en.ts`);
  for (const k of def.strings ?? []) if (!hasMessage(k)) out.push(`string "${k}" isn't in src/i18n/en.ts`);
  if (def.status === "draft" && !def.flag) out.push("a draft theme needs a flag");
  return out;
}
