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

/** What a gift stores in `icon_set`. */
export type IconSetSetting = { id: string } | { custom: string[]; physics?: Physics };

const P = (d: string): IconItem => ({ kind: "path", d });

const HEART = "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z";
const STAR = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6z";
const SPARKLE = "M12 2c.7 5.2 2.8 7.6 10 10-7.2 2.4-9.3 4.8-10 10-.7-5.2-2.8-7.6-10-10 7.2-2.4 9.3-4.8 10-10z";
const MOON = "M19.5 15.2A8.5 8.5 0 1 1 8.8 4.5a6.8 6.8 0 0 0 10.7 10.7z";
const DOT = "M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10z";
const PAW =
  "M12 12.2c3.2 0 5.8 2.7 5.8 5.2 0 1.8-1.4 2.6-2.9 2.6-1.2 0-1.8-.6-2.9-.6s-1.7.6-2.9.6c-1.5 0-2.9-.8-2.9-2.6 0-2.5 2.6-5.2 5.8-5.2zM6 7.6a2 2.4 0 1 1 0 4.8 2 2.4 0 1 1 0-4.8zM18 7.6a2 2.4 0 1 1 0 4.8 2 2.4 0 1 1 0-4.8zM9.4 3.6a2 2.4 0 1 1 0 4.8 2 2.4 0 1 1 0-4.8zM14.6 3.6a2 2.4 0 1 1 0 4.8 2 2.4 0 1 1 0-4.8z";
const BONE =
  "M6.5 4.5a2.3 2.3 0 0 1 3.1 3.1l6.8 6.8a2.3 2.3 0 1 1 3.1 3.1 2.3 2.3 0 1 1-3.1 3.1 2.3 2.3 0 0 1-3.1-3.1L6.5 10.7a2.3 2.3 0 1 1-3.1-3.1 2.3 2.3 0 1 1 3.1-3.1z";
const FLOWER =
  "M12 3.5a3.2 3.2 0 0 1 3.1 4 3.2 3.2 0 0 1 3.9 4.6 3.2 3.2 0 0 1-2.3 5.3A3.2 3.2 0 0 1 12 19a3.2 3.2 0 0 1-4.7-1.6 3.2 3.2 0 0 1-2.3-5.3 3.2 3.2 0 0 1 3.9-4.6 3.2 3.2 0 0 1 3.1-4z";
const LEAF = "M5 19C5 10 11 4 20 4c0 9-6 15-15 15zm0 0l7-7";
const PETAL = "M12 2c3.5 3.8 3.5 8.2 0 12-3.5-3.8-3.5-8.2 0-12z";
const STRIP = "M10 3h4v18h-4z";
const TRIANGLE = "M12 4l8.5 15h-17z";
const SQUARE = "M6 6h12v12H6z";
const SQUIGGLE = "M3 14c2-5 4-5 6 0s4 5 6 0 4-5 6 0v3c-2-5-4-5-6 0s-4 5-6 0-4-5-6 0z";
const SNOW = "M12 2l1.2 7.3L19 6l-4.3 6L19 18l-5.8-3.3L12 22l-1.2-7.3L5 18l4.3-6L5 6l5.8 3.3z";
const SNOW_DOT = "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z";

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
    items: [P(PAW), P(PAW), P(BONE), P(HEART)],
    colors: ["#C0582F", "#F6B48F", "#D9E35A", "#8A6A55"],
    physics: "fall",
  },
  {
    id: "florals",
    name: "Florals",
    items: [P(FLOWER), P(PETAL), P(LEAF), P(PETAL), P(DOT)],
    colors: ["#F2C6C2", "#9DB08F", "#C9A55C", "#FBF7EE"],
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
    colors: ["#FFFFFF", "#E8F0F7", "#D6E4F0", "#E2B95B"],
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
  if (typeof v["id"] === "string" && ICON_SETS.some((s) => s.id === v["id"])) return { id: v["id"] };
  if (Array.isArray(v["custom"])) {
    const custom = v["custom"]
      .slice(0, MAX_CUSTOM_ICONS)
      .map((x) => (typeof x !== "string" ? null : isSafeMediaUrl(x) ? x : cleanEmoji(x)))
      .filter((x): x is string => !!x);
    if (!custom.length) return null;
    const physics = ["float", "fall", "burst", "drift"].includes(String(v["physics"]))
      ? (v["physics"] as Physics)
      : undefined;
    return physics ? { custom, physics } : { custom };
  }
  return null;
}

/** Initials from a name: "Nora & James" → "N&J", "Ana" → "A". */
export function initialsOf(name: string) {
  const parts = name
    .split(/\s*(?:&|and|\+)\s*|\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "♥";
  if (/&|\band\b|\+/i.test(name) && parts.length >= 2) return `${parts[0]![0]!.toUpperCase()}&${parts[1]![0]!.toUpperCase()}`;
  return parts[0]![0]!.toUpperCase();
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
export function iconElement(item: IconItem, color: string, size: number, font = "inherit"): HTMLElement {
  if (item.kind === "path") {
    const span = document.createElement("span");
    span.style.cssText = `display:block;width:${size}px;height:${size}px`;
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="${item.d}" fill="${color}" ${item.d === LEAF ? `stroke="${color}" stroke-width="1.2"` : ""}/></svg>`;
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
