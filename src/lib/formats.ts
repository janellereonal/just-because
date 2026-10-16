/**
 * Gift formats, called "layouts" everywhere people can see: how they read the gift after the
 * theme's opening. Same notes, photos and songs, a different way to flip through them.
 * Names and copy live in LAYOUT_NAMES (src/copy/strings.ts).
 * The `format` column is plain text, so adding one here needs no migration.
 * Which plans can use which format lives in src/config/pricing.ts.
 */
import { isFlagOn, type FlagName } from "@/config/flags";
import { LAYOUT_NAMES } from "@/copy/strings";
export const FORMAT_IDS = ["scrapbook", "comic", "bento", "hunt", "zine", "storybook", "mixtape", "scratch", "stars", "handwritten"] as const;
export type GiftFormat = (typeof FORMAT_IDS)[number];

export type FormatInfo = {
  id: GiftFormat;
  title: string;
  /** One short line for pickers. */
  copy: string;
  /** Longer line for the editor. */
  about: string;
  /**
   * Plays the theme's opening first. True for every layout: the theme owns the opening and
   * the layout owns the reading, so a layout never adds a second opening of its own.
   */
  usesIntro: boolean;
  isNew?: boolean;
  /** Only offered in pickers while this flag is on (src/config/flags.ts). Saved gifts always render. */
  flag?: FlagName;
};

export const FORMATS: FormatInfo[] = [
  {
    id: "scrapbook",
    ...LAYOUT_NAMES["scrapbook"]!,
    usesIntro: true,
  },
  {
    id: "comic",
    ...LAYOUT_NAMES["comic"]!,
    usesIntro: true,
  },
  {
    id: "bento",
    ...LAYOUT_NAMES["bento"]!,
    usesIntro: true,
  },
  {
    id: "hunt",
    ...LAYOUT_NAMES["hunt"]!,
    usesIntro: true,
  },
  {
    id: "zine",
    ...LAYOUT_NAMES["zine"]!,
    usesIntro: true,
  },
  {
    id: "storybook",
    ...LAYOUT_NAMES["storybook"]!,
    usesIntro: true,
    isNew: true,
  },
  {
    id: "mixtape",
    ...LAYOUT_NAMES["mixtape"]!,
    usesIntro: true,
    isNew: true,
  },
  {
    id: "scratch",
    ...LAYOUT_NAMES["scratch"]!,
    usesIntro: true,
    isNew: true,
  },
  {
    id: "stars",
    ...LAYOUT_NAMES["stars"]!,
    usesIntro: true,
    isNew: true,
  },
  {
    id: "handwritten",
    ...LAYOUT_NAMES["handwritten"]!,
    usesIntro: true,
    isNew: true,
    flag: "handwrittenFormat",
  },
];

/** The formats to offer in pickers right now. */
export function offeredFormats(): FormatInfo[] {
  return FORMATS.filter((f) => !f.flag || isFlagOn(f.flag));
}

export function isGiftFormat(value: unknown): value is GiftFormat {
  return typeof value === "string" && (FORMAT_IDS as readonly string[]).includes(value);
}

export function formatInfo(id: GiftFormat): FormatInfo {
  return FORMATS.find((f) => f.id === id) ?? FORMATS[0]!;
}
