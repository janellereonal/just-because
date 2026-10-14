/**
 * Which occasion a theme is, so the gift page can dress up for it: the skin
 * (styles/skins.css), the 3D hero object (lib/theme3d) and a few words.
 * Matched on the theme's name and category, like the intro styles.
 */
export type ThemeKind =
  | "valentine"
  | "birthday"
  | "voyage"
  | "christmas"
  | "pets"
  | "newyear"
  | "anniversary"
  | "wedding"
  | "bridal"
  | "default";

export const THEME_KINDS: ThemeKind[] = [
  "valentine",
  "birthday",
  "voyage",
  "christmas",
  "pets",
  "newyear",
  "anniversary",
  "wedding",
  "bridal",
  "default",
];

export function themeKindOf(
  theme: { name?: string | null; category?: string | null } | null | undefined,
): ThemeKind {
  const key = `${theme?.category ?? ""} ${theme?.name ?? ""}`.toLowerCase();
  if (key.includes("valentine") || key.includes("romance")) return "valentine";
  if (key.includes("birthday")) return "birthday";
  if (key.includes("voyage") || key.includes("farewell") || key.includes("despidida"))
    return "voyage";
  if (key.includes("christmas")) return "christmas";
  if (key.includes("pet") || key.includes("companion")) return "pets";
  if (key.includes("new year")) return "newyear";
  if (key.includes("anniversar") || key.includes("milestone")) return "anniversary";
  if (key.includes("bridal") || key.includes("shower")) return "bridal";
  if (key.includes("wedding")) return "wedding";
  return "default";
}

/** Small words that change per occasion. */
export const KIND_WORDS: Record<
  ThemeKind,
  { badge: string; countdown: string; letters: string; from: string }
> = {
  valentine: {
    badge: "Sealed with love",
    countdown: "Until we celebrate",
    letters: "Love notes",
    from: "With love,",
  },
  birthday: {
    badge: "It's your day",
    countdown: "Party starts in",
    letters: "Birthday wishes",
    from: "Cheers,",
  },
  voyage: {
    badge: "Bon voyage",
    countdown: "Departs in",
    letters: "Postcards for the road",
    from: "Safe travels,",
  },
  christmas: {
    badge: "Under the tree",
    countdown: "Sleeps to go",
    letters: "Notes under the tree",
    from: "Merry Christmas,",
  },
  pets: {
    badge: "Best friend ever",
    countdown: "Treat time in",
    letters: "Notes from the pack",
    from: "Belly rubs,",
  },
  newyear: {
    badge: "Here's to the new year",
    countdown: "Countdown",
    letters: "Toasts",
    from: "Cheers to you,",
  },
  anniversary: {
    badge: "Years together",
    countdown: "Until the day",
    letters: "Letters",
    from: "With love,",
  },
  wedding: {
    badge: "Just married",
    countdown: "Until I do",
    letters: "Wishes for the couple",
    from: "Love,",
  },
  bridal: {
    badge: "Showered with love",
    countdown: "Until the shower",
    letters: "Sweet notes",
    from: "Love,",
  },
  default: {
    badge: "A gift for you",
    countdown: "Counting down",
    letters: "Letters",
    from: "Love,",
  },
};
