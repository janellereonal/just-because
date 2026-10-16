/**
 * People you build: the options, their labels, 40 ready-made people, the
 * face map for each age, and the cleaning the server runs on a saved person.
 * Pure data, safe on the server. The 3D model is src/lib/clay/person.ts.
 *
 * A saved person is { type: "person", person: PersonConfig, preset?, image_url? }.
 * The still comes from image_url (baked in the editor and uploaded), else the
 * preset's file in public/clay/people/, else it is rendered in the browser.
 */

export const SKIN_TONES = ["#FCE3D2", "#F6D2B8", "#EFC0A0", "#E6AE88", "#D69B74", "#C48660", "#A86D4A", "#8C5638", "#6E432B", "#523022"] as const;

export const HAIR_COLORS = [
  { id: "black", label: "Black", hex: "#2A2326" },
  { id: "dark", label: "Dark brown", hex: "#4A3328" },
  { id: "brown", label: "Brown", hex: "#7A5236" },
  { id: "auburn", label: "Auburn", hex: "#9C4A2E" },
  { id: "ginger", label: "Ginger", hex: "#D9773A" },
  { id: "blonde", label: "Blonde", hex: "#E8C27A" },
  { id: "platinum", label: "Platinum", hex: "#F2E6C8" },
  { id: "grey", label: "Grey", hex: "#B8B4B0" },
  { id: "pink", label: "Pink", hex: "#F2A7C3" },
  { id: "blue", label: "Blue", hex: "#7FA8E8" },
] as const;

export const OUTFIT_COLORS = [
  { id: "terracotta", label: "Terracotta", hex: "#C96A45" },
  { id: "blush", label: "Blush", hex: "#F0A8B8" },
  { id: "sun", label: "Sun", hex: "#F6C350" },
  { id: "mint", label: "Mint", hex: "#8FD3BC" },
  { id: "sky", label: "Sky", hex: "#8EC0E8" },
  { id: "blue", label: "Blue", hex: "#4F7FD9" },
  { id: "lavender", label: "Lavender", hex: "#B9A3E0" },
  { id: "red", label: "Red", hex: "#D9534F" },
  { id: "green", label: "Green", hex: "#6FB27C" },
  { id: "cream", label: "Cream", hex: "#F4EEE3" },
  { id: "charcoal", label: "Charcoal", hex: "#3E3A40" },
  { id: "navy", label: "Navy", hex: "#2E3F6E" },
] as const;

const opts = <T extends string>(...pairs: [T, string][]) => pairs.map(([id, label]) => ({ id, label }));

export const AGES = opts(["kid", "Kid"], ["teen", "Teen"], ["adult", "Grown-up"], ["senior", "Grandparent"]);
export const EXPRESSIONS = opts(["smile", "Smile"], ["grin", "Big grin"], ["joy", "Happy eyes"], ["wink", "Wink"], ["wow", "Surprised"], ["calm", "Calm"]);
export const HAIRS = opts(
  ["crop", "Short"],
  ["side", "Side part"],
  ["messy", "Messy"],
  ["curls", "Short curls"],
  ["afro", "Afro"],
  ["buzz", "Buzz cut"],
  ["spiky", "Spiky"],
  ["quiff", "Quiff"],
  ["long", "Long"],
  ["wavy", "Long waves"],
  ["bob", "Bob"],
  ["pixie", "Pixie"],
  ["ponytail", "Ponytail"],
  ["bun", "Top bun"],
  ["buns", "Space buns"],
  ["pigtails", "Pigtails"],
  ["braids", "Two braids"],
  ["sidebraid", "Side braid"],
  ["bangs", "Long with bangs"],
  ["longcurls", "Long curls"],
  ["manbun", "Small bun"],
  ["locs", "Locs"],
  ["horseshoe", "Thinning"],
  ["bald", "Bald"],
);
export const FACIAL = opts(["none", "None"], ["stubble", "Stubble"], ["mustache", "Mustache"], ["goatee", "Goatee"], ["beard", "Beard"]);
export const EYEWEAR = opts(["none", "None"], ["round", "Round glasses"], ["square", "Square glasses"], ["sun", "Sunglasses"], ["hearts", "Heart glasses"]);
export const HEADWEAR = opts(
  ["none", "None"],
  ["beanie", "Beanie"],
  ["cap", "Cap"],
  ["sunhat", "Sun hat"],
  ["bucket", "Bucket hat"],
  ["beret", "Beret"],
  ["headband", "Headband"],
  ["bow", "Bow"],
  ["flowers", "Flower crown"],
  ["party", "Party hat"],
  ["crown", "Crown"],
  ["grad", "Grad cap"],
);
export const OUTFITS = opts(
  ["tee", "T-shirt"],
  ["stripes", "Striped tee"],
  ["hoodie", "Hoodie"],
  ["sweater", "Sweater"],
  ["cardigan", "Cardigan"],
  ["shirt", "Button-up"],
  ["jacket", "Open jacket"],
  ["denim", "Denim jacket"],
  ["blazer", "Blazer"],
  ["suit", "Suit and tie"],
  ["dress", "Dress"],
  ["sundress", "Sundress"],
  ["overalls", "Overalls"],
  ["raincoat", "Raincoat"],
  ["puffer", "Puffer"],
  ["jersey", "Jersey"],
  ["apron", "Apron"],
  ["labcoat", "Lab coat"],
  ["scrubs", "Scrubs"],
  ["gown", "Grad gown"],
);
export const HELD = opts(
  ["none", "Nothing"],
  ["book", "Book"],
  ["cup", "Coffee"],
  ["flowers", "Flowers"],
  ["balloon", "Balloon"],
  ["gift", "Gift"],
  ["cupcake", "Cupcake"],
  ["phone", "Phone"],
  ["camera", "Camera"],
  ["guitar", "Guitar"],
  ["icecream", "Ice cream"],
  ["heart", "Heart"],
  ["wand", "Star wand"],
  ["pizza", "Pizza"],
  ["brush", "Paintbrush"],
  ["ball", "Ball"],
  ["controller", "Controller"],
  ["plant", "Plant"],
  ["letter", "Letter"],
  ["popsicle", "Popsicle"],
  ["teddy", "Teddy"],
);

