import { supabase } from "@/integrations/supabase/client";
import type { Palette } from "@/lib/themes";

export type PaletteRecord = Palette & {
  id: string;
  name: string;
  group: string;
  sort_order: number;
};

export const PALETTE_GROUPS = ["Romantic", "Bright", "Soft", "Earthy", "Dark"] as const;

export const INK_DARK = "#2B2522";
export const INK_LIGHT = "#FBF8F2";

export function normalizePaletteRow(row: Record<string, unknown>): PaletteRecord {
  return {
    id: String(row["id"]),
    name: String(row["name"]),
    group: String(row["group_name"]),
    background: String(row["background"]),
    primary: String(row["primary_color"]),
    accent: String(row["accent"]),
    sort_order: Number(row["sort_order"] ?? 0),
  };
}

export async function fetchPalettes(): Promise<PaletteRecord[]> {
  const { data, error } = await supabase
    .from("palettes")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => normalizePaletteRow(row as Record<string, unknown>));
}

function toRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours (1–21). */
export function contrastRatio(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export function isDark(hex: string) {
  return luminance(hex) < 0.4;
}

/** Text colour that reads best on the given background. Never user-chosen. */
export function readableInk(background: string) {
  return contrastRatio(background, INK_DARK) >= contrastRatio(background, INK_LIGHT)
    ? INK_DARK
    : INK_LIGHT;
}

/** Translucent card surface that works on light and dark palettes. */
export function surfaceColor(background: string) {
  return isDark(background) ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.70)";
}

export function surfaceBorder(background: string) {
  return isDark(background) ? "rgba(255,255,255,0.16)" : "rgba(43,37,34,0.08)";
}

/** True when a colour is too close to the background to read (under 3:1). */
export function tooCloseToBackground(color: string, background: string) {
  return contrastRatio(color, background) < 3;
}

const CUSTOM_KEY = "jb:custom-palettes";

export function recentCustomPalettes(): Palette[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? (JSON.parse(raw) as Palette[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export function rememberCustomPalette(palette: Palette) {
  if (typeof window === "undefined") return;
  const existing = recentCustomPalettes().filter(
    (p) =>
      p.background !== palette.background ||
      p.primary !== palette.primary ||
      p.accent !== palette.accent,
  );
  const next = [palette, ...existing].slice(0, 3);
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

/** Returns `color` when it is legible on `background`, otherwise the readable ink. */
export function readableOn(background: string, color: string, minRatio = 4.5) {
  return contrastRatio(color, background) >= minRatio ? color : readableInk(background);
}

/** Nudges a colour darker (or lighter on dark backgrounds) until it passes `min` contrast. */
export function nudgeContrast(color: string, background: string, min = 3) {
  const lighten = isDark(background);
  let [r, g, b] = toRgb(color);
  for (let i = 0; i < 40; i++) {
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
    if (contrastRatio(hex, background) >= min) return hex;
    if (lighten) {
      r = Math.min(255, r + (255 - r) * 0.12 + 4);
      g = Math.min(255, g + (255 - g) * 0.12 + 4);
      b = Math.min(255, b + (255 - b) * 0.12 + 4);
    } else {
      r = Math.max(0, r * 0.88 - 4);
      g = Math.max(0, g * 0.88 - 4);
      b = Math.max(0, b * 0.88 - 4);
    }
  }
  return readableInk(background);
}

export type SavedPalette = { name: string; colors: Palette };

const SAVED_KEY = "jb:my-palettes";

function sameColors(a: Palette, b: Palette) {
  return a.background === b.background && a.primary === b.primary && a.accent === b.accent;
}

/** Custom palettes this person made: de-duplicated, newest first, max 4. */
export function savedPalettes(): SavedPalette[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavedPalette[]) : [];
    if (!Array.isArray(parsed)) return [];
    const out: SavedPalette[] = [];
    for (const item of parsed) {
      if (!item?.colors) continue;
      if (out.some((p) => sameColors(p.colors, item.colors))) continue;
      out.push(item);
    }
    return out.slice(0, 4);
  } catch {
    return [];
  }
}

function writeSaved(list: SavedPalette[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 4)));
  } catch {
    /* storage unavailable */
  }
}

export function saveCustomPalette(colors: Palette): SavedPalette[] {
  const existing = savedPalettes();
  if (existing.some((p) => sameColors(p.colors, colors))) return existing;
  const name = `My palette ${existing.length + 1}`;
  const next = [{ name, colors }, ...existing].slice(0, 4);
  writeSaved(next);
  return next;
}

export function renameCustomPalette(index: number, name: string): SavedPalette[] {
  const list = savedPalettes();
  const item = list[index];
  if (!item) return list;
  list[index] = { ...item, name };
  writeSaved(list);
  return list;
}

export function deleteCustomPalette(index: number): SavedPalette[] {
  const list = savedPalettes().filter((_, i) => i !== index);
  writeSaved(list);
  return list;
}

/** Pulls up to `count` representative colours out of an image URL (client only). */
export async function colorsFromImage(url: string, count = 5): Promise<string[]> {
  if (typeof window === "undefined") return [];
  const img = new Image();
  img.crossOrigin = "anonymous";
  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
  if (!loaded) return [];
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, size, size).data;
  } catch {
    return [];
  }
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
    const cur = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    buckets.set(key, { n: cur.n + 1, r: cur.r + r, g: cur.g + g, b: cur.b + b });
  }
  return [...buckets.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map(
      ({ n, r, g, b }) =>
        `#${[r / n, g / n, b / n]
          .map((v) => Math.round(v).toString(16).padStart(2, "0"))
          .join("")}`,
    );
}
