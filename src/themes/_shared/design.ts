/**
 * The theme system's contract. Every occasion is a distinct object the
 * recipient handles to open their gift (a wax seal, a record, a cake…), with
 * its own type pairing and material palette. The creator picks a character
 * (the "cast") and an icon set (the "sprinkles"); every theme reads both from
 * the gift instead of hardcoding them.
 *
 * Openings live in src/themes/<kind>/Opening.tsx and share the props below.
 */
import type { ThemeKind } from "@/lib/themeKind";
import type { AccessoryId, CharacterSetting } from "@/themes/_shared/cast/types";
import type { IconSetSetting } from "@/themes/_shared/iconSets";

export type FontSpec = {
  /** CSS font-family stack. */
  family: string;
  source: "google" | "fontshare";
  /** Google: the `family=` value. Fontshare: the `f[]=` value. */
  query: string;
};

export type PaletteKey =
  | "rose" | "cream" | "oxblood" | "gold" | "linen"
  | "espresso" | "champagne" | "plum" | "walnut" | "glow"
  | "butter" | "bubblegum" | "cobalt" | "mint"
  | "ivory" | "sage" | "paper" | "ink"
  | "blue" | "blush" | "oat"
  | "pine" | "cranberry" | "snow"
  | "navy" | "silver" | "violet" | "night"
  | "sky" | "kraft" | "orange"
  | "peach" | "terracotta" | "tennis";
export type ThemePalette = Partial<Record<PaletteKey, string>>;

export type ThemeDesign = {
  id: ThemeKind;
  name: string;
  /** The object the recipient handles. */
  object: string;
  /** One line on how it opens, for pickers and the gallery. */
  gesture: string;
  display: FontSpec;
  text: FontSpec;
  /** Material colors for the opening (the gift body uses the gift's own palette). */
  palette: ThemePalette;
  accessory: AccessoryId | null;
  /** null: no character by default, the object tells the story. */
  defaultCharacter: string | null;
  defaultIconSet: string;
  /** How long the gallery's silent preview loop runs, in ms. */
  previewLoop: number;
  /** One of the sprinkles wanders around the gift by default. */
  roam?: boolean;
};

const g = (family: string, query: string, fallback = "serif"): FontSpec => ({
  family: `'${family}', ${fallback}`,
  source: "google",
  query,
});
const fs = (family: string, query: string, fallback = "sans-serif"): FontSpec => ({
  family: `'${family}', ${fallback}`,
  source: "fontshare",
  query,
});

const FRAUNCES = g("Fraunces", "Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100");
const SATOSHI = fs("Satoshi", "satoshi@400,500,700");
const INTER_TIGHT = g("Inter Tight", "Inter+Tight:wght@400;500;600", "sans-serif");
const CORMORANT = g("Cormorant Garamond", "Cormorant+Garamond:ital,wght@0,400..700;1,400..700");