type Ids<T extends readonly { id: string }[]> = T[number]["id"];
export type Age = Ids<typeof AGES>;
export type Expression = Ids<typeof EXPRESSIONS>;
export type HairStyle = Ids<typeof HAIRS>;
export type FacialHair = Ids<typeof FACIAL>;
export type Eyewear = Ids<typeof EYEWEAR>;
export type Headwear = Ids<typeof HEADWEAR>;
export type Outfit = Ids<typeof OUTFITS>;
export type Held = Ids<typeof HELD>;
export type HairColor = (typeof HAIR_COLORS)[number]["id"];
export type OutfitColor = (typeof OUTFIT_COLORS)[number]["id"];

export type PersonConfig = {
  age: Age;
  skin: number;
  expression: Expression;
  hair: HairStyle;
  hairColor: HairColor;
  facial: FacialHair;
  eyewear: Eyewear;
  headwear: Headwear;
  outfit: Outfit;
  outfitColor: OutfitColor;
  held: Held;
};

export const DEFAULT_PERSON: PersonConfig = {
  age: "adult",
  skin: 2,
  expression: "smile",
  hair: "side",
  hairColor: "dark",
  facial: "none",
  eyewear: "none",
  headwear: "none",
  outfit: "tee",
  outfitColor: "sky",
  held: "none",
};

/** Every option list, in the order the builder shows them. */
export const PERSON_PARTS = [
  { key: "age", label: "Age", options: AGES },
  { key: "expression", label: "Face", options: EXPRESSIONS },
  { key: "hair", label: "Hair", options: HAIRS },
  { key: "facial", label: "Facial hair", options: FACIAL },
  { key: "eyewear", label: "Glasses", options: EYEWEAR },
  { key: "headwear", label: "Hat", options: HEADWEAR },
  { key: "outfit", label: "Outfit", options: OUTFITS },
  { key: "held", label: "Holding", options: HELD },
] as const;

/* ---------- body layout per age (shared by the 3D model and the live face) ---------- */

export type BodyLayout = {
  head: { x: number; y: number; w: number; h: number; d: number };
  torso: { top: number; bottom: number; w: number; d: number };
};

export const LAYOUT: Record<Age, BodyLayout> = {
  kid: { head: { x: 60, y: 50, w: 62, h: 58, d: 56 }, torso: { top: 80, bottom: 101, w: 38, d: 30 } },
  teen: { head: { x: 60, y: 45, w: 58, h: 55, d: 53 }, torso: { top: 74, bottom: 99, w: 40, d: 30 } },
  adult: { head: { x: 60, y: 41, w: 56, h: 53, d: 51 }, torso: { top: 69, bottom: 97, w: 44, d: 32 } },
  senior: { head: { x: 60, y: 44, w: 56, h: 53, d: 51 }, torso: { top: 72, bottom: 98, w: 46, d: 34 } },
};

