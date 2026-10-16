/**
 * Icon sets ("sprinkles"): the little shapes used for particles, background
 * patterns and bursts. Every theme reads them from the gift, never hardcoded.
 * A set is 4 to 8 shapes, a palette and a physics profile.
 */
import { isSafeMediaUrl } from "@/lib/intro";

export type IconItem =
  | { kind: "path"; d: string }
  | { kind: "emoji"; char: string }
  | { kind: "image"; url: string }
  | { kind: "text"; text: string };

export type Physics = "float" | "fall" | "burst" | "drift";

export type IconSet = {
  id: string;
  name: string;
  items: IconItem[];
  /** Fill colors for path and text items. Empty = use the gift palette. */
  colors: string[];
  physics: Physics;
};

/**
 * What a gift stores in `icon_set`. `roam` picks one of the set's icons to wander around the gift
 * (its index), or -1 for none; left out, the theme decides (see ThemeDesign.roam).
 */
export type IconSetSetting = ({ id: string } | { custom: string[]; physics?: Physics }) & { roam?: number };

const P = (d: string): IconItem => ({ kind: "path", d });

const HEART = "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z";
const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";
const SPARKLE = "M12 2c.7 5.2 2.8 7.6 10 10-7.2 2.4-9.3 4.8-10 10-.7-5.2-2.8-7.6-10-10 7.2-2.4 9.3-4.8 10-10z";
const MOON = "M19.5 15.2A8.5 8.5 0 1 1 8.8 4.5a6.8 6.8 0 0 0 10.7 10.7z";
const DOT = "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z";
const PAW =
  "M12 11.2c-2.2 0-3.6 1.6-4.6 3.3-.7 1.2-2 2.1-2 3.7 0 1.6 1.3 2.6 2.8 2.6 1.4 0 2.4-.8 3.8-.8s2.4.8 3.8.8c1.5 0 2.8-1 2.8-2.6 0-1.6-1.3-2.5-2-3.7-1-1.7-2.4-3.3-4.6-3.3ZM2.88 11A1.9 2.5 -25 1 1 6.32 9.4A1.9 2.5 -25 1 1 2.88 11ZM6.62 5.88A2 2.7 -8 1 1 10.58 5.32A2 2.7 -8 1 1 6.62 5.88ZM13.42 5.32A2 2.7 8 1 1 17.38 5.88A2 2.7 8 1 1 13.42 5.32ZM17.68 9.4A1.9 2.5 25 1 1 21.12 11A1.9 2.5 25 1 1 17.68 9.4Z";
const BONE =
  "M7.1 5.2a2.6 2.6 0 0 0-4.4 1.9 2.6 2.6 0 0 0 1.7 2.4 2.6 2.6 0 0 0 .2 3.5 2.6 2.6 0 0 0 3.5.2l6.9 6.9a2.6 2.6 0 0 0 .2 3.5 2.6 2.6 0 0 0 3.5.2 2.6 2.6 0 0 0 2.4 1.7 2.6 2.6 0 0 0 1.9-4.4 2.6 2.6 0 0 0-1.9-4.4 2.6 2.6 0 0 0-1.6.6L10.6 9a2.6 2.6 0 0 0 .6-1.6 2.6 2.6 0 0 0-4.1-2.2Z";
const FLOWER =
  "M8.4 7.4A3.6 4.9 0 1 1 15.6 7.4A3.6 4.9 0 1 1 8.4 7.4ZM15.26 7.15A3.6 4.9 72 1 1 17.49 14A3.6 4.9 72 1 1 15.26 7.15ZM17.62 13.61A3.6 4.9 144 1 1 11.79 17.84A3.6 4.9 144 1 1 17.62 13.61ZM12.21 17.84A3.6 4.9 216 1 1 6.38 13.61A3.6 4.9 216 1 1 12.21 17.84ZM6.51 14A3.6 4.9 288 1 1 8.74 7.15A3.6 4.9 288 1 1 6.51 14ZM9.7 12A2.3 2.3 0 1 0 14.3 12A2.3 2.3 0 1 0 9.7 12ZM10.8 12A1.2 1.2 0 1 1 13.2 12A1.2 1.2 0 1 1 10.8 12Z";
