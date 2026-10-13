/** Intro styling helpers, kept apart from the animation so cards stay light. */

export type IntroStyle =
  | "envelope"
  | "giftbox"
  | "boardingpass"
  | "present"
  | "paw"
  | "sparkler"
  | "letter"
  | "invitation";

/** The intro style is curated per theme, never chosen by the creator. */
export function introStyleForTheme(themeName: string | null | undefined): IntroStyle {
  const key = (themeName ?? "").toLowerCase();
  if (key.includes("valentine")) return "envelope";
  if (key.includes("birthday")) return "giftbox";
  if (key.includes("despidida") || key.includes("farewell") || key.includes("voyage")) return "boardingpass";
  if (key.includes("christmas")) return "present";
  if (key.includes("pet")) return "paw";
  if (key.includes("new year")) return "sparkler";
  if (key.includes("anniversary")) return "letter";
  if (key.includes("wedding") || key.includes("bridal") || key.includes("shower")) return "invitation";
  return "envelope";
}

export const INTRO_COPY: Record<IntroStyle, { badge: string; action: string; glyph: string }> = {
  envelope: { badge: "Sealed with love", action: "Tap to open", glyph: "♥" },
  giftbox: { badge: "A little something", action: "Tap to unwrap", glyph: "🎁" },
  boardingpass: { badge: "One way, with love", action: "Tap to board", glyph: "✈" },
  present: { badge: "Under the tree", action: "Pull the ribbon", glyph: "❄" },
  paw: { badge: "From your favourite human", action: "Tap to open", glyph: "🐾" },
  sparkler: { badge: "Three… two… one", action: "Tap to celebrate", glyph: "✦" },
  letter: { badge: "A letter for you", action: "Tap to unfold", glyph: "✒" },
  invitation: { badge: "You are invited", action: "Tap to open", glyph: "❀" },
};
