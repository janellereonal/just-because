/**
 * The clay-only cast (Oct 2026): animals and little friends modelled in
 * src/lib/clay/animals.ts and objects.ts, rendered to public/clay/<id>.webp.
 * They have no drawn SVG body, so they always show their clay still in their
 * own colors (Customize only changes the name tag for these).
 *
 * `tags` feed the picker: theme kinds (so each theme can suggest its own
 * friends) plus a few plain words for search.
 */
import type { CharacterSpec } from "@/themes/_shared/cast/library";

/** Blush that still reads as pink on green skin (the default pink turns brown there). */
export const GREEN_BLUSH = { color: "#FF5A86" };

type Face = NonNullable<CharacterSpec["clay"]>;
type Entry = Omit<CharacterSpec, "body" | "eyes" | "mouth" | "cheeks" | "head" | "neck" | "clay"> & { face: Face };

/** Eyes, mouth and cheeks in one line: [eyeY, eyeGap, size, mouthY | null, cheekDY, cheekDX, x]. */
function face(
  y: number,
  gap: number,
  size: number,
  mouth: number | null,
  head: [number, number],
  neck: [number, number],
  { x = 60, cheekY = 9, cheekX = 9, ink, blush }: { x?: number; cheekY?: number; cheekX?: number; ink?: string; blush?: Face["blush"] } = {},
): Face {
  return {
    eyes: { l: [x - gap / 2, y], r: [x + gap / 2, y], size },
    mouth: mouth === null ? null : [x, mouth],
    cheeks: { l: [x - gap / 2 - cheekX, y + cheekY], r: [x + gap / 2 + cheekX, y + cheekY] },
    head: { x, y: head[0], w: head[1] },
    neck: { x, y: neck[0], w: neck[1] },
    ...(ink ? { ink } : {}),
    ...(blush ? { blush } : {}),
  };
}

