/**
 * Placeholder characters: simple geometric shapes with eyes that follow the
 * finger and blink. Deliberately simple (no detailed illustration); real art
 * arrives as Rive files behind the same contract. All drawn in a 120x120 box.
 */
import type { AccessoryId } from "@/themes/_shared/cast/types";

export type Colors = { primary: string; secondary: string; skin: string };

export type CharacterSpec = {
  id: string;
  name: string;
  category: "Mascot" | "Animals" | "Little people" | "Objects";
  colors: Colors;
  /** Everything except the eyes and mouth (the component animates those). */
  body: (c: Colors) => React.ReactNode;
  eyes: { l: [number, number]; r: [number, number]; size: number };
  mouth: [number, number] | null;
  cheeks?: { l: [number, number]; r: [number, number] };
  /** Where hats sit (top center) and how wide the head is there. */
  head: { x: number; y: number; w: number };
  /** Where scarves and bow ties sit. */
  neck: { x: number; y: number; w: number };
};

const shade = (hex: string, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
};
export { shade };

/** A soft floor shadow, shared. */
const floor = <ellipse cx="60" cy="114" rx="30" ry="4.5" fill="rgba(0,0,0,.13)" />;

export const CHARACTERS: CharacterSpec[] = [
  {
    id: "mascot",
    name: "Bo",
    category: "Mascot",
    colors: { primary: "#FBF3EA", secondary: "#F07C9B", skin: "#FBF3EA" },
    body: (c) => (
      <>
        {floor}
        <rect x="24" y="48" width="72" height="60" rx="13" fill={c.primary} />
        <rect x="24" y="48" width="72" height="60" rx="13" fill="url(#jb-sheen)" />
        <rect x="55" y="48" width="10" height="60" fill={c.secondary} />
        <rect x="17" y="36" width="86" height="19" rx="8" fill={c.secondary} />
        <rect x="17" y="36" width="86" height="7" rx="3.5" fill="#fff" opacity=".25" />
        <path d="M60 36c-6-14-24-16-22-5 1 6 13 6 22 5zM60 36c6-14 24-16 22-5-1 6-13 6-22 5z" fill={c.secondary} />
        <circle cx="60" cy="35" r="4.5" fill={shade(c.secondary, -25)} />
        <ellipse cx="44" cy="109" rx="7" ry="4" fill={shade(c.secondary, -20)} />
        <ellipse cx="76" cy="109" rx="7" ry="4" fill={shade(c.secondary, -20)} />
      </>
    ),
    eyes: { l: [46, 75], r: [74, 75], size: 5 },
    mouth: [60, 88],
    cheeks: { l: [37, 86], r: [83, 86] },
    head: { x: 60, y: 24, w: 60 },
    neck: { x: 60, y: 56, w: 70 },
  },
  {
    id: "cat",
    name: "Cat",
    category: "Animals",
    colors: { primary: "#F2A65A", secondary: "#FFE1C2", skin: "#F2A65A" },
    body: (c) => (
      <>
        {floor}
        <path d="M26 46L32 14l24 20zM94 46L88 14 64 34z" fill={c.primary} />
        <path d="M32 40l3-17 12 11zM88 40l-3-17-12 11z" fill={c.secondary} />
        <ellipse cx="60" cy="70" rx="40" ry="37" fill={c.primary} />
        <ellipse cx="60" cy="70" rx="40" ry="37" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="86" rx="18" ry="12" fill={c.secondary} />
        <path d="M57 81h6l-3 3z" fill="#E86F7E" />
        <path d="M30 82h-14M31 88l-13 4M90 82h14M89 88l13 4" stroke={shade(c.primary, -60)} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      </>
    ),
    eyes: { l: [45, 67], r: [75, 67], size: 5.5 },
    mouth: [60, 89],
    cheeks: { l: [33, 80], r: [87, 80] },
    head: { x: 60, y: 34, w: 72 },
    neck: { x: 60, y: 104, w: 56 },
  },
  {
    id: "dog",
    name: "Dog",
    category: "Animals",
    colors: { primary: "#E9C39B", secondary: "#8A5A3C", skin: "#E9C39B" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="60" cy="68" rx="38" ry="38" fill={c.primary} />
        <ellipse cx="60" cy="68" rx="38" ry="38" fill="url(#jb-sheen)" />
        <path d="M26 44c-14 4-16 30-8 38 6 5 14-4 16-16 1-9-2-20-8-22zM94 44c14 4 16 30 8 38-6 5-14-4-16-16-1-9 2-20 8-22z" fill={c.secondary} />
        <ellipse cx="60" cy="84" rx="20" ry="15" fill="#FFF4E6" />
        <ellipse cx="60" cy="77" rx="7" ry="5" fill="#2B2522" />
      </>
    ),
    eyes: { l: [46, 62], r: [74, 62], size: 5.5 },
    mouth: [60, 90],
    cheeks: { l: [35, 78], r: [85, 78] },
    head: { x: 60, y: 30, w: 70 },
    neck: { x: 60, y: 104, w: 56 },
  },
  {
    id: "bunny",
    name: "Bunny",
    category: "Animals",
    colors: { primary: "#F4F0EC", secondary: "#F6B7C8", skin: "#F4F0EC" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="44" cy="30" rx="10" ry="27" fill={c.primary} transform="rotate(-8 44 30)" />
        <ellipse cx="76" cy="30" rx="10" ry="27" fill={c.primary} transform="rotate(8 76 30)" />
        <ellipse cx="44" cy="32" rx="5" ry="19" fill={c.secondary} transform="rotate(-8 44 32)" />
        <ellipse cx="76" cy="32" rx="5" ry="19" fill={c.secondary} transform="rotate(8 76 32)" />
        <circle cx="60" cy="76" r="35" fill={c.primary} />
        <circle cx="60" cy="76" r="35" fill="url(#jb-sheen)" />
        <path d="M56 84h8l-4 4z" fill={c.secondary} />
      </>
    ),
    eyes: { l: [47, 74], r: [73, 74], size: 5 },
    mouth: [60, 93],
    cheeks: { l: [36, 86], r: [84, 86] },
    head: { x: 60, y: 44, w: 60 },
    neck: { x: 60, y: 108, w: 50 },
  },
  {
    id: "bear",
    name: "Bear",
    category: "Animals",
    colors: { primary: "#A9774F", secondary: "#E9C9A6", skin: "#A9774F" },
    body: (c) => (
      <>
        {floor}
        <circle cx="28" cy="38" r="14" fill={c.primary} />
        <circle cx="92" cy="38" r="14" fill={c.primary} />
        <circle cx="28" cy="38" r="7" fill={c.secondary} />
        <circle cx="92" cy="38" r="7" fill={c.secondary} />
        <circle cx="60" cy="70" r="39" fill={c.primary} />
        <circle cx="60" cy="70" r="39" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="85" rx="17" ry="13" fill={c.secondary} />
        <ellipse cx="60" cy="79" rx="6" ry="4.5" fill="#2B2522" />
      </>
    ),
    eyes: { l: [46, 65], r: [74, 65], size: 5 },
    mouth: [60, 90],
    cheeks: { l: [34, 80], r: [86, 80] },
    head: { x: 60, y: 31, w: 66 },
    neck: { x: 60, y: 106, w: 56 },
  },
  {
    id: "duck",
    name: "Duck",
    category: "Animals",
    colors: { primary: "#FFD95A", secondary: "#F59A3C", skin: "#FFD95A" },
    body: (c) => (
      <>
        {floor}
        <circle cx="60" cy="68" r="40" fill={c.primary} />
        <circle cx="60" cy="68" r="40" fill="url(#jb-sheen)" />
        <path d="M58 28c-4-10 6-14 8-6 2-6 10-2 6 4" fill="none" stroke={c.primary} strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="60" cy="82" rx="16" ry="8" fill={c.secondary} />
        <path d="M45 82c6 3 24 3 30 0" stroke={shade(c.secondary, -40)} strokeWidth="1.5" fill="none" />
      </>
    ),
    eyes: { l: [46, 62], r: [74, 62], size: 5.5 },
    mouth: null,
    cheeks: { l: [32, 76], r: [88, 76] },
    head: { x: 60, y: 28, w: 70 },
    neck: { x: 60, y: 106, w: 56 },
  },
  {
    id: "frog",
    name: "Frog",
    category: "Animals",
    colors: { primary: "#7CCB7A", secondary: "#E9F7D9", skin: "#7CCB7A" },
    body: (c) => (
      <>
        {floor}
        <circle cx="38" cy="44" r="17" fill={c.primary} />
        <circle cx="82" cy="44" r="17" fill={c.primary} />
        <circle cx="38" cy="44" r="10" fill="#fff" />
        <circle cx="82" cy="44" r="10" fill="#fff" />
        <ellipse cx="60" cy="76" rx="46" ry="33" fill={c.primary} />
        <ellipse cx="60" cy="76" rx="46" ry="33" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="92" rx="26" ry="12" fill={c.secondary} />
      </>
    ),
    eyes: { l: [38, 44], r: [82, 44], size: 5.5 },
    mouth: [60, 82],
    cheeks: { l: [26, 80], r: [94, 80] },
    head: { x: 60, y: 28, w: 84 },
    neck: { x: 60, y: 106, w: 60 },
  },
  {
    id: "person",
    name: "Little you",
    category: "Little people",
    colors: { primary: "#6C8EF2", secondary: "#3B2A24", skin: "#E9B48F" },
    body: (c) => (
      <>
        {floor}
        <path d="M24 114c0-22 16-30 36-30s36 8 36 30z" fill={c.primary} />
        <circle cx="60" cy="58" r="32" fill={c.skin} />
        <circle cx="60" cy="58" r="32" fill="url(#jb-sheen)" />
        <path d="M27 58c-2-24 14-36 33-36s36 12 33 36c-6-12-18-18-33-18s-27 6-33 18z" fill={c.secondary} />
        <circle cx="60" cy="22" r="10" fill={c.secondary} />
        <ellipse cx="28" cy="62" rx="4" ry="6" fill={c.skin} />
        <ellipse cx="92" cy="62" rx="4" ry="6" fill={c.skin} />
      </>
    ),
    eyes: { l: [48, 62], r: [72, 62], size: 4.5 },
    mouth: [60, 75],
    cheeks: { l: [40, 70], r: [80, 70] },
    head: { x: 60, y: 14, w: 58 },
    neck: { x: 60, y: 90, w: 46 },
  },
  {
    id: "cup",
    name: "Coffee cup",
    category: "Objects",
    colors: { primary: "#F7EDE3", secondary: "#C2835A", skin: "#F7EDE3" },
    body: (c) => (
      <>
        {floor}
        <path d="M88 60c16 0 16 26 0 26" fill="none" stroke={c.primary} strokeWidth="8" />
        <path d="M24 46h68l-6 58a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill={c.primary} />
        <path d="M24 46h68l-6 58a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill="url(#jb-sheen)" />
        <ellipse cx="58" cy="46" rx="34" ry="6" fill={c.secondary} />
        <path d="M46 34c-4-6 4-8 0-14M60 32c-4-6 4-8 0-14M74 34c-4-6 4-8 0-14" stroke={shade(c.secondary, 40)} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" className="jb-steam" />
      </>
    ),
    eyes: { l: [47, 74], r: [69, 74], size: 4.5 },
    mouth: [58, 87],
    cheeks: { l: [38, 84], r: [78, 84] },
    head: { x: 58, y: 40, w: 64 },
    neck: { x: 58, y: 100, w: 52 },
  },
  {
    id: "plant",
    name: "Plant",
    category: "Objects",
    colors: { primary: "#6FB27C", secondary: "#E08A5F", skin: "#E08A5F" },
    body: (c) => (
      <>
        {floor}
        <path d="M60 58C40 50 30 30 38 16c12 6 22 22 22 42zM60 58c20-8 30-28 22-42-12 6-22 22-22 42zM60 58c-3-18 0-34 0-44 6 12 6 30 0 44z" fill={c.primary} />
        <path d="M30 58h60l-7 50a6 6 0 0 1-6 5H43a6 6 0 0 1-6-5z" fill={c.secondary} />
        <path d="M30 58h60l-7 50a6 6 0 0 1-6 5H43a6 6 0 0 1-6-5z" fill="url(#jb-sheen)" />
        <rect x="26" y="54" width="68" height="12" rx="4" fill={shade(c.secondary, 15)} />
      </>
    ),
    eyes: { l: [49, 82], r: [71, 82], size: 4.5 },
    mouth: [60, 94],
    cheeks: { l: [40, 92], r: [80, 92] },
    head: { x: 60, y: 12, w: 40 },
    neck: { x: 60, y: 62, w: 70 },
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "Objects",
    colors: { primary: "#FFFFFF", secondary: "#CFE3F7", skin: "#FFFFFF" },
    body: (c) => (
      <>
        {floor}
        <path d="M30 98a20 20 0 0 1-2-40 26 26 0 0 1 49-12 22 22 0 0 1 17 52z" fill={c.secondary} transform="translate(2 4)" />
        <path d="M30 98a20 20 0 0 1-2-40 26 26 0 0 1 49-12 22 22 0 0 1 17 52z" fill={c.primary} />
        <path d="M30 98a20 20 0 0 1-2-40 26 26 0 0 1 49-12 22 22 0 0 1 17 52z" fill="url(#jb-sheen)" />
      </>
    ),
    eyes: { l: [48, 70], r: [72, 70], size: 4.5 },
    mouth: [60, 83],
    cheeks: { l: [38, 80], r: [82, 80] },
    head: { x: 56, y: 22, w: 54 },
    neck: { x: 60, y: 98, w: 60 },
  },
  {
    id: "moon",
    name: "Moon",
    category: "Objects",
    colors: { primary: "#F7E7A6", secondary: "#E8CF73", skin: "#F7E7A6" },
    body: (c) => (
      <>
        {floor}
        <circle cx="60" cy="66" r="42" fill={c.primary} />
        <circle cx="60" cy="66" r="42" fill="url(#jb-sheen)" />
        <circle cx="38" cy="46" r="7" fill={c.secondary} opacity=".6" />
        <circle cx="84" cy="90" r="5" fill={c.secondary} opacity=".6" />
        <circle cx="86" cy="50" r="4" fill={c.secondary} opacity=".6" />
      </>
    ),
    eyes: { l: [47, 66], r: [73, 66], size: 4.5 },
    mouth: [60, 82],
    cheeks: { l: [36, 78], r: [84, 78] },
    head: { x: 60, y: 24, w: 66 },
    neck: { x: 60, y: 106, w: 56 },
  },
];

export const characterById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]!;

