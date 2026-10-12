import { useQuery } from "@tanstack/react-query";
import { fetchPalettes, type PaletteRecord } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";

export function usePalettes() {
  return useQuery({ queryKey: ["palettes"], queryFn: fetchPalettes, staleTime: 1000 * 60 * 30 });
}

/** The 3 palettes curated for a theme, in order. */
export function suggestedPalettes(theme: Theme | null, all: PaletteRecord[]): PaletteRecord[] {
  if (!theme) return [];
  return theme.suggested_palette_ids
    .map((id) => all.find((p) => p.id === id))
    .filter((p): p is PaletteRecord => !!p);
}

/** Palettes shown for a theme: the curated three, falling back to legacy rows. */
export function themePalettes(theme: Theme | null, all: PaletteRecord[]) {
  if (!theme) return [];
  const suggested = suggestedPalettes(theme, all);
  return suggested.length > 0 ? suggested : theme.palettes;
}
