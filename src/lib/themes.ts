import { supabase } from "@/integrations/supabase/client";

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

/** Preview images live in a private bucket, so storage paths need a signed URL. */
export async function resolvePreviewUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const { data } = await supabase.storage.from(THEME_BUCKET).createSignedUrl(value, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function fetchThemes(includeDrafts = false): Promise<Theme[]> {
  let query = supabase.from("themes").select("*").order("created_at", { ascending: true });
  if (!includeDrafts) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizeTheme(row as Record<string, unknown>));
}

export async function fetchThemeById(id: string): Promise<Theme | null> {
  const { data, error } = await supabase.from("themes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeTheme(data as Record<string, unknown>) : null;
}
