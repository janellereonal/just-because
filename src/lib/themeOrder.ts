/**
 * Theme order and groups for the gallery and the create page. Engine themes
 * featured for the visitor's country come first, and paired regional themes
 * swap places: Balikbayan Box before Care Package for visitors from the
 * Philippines, Care Package first for everyone else. Everyone sees both.
 */
import { ENGINE_THEMES } from "@/themes/engine/registry";

type Named = { name: string };

const byName = (name: string) => ENGINE_THEMES.find((t) => t.status !== "dev" && t.dbName.toLowerCase() === name.toLowerCase());

/** Names of the newest themes (on the engine and live), for the "New" group. */
export const NEW_THEME_NAMES = ENGINE_THEMES.filter((t) => t.status === "live").map((t) => t.dbName.toLowerCase());

/** Themes in the Philippines collection: featured for PH. */
export const PH_THEME_NAMES = ENGINE_THEMES.filter((t) => t.regions.featured?.includes("PH")).map((t) => t.dbName.toLowerCase());

/** Pairs where one name leads in a country and the other leads elsewhere. */
const PAIRS: { country: string; local: string; global: string }[] = [{ country: "PH", local: "balikbayan box", global: "care package" }];

export function orderThemes<T extends Named>(themes: T[], country: string | null | undefined): T[] {
  const c = (country ?? "").toUpperCase();
  const featured = (t: T) => (c ? !!byName(t.name)?.regions.featured?.includes(c) : false);
  // Stable: featured ones first, everything else in its usual order.
  const out = [...themes.filter(featured), ...themes.filter((t) => !featured(t))];
  for (const pair of PAIRS) {
    const local = out.findIndex((t) => t.name.toLowerCase() === pair.local);
    const global = out.findIndex((t) => t.name.toLowerCase() === pair.global);
    if (local < 0 || global < 0) continue;
    const wantLocalFirst = c === pair.country;
    if (wantLocalFirst !== local < global) {
      const tmp = out[local]!;
      out[local] = out[global]!;
      out[global] = tmp;
    }
  }
  return out;
}

/** Only look up the visitor's country when a theme that depends on it is actually showing. */
export function needsCountry(themes: Named[]): boolean {
  const names = new Set(themes.map((t) => t.name.toLowerCase()));
  return PH_THEME_NAMES.some((n) => names.has(n)) || PAIRS.some((p) => names.has(p.local) || names.has(p.global));
}
