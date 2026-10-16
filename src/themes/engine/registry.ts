/**
 * Every engine theme. New themes add one import here. Existing themes
 * (src/themes/<kind>/Opening.tsx) aren't on the engine yet; they move after
 * launch (see docs/theme-bible.md).
 */
import type { ThemeDefinition } from "./define";
import kraftParcel from "./themes/kraft-parcel/theme";
import winterCabin from "./themes/winter-cabin/theme";
import carePackage from "./themes/care-package/theme";
import balikbayanBox from "./themes/balikbayan-box/theme";
import parol from "./themes/parol/theme";
import debut from "./themes/debut/theme";

export const ENGINE_THEMES: ThemeDefinition[] = [winterCabin, carePackage, balikbayanBox, parol, debut, kraftParcel];

export function engineTheme(id: string): ThemeDefinition | undefined {
  return ENGINE_THEMES.find((t) => t.id === id);
}

/** The engine theme for a theme row (by its name), if it has one. Dev-only samples never match. */
export function engineThemeForName(name: string | null | undefined): ThemeDefinition | undefined {
  const n = (name ?? "").trim().toLowerCase();
  if (!n) return undefined;
  return ENGINE_THEMES.find((t) => t.status !== "dev" && t.dbName.toLowerCase() === n);
}

/** Themes a visitor can pick in production: live ones, plus drafts whose flag is on. */
export function liveEngineThemes(flags: Record<string, boolean> = {}): ThemeDefinition[] {
  return ENGINE_THEMES.filter((t) => t.status === "live" || (t.status === "draft" && !!t.flag && flags[t.flag]));
}
