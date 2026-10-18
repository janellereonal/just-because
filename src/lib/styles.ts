/**
 * Styles: the one visual choice for a gift. Each style is a whole experience:
 * its own opening, its own look and a way to read the notes.
 *
 * How it maps onto what's stored (nothing old is rewritten):
 *  - `gift_sites.style`   the style id. Null on gifts made before styles.
 *  - `gift_sites.format`  how the notes are read (scrapbook, storybook...). A style
 *                         always sets it to its `body`, so every layout keeps working.
 *  - `gift_sites.theme_id` the theme row the style borrows its opening, colors, fonts
 *                         and cast from (its "look"). Null for layout styles.
 *
 * Older gifts (style null) show exactly what they showed before: their theme's
 * opening, then their layout. See `resolveStyle` and src/lib/styles.test.ts.
 *
 * Words live in src/i18n/en.ts (`style.<id>.title|copy|about`).
 */
import { t, type MessageKey } from "@/i18n";
import { isFlagOn } from "@/config/flags";
import { formatInfo, type GiftFormat } from "@/lib/formats";
import { themeKindOf, type ThemeKind } from "@/lib/themeKind";
import { occasionInfo, type OccasionId } from "@/lib/occasions";

export const STYLE_IDS = [
  // From the occasion themes: the opening is the star.
  "cake",
  "love-letter",
  "boarding-pass",
  "gift-box",
  "countdown",
  "record-player",
  "invitation",
  "crib-mobile",
  "fetch",
  "board-game",
  "arcade",
  "handwritten",
  // Theme engine styles (drafts until their theme is published in /admin).
  "winter-window",
  "care-package",
  "parol",
  "debut",
  // From the layouts: the way of reading is the star.
  "scrapbook",
  "storybook",
  "comic",
  "bento",
  "hunt",
  "zine",
  "mixtape",
  "scratch",
  "stars",
] as const;
export type StyleId = (typeof STYLE_IDS)[number];

/** A theme row a style can wear. Most styles have one; Invitation has ivory or blush. */
export type StyleLook = {
  id: string;
  /** The theme row's name in scripts/seed.ts (matched by name, like the rest of the app). */
  theme: string;
  /** Occasions this look is picked for automatically (Bridal shower → blush). */
  occasions?: OccasionId[];
};

export type StyleInfo = {
  id: StyleId;
  /**
   * "theme": made from an occasion theme; free on every plan, like themes were.
   * "layout": made from a layout; keeps that layout's plan.
   */
  origin: "theme" | "layout";
  /** Theme rows to borrow the look from. Empty for layout styles. */
  looks: StyleLook[];
  /** How the notes are read once it's open. */
  body: GiftFormat;
  /** Used for new gifts while `body` sits behind a flag that's off. */
  fallbackBody?: GiftFormat;
  /** Party styles sink to the bottom for calm occasions (Sympathy, Get well). */
  mood: "party" | "calm" | "easy";
};

