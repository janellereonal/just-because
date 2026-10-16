/**
 * Theme owns the opening, layout owns the reading. Each theme recommends the layout that
 * reads best after its opening, with a short reason. New gifts start on it; the editor
 * marks it "Recommended for this theme". Theme names are the ones in scripts/seed.ts.
 */
import { isFlagOn } from "@/config/flags";
import type { GiftFormat } from "@/lib/formats";

type Pick = { layout: GiftFormat; why: string };

const BY_THEME: Record<string, Pick> = {
  "happy birthday": { layout: "scrapbook", why: "One long, cozy page, like a birthday card everyone signed." },
  "valentine's": { layout: "storybook", why: "A little book of love notes, one page at a time." },
  "bon voyage": { layout: "scrapbook", why: "A travel scrapbook of everyone's send-off notes." },
  christmas: { layout: "scrapbook", why: "Everything under one tree, in one scroll." },
  "winter cabin christmas": { layout: "scrapbook", why: "A warm scroll by the fire." },
  "parol christmas": { layout: "scrapbook", why: "Each night's note in one long page." },
  pets: { layout: "bento", why: "Quick tiles, as short as a good belly rub." },
  "new year": { layout: "stars", why: "A night sky, every friend a firework." },
  anniversary: { layout: "storybook", why: "Your story together, chapter by chapter." },
  weddings: { layout: "storybook", why: "A keepsake book from everyone at the wedding." },
  "bridal shower": { layout: "scrapbook", why: "A scrapbook of advice, memories and toasts." },
  "baby shower": { layout: "scrapbook", why: "A soft scroll of wishes for the baby." },
  handwritten: { layout: "zine", why: "Cut, pasted and scribbled, like the note itself." },
  "game night": { layout: "hunt", why: "Each note is a prize to unwrap." },
  pixel: { layout: "bento", why: "Tiles like a level select screen." },
  "care package": { layout: "hunt", why: "Notes come out of the box one by one." },
  "balikbayan box": { layout: "hunt", why: "Unpack it one pasalubong at a time." },
  debut: { layout: "storybook", why: "Eighteen years, told like a storybook." },
};

const DEFAULT: Pick = { layout: "scrapbook", why: "One long, cozy page with every note." };

/** The layout a theme recommends (a gift with no theme gets Scrapbook). */
export function recommendedLayout(themeName: string | null | undefined): Pick {
  const key = (themeName ?? "").trim().toLowerCase();
  const pick = BY_THEME[key] ?? DEFAULT;
  // Handwritten reads best in the Notebook layout once that's switched on.
  if (key === "handwritten" && isFlagOn("handwrittenFormat")) return { layout: "handwritten", why: "Notes in everyone's own handwriting, like the note itself." };
  return pick;
}

/** For docs and tests: every theme's pick. */
export const RECOMMENDED_LAYOUTS = BY_THEME;