const LEAF =
  "M4 20C4.5 11 10 5 20 4c-.5 9.5-6 15.5-15 15.6l-1 .4Zm2.3-2.2c3-2.6 6-6 8.2-9.6-2.8 3-5.6 6.2-8.2 9.6Z";
const PETAL = "M12 2c3.5 3.8 3.5 8.2 0 12-3.5-3.8-3.5-8.2 0-12z";
const STRIP = "M10 3h4v18h-4z";
const TRIANGLE = "M12 4l8.5 15h-17z";
const SQUARE = "M6 6h12v12H6z";
const SQUIGGLE = "M3 14c2-5 4-5 6 0s4 5 6 0 4-5 6 0v3c-2-5-4-5-6 0s-4 5-6 0-4-5-6 0z";
const SNOW =
  "M11.2 12L11.2 2L12.8 2L12.8 12ZM11.6 6.4L8.6 3.8L9.6 2.9L12.2 5.2ZM12.4 6.4L15.4 3.8L14.4 2.9L11.8 5.2ZM11.6 11.31L20.26 6.31L21.06 7.69L12.4 12.69ZM16.65 8.85L17.4 4.96L18.68 5.37L17.99 8.77ZM17.05 9.55L20.8 10.84L21.08 9.53L17.79 8.43ZM12.4 11.31L21.06 16.31L20.26 17.69L11.6 12.69ZM17.05 14.45L20.8 13.16L21.08 14.47L17.79 15.57ZM16.65 15.15L17.4 19.04L18.68 18.63L17.99 15.23ZM12.8 12L12.8 22L11.2 22L11.2 12ZM12.4 17.6L15.4 20.2L14.4 21.1L11.8 18.8ZM11.6 17.6L8.6 20.2L9.6 21.1L12.2 18.8ZM12.4 12.69L3.74 17.69L2.94 16.31L11.6 11.31ZM7.35 15.15L6.6 19.04L5.32 18.63L6.01 15.23ZM6.95 14.45L3.2 13.16L2.92 14.47L6.21 15.57ZM11.6 12.69L2.94 7.69L3.74 6.31L12.4 11.31ZM6.95 9.55L3.2 10.84L2.92 9.53L6.21 8.43ZM7.35 8.85L6.6 4.96L5.32 5.37L6.01 8.77ZM9.8 12A2.2 2.2 0 1 1 14.2 12A2.2 2.2 0 1 1 9.8 12Z";
const SNOW_DOT = "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z";

const FISH =
  "M3 12c2.5-4 6-6 9.5-6 3.2 0 5.6 1.8 7 3.6L22 7.5v9l-2.5-2.1C18.1 16.2 15.7 18 12.5 18 9 18 5.5 16 3 12ZM7 10.6A1 1 0 1 1 9 10.6A1 1 0 1 1 7 10.6Z";
const DAISY =
  "M13.7 12A3.9 1.7 0 1 1 21.5 12A3.9 1.7 0 1 1 13.7 12ZM13.2 13.2A3.9 1.7 45 1 1 18.72 18.72A3.9 1.7 45 1 1 13.2 13.2ZM12 13.7A3.9 1.7 90 1 1 12 21.5A3.9 1.7 90 1 1 12 13.7ZM10.8 13.2A3.9 1.7 135 1 1 5.28 18.72A3.9 1.7 135 1 1 10.8 13.2ZM10.3 12A3.9 1.7 180 1 1 2.5 12A3.9 1.7 180 1 1 10.3 12ZM10.8 10.8A3.9 1.7 225 1 1 5.28 5.28A3.9 1.7 225 1 1 10.8 10.8ZM12 10.3A3.9 1.7 270 1 1 12 2.5A3.9 1.7 270 1 1 12 10.3ZM13.2 10.8A3.9 1.7 315 1 1 18.72 5.28A3.9 1.7 315 1 1 13.2 10.8ZM9.4 12A2.6 2.6 0 1 0 14.6 12A2.6 2.6 0 1 0 9.4 12ZM10.2 12A1.8 1.8 0 1 1 13.8 12A1.8 1.8 0 1 1 10.2 12Z";
