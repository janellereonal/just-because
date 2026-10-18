/**
 * "Friends arrive" (flag friendsIntro): who pops out of the box.
 *
 * One little character per friend who wrote a note, picked from their name so the same friend is
 * always the same animal on every visit, and no two friends share one. The last friend is "late"
 * (pops out after the others) when there are at least three.
 */
import type { AccessoryId } from "@/themes/_shared/cast/types";
import type { ThemeKind } from "@/lib/themeKind";

/** Clay characters that read well small and side by side. */
export const STORY_ANIMALS = [
  "bear",
  "bunny",
  "cat",
  "dog",
  "duck",
  "frog",
  "fox",
  "panda",
  "chick",
  "penguin",
  "koala",
  "pig",
  "hedgehog",
  "mouse",
  "owl",
  "sheep",
  "dino",
  "elephant",
] as const;

/** How many fit on a phone screen (the rest are counted, not drawn). */
export const MAX_FRIENDS = 7;

export type StoryFriend = { key: string; name: string; animal: string };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** "Maria Clara Santos" → "Maria". Long single names are cut so the tag stays small. */
export function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}

/**
 * The friends to draw. Names are de-duplicated (case and spaces ignored). With no names yet,
 * three unnamed friends come out so the story still works in a preview.
 */
export function storyCast(names: string[], max = MAX_FRIENDS): { friends: StoryFriend[]; total: number; extra: number } {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of names) {
    const n = raw.trim();
    const k = n.toLowerCase().replace(/\s+/g, " ");
    if (!n || seen.has(k)) continue;
    seen.add(k);
    unique.push(n);
  }
  const shown = unique.length ? unique.slice(0, max) : ["", "", ""];
  const used = new Set<string>();
  const friends = shown.map((name, i) => {
    const pool = STORY_ANIMALS;
    let at = hash(name || `friend-${i}`) % pool.length;
    // Next free animal, so two friends never look the same (there are more animals than seats).
    while (used.has(pool[at]!)) at = (at + 1) % pool.length;
    used.add(pool[at]!);
    return { key: `${i}-${name}`, name: name ? shortName(name) : "", animal: pool[at]! };
  });
  return { friends, total: unique.length, extra: Math.max(0, unique.length - friends.length) };
}

/** A little costume for the occasion, from the cast's own accessories. */
export function storyAccessory(kind: ThemeKind): AccessoryId | null {
  switch (kind) {
    case "christmas":
      return "scarf";
    case "wedding":
    case "bridal":
      return "bowtie";
    case "valentine":
    case "anniversary":
      return "bow";
    case "baby":
      return "bonnet";
    case "voyage":
      return "pilot-cap";
    case "pets":
      return "bandana";
    case "handwritten":
      return null;
    default:
      return "party-hat";
  }
}

/**
 * Where each friend stands, centred on x = 0, with `floor` the y of the front row's feet.
 * Up to four stand in one row; more make a second, slightly smaller row behind, set between
 * the front ones so every face shows.
 */
export function storySeats(count: number, width: number, floor: number) {
  const size = Math.round(Math.max(70, Math.min(150, width * (count <= 4 ? 0.27 : 0.25))));
  const rows = count <= 4 ? [count] : [Math.ceil(count / 2), Math.floor(count / 2)];
  const seats: { x: number; y: number; size: number; z: number }[] = [];
  const back = rows.length > 1;
  rows.forEach((n, r) => {
    const s = back && r === 0 ? Math.round(size * 0.86) : size;
    const usable = width - 24 - s;
    const gap = n > 1 ? Math.min(s * (back && r === 0 ? 1.3 : 1.1), usable / (n - 1)) : 0;
    const y = back && r === 0 ? floor - size * 0.6 : floor;
    for (let i = 0; i < n; i++) seats.push({ x: (i - (n - 1) / 2) * gap, y, size: s, z: r + 1 });
  });
  return seats;
}
