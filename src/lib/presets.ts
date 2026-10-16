/**
 * Occasion presets: which sections a new gift starts with for each theme.
 * Everything else is one tap away under "Add more".
 */
import type { ModuleType } from "@/lib/gift";
import type { ThemeKind } from "@/lib/themeKind";

export const PRESETS: Record<ThemeKind, ModuleType[]> = {
  birthday: ["letters", "photobooth", "wordcloud", "voice", "countdown", "superlatives"],
  valentine: ["letters", "openwhen", "photobooth", "songs", "coupons"],
  anniversary: ["letters", "photobooth", "songs", "map", "capsule"],
  wedding: ["letters", "photobooth", "superlatives", "map", "video"],
  bridal: ["letters", "photobooth", "quiz", "superlatives", "coupons"],
  baby: ["letters", "photobooth", "capsule", "quiz", "doodle"],
  christmas: ["letters", "calendar", "tree", "photobooth", "coupons"],
  newyear: ["letters", "capsule", "superlatives", "video", "photobooth"],
  voyage: ["letters", "openwhen", "map", "photobooth", "video"],
  pets: ["photobooth", "letters", "doodle", "superlatives", "video"],
  handwritten: ["letters", "openwhen", "capsule", "photobooth", "voice"],
  game: ["letters", "quiz", "superlatives", "coupons", "photobooth"],
  pixel: ["letters", "quiz", "superlatives", "video", "photobooth"],
  default: ["letters", "photobooth", "songs", "voice", "wordcloud"],
};