const TULIP =
  "M12 3c1.4 1.4 2.3 2.7 2.7 3.9C16 5.6 17.5 5 19 5c0 6-2.6 9.4-6.2 9.9V21h-1.6v-6.1C7.6 14.4 5 11 5 5c1.5 0 3 .6 4.3 1.9C9.7 5.7 10.6 4.4 12 3Z";

/* Handwritten: ink, envelopes, a kiss. */
const INK_DROP = "M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z";
const ENVELOPE = "M3 6h18v12H3zM5 7.5L12 12.5L19 7.5L18.3 6.9L12 11.2L5.7 6.9z";
const KISS = "M5 6.4L6.4 5L12 10.6L17.6 5L19 6.4L13.4 12L19 17.6L17.6 19L12 13.4L6.4 19L5 17.6L10.6 12z";
/* Game night: a die (pips cut out by winding), a meeple, a token, a spade. */
const DIE =
  "M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3zM8.5 6.9a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zM12 10.4a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2zM15.5 13.9a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 1 0 0-3.2z";
const MEEPLE =
  "M12 3a3 3 0 0 1 3 3c0 1-.4 1.7-1 2.3 3.2.6 7 1.8 7 3.7 0 1.3-2.2 1.6-4 1.5l3 6.5h-5.5L12 16l-2.5 4H4l3-6.5c-1.8.1-4-.2-4-1.5 0-1.9 3.8-3.1 7-3.7-.6-.6-1-1.3-1-2.3a3 3 0 0 1 3-3z";
const TOKEN =
  "M12 4a8 8 0 1 1 0 16a8 8 0 1 1 0-16zM12 6.4a5.6 5.6 0 1 0 0 11.2a5.6 5.6 0 1 0 0-11.2zM12 8.4a3.6 3.6 0 1 1 0 7.2a3.6 3.6 0 1 1 0-7.2z";
const SPADE = "M12 3c3 3.6 8 6.4 8 10.2a4 4 0 0 1-6.6 3l1.1 4.8h-5l1.1-4.8a4 4 0 0 1-6.6-3C4 9.4 9 6.6 12 3z";
/* Pixel: drawn on a grid, square corners on purpose. */
const PX_HEART = "M4.5 4.5h5v2.5h-5zM14.5 4.5h5v2.5h-5zM2 7h20v2.5h-20zM2 9.5h20v2.5h-20zM4.5 12h15v2.5h-15zM7 14.5h10v2.5h-10zM9.5 17h5v2.5h-5z";
const PX_COIN = "M7 3.25h10v2.5h-10zM4.5 5.75h15v2.5h-15zM2 8.25h20v2.5h-20zM2 10.75h20v2.5h-20zM2 13.25h20v2.5h-20zM4.5 15.75h15v2.5h-15zM7 18.25h10v2.5h-10z";
const PX_STAR = "M10.6 3.6h2.8v2.8h-2.8zM7.8 6.4h8.4v2.8h-8.4zM2.2 9.2h19.6v2.8h-19.6zM5 12h14v2.8h-14zM7.8 14.8h2.8v2.8h-2.8zM13.4 14.8h2.8v2.8h-2.8zM5 17.6h2.8v2.8h-2.8zM16.2 17.6h2.8v2.8h-2.8z";
const PX_BLOCK = "M3 3h18v3h-18zM3 6h3v3h-3zM18 6h3v3h-3zM3 9h3v3h-3zM9 9h6v3h-6zM18 9h3v3h-3zM3 12h3v3h-3zM9 12h6v3h-6zM18 12h3v3h-3zM3 15h3v3h-3zM18 15h3v3h-3zM3 18h18v3h-18z";

