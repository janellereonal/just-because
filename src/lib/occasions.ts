/**
 * Occasions: what the gift is for. An occasion is not a look. It only:
 *  - sorts the styles so the best matches come first (every style still works),
 *  - picks the words on the gift ("Happy birthday, Ana" vs "Happy anniversary, Ana"),
 *  - picks the starting sections and Bo's outfit.
 * The words live in src/i18n/en.ts as full sentences, so other languages can
 * order them their own way. Add an occasion here and its 7 strings there.
 *
 * Gifts store their occasion in `gift_sites.occasion`. Older gifts have none;
 * they keep the words of their theme (KIND_WORDS in src/lib/themeKind.ts).
 */
import { t, type MessageKey } from "@/i18n";
import type { ModuleType } from "@/lib/gift";
import type { ThemeKind } from "@/lib/themeKind";
import type { StyleId } from "@/lib/styles";

export const OCCASION_IDS = [
  "birthday",
  "love",
  "valentines",
  "anniversary",
  "wedding",
  "engagement",
  "bridal-shower",
  "baby",
  "baby-shower",
  "graduation",
  "new-job",
  "send-off",
  "moving",
  "retirement",
  "get-well",
  "sympathy",
  "thank-you",
  "holidays",
  "christmas",
  "new-year",
  "lunar-new-year",
  "eid",
  "diwali",
  "hanukkah",
  "pets",
  "just-because",
] as const;
export type OccasionId = (typeof OCCASION_IDS)[number];

export type OccasionInfo = {
  id: OccasionId;
  /** Shown inside its parent's chip (Holidays opens up into Christmas, Eid...). */
  parent?: OccasionId;
  /** A chip that only opens up into its children (Holidays). Not saved on a gift. */
  groupOnly?: boolean;
  /** Calm occasions: party styles go to the bottom, and no Bo on the gift. */
  quiet?: boolean;
  /** Greetings for a culture or faith. Shown once someone from it has checked the words. */
  culturalReview?: boolean;
  /** Styles to show first, best match first. Every other style follows. */
  styles: StyleId[];
  /** The sections a new gift starts with. */
  sections: ModuleType[];
  /** Bo's outfit on the create page and editor (an accessory set in src/lib/bo3d/accessories.ts). */
  bo: ThemeKind;
};

export const OCCASIONS: OccasionInfo[] = [
  {
    id: "birthday",
    styles: ["cake", "gift-box", "board-game", "arcade", "debut", "scrapbook", "bento", "zine", "scratch"],
    sections: ["letters", "photobooth", "wordcloud", "voice", "countdown", "superlatives"],
    bo: "birthday",
  },
  {
    id: "love",
    styles: ["love-letter", "stars", "storybook", "mixtape", "handwritten", "scratch"],
    sections: ["letters", "openwhen", "photobooth", "songs", "coupons"],
    bo: "valentine",
  },
  {
    id: "valentines",
    parent: "love",
    styles: ["love-letter", "stars", "scratch", "mixtape", "storybook"],
    sections: ["letters", "openwhen", "photobooth", "songs", "coupons"],
    bo: "valentine",
  },
  {
    id: "anniversary",
    styles: ["love-letter", "stars", "storybook", "mixtape", "record-player", "scrapbook"],
    sections: ["letters", "photobooth", "songs", "map", "capsule"],
    bo: "anniversary",
  },
  {
    id: "wedding",
    styles: ["invitation", "countdown", "love-letter", "storybook", "scrapbook"],
    sections: ["letters", "photobooth", "superlatives", "map", "video"],
    bo: "wedding",
  },
  {
    id: "engagement",
    parent: "wedding",
    styles: ["invitation", "love-letter", "stars", "storybook"],
    sections: ["letters", "photobooth", "songs", "map", "coupons"],
    bo: "wedding",
  },
  {
    id: "bridal-shower",
    parent: "wedding",
    styles: ["invitation", "scrapbook", "hunt", "scratch"],
    sections: ["letters", "photobooth", "quiz", "superlatives", "coupons"],
    bo: "bridal",
  },
  {
    id: "baby",
    styles: ["crib-mobile", "scrapbook", "storybook", "hunt"],
    sections: ["letters", "photobooth", "capsule", "voice", "doodle"],
    bo: "baby",
  },
  {
    id: "baby-shower",
    parent: "baby",
    styles: ["crib-mobile", "scrapbook", "hunt", "scratch"],
    sections: ["letters", "photobooth", "capsule", "quiz", "doodle"],
    bo: "baby",
  },
  {
    id: "graduation",
    styles: ["boarding-pass", "arcade", "scrapbook", "comic", "bento", "zine"],
    sections: ["letters", "photobooth", "superlatives", "openwhen", "video"],
    bo: "default",
  },
  {
    id: "new-job",
    styles: ["boarding-pass", "bento", "scrapbook", "comic"],
    sections: ["letters", "openwhen", "coupons", "photobooth", "voice"],
    bo: "default",
  },
  {
    id: "send-off",
    styles: ["boarding-pass", "mixtape", "scrapbook", "comic", "storybook"],
    sections: ["letters", "openwhen", "map", "photobooth", "video"],
    bo: "voyage",
  },
  {
    id: "moving",
    parent: "send-off",
    styles: ["boarding-pass", "care-package", "scrapbook", "mixtape"],
    sections: ["letters", "openwhen", "map", "photobooth", "voice"],
    bo: "voyage",
  },
  {
    id: "retirement",
    parent: "send-off",
    styles: ["record-player", "storybook", "boarding-pass", "scrapbook"],
    sections: ["letters", "photobooth", "superlatives", "map", "video"],
    bo: "voyage",
  },
  {
    id: "get-well",
    quiet: true,
    styles: ["handwritten", "storybook", "stars", "scrapbook"],
    sections: ["letters", "openwhen", "voice", "photobooth", "doodle"],
    bo: "default",
  },
  {
    id: "sympathy",
    quiet: true,
    styles: ["handwritten", "storybook", "stars", "scrapbook"],
    sections: ["letters", "photobooth", "voice"],
    bo: "default",
  },
  {
    id: "thank-you",
    styles: ["handwritten", "gift-box", "scrapbook", "bento"],
    sections: ["letters", "photobooth", "voice", "doodle", "coupons"],
    bo: "default",
  },
  {
    id: "holidays",
    groupOnly: true,
    styles: ["gift-box", "stars", "scrapbook"],
    sections: ["letters", "photobooth", "voice", "wordcloud", "video"],
    bo: "christmas",
  },
  {
    id: "christmas",
    parent: "holidays",
    styles: ["gift-box", "winter-window", "parol", "scrapbook", "hunt"],
    sections: ["letters", "calendar", "tree", "photobooth", "coupons"],
    bo: "christmas",
  },
  {
    id: "new-year",
    parent: "holidays",
    styles: ["countdown", "stars", "zine", "bento"],
    sections: ["letters", "capsule", "superlatives", "video", "photobooth"],
    bo: "newyear",
  },
  {
    id: "lunar-new-year",
    parent: "holidays",
    culturalReview: true,
    styles: ["gift-box", "countdown", "scrapbook"],
    sections: ["letters", "photobooth", "wordcloud", "voice", "video"],
    bo: "default",
  },
  {
    id: "eid",
    parent: "holidays",
    culturalReview: true,
    styles: ["stars", "gift-box", "scrapbook", "storybook"],
    sections: ["letters", "photobooth", "voice", "video", "wordcloud"],
    bo: "default",
  },
  {
    id: "diwali",
    parent: "holidays",
    culturalReview: true,
    styles: ["stars", "gift-box", "scrapbook"],
    sections: ["letters", "photobooth", "voice", "video", "wordcloud"],
    bo: "default",
  },
  {
    id: "hanukkah",
    parent: "holidays",
    culturalReview: true,
    styles: ["stars", "gift-box", "storybook"],
    sections: ["letters", "photobooth", "voice", "video", "wordcloud"],
    bo: "default",
  },
  {
    id: "pets",
    styles: ["fetch", "bento", "scrapbook", "comic"],
    sections: ["photobooth", "letters", "doodle", "superlatives", "video"],
    bo: "pets",
  },
  {
    id: "just-because",
    styles: ["love-letter", "handwritten", "scrapbook", "scratch", "hunt", "care-package"],
    sections: ["letters", "photobooth", "songs", "voice", "wordcloud"],
    bo: "default",
  },
];