/** How high the hair reaches above the head's center, as a share of head height. */
export function hairTop(p: PersonConfig) {
  const { head: H } = LAYOUT[p.age];
  const k: Partial<Record<HairStyle, number>> = { afro: 0.8, curls: 0.68, longcurls: 0.66, spiky: 0.72, quiff: 0.74, bald: 0.5, horseshoe: 0.5, buzz: 0.52 };
  return H.y - H.h * (k[p.hair] ?? 0.62);
}

/** Where the live face goes for this person (matches the 3D head). */
export function personFace(p: PersonConfig) {
  const { head: H, torso: T } = LAYOUT[p.age];
  const gap = H.w * 0.38;
  const ey = H.y + 3;
  return {
    eyes: { l: [H.x - gap / 2, ey] as [number, number], r: [H.x + gap / 2, ey] as [number, number], size: H.w * 0.068 },
    mouth: [H.x, H.y + 15] as [number, number],
    cheeks: { l: [H.x - gap / 2 - 7, H.y + 11] as [number, number], r: [H.x + gap / 2 + 7, H.y + 11] as [number, number] },
    head: { x: H.x, y: hairTop(p) + 4, w: H.w * 0.82 },
    neck: { x: H.x, y: T.top + 1, w: T.w },
    hideEyes: p.eyewear === "sun",
    expression: p.expression,
    /** A person wearing their own hat doesn't also get the theme's. */
    ownHat: p.headwear !== "none",
  };
}

/* ---------- cleaning ---------- */

const pick = <T extends string>(v: unknown, list: readonly { id: T }[], fallback: T): T =>
  typeof v === "string" && list.some((o) => o.id === v) ? (v as T) : fallback;

export function normalizePerson(value: unknown): PersonConfig {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const skin = typeof v["skin"] === "number" && Number.isInteger(v["skin"]) && v["skin"] >= 0 && v["skin"] < SKIN_TONES.length ? v["skin"] : DEFAULT_PERSON.skin;
  return {
    age: pick(v["age"], AGES, DEFAULT_PERSON.age),
    skin,
    expression: pick(v["expression"], EXPRESSIONS, DEFAULT_PERSON.expression),
    hair: pick(v["hair"], HAIRS, DEFAULT_PERSON.hair),
    hairColor: pick(v["hairColor"], HAIR_COLORS, DEFAULT_PERSON.hairColor),
    facial: pick(v["facial"], FACIAL, DEFAULT_PERSON.facial),
    eyewear: pick(v["eyewear"], EYEWEAR, DEFAULT_PERSON.eyewear),
    headwear: pick(v["headwear"], HEADWEAR, DEFAULT_PERSON.headwear),
    outfit: pick(v["outfit"], OUTFITS, DEFAULT_PERSON.outfit),
    outfitColor: pick(v["outfitColor"], OUTFIT_COLORS, DEFAULT_PERSON.outfitColor),
    held: pick(v["held"], HELD, DEFAULT_PERSON.held),
  };
}

