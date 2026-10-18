/**
 * Gift formats: different ways to show the same notes, photos and songs.
 * The `format` column is plain text, so adding one here needs no migration.
 * Which plans can use which format lives in src/config/pricing.ts.
 */
import { isFlagOn, type FlagName } from "@/config/flags";
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
   * Plays the gift's opening first. True for every layout: the opening opens the gift and
   * the layout is how it's read, so a layout never adds a second opening of its own.
   */
  usesIntro: boolean;
  isNew?: boolean;
  /** Only offered in pickers while this flag is on (src/config/flags.ts). Saved gifts always render. */
  flag?: FlagName;
};

export const FORMATS: FormatInfo[] = [
  {
    id: "scrapbook",
    title: "Scrapbook",
    copy: "A warm, scrolling collection",
    about: "Every section in one long, cozy page.",
    usesIntro: true,
  },
  {
    id: "comic",
    title: "Comic Issue",
    copy: "A cover and page-turn adventure",
    about: "A comic cover, then chapters they flip through.",
    usesIntro: true,
  },
  {
    id: "bento",
    title: "Bento Board",
    copy: "Everything at a glance, in tiles",
    about: "Notes, photos and songs as a tidy grid of tiles. Tap any tile to open it.",
    usesIntro: true,
  },
  {
    id: "hunt",
    title: "Gift Hunt",
    copy: "Unwrap every note, one by one",
    about: "Each note is a little wrapped box. They unwrap them all to finish the hunt.",
    usesIntro: true,
  },
  {
    id: "zine",
    title: "Zine",
    copy: "Loud, handmade and a bit chaotic",
    about: "A cut-and-paste zine with stickers, scribbles and big type.",
    usesIntro: true,
  },
  {
    id: "storybook",
    title: "Storybook",
    copy: "A little book with real page turns",
    about: "A hardcover book where every note is a chapter. Drag a page by its edge to turn it.",
    usesIntro: true,
    isNew: true,
  },
  {
    id: "mixtape",
    title: "Mixtape",
    copy: "A cassette, every note a track",
    about: "Press play and the reels turn. Spin a reel to scrub, flip the tape for side B.",
    usesIntro: true,
    isNew: true,
  },
  {
    id: "scratch",
    title: "Scratch Cards",
    copy: "Scratch the foil to reveal each note",
    about: "Every note hides under silver foil. They scratch it off with a finger, card by card.",
    usesIntro: true,
    isNew: true,
  },
  {
    id: "stars",
    title: "Constellation",
    copy: "A night sky, every friend a star",
    about: "Tap the stars to read them. Each one connects to the last, until they make a heart.",
    usesIntro: true,
    isNew: true,
  },
  {
    id: "handwritten",
    title: "Handwritten",
    copy: "A notebook of notes and doodles",
    about: "Every friend writes in their own hand, on lined pages and sticky notes, with doodles that draw themselves in.",
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
