/**
 * The cast: hand-drawn SVG characters with eyes that follow the finger, blink
 * and react. Animals sit with a body, paws and (for some) a tail that wags.
 * Real Rive art can replace any of them behind the same contract. All drawn
 * in a 120x120 box.
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
    id: "dog",
    name: "Dog",
    category: "Animals",
    colors: { primary: "#E2B07A", secondary: "#8A5634", skin: "#FFF3E2" },
    body: (c) => (
      <>
        {floor}
        {/* Tail, wagging behind */}
        <g className="jb-wag" style={{ transformOrigin: "82px 96px" }}>
          <path d="M80 98c10-2 18-10 20-22 1-5 6-4 6 1-1 15-11 26-24 27z" fill={c.primary} />
          <path d="M101 76c1-4 5-4 5 1" stroke={shade(c.primary, 30)} strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
        {/* Body, sitting */}
        <ellipse cx="60" cy="95" rx="26" ry="19" fill={c.primary} />
        <path d="M46 84c4 10 24 10 28 0 2 8-2 20-14 21-12-1-16-13-14-21z" fill={c.skin} />
        <ellipse cx="60" cy="95" rx="26" ry="19" fill="url(#jb-sheen)" />
        {/* Front paws */}
        <ellipse cx="49" cy="110" rx="8.5" ry="5.5" fill={c.skin} />
        <ellipse cx="71" cy="110" rx="8.5" ry="5.5" fill={c.skin} />
        <path d="M46 109v3M49 109v3.5M52 109v3M68 109v3M71 109v3.5M74 109v3" stroke={shade(c.primary, -45)} strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
        {/* Head */}
        <path d="M26 52c0-22 15-34 34-34s34 12 34 34c0 20-15 32-34 32S26 72 26 52z" fill={c.primary} />
        <ellipse cx="74" cy="48" rx="11" ry="10" fill={shade(c.primary, -22)} opacity=".55" />
        {/* Floppy ears */}
        <path d="M30 30c-10 2-17 14-16 30 1 10 7 16 13 13 6-3 7-14 8-24 1-9-1-17-5-19z" fill={c.secondary} />
        <path d="M90 30c10 2 17 14 16 30-1 10-7 16-13 13-6-3-7-14-8-24-1-9 1-17 5-19z" fill={c.secondary} />
        <path d="M27 40c-5 5-7 14-6 22" stroke={shade(c.secondary, 30)} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".5" />
        <path d="M93 40c5 5 7 14 6 22" stroke={shade(c.secondary, 30)} strokeWidth="2" strokeLinecap="round" fill="none" opacity=".5" />
        <path d="M26 52c0-22 15-34 34-34s34 12 34 34c0 20-15 32-34 32S26 72 26 52z" fill="url(#jb-sheen)" />
        {/* Brows */}
        <path d="M42 40q4-3 8 0M70 40q4-3 8 0" stroke={shade(c.primary, -55)} strokeWidth="1.8" strokeLinecap="round" fill="none" opacity=".55" />
        {/* Muzzle and nose */}
        <ellipse cx="60" cy="67" rx="16" ry="11.5" fill={c.skin} />
        <path d="M54 61c0-3 3-4 6-4s6 1 6 4-3 5-6 5-6-2-6-5z" fill="#2B2522" />
        <ellipse cx="58" cy="59.5" rx="2" ry="1.2" fill="#fff" opacity=".7" />
        <path d="M60 66v3" stroke="#2B2522" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
    eyes: { l: [47, 50], r: [73, 50], size: 4.8 },
    mouth: [60, 72],
    cheeks: { l: [38, 64], r: [82, 64] },
    head: { x: 60, y: 22, w: 62 },
    neck: { x: 60, y: 82, w: 48 },
  },
  {
    id: "cat",
    name: "Cat",
    category: "Animals",
    colors: { primary: "#F0A35E", secondary: "#FFE6CC", skin: "#FFE6CC" },
    body: (c) => (
      <>
        {floor}
        {/* Tail curling up */}
        <g className="jb-wag" style={{ transformOrigin: "80px 104px" }}>
          <path d="M78 106c14 2 24-4 26-16 2-10-4-18-10-16" stroke={c.primary} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M98 80c-2-3-4-4-6-4" stroke={shade(c.primary, -30)} strokeWidth="9" strokeLinecap="round" fill="none" opacity=".45" />
        </g>
        <path d="M36 112c-3-22 8-34 24-34s27 12 24 34z" fill={c.primary} />
        <path d="M50 88c3 8 17 8 20 0 2 10-1 20-10 21-9-1-12-11-10-21z" fill={c.secondary} />
        <path d="M36 112c-3-22 8-34 24-34s27 12 24 34z" fill="url(#jb-sheen)" />
        <ellipse cx="50" cy="111" rx="7.5" ry="4.5" fill={c.secondary} />
        <ellipse cx="70" cy="111" rx="7.5" ry="4.5" fill={c.secondary} />
        {/* Ears */}
        <path d="M30 40L33 10l25 18z" fill={c.primary} strokeLinejoin="round" />
        <path d="M90 40L87 10 62 28z" fill={c.primary} />
        <path d="M34 34l2-17 13 10z" fill="#F7B8C0" />
        <path d="M86 34l-2-17-13 10z" fill="#F7B8C0" />
        {/* Head */}
        <ellipse cx="60" cy="54" rx="36" ry="30" fill={c.primary} />
        <path d="M52 27l2 9M60 25v10M68 27l-2 9" stroke={shade(c.primary, -40)} strokeWidth="3" strokeLinecap="round" opacity=".6" />
        <path d="M24 56l9 1M25 64l8-3M96 56l-9 1M95 64l-8-3" stroke={shade(c.primary, -40)} strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
        <ellipse cx="60" cy="54" rx="36" ry="30" fill="url(#jb-sheen)" />
        <path d="M46 70c2-8 26-8 28 0-2 8-26 8-28 0z" fill={c.secondary} />
        <path d="M57 63h6l-3 3.5z" fill="#E86F7E" strokeLinejoin="round" stroke="#E86F7E" strokeWidth="1.5" />
        <path d="M30 66l-14-2M30 71l-13 4M90 66l14-2M90 71l13 4" stroke="#2B2522" strokeWidth="1.3" strokeLinecap="round" opacity=".45" />
      </>
    ),
    eyes: { l: [46, 52], r: [74, 52], size: 5 },
    mouth: [60, 70],
    cheeks: { l: [36, 64], r: [84, 64] },
    head: { x: 60, y: 22, w: 64 },
    neck: { x: 60, y: 84, w: 44 },
  },
  {
    id: "bunny",
    name: "Bunny",
    category: "Animals",
    colors: { primary: "#F6F1EA", secondary: "#F6B7C8", skin: "#FFFFFF" },
    body: (c) => (
      <>
        {floor}
        <circle cx="84" cy="104" r="8" fill={c.skin} />
        <circle cx="84" cy="104" r="8" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="98" rx="24" ry="17" fill={c.primary} />
        <ellipse cx="60" cy="98" rx="24" ry="17" fill="url(#jb-sheen)" />
        <ellipse cx="50" cy="111" rx="8" ry="4.5" fill={c.skin} />
        <ellipse cx="70" cy="111" rx="8" ry="4.5" fill={c.skin} />
        {/* Ears */}
        <path d="M44 34c-8-12-10-28-4-32 6-3 12 10 12 28z" fill={c.primary} />
        <path d="M76 34c8-12 10-28 4-32-6-3-12 10-12 28z" fill={c.primary} />
        <path d="M46 30c-5-9-6-20-3-22 3-2 6 8 6 20z" fill={c.secondary} />
        <path d="M74 30c5-9 6-20 3-22-3-2-6 8-6 20z" fill={c.secondary} />
        <ellipse cx="60" cy="58" rx="32" ry="28" fill={c.primary} />
        <ellipse cx="60" cy="58" rx="32" ry="28" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="70" rx="11" ry="7.5" fill={c.skin} />
        <path d="M56 65.5c0-2 2-2.5 4-2.5s4 .5 4 2.5-2 3.5-4 3.5-4-1.5-4-3.5z" fill="#F08AA4" />
        <path d="M56 71l4 2 4-2" stroke="#2B2522" strokeWidth="1.2" fill="none" opacity=".35" />
      </>
    ),
    eyes: { l: [48, 56], r: [72, 56], size: 4.6 },
    mouth: [60, 75],
    cheeks: { l: [38, 66], r: [82, 66] },
    head: { x: 60, y: 30, w: 56 },
    neck: { x: 60, y: 84, w: 44 },
  },
  {
    id: "bear",
    name: "Bear",
    category: "Animals",
    colors: { primary: "#A8774F", secondary: "#E8C7A2", skin: "#E8C7A2" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="60" cy="96" rx="27" ry="19" fill={c.primary} />
        <ellipse cx="60" cy="98" rx="15" ry="12" fill={c.secondary} />
        <ellipse cx="60" cy="96" rx="27" ry="19" fill="url(#jb-sheen)" />
        <ellipse cx="48" cy="111" rx="9" ry="5" fill={shade(c.primary, -15)} />
        <ellipse cx="72" cy="111" rx="9" ry="5" fill={shade(c.primary, -15)} />
        <ellipse cx="48" cy="111" rx="4" ry="2.4" fill={c.secondary} />
        <ellipse cx="72" cy="111" rx="4" ry="2.4" fill={c.secondary} />
        <circle cx="31" cy="30" r="12" fill={c.primary} />
        <circle cx="89" cy="30" r="12" fill={c.primary} />
        <circle cx="31" cy="30" r="6.5" fill={c.secondary} />
        <circle cx="89" cy="30" r="6.5" fill={c.secondary} />
        <ellipse cx="60" cy="55" rx="35" ry="31" fill={c.primary} />
        <ellipse cx="60" cy="55" rx="35" ry="31" fill="url(#jb-sheen)" />
        <ellipse cx="60" cy="68" rx="15" ry="11" fill={c.secondary} />
        <path d="M54 62c0-3 3-4 6-4s6 1 6 4-3 5-6 5-6-2-6-5z" fill="#3A2418" />
        <ellipse cx="58" cy="60.5" rx="1.8" ry="1.1" fill="#fff" opacity=".6" />
      </>
    ),
    eyes: { l: [47, 52], r: [73, 52], size: 4.6 },
    mouth: [60, 72],
    cheeks: { l: [36, 64], r: [84, 64] },
    head: { x: 60, y: 24, w: 62 },
    neck: { x: 60, y: 84, w: 48 },
  },
  {
    id: "duck",
    name: "Duckling",
    category: "Animals",
    colors: { primary: "#FFD95A", secondary: "#F59A3C", skin: "#FFE9A0" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="50" cy="111" rx="8" ry="3.5" fill={c.secondary} />
        <ellipse cx="70" cy="111" rx="8" ry="3.5" fill={c.secondary} />
        <ellipse cx="60" cy="93" rx="30" ry="20" fill={c.primary} />
        <path d="M30 92c-6-6-6-14 0-14 6 2 8 10 6 16zM90 92c6-6 6-14 0-14-6 2-8 10-6 16z" fill={shade(c.primary, -18)} />
        <ellipse cx="60" cy="97" rx="16" ry="11" fill={c.skin} />
        <ellipse cx="60" cy="93" rx="30" ry="20" fill="url(#jb-sheen)" />
        <circle cx="60" cy="52" r="31" fill={c.primary} />
        <circle cx="60" cy="52" r="31" fill="url(#jb-sheen)" />
        <path d="M56 22c-3-9 5-12 7-5 3-7 11-3 6 3" fill="none" stroke={c.primary} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M46 63c4-5 24-5 28 0-2 7-26 7-28 0z" fill={c.secondary} />
        <path d="M47 63c6 2 20 2 26 0" stroke={shade(c.secondary, -35)} strokeWidth="1.4" fill="none" />
      </>
    ),
    eyes: { l: [47, 50], r: [73, 50], size: 4.8 },
    mouth: null,
    cheeks: { l: [36, 60], r: [84, 60] },
    head: { x: 60, y: 22, w: 58 },
    neck: { x: 60, y: 80, w: 48 },
  },
  {
    id: "frog",
    name: "Frog",
    category: "Animals",
    colors: { primary: "#7CCB7A", secondary: "#E9F7D9", skin: "#E9F7D9" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="60" cy="97" rx="28" ry="17" fill={c.primary} />
        <ellipse cx="60" cy="99" rx="17" ry="11" fill={c.secondary} />
        <path d="M34 108c-8 0-12 4-8 6h14zM86 108c8 0 12 4 8 6H80z" fill={shade(c.primary, -12)} />
        <circle cx="38" cy="36" r="15" fill={c.primary} />
        <circle cx="82" cy="36" r="15" fill={c.primary} />
        <circle cx="38" cy="36" r="9.5" fill="#fff" />
        <circle cx="82" cy="36" r="9.5" fill="#fff" />
        <ellipse cx="60" cy="62" rx="40" ry="25" fill={c.primary} />
        <ellipse cx="60" cy="62" rx="40" ry="25" fill="url(#jb-sheen)" />
        <circle cx="54" cy="58" r="1.3" fill={shade(c.primary, -60)} />
        <circle cx="66" cy="58" r="1.3" fill={shade(c.primary, -60)} />
        <circle cx="30" cy="70" r="2.5" fill={shade(c.primary, -25)} opacity=".6" />
        <circle cx="92" cy="66" r="2" fill={shade(c.primary, -25)} opacity=".6" />
      </>
    ),
    eyes: { l: [38, 37], r: [82, 37], size: 4.8 },
    mouth: [60, 70],
    cheeks: { l: [30, 64], r: [90, 64] },
    head: { x: 60, y: 20, w: 74 },
    neck: { x: 60, y: 84, w: 50 },
  },
  {
    id: "person",
    name: "Little you",
    category: "Little people",
    colors: { primary: "#6C8EF2", secondary: "#3B2A24", skin: "#E9B48F" },
    body: (c) => (
      <>
        {floor}
        <path d="M30 114c0-20 13-28 30-28s30 8 30 28z" fill={c.primary} />
        <path d="M30 114c0-20 13-28 30-28s30 8 30 28z" fill="url(#jb-sheen)" />
        <path d="M52 86l8 9 8-9" fill="#fff" opacity=".9" />
        <rect x="54" y="78" width="12" height="10" rx="4" fill={shade(c.skin, -18)} />
        <path d="M24 62c-2-26 15-40 36-40s38 14 36 40c-2 8-4 10-6 12l-2-10c-6-6-14-12-28-12-12 0-22 4-30 12l-2 10c-2-2-4-4-4-12z" fill={c.secondary} />
        <ellipse cx="60" cy="56" rx="29" ry="28" fill={c.skin} />
        <ellipse cx="60" cy="56" rx="29" ry="28" fill="url(#jb-sheen)" />
        <path d="M31 50c4-16 16-24 29-24s25 8 29 24c-8-6-14-12-18-18-6 8-22 14-40 18z" fill={c.secondary} />
        <ellipse cx="31" cy="60" rx="4" ry="6" fill={c.skin} />
        <ellipse cx="89" cy="60" rx="4" ry="6" fill={c.skin} />
        <path d="M58 64q2 3 4 0" stroke={shade(c.skin, -50)} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
    eyes: { l: [49, 56], r: [71, 56], size: 4.2 },
    mouth: [60, 72],
    cheeks: { l: [41, 66], r: [79, 66] },
    head: { x: 60, y: 22, w: 58 },
    neck: { x: 60, y: 86, w: 44 },
  },
  {
    id: "cup",
    name: "Coffee cup",
    category: "Objects",
    colors: { primary: "#F7EDE3", secondary: "#B9774E", skin: "#F7EDE3" },
    body: (c) => (
      <>
        {floor}
        <ellipse cx="58" cy="112" rx="40" ry="5" fill={shade(c.primary, -14)} />
        <path d="M88 60c16 0 16 26 0 26" fill="none" stroke={c.primary} strokeWidth="8" />
        <path d="M88 60c16 0 16 26 0 26" fill="none" stroke="#000" strokeWidth="8" opacity=".06" />
        <path d="M24 46h68l-6 58a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill={c.primary} />
        <path d="M27 96h62l-1 8a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill={shade(c.secondary, 40)} opacity=".45" />
        <path d="M24 46h68l-6 58a8 8 0 0 1-8 7H38a8 8 0 0 1-8-7z" fill="url(#jb-sheen)" />
        <ellipse cx="58" cy="46" rx="34" ry="6" fill={c.secondary} />
        <path d="M50 46c4-3 12-3 16 0" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".6" />
        <path d="M46 34c-4-6 4-8 0-14M60 32c-4-6 4-8 0-14M74 34c-4-6 4-8 0-14" stroke={shade(c.secondary, 60)} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" className="jb-steam" />
      </>
    ),
    eyes: { l: [47, 72], r: [69, 72], size: 4.5 },
    mouth: [58, 85],
    cheeks: { l: [38, 82], r: [78, 82] },
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
        <path d="M60 58C44 50 37 34 40 22M60 58c16-8 23-24 20-36" stroke={shade(c.primary, -30)} strokeWidth="1.5" fill="none" opacity=".5" />
        <path d="M30 58h60l-7 50a6 6 0 0 1-6 5H43a6 6 0 0 1-6-5z" fill={c.secondary} />
        <path d="M30 58h60l-7 50a6 6 0 0 1-6 5H43a6 6 0 0 1-6-5z" fill="url(#jb-sheen)" />
        <rect x="26" y="54" width="68" height="12" rx="4" fill={shade(c.secondary, 15)} />
        <rect x="26" y="54" width="68" height="4" rx="2" fill="#fff" opacity=".25" />
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
        <g fill={c.secondary} transform="translate(0 5)">
          <circle cx="38" cy="78" r="19" />
          <circle cx="60" cy="62" r="26" />
          <circle cx="84" cy="76" r="19" />
          <rect x="22" y="76" width="78" height="26" rx="13" />
        </g>
        <g fill={c.primary}>
          <circle cx="38" cy="78" r="19" />
          <circle cx="60" cy="62" r="26" />
          <circle cx="84" cy="76" r="19" />
          <rect x="22" y="76" width="78" height="26" rx="13" />
        </g>
        <ellipse cx="52" cy="52" rx="12" ry="7" fill="#fff" opacity=".8" />
      </>
    ),
    eyes: { l: [50, 74], r: [72, 74], size: 4.5 },
    mouth: [61, 86],
    cheeks: { l: [40, 84], r: [82, 84] },
    head: { x: 60, y: 38, w: 54 },
    neck: { x: 60, y: 100, w: 60 },
  },
  {
    id: "moon",
    name: "Moon",
    category: "Objects",
    colors: { primary: "#F7E7A6", secondary: "#E8CF73", skin: "#F7E7A6" },
    body: (c) => (
      <>
        {floor}
        <circle cx="60" cy="66" r="44" fill={c.primary} opacity=".25" />
        <circle cx="60" cy="66" r="40" fill={c.primary} />
        <circle cx="60" cy="66" r="40" fill="url(#jb-sheen)" />
        <circle cx="38" cy="48" r="7" fill={c.secondary} opacity=".6" />
        <circle cx="84" cy="88" r="5" fill={c.secondary} opacity=".6" />
        <circle cx="86" cy="50" r="4" fill={c.secondary} opacity=".6" />
      </>
    ),
    eyes: { l: [47, 66], r: [73, 66], size: 4.5 },
    mouth: [60, 82],
    cheeks: { l: [36, 78], r: [84, 78] },
    head: { x: 60, y: 26, w: 66 },
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
