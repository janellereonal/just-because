/**
 * Every engine theme. New themes add one import here. Existing themes
 * (src/themes/<kind>/Opening.tsx) aren't on the engine yet; they move after
 * launch (see docs/theme-bible.md).
 */
import type { ThemeDefinition } from "./define";
import kraftParcel from "./themes/kraft-parcel/theme";

export const ENGINE_THEMES: ThemeDefinition[] = [kraftParcel];

export function engineTheme(id: string): ThemeDefinition | undefined {
  return ENGINE_THEMES.find((t) => t.id === id);
}

/** Themes a visitor can pick in production: live ones, plus drafts whose flag is on. */
export function liveEngineThemes(flags: Record<string, boolean> = {}): ThemeDefinition[] {
  return ENGINE_THEMES.filter((t) => t.status === "live" || (t.status === "draft" && !!t.flag && flags[t.flag]));
}