export const THEME_DESIGNS: Record<ThemeKind, ThemeDesign> = {
  valentine: {
    id: "valentine",
    name: "Valentine's",
    object: "A wax-sealed envelope on linen",
    gesture: "Press and hold the seal",
    display: FRAUNCES,
    text: g("Instrument Sans", "Instrument+Sans:wght@400..700", "sans-serif"),
    palette: { rose: "#B4335A", cream: "#F6EEE3", oxblood: "#5E1424", gold: "#C9A24A", linen: "#EDE3D4" },
    accessory: "bow",
    defaultCharacter: null,
    defaultIconSet: "hearts",
    previewLoop: 3200,
  },
  anniversary: {
    id: "anniversary",
    name: "Anniversary",
    object: "A record on a turntable",
    gesture: "Drag the needle onto the record",
    display: g("Gloock", "Gloock"),
    text: SATOSHI,
    palette: { espresso: "#2B1D18", champagne: "#E9D6B0", plum: "#8E6A80", walnut: "#4A2F24", glow: "#FFCF8A" },
    accessory: "rose",
    defaultCharacter: null,
    defaultIconSet: "stars",
    previewLoop: 3400,
  },
  birthday: {
    id: "birthday",
    name: "Happy Birthday",
    object: "A cake with real candles",
    gesture: "Blow out the candles",
    display: g("Caprasimo", "Caprasimo", "serif"),
    text: SATOSHI,
    palette: { butter: "#FFE9A3", bubblegum: "#FF7EB6", cobalt: "#2D4BD6", mint: "#8DE3C6", cream: "#FFF8E6" },
    accessory: "party-hat",
    defaultCharacter: "bear",
    defaultIconSet: "confetti",
    previewLoop: 3400,
  },
  wedding: {
    id: "wedding",
    name: "Wedding",
    object: "An embossed invitation in a vellum sleeve",
    gesture: "Slide the card out",
    display: CORMORANT,
    text: INTER_TIGHT,
    palette: { ivory: "#FBF7EE", sage: "#9DB08F", gold: "#C9A55C", paper: "#F3EDE1", ink: "#3B3A33" },
    accessory: "veil",
    defaultCharacter: null,
    defaultIconSet: "florals",
    previewLoop: 3200,
  },
  bridal: {
    id: "bridal",
    name: "Bridal Shower",
    object: "An embossed invitation in a vellum sleeve",
    gesture: "Slide the card out",
    display: CORMORANT,
    text: INTER_TIGHT,
    palette: { ivory: "#FCF3F0", sage: "#E0A9A3", gold: "#C9A55C", paper: "#F8ECE8", ink: "#4A3A3A" },
    accessory: "veil",
    defaultCharacter: null,
    defaultIconSet: "florals",
    previewLoop: 3200,
  },
  baby: {
    id: "baby",
    name: "Baby Shower",
    object: "A mobile above a crib",
    gesture: "Pull the string",
    display: g("Bricolage Grotesque", "Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800", "sans-serif"),
    text: g("DM Sans", "DM+Sans:opsz,wght@9..40,400..700", "sans-serif"),
    palette: { blue: "#AFCDEB", butter: "#FBE7A1", blush: "#F4BFC8", oat: "#F3ECE0", ink: "#3D4660" },
    accessory: "bonnet",
    defaultCharacter: "duck",
    defaultIconSet: "stars",
    previewLoop: 3400,
  },
  christmas: {
    id: "christmas",
    name: "Christmas",
    object: "A wrapped present with a real ribbon",
    gesture: "Pull the ribbon",
    display: g("Young Serif", "Young+Serif"),
    text: fs("Erode", "erode@400,500,600", "serif"),
    palette: { pine: "#1F4D3A", cranberry: "#A3203A", gold: "#E2B95B", snow: "#F7F4EE", paper: "#B8283F" },
    accessory: "scarf",
    defaultCharacter: null,
    defaultIconSet: "snowflakes",
    previewLoop: 3200,
  },
  newyear: {
    id: "newyear",
    name: "New Year",
    object: "A countdown in the night sky",
    gesture: "Hold to count down",
    display: fs("Clash Display", "clash-display@200,300,400,500,600,700"),
    text: fs("Boska", "boska@400,500,700", "serif"),
    palette: { navy: "#10152E", gold: "#E5C26B", silver: "#C9CED8", violet: "#8E7CF0", night: "#070A1A" },
    accessory: "crown",
    defaultCharacter: null,
    defaultIconSet: "stars",
    previewLoop: 3600,
  },
  voyage: {
    id: "voyage",
    name: "Bon Voyage",
    object: "A boarding pass",
    gesture: "Tear along the dotted line",
    display: fs("Zodiak", "zodiak@400,700", "serif"),
    text: g("Space Mono", "Space+Mono:wght@400;700", "monospace"),
    palette: { sky: "#8EC0E8", kraft: "#C9A57A", cream: "#F6F0E4", orange: "#F2652E", ink: "#22303F" },
    accessory: "pilot-cap",
    defaultCharacter: null,
    defaultIconSet: "stars",
    previewLoop: 3200,
  },
  pets: {
    id: "pets",
    name: "Pets",
    object: "Your pet, who brings the gift",
    gesture: "Pet them",
    display: fs("Cabinet Grotesk", "cabinet-grotesk@500,700,800"),
    text: fs("Sentient", "sentient@400,500", "serif"),
    palette: { oat: "#F1E8D8", peach: "#F6B48F", terracotta: "#C0582F", tennis: "#D9E35A", ink: "#3A2A22" },
    accessory: "bandana",
    defaultCharacter: "dog",
    defaultIconSet: "paws",
    previewLoop: 3400,
  },
  handwritten: {
    id: "handwritten",
    roam: true,
    name: "Handwritten",
    object: "A note folded in four, written in ink",
    gesture: "Unfold the note",
    display: g("Kalam", "Kalam:wght@300;400;700", "cursive"),
    text: g("Patrick Hand", "Patrick+Hand", "cursive"),
    palette: { paper: "#FBF6EA", ink: "#2A3A6B", kraft: "#C9A57A", rose: "#C2536B", linen: "#EFE6D2" },
    accessory: null,
    defaultCharacter: null,
    defaultIconSet: "notes",
    previewLoop: 3400,
  },
  game: {
    id: "game",
    roam: true,
    name: "Game Night",
    object: "Two dice on a game board",
    gesture: "Roll the dice",
    display: g("Bungee", "Bungee", "sans-serif"),
    text: g("Outfit", "Outfit:wght@400..700", "sans-serif"),
    palette: { navy: "#22305E", butter: "#FFD34E", cranberry: "#E2463F", mint: "#3BB98A", cream: "#FFF6E5", sky: "#57A7E8" },
    accessory: "party-hat",
    defaultCharacter: "frog",
    defaultIconSet: "game",
    previewLoop: 3400,
  },
  pixel: {
    id: "pixel",
    roam: true,
    name: "Pixel",
    object: "A little handheld game console",
    gesture: "Press start",
    display: g("Press Start 2P", "Press+Start+2P", "monospace"),
    text: g("Pixelify Sans", "Pixelify+Sans:wght@400..700", "monospace"),
    palette: { night: "#1B1640", violet: "#7A5CFF", mint: "#3DF2B0", bubblegum: "#FF5DA2", butter: "#FFE45C", snow: "#F4F1FF" },
    accessory: "crown",
    defaultCharacter: null,
    defaultIconSet: "pixels",
    previewLoop: 3400,
  },
  default: {
    id: "default",
    name: "Just Because",
    object: "A wrapped present",
    gesture: "Pull the ribbon",
    display: FRAUNCES,
    text: g("DM Sans", "DM+Sans:opsz,wght@9..40,400..700", "sans-serif"),
    palette: { pine: "#B5623E", cranberry: "#C2366B", gold: "#E9C9B6", snow: "#FBF8F2", paper: "#C2366B" },
    accessory: null,
    defaultCharacter: "mascot",
    defaultIconSet: "confetti",
    previewLoop: 3200,
  },
};