const ENTRIES: Entry[] = [
  // ---------- animals ----------
  { id: "snail", name: "Snail", category: "Animals", tags: ["garden", "slow", "handwritten"], colors: { primary: "#F09A5B", secondary: "#F09A5B", skin: "#F3D49B" }, face: { ...face(29, 22, 3.2, 70, [14, 30], [92, 40]), eyes: { l: [21, 29], r: [43, 29], size: 3.2 }, mouth: [32, 70], cheeks: { l: [24, 66], r: [40, 66] }, blush: { size: 0.75 }, head: { x: 32, y: 18, w: 28 }, neck: { x: 32, y: 92, w: 30 } } },
  { id: "octopus", name: "Octopus", category: "Animals", tags: ["sea", "ocean", "voyage"], colors: { primary: "#F2A65A", secondary: "#F7C38E", skin: "#F7C38E" }, face: face(62, 26, 4, 74, [24, 54], [88, 56]) },
  { id: "bee", name: "Bee", category: "Animals", tags: ["garden", "honey", "birthday"], colors: { primary: "#FFD34E", secondary: "#5A3A22", skin: "#FFD34E" }, face: face(62, 26, 4, 72, [38, 46], [86, 60]) },
  { id: "chick", name: "Chick", category: "Animals", tags: ["farm", "baby", "easter"], colors: { primary: "#FFE27A", secondary: "#E8463C", skin: "#F59A3C" }, face: face(63, 26, 4, null, [32, 40], [94, 56]) },
  { id: "elephant", name: "Elephant", category: "Animals", tags: ["safari", "baby"], colors: { primary: "#B9BEC8", secondary: "#F4BFC8", skin: "#B9BEC8" }, face: face(63, 28, 3.8, null, [38, 46], [96, 56], { cheekX: 10, cheekY: 11 }) },
  { id: "turtle", name: "Turtle", category: "Animals", tags: ["sea", "slow", "voyage"], colors: { primary: "#95D27C", secondary: "#4E8F4A", skin: "#95D27C" }, face: face(64, 26, 4, 76, [36, 46], [100, 56], { blush: GREEN_BLUSH }) },
  { id: "pig", name: "Pig", category: "Animals", tags: ["farm"], colors: { primary: "#F8B9AA", secondary: "#F09A8C", skin: "#F8B9AA" }, face: face(66, 30, 4, 96, [38, 50], [100, 56], { cheekX: 8, cheekY: 12 }) },
  { id: "penguin", name: "Penguin", category: "Animals", tags: ["snow", "christmas", "winter"], colors: { primary: "#34313B", secondary: "#FBF6EE", skin: "#F5A33C" }, face: face(63, 24, 4, null, [34, 44], [92, 56]) },
  { id: "giraffe", name: "Giraffe", category: "Animals", tags: ["safari", "tall"], colors: { primary: "#F4C350", secondary: "#B9772F", skin: "#FBE3A4" }, face: face(48, 24, 3.8, 67, [24, 44], [80, 34], { cheekY: 8, cheekX: 10 }) },
  { id: "dino", name: "Dino", category: "Animals", tags: ["birthday", "game", "rawr"], colors: { primary: "#8FCB6E", secondary: "#F3B23C", skin: "#DDF1BE" }, face: face(62, 26, 4, 74, [36, 44], [94, 56], { blush: GREEN_BLUSH }) },
  { id: "koala", name: "Koala", category: "Animals", tags: ["sleepy", "cuddle"], colors: { primary: "#A3A3AB", secondary: "#3A3540", skin: "#ECE8E4" }, face: face(66, 32, 3.8, 93, [38, 46], [100, 56], { cheekX: 6, cheekY: 12 }) },
  { id: "hedgehog", name: "Hedgehog", category: "Animals", tags: ["garden", "autumn"], colors: { primary: "#7E5638", secondary: "#7E5638", skin: "#F6DDB2" }, face: face(70, 20, 3.4, 88, [26, 56], [100, 50], { cheekX: 8, cheekY: 9 }) },
  { id: "sheep", name: "Sheep", category: "Animals", tags: ["farm", "sleepy", "baby"], colors: { primary: "#FBF6EC", secondary: "#F1D2B8", skin: "#F1D2B8" }, face: face(72, 18, 3.4, 84, [40, 40], [96, 50], { cheekX: 4, cheekY: 7 }) },
  { id: "panda", name: "Panda", category: "Animals", tags: ["cuddle", "bamboo"], colors: { primary: "#FAF7F2", secondary: "#3A363C", skin: "#FAF7F2" }, face: face(69, 30, 3.6, 88, [38, 50], [98, 56], { cheekX: 11, cheekY: 15, ink: "#1A1418" }) },
  { id: "fox", name: "Fox", category: "Animals", tags: ["autumn", "forest"], colors: { primary: "#EE8F45", secondary: "#4A3328", skin: "#FFF6EC" }, face: face(66, 26, 4, 88, [36, 48], [98, 56]) },
  { id: "mouse", name: "Mouse", category: "Animals", tags: ["cheese", "little"], colors: { primary: "#C9C3CF", secondary: "#F4A9B8", skin: "#C9C3CF" }, face: face(70, 24, 3.8, 89, [42, 44], [100, 52]) },
  { id: "owl", name: "Owl", category: "Animals", tags: ["night", "wise", "graduation", "handwritten"], colors: { primary: "#A97B52", secondary: "#F5A33C", skin: "#F5E3C8" }, face: face(64, 28, 4.6, null, [36, 44], [96, 56], { cheekY: 18, cheekX: 6 }) },
  { id: "whale", name: "Whale", category: "Animals", tags: ["sea", "ocean", "voyage"], colors: { primary: "#6FA8DC", secondary: "#BFE3F7", skin: "#EAF4FB" }, face: face(72, 24, 3.8, 84, [52, 50], [102, 60], { x: 48 }) },

  // ---------- little friends ----------
  { id: "robot", name: "Robot", category: "Objects", tags: ["game", "pixel", "tech", "future"], colors: { primary: "#9AD8C8", secondary: "#FFD166", skin: "#9AD8C8" }, face: face(55, 22, 3.6, 66, [16, 40], [84, 46], { ink: "#FFFFFF", cheekX: 4, cheekY: 9 }) },
  { id: "star", name: "Star", category: "Objects", tags: ["night", "pixel", "newyear", "wish"], colors: { primary: "#FFC94D", secondary: "#FFC94D", skin: "#FFC94D" }, face: face(66, 22, 3.8, 77, [22, 30], [96, 40]) },
  { id: "candle", name: "Candle", category: "Objects", tags: ["birthday", "christmas", "wish", "cozy"], colors: { primary: "#FBEFD8", secondary: "#F2B45A", skin: "#FBEFD8" }, face: face(82, 24, 3.6, 93, [48, 48], [104, 52]) },
  { id: "pencil", name: "Pencil", category: "Objects", tags: ["school", "handwritten", "teacher", "graduation"], colors: { primary: "#FFD15C", secondary: "#F4A3A8", skin: "#F2D3A8" }, face: face(64, 16, 3.2, 74, [14, 26], [90, 34], { cheekX: 3, cheekY: 7, blush: { size: 0.7 } }) },
  { id: "camera", name: "Camera", category: "Objects", tags: ["voyage", "photo", "trip"], colors: { primary: "#9CCFC4", secondary: "#9CCFC4", skin: "#FBF1E2" }, face: face(66, 28, 3.4, null, [44, 30], [106, 60], { cheekY: 0, cheekX: 10 }) },
  { id: "backpack", name: "Backpack", category: "Objects", tags: ["voyage", "school", "trip"], colors: { primary: "#D9B07A", secondary: "#D9B07A", skin: "#D9B07A" }, face: face(66, 24, 3.8, 76, [42, 50], [104, 56]) },
  { id: "drop", name: "Raindrop", category: "Objects", tags: ["rain", "calm"], colors: { primary: "#A8D3EE", secondary: "#A8D3EE", skin: "#A8D3EE" }, face: face(84, 24, 3.8, 94, [36, 22], [106, 50]) },
  { id: "planet", name: "Planet", category: "Objects", tags: ["space", "night", "pixel", "voyage"], colors: { primary: "#F2B07A", secondary: "#F7E3C4", skin: "#F2B07A" }, face: face(56, 24, 3.8, 67, [28, 46], [96, 50]) },
  { id: "bulb", name: "Light bulb", category: "Objects", tags: ["idea", "game", "graduation"], colors: { primary: "#FFE680", secondary: "#FFE680", skin: "#FFE680" }, face: face(52, 24, 3.8, 63, [20, 46], [84, 40]) },
  { id: "bubble", name: "Speech bubble", category: "Objects", tags: ["chat", "handwritten", "notes"], colors: { primary: "#BBA6E3", secondary: "#FFFFFF", skin: "#BBA6E3" }, face: face(72, 24, 3.8, 83, [26, 50], [100, 56]) },
  { id: "heart", name: "Heart", category: "Objects", tags: ["valentine", "anniversary", "wedding", "bridal", "love"], colors: { primary: "#F27A93", secondary: "#F27A93", skin: "#F27A93" }, face: face(58, 26, 4, 70, [24, 50], [96, 50]) },
  { id: "cake", name: "Cake", category: "Objects", tags: ["birthday", "party", "wedding", "bridal"], colors: { primary: "#F7A8C0", secondary: "#E8463C", skin: "#F6DDB0" }, face: face(91, 28, 3.6, 100, [58, 40], [106, 66], { cheekY: 6, cheekX: 8 }) },
  { id: "balloon", name: "Balloon", category: "Objects", tags: ["birthday", "party", "baby", "newyear"], colors: { primary: "#F26B7A", secondary: "#F26B7A", skin: "#F26B7A" }, face: face(50, 24, 3.8, 61, [16, 44], [92, 20]) },
  { id: "letter", name: "Love letter", category: "Objects", tags: ["handwritten", "valentine", "anniversary", "wedding", "bridal", "notes", "love"], colors: { primary: "#FBF3E6", secondary: "#E8577E", skin: "#FBF3E6" }, face: face(92, 26, 3.4, 100, [48, 50], [106, 60], { cheekY: 4, cheekX: 10 }) },
  { id: "snowman", name: "Snowman", category: "Objects", tags: ["christmas", "snow", "winter"], colors: { primary: "#FFFFFF", secondary: "#D94B5A", skin: "#FFFFFF" }, face: face(52, 18, 3.4, 68, [28, 40], [75, 40], { cheekX: 6, cheekY: 9 }) },
  { id: "ornament", name: "Ornament", category: "Objects", tags: ["christmas", "newyear"], colors: { primary: "#D94B5A", secondary: "#E5C26B", skin: "#D94B5A" }, face: face(70, 24, 3.8, 81, [30, 30], [104, 50]) },
  { id: "suitcase", name: "Suitcase", category: "Objects", tags: ["voyage", "trip"], colors: { primary: "#F2C14E", secondary: "#E8577E", skin: "#F2C14E" }, face: face(72, 26, 3.6, 84, [46, 50], [104, 56], { cheekY: 7 }) },
  { id: "sun", name: "Sun", category: "Objects", tags: ["summer", "voyage", "morning"], colors: { primary: "#FFC94D", secondary: "#FFA94D", skin: "#FFC94D" }, face: face(62, 24, 4, 74, [12, 40], [104, 40]) },
];

export const CLAY_CAST: CharacterSpec[] = ENTRIES.map(({ face: f, ...e }) => ({
  ...e,
  eyes: f.eyes,
  mouth: f.mouth,
  ...(f.cheeks ? { cheeks: f.cheeks } : {}),
  head: f.head,
  neck: f.neck,
  clay: f,
}));