export const STYLES: StyleInfo[] = [
  { id: "cake", origin: "theme", looks: [{ id: "cake", theme: "Happy Birthday" }], body: "scrapbook", mood: "party" },
  { id: "love-letter", origin: "theme", looks: [{ id: "wax", theme: "Valentine's" }], body: "storybook", mood: "calm" },
  { id: "boarding-pass", origin: "theme", looks: [{ id: "pass", theme: "Bon Voyage" }], body: "scrapbook", mood: "easy" },
  { id: "gift-box", origin: "theme", looks: [{ id: "box", theme: "Christmas" }], body: "scrapbook", mood: "party" },
  { id: "countdown", origin: "theme", looks: [{ id: "dial", theme: "New Year" }], body: "stars", mood: "party" },
  { id: "record-player", origin: "theme", looks: [{ id: "vinyl", theme: "Anniversary" }], body: "storybook", mood: "calm" },
  {
    id: "invitation",
    origin: "theme",
    looks: [
      { id: "ivory", theme: "Weddings", occasions: ["wedding", "engagement"] },
      { id: "blush", theme: "Bridal Shower", occasions: ["bridal-shower"] },
    ],
    body: "storybook",
    mood: "calm",
  },
  { id: "crib-mobile", origin: "theme", looks: [{ id: "nursery", theme: "Baby Shower" }], body: "scrapbook", mood: "calm" },
  { id: "fetch", origin: "theme", looks: [{ id: "pet", theme: "Pets" }], body: "bento", mood: "easy" },
  { id: "board-game", origin: "theme", looks: [{ id: "board", theme: "Game Night" }], body: "hunt", mood: "party" },
  { id: "arcade", origin: "theme", looks: [{ id: "console", theme: "Pixel" }], body: "bento", mood: "party" },
  {
    id: "handwritten",
    origin: "theme",
    looks: [{ id: "note", theme: "Handwritten" }],
    body: "handwritten",
    fallbackBody: "zine",
    mood: "calm",
  },
  { id: "winter-window", origin: "theme", looks: [{ id: "cabin", theme: "Winter Cabin Christmas" }], body: "scrapbook", mood: "calm" },
  {
    id: "care-package",
    origin: "theme",
    looks: [
      { id: "parcel", theme: "Care Package" },
      { id: "balikbayan", theme: "Balikbayan Box" },
    ],
    body: "scrapbook",
    mood: "easy",
  },
  { id: "parol", origin: "theme", looks: [{ id: "star", theme: "Parol Christmas" }], body: "scrapbook", mood: "calm" },
  { id: "debut", origin: "theme", looks: [{ id: "curtain", theme: "Debut" }], body: "storybook", mood: "party" },
  { id: "scrapbook", origin: "layout", looks: [], body: "scrapbook", mood: "easy" },
  { id: "storybook", origin: "layout", looks: [], body: "storybook", mood: "calm" },
  { id: "comic", origin: "layout", looks: [], body: "comic", mood: "easy" },
  { id: "bento", origin: "layout", looks: [], body: "bento", mood: "easy" },
  { id: "hunt", origin: "layout", looks: [], body: "hunt", mood: "party" },
  { id: "zine", origin: "layout", looks: [], body: "zine", mood: "party" },
  { id: "mixtape", origin: "layout", looks: [], body: "mixtape", mood: "easy" },
  { id: "scratch", origin: "layout", looks: [], body: "scratch", mood: "party" },
  { id: "stars", origin: "layout", looks: [], body: "stars", mood: "calm" },
];

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === "string" && (STYLE_IDS as readonly string[]).includes(value);
}

export function styleInfo(id: StyleId): StyleInfo {
  return STYLES.find((s) => s.id === id)!;
}

const key = (id: StyleId, field: string) => `style.${id}.${field}` as MessageKey;

export function styleTitle(id: StyleId): string {
  return t(key(id, "title"));
}
export function styleCopy(id: StyleId): string {
  return t(key(id, "copy"));
}
export function styleAbout(id: StyleId): string {
  // With their own bodies on, styles that have one describe it (`style.<id>.aboutOwn`).
  const own = key(id, "aboutOwn");
  if (isFlagOn("styleBodies") && t(own) !== own) return t(own);
  return t(key(id, "about"));
}

/** The layout a new gift in this style is saved with (respects flags, like the notebook). */
export function bodyFor(style: StyleInfo): GiftFormat {
  const flag = formatInfo(style.body).flag;
  if (flag && !isFlagOn(flag) && style.fallbackBody) return style.fallbackBody;
  return style.body;
}

/** Which look a new gift gets: the one made for its occasion, else the first. */
export function lookFor(style: StyleInfo, occasion?: OccasionId | null, lookId?: string | null): StyleLook | null {
  if (!style.looks.length) return null;
  if (lookId) {
    const picked = style.looks.find((l) => l.id === lookId);
    if (picked) return picked;
  }
  if (occasion) {
    const match = style.looks.find((l) => l.occasions?.includes(occasion));
    if (match) return match;
  }
  return style.looks[0]!;
}

