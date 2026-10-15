import type { ThemeKind } from "@/lib/themeKind";
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

/* ---------- Custom intros (stored in gift_sites.intro_settings) ---------- */

/** What sits in the middle of the opening. */
export type IntroHero =
  | { type: "theme" }
  | { type: "object"; kind: ThemeKind }
  | { type: "emoji"; emoji: string }
  | { type: "image"; url: string };

export type IntroBackground =
  | { type: "theme" }
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string }
  | { type: "image"; url: string };

/** A sticker floating around the opening: an emoji or an uploaded picture. */
export type IntroSticker = { id: string; emoji?: string; url?: string; x: number; y: number; r: number; s: number };

export type IntroBurst = "confetti" | "hearts" | "stars" | "bubbles" | "petals";

export type IntroSettings = {
  hero?: IntroHero;
  background?: IntroBackground;
  stickers?: IntroSticker[];
  /** Text and button colors. Empty = from the gift's palette. */
  ink?: string;
  button?: string;
  button_ink?: string;
  button_text?: string;
  badge_text?: string;
  burst?: IntroBurst;
};

export const MAX_INTRO_STICKERS = 8;
const HEX = /^#[0-9a-fA-F]{6}$/;
/** Uploaded files: Vercel Blob (https) or local dev uploads. */
export function isSafeMediaUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length <= 600 &&
    (/^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+$/.test(url) ||
      /^\/api\/dev-uploads\/[\w.-]+$/.test(url))
  );
}
const color = (v: unknown) => (typeof v === "string" && HEX.test(v) ? v : undefined);
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
/** One emoji-ish cluster, never markup. */
const emoji = (v: unknown) => {
  if (typeof v !== "string") return undefined;
  const t = [...v.trim()].slice(0, 8).join("");
  return t && !/[<>&"'`]/.test(t) ? t : undefined;
};

const KINDS = ["valentine", "birthday", "voyage", "christmas", "pets", "newyear", "anniversary", "wedding", "bridal", "default"];
const BURSTS: IntroBurst[] = ["confetti", "hearts", "stars", "bubbles", "petals"];

/** Cleans whatever is stored (or sent) into safe settings. Unknown bits are dropped. */
export function normalizeIntroSettings(value: unknown): IntroSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  const out: IntroSettings = {};
  const h = v["hero"] as Record<string, unknown> | undefined;
  if (h && typeof h === "object") {
    if (h["type"] === "object" && KINDS.includes(String(h["kind"])))
      out.hero = { type: "object", kind: h["kind"] as ThemeKind };
    else if (h["type"] === "emoji" && emoji(h["emoji"])) out.hero = { type: "emoji", emoji: emoji(h["emoji"])! };
    else if (h["type"] === "image" && isSafeMediaUrl(h["url"])) out.hero = { type: "image", url: h["url"] };
  }
  const b = v["background"] as Record<string, unknown> | undefined;
  if (b && typeof b === "object") {
    if (b["type"] === "solid" && color(b["color"])) out.background = { type: "solid", color: color(b["color"])! };
    else if (b["type"] === "gradient" && color(b["from"]) && color(b["to"]))
      out.background = { type: "gradient", from: color(b["from"])!, to: color(b["to"])! };
    else if (b["type"] === "image" && isSafeMediaUrl(b["url"])) out.background = { type: "image", url: b["url"] };
  }
  if (Array.isArray(v["stickers"])) {
    const stickers: IntroSticker[] = [];
    for (const raw of v["stickers"].slice(0, MAX_INTRO_STICKERS)) {
      if (!raw || typeof raw !== "object") continue;
      const s = raw as Record<string, unknown>;
      const e = emoji(s["emoji"]);
      const url = isSafeMediaUrl(s["url"]) ? s["url"] : undefined;
      if (!e && !url) continue;
      stickers.push({
        id: typeof s["id"] === "string" ? s["id"].slice(0, 24) : Math.random().toString(36).slice(2, 10),
        ...(url ? { url } : { emoji: e! }),
        x: num(s["x"], 0, 1, 0.5),
        y: num(s["y"], 0, 1, 0.5),
        r: num(s["r"], -40, 40, 0),
        s: num(s["s"], 0.6, 1.8, 1),
      });
    }
    if (stickers.length) out.stickers = stickers;
  }
  const ink = color(v["ink"]);
  if (ink) out.ink = ink;
  const button = color(v["button"]);
  if (button) out.button = button;
  const buttonInk = color(v["button_ink"]);
  if (buttonInk) out.button_ink = buttonInk;
  const bt = text(v["button_text"], 40);
  if (bt) out.button_text = bt;
  const badge = text(v["badge_text"], 48);
  if (badge) out.badge_text = badge;
  if (BURSTS.includes(v["burst"] as IntroBurst)) out.burst = v["burst"] as IntroBurst;
  return out;
}

/** Sticker ideas for the picker. */
export const STICKER_EMOJIS = ["💖", "🎀", "🌸", "✨", "🧸", "🍰", "🎈", "🌈", "⭐", "🍓", "🦋", "🌙", "🐶", "🐱", "🎂", "🥂", "💌", "🌻", "🍀", "🎵"];