export function isOccasionId(value: unknown): value is OccasionId {
  return typeof value === "string" && (OCCASION_IDS as readonly string[]).includes(value);
}

export function occasionInfo(id: OccasionId): OccasionInfo {
  return OCCASIONS.find((o) => o.id === id)!;
}

/** Calm occasions (Sympathy, Get well): no drifting particles, no Bo, party styles last. */
export function isQuietOccasion(id: string | null | undefined): boolean {
  return isOccasionId(id) && !!occasionInfo(id).quiet;
}

/** The top row of chips: everything without a parent. */
export function topOccasions(): OccasionInfo[] {
  return OCCASIONS.filter((o) => !o.parent);
}

/** What a chip opens up into (Holidays → Christmas, New Year...). */
export function childOccasions(id: OccasionId): OccasionInfo[] {
  return OCCASIONS.filter((o) => o.parent === id);
}

/** Occasions a gift can be saved with (not the group-only chips). */
export const SAVEABLE_OCCASION_IDS = OCCASION_IDS.filter((id) => !occasionInfo(id).groupOnly);

/** The small words on a gift, in the same shape as KIND_WORDS. */
export type OccasionWords = {
  badge: string;
  occasion: string;
  countdown: string;
  letters: string;
  from: string;
};

const key = (id: OccasionId, field: string) => `occasion.${id}.${field}` as MessageKey;

export function occasionName(id: OccasionId): string {
  return t(key(id, "name"));
}

export function occasionWords(id: OccasionId): OccasionWords {
  return {
    badge: t(key(id, "badge")),
    occasion: t(key(id, "greeting")),
    countdown: t(key(id, "countdown")),
    letters: t(key(id, "letters")),
    from: t(key(id, "from")),
  };
}

/** "Happy birthday, Ana", or "Happy birthday" while there's no name yet. */
export function occasionGreeting(id: OccasionId, name: string): string {
  const who = name.trim();
  return who ? t(key(id, "greetingFor"), { name: who }) : t(key(id, "greeting"));
}

/**
 * Which occasion an older gift's theme stands for, so it can be filed and filtered.
 * Style themes (Handwritten, Game Night, Pixel) aren't occasions, so they have none.
 * Only used for sorting and metrics: older gifts keep their theme's own words.
 */
export const OCCASION_FOR_KIND: Partial<Record<ThemeKind, OccasionId>> = {
  valentine: "valentines",
  birthday: "birthday",
  voyage: "send-off",
  christmas: "christmas",
  pets: "pets",
  newyear: "new-year",
  anniversary: "anniversary",
  wedding: "wedding",
  bridal: "bridal-shower",
  baby: "baby-shower",
};
