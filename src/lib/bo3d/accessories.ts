/**
 * Small hats and props Bo wears on his lid, one per theme. Kept free of three.js
 * so pages can map a theme to an accessory without loading the 3D chunk.
 */
export const BO_ACCESSORIES = ["party_hat", "heart", "suitcase", "santa_hat", "paw", "sparkler", "rosette", "flower"] as const;

export type BoAccessory = (typeof BO_ACCESSORIES)[number];

const BY_KEYWORD: [RegExp, BoAccessory][] = [
  [/birthday/i, "party_hat"],
  [/valentine|romance/i, "heart"],
  [/voyage|farewell|travel/i, "suitcase"],
  [/christmas|holiday/i, "santa_hat"],
  [/pet|companion/i, "paw"],
  [/new year/i, "sparkler"],
  [/anniversary|milestone/i, "rosette"],
  [/wedding|bridal|shower/i, "flower"],
];

/** The accessory for a theme, matched on its name first, then its category. */
export function accessoryForTheme(theme: { name?: string | null; category?: string | null } | null | undefined): BoAccessory | null {
  if (!theme) return null;
  for (const text of [theme.name, theme.category]) {
    if (!text) continue;
    for (const [re, acc] of BY_KEYWORD) if (re.test(text)) return acc;
  }
  return null;
}