export const ICON_SETS: IconSet[] = [
  {
    id: "hearts",
    name: "Hearts",
    items: [P(HEART), P(HEART), P(SPARKLE), P(DOT)],
    colors: ["#E8577E", "#B4335A", "#F7B2C4", "#C9A24A"],
    physics: "float",
  },
  {
    id: "stars",
    name: "Stars",
    items: [P(STAR), P(SPARKLE), P(MOON), P(DOT)],
    colors: ["#E5C26B", "#F7E7B4", "#A99BF5", "#FFFFFF"],
    physics: "drift",
  },
  {
    id: "paws",
    name: "Paws",
    items: [P(PAW), P(BONE), P(PAW), P(FISH), P(HEART)],
    colors: ["#B9542C", "#E9A27A", "#7A5644", "#5E9BBF", "#E8577E"],
    physics: "fall",
  },
  {
    id: "florals",
    name: "Florals",
    items: [P(FLOWER), P(LEAF), P(DAISY), P(PETAL), P(TULIP)],
    colors: ["#E8A3A8", "#8FA982", "#F4E3B5", "#F2C6C2", "#D98C9A"],
    physics: "drift",
  },
  {
    id: "confetti",
    name: "Confetti",
    items: [P(STRIP), P(DOT), P(TRIANGLE), P(SQUARE), P(SQUIGGLE)],
    colors: ["#FF7EB6", "#2D4BD6", "#FFD166", "#8DE3C6", "#FF8A5B"],
    physics: "burst",
  },
  {
    id: "snowflakes",
    name: "Snowflakes",
    items: [P(SNOW), P(SNOW_DOT), P(SNOW), P(SPARKLE)],
    colors: ["#BFD7EC", "#FFFFFF", "#9DBFE0", "#E2B95B"],
    physics: "fall",
  },
  {
    id: "notes",
    name: "Love notes",
    items: [P(ENVELOPE), P(HEART), P(INK_DROP), P(KISS)],
    colors: ["#2A3A6B", "#C2536B", "#C9A57A", "#E8A3A8"],
    physics: "drift",
  },
  {
    id: "game",
    name: "Game night",
    items: [P(DIE), P(MEEPLE), P(TOKEN), P(SPADE), P(STAR)],
    colors: ["#E2463F", "#3BB98A", "#FFD34E", "#57A7E8", "#22305E"],
    physics: "burst",
  },
  {
    id: "pixels",
    name: "Pixels",
    items: [P(PX_HEART), P(PX_COIN), P(PX_STAR), P(PX_BLOCK)],
    colors: ["#FF5DA2", "#FFE45C", "#3DF2B0", "#7A5CFF"],
    physics: "fall",
  },
  {
    id: "emoji",
    name: "Emoji",
    items: ["💖", "✨", "🎉", "🌸", "⭐", "🍀", "🎈", "🫶"].map((char) => ({ kind: "emoji" as const, char })),
    colors: [],
    physics: "float",
  },
  {
    id: "initials",
    name: "Initials",
    items: [{ kind: "text", text: "A" }, P(HEART), P(SPARKLE)],
    colors: [],
    physics: "float",
  },
];

export const MAX_CUSTOM_ICONS = 3;

/** One emoji-ish cluster, never markup. */
function cleanEmoji(v: string) {
  const t = [...v.trim()].slice(0, 8).join("");
  return t && !/[<>&"'`]/.test(t) ? t : null;
}

export function normalizeIconSetting(value: unknown): IconSetSetting | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const r = Number(v["roam"]);
  const roam = Number.isInteger(r) && r >= -1 && r < 8 ? { roam: r } : {};
  if (typeof v["id"] === "string" && ICON_SETS.some((s) => s.id === v["id"])) return { id: v["id"], ...roam };
  if (Array.isArray(v["custom"])) {
    const custom = v["custom"]
      .slice(0, MAX_CUSTOM_ICONS)
      .map((x) => (typeof x !== "string" ? null : isSafeMediaUrl(x) ? x : cleanEmoji(x)))
      .filter((x): x is string => !!x);
    if (!custom.length) return null;
    const physics = ["float", "fall", "burst", "drift"].includes(String(v["physics"]))
      ? (v["physics"] as Physics)
      : undefined;
    return physics ? { custom, physics, ...roam } : { custom, ...roam };
  }
  return null;
}

