import { getThemeById, listThemes } from "@/lib/api";

export type Palette = {
  background: string;
  primary: string;
  accent: string;
};

export type Theme = {
  id: string;
  name: string;
  category: string;
  preview_image_url: string | null;
  /** @deprecated use suggested_palette_ids with the shared palette library */
  palettes: Palette[];
  suggested_palette_ids: string[];
  description: string | null;
  status: string;
  default_modules: string[];
  created_at: string;
};

export const THEME_BUCKET = "theme-previews";

export function parsePalettes(value: unknown): Palette[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (p): p is Palette =>
      !!p && typeof p === "object" && "background" in p && "primary" in p && "accent" in p,
  );
}

export function normalizeTheme(row: Record<string, unknown>): Theme {
  return {
    id: String(row["id"]),
    name: String(row["name"]),
    category: String(row["category"]),
    preview_image_url: (row["preview_image_url"] as string | null) ?? null,
    palettes: parsePalettes(row["palettes"]),
    suggested_palette_ids: Array.isArray(row["suggested_palette_ids"])
      ? (row["suggested_palette_ids"] as string[])
      : [],
    description: (row["description"] as string | null) ?? null,
    status: String(row["status"]),
    default_modules: Array.isArray(row["default_modules"])
      ? (row["default_modules"] as string[])
      : [],
    created_at: String(row["created_at"]),
  };
}

/** Preview images are stored as full public URLs. */
export async function resolvePreviewUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return null;
}

export async function fetchThemes(includeDrafts = false): Promise<Theme[]> {
  const data = await listThemes({ data: { includeDrafts } });
  return data.map((row) => normalizeTheme(row as Record<string, unknown>));
}

export async function fetchThemeById(id: string): Promise<Theme | null> {
  const data = await getThemeById({ data: { id } });
  return data ? normalizeTheme(data as Record<string, unknown>) : null;
}