/**
 * Styles in the order to show them for an occasion: its best matches first,
 * then the rest in their usual order. Calm occasions push party styles last.
 * With no occasion, the usual order.
 */
export function stylesForOccasion(occasion: OccasionId | null | undefined, list: StyleInfo[] = STYLES): StyleInfo[] {
  if (!occasion) return [...list];
  const info = occasionInfo(occasion);
  const rank = new Map(info.styles.map((id, i) => [id, i]));
  const score = (s: StyleInfo) => {
    const r = rank.get(s.id);
    if (r !== undefined) return r;
    const base = 1000 + list.indexOf(s);
    return info.quiet && s.mood === "party" ? base + 1000 : base;
  };
  return [...list].sort((a, b) => score(a) - score(b));
}

/** Is this style one of the occasion's top picks (the "Top pick" tag)? The first three of its list. */
export function isRecommended(style: StyleId, occasion: OccasionId | null | undefined): boolean {
  return !!occasion && occasionInfo(occasion).styles.slice(0, 3).includes(style);
}

/**
 * Does this style belong under the occasion's chip? Styles made for it do. Plain layouts suit
 * anything, except that calm occasions (Sympathy, Get well) only get the calm ones. Theme styles
 * made for something else (a Christmas gift box under Sympathy, a wedding invitation under
 * Birthday) don't.
 */
export function fitsOccasion(style: StyleInfo, occasion: OccasionId | null | undefined): boolean {
  if (!occasion) return true;
  const info = occasionInfo(occasion);
  if (info.styles.includes(style.id)) return true;
  if (style.origin !== "layout") return false;
  return info.quiet ? style.mood === "calm" : true;
}

/** The styles for an occasion (sorted, best first), and the rest, for "Show other styles". */
export function splitForOccasion(occasion: OccasionId | null | undefined, list: StyleInfo[] = STYLES) {
  const sorted = stylesForOccasion(occasion, list);
  return { fits: sorted.filter((s) => fitsOccasion(s, occasion)), others: sorted.filter((s) => !fitsOccasion(s, occasion)) };
}

type ThemeLike = { name?: string | null; category?: string | null } | null | undefined;
type SiteLike = { style?: string | null; format: GiftFormat; occasion?: string | null };

export type ResolvedStyle = {
  /** The gift's style, or null for a gift made before styles. */
  style: StyleInfo | null;
  /** Which opening plays (the theme it borrows from; "default" for layout styles). */
  introKind: ThemeKind;
  /** How the notes are read. Always the saved layout, so nothing old moves. */
  body: GiftFormat;
};

/**
 * What a gift shows. A gift with a style plays that style's opening and reads in
 * its layout. A gift from before styles plays its theme's opening and reads in its
 * saved layout, exactly as it always has.
 */
export function resolveStyle(site: SiteLike, theme: ThemeLike): ResolvedStyle {
  const style = isStyleId(site.style) ? styleInfo(site.style) : null;
  const introKind = style && style.origin === "layout" ? "default" : themeKindOf(theme);
  return { style, introKind, body: site.format };
}

/**
 * The style that matches an older gift's theme and layout, if any (Happy Birthday
 * read as a scrapbook is the Cake style). Used to show "Current style" in the editor.
 */
export function styleForLegacy(theme: ThemeLike, format: GiftFormat): StyleInfo | null {
  const name = (theme?.name ?? "").trim().toLowerCase();
  if (!name) return STYLES.find((s) => s.origin === "layout" && s.body === format) ?? null;
  return (
    STYLES.find((s) => s.origin === "theme" && s.looks.some((l) => l.theme.toLowerCase() === name) && (s.body === format || s.fallbackBody === format)) ?? null
  );
}