export const designFor = (kind: ThemeKind) => THEME_DESIGNS[kind] ?? THEME_DESIGNS.default;

/** The creator's cast for this gift, falling back to the theme's defaults. */
export function castFor(
  kind: ThemeKind,
  character: CharacterSetting | null | undefined,
  iconSet: IconSetSetting | null | undefined,
) {
  const d = designFor(kind);
  const set = iconSet ?? ({ id: d.defaultIconSet } as IconSetSetting);
  return {
    character: character ?? ((d.defaultCharacter ? { type: "library", id: d.defaultCharacter, accessory: true } : { type: "none" }) as CharacterSetting),
    iconSet: set,
    accessory: d.accessory,
    /** Which sprinkle wanders around the gift (-1: none). */
    roam: typeof set.roam === "number" ? set.roam : d.roam ? 0 : -1,
  };
}

/* ---------- font loading ---------- */

const loaded = new Set<string>();

/** Adds the stylesheet for a font once. Display faces are preloaded with high priority. */
function loadFont(spec: FontSpec, priority: "high" | "low") {
  if (typeof document === "undefined" || loaded.has(spec.query)) return;
  loaded.add(spec.query);
  const href =
    spec.source === "google"
      ? `https://fonts.googleapis.com/css2?family=${spec.query}&display=swap`
      : `https://api.fontshare.com/v2/css?f[]=${spec.query}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("fetchpriority", priority);
  link.dataset["jbFont"] = spec.query;
  document.head.appendChild(link);
}

export function loadThemeFonts(kind: ThemeKind) {
  const d = designFor(kind);
  loadFont(d.display, "high");
  loadFont(d.text, "low");
}

/** CSS variables a gift root sets, so "Theme's own" fonts resolve anywhere inside it. */
export function themeFontVars(kind: ThemeKind): React.CSSProperties {
  const d = designFor(kind);
  return {
    ["--jb-display" as string]: d.display.family,
    ["--jb-text" as string]: d.text.family,
  } as React.CSSProperties;
}