/* ---------- accessories ---------- */

/**
 * Costumes, drawn around (0,0) = the anchor point, sized for an 80-wide head.
 * Head pieces sit on `spec.head`; neck pieces on `spec.neck`.
 */
export const ACCESSORIES: Record<AccessoryId, { slot: "head" | "neck"; name: string; draw: () => React.ReactNode }> = {
  "party-hat": {
    slot: "head",
    name: "Party hat",
    draw: () => (
      <g transform="rotate(-12)">
        <path d="M-16 2L0-40 16 2z" fill="#2D4BD6" />
        <path d="M-11-10L-6-23M-4 0l7-22M5 1l5-15" stroke="#FFD166" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="0" cy="2" rx="17" ry="4" fill="#1F36A8" />
        <circle cx="0" cy="-42" r="6" fill="#FF7EB6" />
      </g>
    ),
  },
  bow: {
    slot: "head",
    name: "Bow",
    draw: () => (
      <g transform="translate(22 6) rotate(18)">
        <path d="M0 0l-16-10v20zM0 0l16-10v20z" fill="#B4335A" />
        <circle r="5" fill="#8E2246" />
      </g>
    ),
  },
  rose: {
    slot: "head",
    name: "Rose",
    draw: () => (
      <g transform="translate(24 8)">
        <path d="M-2 4c-10 4-12 14-6 16" stroke="#5E8C61" strokeWidth="3" fill="none" />
        <circle r="9" fill="#C24A6A" />
        <path d="M-5-2a6 6 0 0 1 10 0M-6 3a7 7 0 0 0 12 0" stroke="#8E2246" strokeWidth="1.8" fill="none" />
      </g>
    ),
  },
  veil: {
    slot: "head",
    name: "Veil",
    draw: () => (
      <g>
        <path d="M-30 4C-34 30-42 58-48 82H48C42 58 34 30 30 4z" fill="#FFFFFF" opacity=".42" />
        <path d="M-28 2c10-8 46-8 56 0" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
        {[-18, -6, 6, 18].map((x) => (
          <circle key={x} cx={x} cy={-3} r="2.6" fill="#F3E3B3" />
        ))}
      </g>
    ),
  },
  bowtie: {
    slot: "neck",
    name: "Bow tie",
    draw: () => (
      <g>
        <path d="M0 0l-14-8v16zM0 0l14-8v16z" fill="#2B2522" />
        <rect x="-4" y="-4" width="8" height="8" rx="2" fill="#4A3F3A" />
      </g>
    ),
  },
  bonnet: {
    slot: "head",
    name: "Bonnet",
    draw: () => (
      <g>
        <path d="M-36 14c0-28 16-40 36-40s36 12 36 40c-10-8-22-12-36-12s-26 4-36 12z" fill="#AFCDEB" />
        <path d="M-36 14c10-8 22-12 36-12s26 4 36 12" stroke="#fff" strokeWidth="4" fill="none" strokeDasharray="1 6" strokeLinecap="round" />
        <path d="M-30 16l-6 30M30 16l6 30" stroke="#F4BFC8" strokeWidth="4" strokeLinecap="round" />
      </g>
    ),
  },
  scarf: {
    slot: "neck",
    name: "Scarf",
    draw: () => (
      <g>
        <rect x="-38" y="-7" width="76" height="14" rx="7" fill="#A3203A" />
        <path d="M-38-1h76" stroke="#fff" strokeWidth="2" strokeDasharray="5 5" opacity=".6" />
        <path d="M14 4l6 26h10l-4-24z" fill="#A3203A" />
        <path d="M19 30h11" stroke="#E2B95B" strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
  },
  crown: {
    slot: "head",
    name: "Crown",
    draw: () => (
      <g transform="rotate(-8)">
        <path d="M-18 4l-4-24 11 11 11-17 11 17 11-11-4 24z" fill="#E5C26B" />
        <path d="M-18 4h36" stroke="#C49B3A" strokeWidth="3" />
        <circle cx="0" cy="-26" r="3" fill="#A99BF5" />
        <circle cx="-22" cy="-20" r="2.5" fill="#fff" />
        <circle cx="22" cy="-20" r="2.5" fill="#fff" />
      </g>
    ),
  },
  "pilot-cap": {
    slot: "head",
    name: "Pilot cap",
    draw: () => (
      <g>
        <path d="M-34 10c0-24 14-34 34-34s34 10 34 34z" fill="#8A5A3C" />
        <path d="M-36 10h72" stroke="#5E3B26" strokeWidth="5" strokeLinecap="round" />
        <circle cx="-12" cy="-6" r="9" fill="#BFE0F7" stroke="#3B2A24" strokeWidth="3" />
        <circle cx="12" cy="-6" r="9" fill="#BFE0F7" stroke="#3B2A24" strokeWidth="3" />
        <path d="M-3-6h6" stroke="#3B2A24" strokeWidth="3" />
      </g>
    ),
  },
  bandana: {
    slot: "neck",
    name: "Bandana",
    draw: () => (
      <g>
        <path d="M-36-5h72L0 26z" fill="#C0582F" />
        {[-20, -6, 8, 22, 0].map((x, i) => (
          <circle key={i} cx={x} cy={i === 4 ? 10 : 0} r="2" fill="#F1E8D8" />
        ))}
      </g>
    ),
  },
};