/** A short stable key for a person (file names, caches). */
export function personKey(p: PersonConfig) {
  const s = [p.age, p.skin, p.expression, p.hair, p.hairColor, p.facial, p.eyewear, p.headwear, p.outfit, p.outfitColor, p.held].join(".");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** "Little you" from before the builder: closest skin, hair and outfit colors, side part and a tee. */
export function personFromLegacy(colors?: { primary?: string; secondary?: string; skin?: string }): PersonConfig {
  const near = (hex: string | undefined, list: readonly string[]) => {
    if (!hex) return -1;
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = rgb(hex);
    let best = 0;
    let bd = Infinity;
    list.forEach((c, i) => {
      const b = rgb(c);
      const d = (a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const skin = near(colors?.skin ?? "#E9B48F", SKIN_TONES);
  const hair = near(colors?.secondary ?? "#3B2A24", HAIR_COLORS.map((h) => h.hex));
  const outfit = near(colors?.primary ?? "#6C8EF2", OUTFIT_COLORS.map((o) => o.hex));
  return { ...DEFAULT_PERSON, skin, hairColor: HAIR_COLORS[hair]!.id, outfitColor: OUTFIT_COLORS[outfit]!.id };
}

/* ---------- 40 ready-made people ---------- */

const P = (id: string, name: string, tags: string[], p: Partial<PersonConfig>) => ({ id, name, tags, person: { ...DEFAULT_PERSON, ...p } as PersonConfig });

export const PEOPLE = [
  P("bookworm", "Bookworm", ["school", "handwritten", "graduation"], { age: "teen", skin: 1, hair: "messy", hairColor: "black", eyewear: "round", outfit: "jacket", outfitColor: "blue", held: "book" }),
  P("explorer", "Explorer", ["voyage", "school"], { age: "teen", skin: 3, hair: "quiff", hairColor: "dark", eyewear: "square", outfit: "stripes", outfitColor: "red", held: "camera" }),
  P("birthday-kid", "Birthday kid", ["birthday", "party"], { age: "kid", skin: 4, hair: "curls", hairColor: "black", expression: "grin", headwear: "party", outfit: "tee", outfitColor: "sun", held: "balloon" }),
  P("barista", "Barista", ["handwritten", "cozy", "morning"], { skin: 6, hair: "bun", hairColor: "dark", outfit: "apron", outfitColor: "terracotta", held: "cup" }),
  P("sweetheart", "Sweetheart", ["valentine", "anniversary", "love"], { skin: 2, hair: "wavy", hairColor: "auburn", expression: "joy", outfit: "sundress", outfitColor: "blush", held: "flowers" }),
  P("date-night", "Date night", ["valentine", "anniversary", "wedding"], { skin: 5, hair: "side", hairColor: "black", outfit: "suit", outfitColor: "navy", held: "heart" }),
  P("bride", "Bride", ["wedding", "bridal"], { skin: 3, hair: "bun", hairColor: "brown", expression: "joy", headwear: "flowers", outfit: "dress", outfitColor: "cream", held: "flowers" }),
  P("groom", "Groom", ["wedding"], { skin: 7, hair: "crop", hairColor: "black", facial: "beard", outfit: "suit", outfitColor: "charcoal" }),
  P("bridesmaid", "Bridesmaid", ["bridal", "wedding"], { skin: 8, hair: "longcurls", hairColor: "black", expression: "grin", outfit: "dress", outfitColor: "lavender", held: "flowers" }),
  P("new-parent", "New parent", ["baby"], { skin: 4, hair: "pixie", hairColor: "dark", expression: "calm", outfit: "cardigan", outfitColor: "mint", held: "teddy" }),
  P("little-one", "Little one", ["baby"], { age: "kid", skin: 1, hair: "pigtails", hairColor: "blonde", expression: "joy", outfit: "overalls", outfitColor: "sky", held: "teddy" }),
  P("cozy-winter", "Cozy winter", ["christmas", "winter"], { skin: 2, hair: "long", hairColor: "ginger", headwear: "beanie", outfit: "sweater", outfitColor: "red", held: "cup" }),
  P("gift-giver", "Gift giver", ["christmas", "birthday"], { skin: 6, hair: "afro", hairColor: "black", expression: "grin", outfit: "puffer", outfitColor: "green", held: "gift" }),
  P("party-starter", "Party starter", ["newyear", "party"], { skin: 3, hair: "bob", hairColor: "black", eyewear: "hearts", headwear: "crown", outfit: "blazer", outfitColor: "sun", held: "wand" }),
  P("traveler", "Traveler", ["voyage", "trip"], { skin: 5, hair: "ponytail", hairColor: "brown", eyewear: "sun", headwear: "bucket", outfit: "denim", outfitColor: "sky", held: "camera" }),
  P("beach-day", "Beach day", ["voyage", "summer"], { skin: 4, hair: "wavy", hairColor: "blonde", eyewear: "sun", headwear: "sunhat", outfit: "sundress", outfitColor: "sun", held: "icecream" }),
  P("pet-parent", "Pet parent", ["pets"], { skin: 2, hair: "messy", hairColor: "brown", outfit: "hoodie", outfitColor: "mint", held: "ball" }),
  P("dog-walker", "Dog walker", ["pets", "outdoors"], { skin: 7, hair: "locs", hairColor: "black", headwear: "cap", outfit: "raincoat", outfitColor: "sun" }),
  P("letter-writer", "Letter writer", ["handwritten", "notes"], { skin: 1, hair: "bangs", hairColor: "dark", eyewear: "round", outfit: "cardigan", outfitColor: "cream", held: "letter" }),
  P("artist", "Artist", ["handwritten", "art"], { skin: 5, hair: "manbun", hairColor: "dark", facial: "stubble", headwear: "beret", outfit: "apron", outfitColor: "navy", held: "brush" }),
  P("gamer", "Gamer", ["game", "pixel"], { age: "teen", skin: 6, hair: "spiky", hairColor: "blue", expression: "grin", outfit: "hoodie", outfitColor: "lavender", held: "controller" }),
  P("game-host", "Game host", ["game"], { skin: 3, hair: "quiff", hairColor: "ginger", facial: "mustache", outfit: "shirt", outfitColor: "red", held: "cupcake" }),
  P("pixel-pal", "Pixel pal", ["pixel", "game"], { age: "kid", skin: 8, hair: "buns", hairColor: "pink", expression: "wink", outfit: "jersey", outfitColor: "mint", held: "controller" }),
  P("graduate", "Graduate", ["graduation", "school"], { skin: 4, hair: "long", hairColor: "black", expression: "joy", headwear: "grad", outfit: "gown", outfitColor: "navy", held: "letter" }),
  P("teacher", "Teacher", ["school", "graduation", "handwritten"], { age: "senior", skin: 2, hair: "bob", hairColor: "grey", eyewear: "square", outfit: "cardigan", outfitColor: "terracotta", held: "book" }),
  P("grandpa", "Grandpa", ["family", "cozy"], { age: "senior", skin: 3, hair: "horseshoe", hairColor: "grey", facial: "mustache", eyewear: "round", outfit: "sweater", outfitColor: "green", held: "cup" }),
  P("grandma", "Grandma", ["family", "cozy"], { age: "senior", skin: 6, hair: "bun", hairColor: "platinum", expression: "joy", eyewear: "round", outfit: "cardigan", outfitColor: "lavender", held: "cupcake" }),
  P("doctor", "Doctor", ["work", "thanks"], { skin: 5, hair: "ponytail", hairColor: "black", outfit: "labcoat", outfitColor: "sky" }),
  P("nurse", "Nurse", ["work", "thanks"], { skin: 8, hair: "bun", hairColor: "black", outfit: "scrubs", outfitColor: "mint", held: "heart" }),
  P("coworker", "Coworker", ["work", "farewell"], { skin: 2, hair: "side", hairColor: "brown", facial: "goatee", eyewear: "square", outfit: "blazer", outfitColor: "charcoal", held: "cup" }),
  P("chef", "Chef", ["work", "food"], { skin: 4, hair: "crop", hairColor: "dark", facial: "beard", outfit: "apron", outfitColor: "red", held: "pizza" }),
  P("plant-friend", "Plant friend", ["garden", "home"], { skin: 9, hair: "afro", hairColor: "dark", headwear: "headband", outfit: "overalls", outfitColor: "green", held: "plant" }),
  P("musician", "Musician", ["music", "party"], { skin: 7, hair: "long", hairColor: "dark", facial: "stubble", outfit: "denim", outfitColor: "blue", held: "guitar" }),
  P("sporty", "Sporty", ["sports", "outdoors"], { age: "teen", skin: 9, hair: "buzz", hairColor: "black", expression: "grin", headwear: "headband", outfit: "jersey", outfitColor: "blue", held: "ball" }),
  P("sunny", "Sunny", ["summer", "birthday"], { age: "kid", skin: 3, hair: "braids", hairColor: "auburn", expression: "joy", headwear: "bow", outfit: "dress", outfitColor: "sun", held: "popsicle" }),
  P("rainy-day", "Rainy day", ["cozy", "rain"], { age: "kid", skin: 5, hair: "bob", hairColor: "black", outfit: "raincoat", outfitColor: "sun", held: "teddy" }),
  P("bestie", "Bestie", ["birthday", "friends"], { age: "teen", skin: 2, hair: "sidebraid", hairColor: "blonde", expression: "wink", outfit: "stripes", outfitColor: "navy", held: "phone" }),
  P("dreamer", "Dreamer", ["night", "wish"], { skin: 1, hair: "longcurls", hairColor: "platinum", expression: "calm", outfit: "sweater", outfitColor: "lavender", held: "wand" }),
  P("cool-uncle", "Cool uncle", ["family", "party"], { skin: 6, hair: "bald", facial: "beard", hairColor: "dark", eyewear: "sun", outfit: "shirt", outfitColor: "sun", held: "phone" }),
  P("royalty", "Royalty", ["birthday", "pixel"], { age: "kid", skin: 7, hair: "curls", hairColor: "dark", expression: "grin", headwear: "crown", outfit: "suit", outfitColor: "lavender", held: "gift" }),
] as const;

export type PersonPreset = (typeof PEOPLE)[number];
export const presetById = (id: string) => PEOPLE.find((p) => p.id === id);