/** Initials from a name: "Nora & James" → "N&J", "Ana" → "A". */
export function initialsOf(name: string) {
  // Letters only: skip emoji, apostrophes and numbers at the start of a word.
  const letter = (word: string) => word.match(/\p{L}/u)?.[0]?.toLocaleUpperCase() ?? "";
  // "Ana & Ben", "Ana and Ben", "Ana + Ben": one initial from each person.
  const sides = name
    .split(/\s+and\s+|\s*[&+]\s*/i)
    .map((side) => side.trim())
    .filter((side) => letter(side));
  if (!sides.length) return "♥";
  const first = (side: string) => letter(side.split(/\s+/).find((w) => letter(w)) ?? "");
  if (sides.length >= 2) return `${first(sides[0]!)}&${first(sides[1]!)}`;
  return first(sides[0]!);
}

/** Turns a gift's setting into a ready-to-draw icon set. */
export function resolveIconSet(
  setting: IconSetSetting | null | undefined,
  { recipient = "", palette }: { recipient?: string; palette?: { primary: string; accent: string } } = {},
): IconSet {
  const giftColors = palette ? [palette.accent, palette.primary, "#FFFFFF"] : ["#C2366B", "#B5623E", "#FFFFFF"];
  if (setting && "custom" in setting) {
    return {
      id: "custom",
      name: "Yours",
      items: setting.custom.map((x) => (isSafeMediaUrl(x) ? { kind: "image", url: x } : { kind: "emoji", char: x })),
      colors: [],
      physics: setting.physics ?? "float",
    };
  }
  const base = ICON_SETS.find((s) => s.id === (setting as { id?: string } | null)?.id) ?? ICON_SETS[0]!;
  if (base.id === "initials") {
    return {
      ...base,
      items: [{ kind: "text", text: initialsOf(recipient) }, P(HEART), { kind: "text", text: initialsOf(recipient) }, P(SPARKLE)],
      colors: giftColors,
    };
  }
  return base;
}

/** Deterministic pick so server and browser agree. */
export function pick<T>(list: T[], i: number): T {
  return list[((i % list.length) + list.length) % list.length]!;
}

/** Markup for one icon (used by DOM bursts, which build elements by hand). */
let burstSeq = 0;

/** Mix two #rrggbb colors; t = 0 gives a, 1 gives b. */
export function mixHex(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export function iconElement(item: IconItem, color: string, size: number, font = "inherit"): HTMLElement {
  if (item.kind === "path") {
    const span = document.createElement("span");
    span.style.cssText = `display:block;width:${size}px;height:${size}px`;
    const stroke = item.d === LEAF ? `stroke="${color}" stroke-width="1.2"` : "";
    if (/^#[0-9a-f]{6}$/i.test(color)) {
      // Same soft clay shading as IconGlyph, as a string for bursts.
      const id = `jb-clay-b${(burstSeq = (burstSeq + 1) % 1e6)}`;
      span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" overflow="visible" aria-hidden="true"><defs><radialGradient id="${id}" cx="34%" cy="26%" r="85%"><stop offset="0" stop-color="${mixHex(color, "#ffffff", 0.42)}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${mixHex(color, "#2b2522", 0.24)}"/></radialGradient></defs><path d="${item.d}" fill="${mixHex(color, "#2b2522", 0.55)}" opacity=".16" transform="translate(.7 1.3)"/><path d="${item.d}" fill="url(#${id})" ${stroke}/></svg>`;
    } else {
      span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${item.d}" fill="${color}" ${stroke}/></svg>`;
    }
    return span;
  }
  if (item.kind === "image") {
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "";
    img.style.cssText = `width:${size * 1.3}px;height:${size * 1.3}px;object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.2))`;
    return img;
  }
  const span = document.createElement("span");
  span.textContent = item.kind === "emoji" ? item.char : item.text;
  span.style.cssText = `display:block;font-size:${size}px;line-height:1;color:${color};font-family:${font};font-weight:700`;
  return span;
}
