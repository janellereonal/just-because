/**
 * The people builder's 3D model: a clay chibi person put together from parts
 * (age, skin, hair, facial hair, glasses, hat, outfit, what they hold), in the
 * same 120 box and light as the rest of the cast. The live face (eyes, blush,
 * mouth) is drawn on top from personFace() in cast/person.ts, which shares the
 * head layout used here.
 */
import type * as THREE from "three";
import { blob, cone, egg, fluff, GLOSS, heartOutline, lathe, limb, pillow, rbox, shade, starOutline, torus, tube, type V3 } from "@/lib/clay/shapes";
import { HAIR_COLORS, hairTop, LAYOUT, OUTFIT_COLORS, SKIN_TONES, type PersonConfig } from "@/themes/_shared/cast/person";

type O = THREE.Object3D;

const INK = "#2B2522";
const GOLD = "#E5C26B";
const WHITE = "#FBF7F0";
const DENIM = "#506894";

function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** A soft flared shape (skirts, coats, gowns): profile from bottom to top. */
const FLARE: [number, number][] = [
  [0, -0.5],
  [0.47, -0.5],
  [0.5, -0.42],
  [0.36, 0.42],
  [0.3, 0.5],
  [0, 0.5],
];
const TORSO: [number, number][] = [
  [0, -0.5],
  [0.44, -0.5],
  [0.49, -0.4],
  [0.5, 0.08],
  [0.47, 0.32],
  [0.37, 0.46],
  [0.2, 0.5],
  [0, 0.5],
];
const CYL: [number, number][] = [
  [0, -0.5],
  [0.46, -0.5],
  [0.5, -0.42],
  [0.5, 0.42],
  [0.46, 0.5],
  [0, 0.5],
];

type Hands = { l: V3 | null; r: V3 | null; raiseR?: boolean };

export function buildPerson(p: PersonConfig): O[] {
  const { head: H, torso: T0 } = LAYOUT[p.age];
  const skin = SKIN_TONES[p.skin] ?? SKIN_TONES[2];
  const hairHex = HAIR_COLORS.find((h) => h.id === p.hairColor)?.hex ?? "#4A3328";
  const oi = Math.max(0, OUTFIT_COLORS.findIndex((o) => o.id === p.outfitColor));
  const oc = OUTFIT_COLORS[oi]!.hex;
  const accent = OUTFIT_COLORS[(oi + 4) % OUTFIT_COLORS.length]!.hex;
  // Hats get their own bright set, so they never vanish against cream or match the outfit.
  const HATS = ["#E8577E", "#4F7FD9", "#F6C350", "#7ED7C1", "#B9A3E0", "#D9534F", "#2E3F6E", "#F28C38"];
  const hatHex = HATS[(oi + 3) % HATS.length]!;
  const kid = p.age === "kid";
  const T = { ...T0 };
  const out: O[] = [];
  const hx = H.x;
  const hy = H.y;
  /** How far forward the head's surface is at (dx, dy) from its center. */
  const surf = (dy: number, dx = 0) => (H.d / 2) * Math.sqrt(Math.max(0, 1 - (dy / (H.h / 2)) ** 2 - (dx / (H.w / 2)) ** 2));

  /* ---------- what they hold decides where the hands go ---------- */
  const cx = 60;
  const cy = T.top + 17;
  const cz = T.d / 2 + 7;
  const held = heldItem(p, cx, cy, cz, T, accent);

  /* ---------- legs and shoes ---------- */
  const long = ["raincoat", "labcoat", "gown"].includes(p.outfit);
  const skirt = p.outfit === "dress" || p.outfit === "sundress";
  const pants = ["suit", "scrubs", "overalls"].includes(p.outfit) ? shade(oc, p.outfit === "overalls" ? 0 : -12) : p.outfit === "gown" ? INK : DENIM;
  const legX = kid ? 8 : 9;
  const legR = kid ? 6.2 : 6.8;
  const shoe = p.outfit === "suit" || p.outfit === "blazer" ? "#3A2A24" : skirt ? shade(oc, -25) : WHITE;
  for (const s of [-1, 1]) {
    out.push(limb([60 + s * legX, T.bottom - 6, 0], [60 + s * legX, 104, 2], legR, skirt ? skin : pants));
    out.push(blob([60 + s * (legX + 1), 108.2, 6], [17, 9, 20], shoe));
    out.push(blob([60 + s * (legX + 1), 111, 6], [17.5, 3, 20.5], shade(shoe, -28)));
  }

  /* ---------- back layers: long hair, hoods ---------- */
  const hairParts = hair(p, H, hairHex, surf);
  out.push(...hairParts.back);
  if (p.outfit === "hoodie" || p.outfit === "jacket" || p.outfit === "raincoat") {
    out.push(blob([60, T.top - 1, -T.d * 0.45], [T.w * 0.92, 18, 22], shade(oc, -8)));
  }

  /* ---------- torso and outfit ---------- */
  const mid = (T.top + T.bottom) / 2;
  const tall = T.bottom - T.top;
  const torso = (color: string, extra = 0) => lathe(TORSO, [60, mid + extra / 2, 0], [T.w, tall + extra, T.d], color);
  const front = T.d / 2;
  const sleeves: { color: string; short: boolean; puff?: boolean } = { color: oc, short: false };
  switch (p.outfit) {
    case "tee":
      out.push(torso(oc));
      sleeves.short = true;
      break;
    case "stripes":
      out.push(torso(WHITE));
      for (let i = 0; i < 4; i++) {
        const y = T.top + 7 + i * (tall / 4.4);
        out.push(lathe(CYL, [60, y, 0], [T.w * (1.005 - (i === 0 ? 0.06 : 0)), 3.2, T.d * 1.005], oc));
      }
      sleeves.short = true;
      break;
    case "hoodie":
      out.push(torso(oc));
      out.push(rbox([60, T.bottom - 8, front - 2], [T.w * 0.6, 10, 4], 3, shade(oc, -10)));
      for (const s of [-1, 1]) out.push(limb([60 + s * 4, T.top + 3, front - 3], [60 + s * 4.5, T.top + 13, front], 1, WHITE));
      break;
    case "sweater":
      out.push(torso(oc));
      out.push(lathe(CYL, [60, T.bottom - 2.5, 0], [T.w * 1.01, 5, T.d * 1.01], shade(oc, -12)));
      out.push(torus([60, T.top + 1.5, 0], T.w * 0.2, 2.2, shade(oc, -12), [Math.PI / 2 - 0.1, 0, 0]));
      break;
    case "cardigan":
      out.push(torso(oc));
      out.push(rbox([60, mid + 1, front - 2.2], [T.w * 0.24, tall - 4, 4], 2, WHITE));
      for (let i = 0; i < 3; i++) out.push(blob([60 + T.w * 0.14, T.top + 9 + i * 6, front + 0.5], [2.4, 2.4, 2], shade(oc, -30)));
      break;
    case "shirt":
      out.push(torso(oc));
      for (const s of [-1, 1]) out.push(blob([60 + s * 4.5, T.top + 2, front - 3], [10, 5, 6], WHITE, [0, 0, s * 0.5]));
      for (let i = 0; i < 3; i++) out.push(blob([60, T.top + 8 + i * 6, front + 0.3], [2, 2, 2], WHITE));
      break;
    case "jacket":
    case "denim": {
      out.push(torso(WHITE));
      const j = p.outfit === "denim" ? mix(oc, DENIM, 0.35) : oc;
      for (const s of [-1, 1]) {
        out.push(rbox([60 + s * T.w * 0.3, mid, 0.5], [T.w * 0.44, tall + 1, T.d * 1.02], 7, j));
        out.push(rbox([60 + s * T.w * 0.26, T.bottom - 9, front + 0.5], [9, 7, 2], 2, shade(j, -12)));
        if (p.outfit === "denim") out.push(blob([60 + s * 7, T.top + 3, front - 2], [11, 6, 5], shade(j, -8), [0, 0, s * 0.6]));
      }
      sleeves.color = j;
      break;
    }
    case "blazer":
    case "suit": {
      out.push(torso(oc));
      out.push(
        pillow(
          [
            [60 - 6, T.top + 1],
            [60 + 6, T.top + 1],
            [60, T.top + 17],
          ],
          1,
          WHITE,
          front - 1.2,
          1,
        ),
      );
      for (const s of [-1, 1])
        out.push(
          pillow(
            [
              [60 + s * 6, T.top + 1],
              [60 + s * 11, T.top + 3],
              [60 + s * 4, T.top + 18],
            ],
            1,
            shade(oc, -14),
            front,
            1,
          ),
        );
      if (p.outfit === "suit")
        out.push(
          pillow(
            [
              [58, T.top + 3],
              [62, T.top + 3],
              [63.5, T.top + 15],
              [60, T.top + 18],
              [56.5, T.top + 15],
            ],
            1.2,
            accent,
            front + 0.4,
            1,
          ),
        );
      break;
    }
    case "dress":
    case "sundress": {
      const waist = T.top + tall * 0.52;
      if (p.outfit === "sundress") {
        out.push(lathe(TORSO, [60, (T.top + waist) / 2 + 1, 0], [T.w * 0.96, waist - T.top + 2, T.d * 0.96], skin));
        out.push(lathe(CYL, [60, waist - 4, 0], [T.w * 0.99, 10, T.d * 0.99], oc));
        for (const s of [-1, 1]) out.push(limb([60 + s * 7, T.top + 2, front - 4], [60 + s * 7, waist - 8, front - 1], 1.1, oc));
      } else {
        out.push(lathe(TORSO, [60, (T.top + waist) / 2 + 1, 0], [T.w, waist - T.top + 2, T.d], oc));
      }
      out.push(lathe(FLARE, [60, (waist + 103) / 2, 0], [T.w * 1.55, 103 - waist, T.d * 1.4], oc));
      out.push(torus([60, waist + 0.5, 0], T.w * 0.48, 1.6, shade(oc, -15), [Math.PI / 2, 0, 0]));
      sleeves.short = p.outfit === "dress";
      if (p.outfit === "sundress") sleeves.color = skin;
      break;
    }
    case "overalls":
      out.push(torso(WHITE));
      out.push(rbox([60, mid + 6, front - 1.5], [T.w * 0.5, tall * 0.55, 4], 3, oc));
      out.push(lathe(CYL, [60, T.bottom - 4, 0], [T.w * 1.01, 9, T.d * 1.01], oc));
      for (const s of [-1, 1]) {
        out.push(limb([60 + s * 9, T.top + 2, front - 3], [60 + s * 9, mid, front], 1.4, oc));
        out.push(blob([60 + s * 8, mid + 1, front + 1.5], [3, 3, 2], GOLD, [0, 0, 0], GLOSS));
      }
      sleeves.short = true;
      sleeves.color = WHITE;
      break;
    case "raincoat":
    case "labcoat": {
      const coat = p.outfit === "labcoat" ? WHITE : oc;
      if (p.outfit === "labcoat") out.push(torso(oc));
      out.push(lathe(FLARE, [60, (T.top + 104) / 2 + 1, -0.5], [T.w * 1.12, 104 - T.top - 2, T.d * 1.08], coat));
      if (p.outfit === "labcoat") {
        out.push(
          pillow(
            [
              [60 - 6, T.top + 1],
              [60 + 6, T.top + 1],
              [60, T.top + 16],
            ],
            1,
            oc,
            front + 1.5,
            1,
          ),
        );
        out.push(rbox([60 - T.w * 0.25, T.top + 13, front + 2], [8, 6, 2], 2, shade(WHITE, -12)));
      } else {
        for (let i = 0; i < 3; i++) out.push(rbox([60, T.top + 10 + i * 8, front + 2.5], [6, 2.4, 2], 1, shade(oc, -30)));
      }
      sleeves.color = coat;
      break;
    }
    case "puffer":
      out.push(torso(oc));
      for (let i = 0; i < 3; i++) {
        const y = T.top + 8 + i * (tall / 3.3);
        out.push(lathe(CYL, [60, y, 0], [T.w * 1.06, tall / 3.6, T.d * 1.08], shade(oc, i % 2 ? -4 : 6)));
      }
      out.push(torus([60, T.top + 1, 0], T.w * 0.24, 3.4, shade(oc, -10), [Math.PI / 2 - 0.1, 0, 0]));
      sleeves.puff = true;
      break;
    case "jersey":
      out.push(torso(oc));
      out.push(
        pillow(
          [
            [60 - 7, T.top],
            [60 + 7, T.top],
            [60, T.top + 9],
          ],
          1,
          WHITE,
          front - 0.8,
          1,
        ),
      );
      out.push(rbox([60, mid + 2, front + 0.2], [10, 12, 1.5], 2, WHITE));
      sleeves.short = true;
      break;
    case "apron":
      out.push(torso(WHITE));
      out.push(rbox([60, mid + 4, front - 1.5], [T.w * 0.62, tall - 4, 4], 4, oc));
      out.push(rbox([60, mid + 8, front + 0.5], [T.w * 0.3, 8, 2], 2, shade(oc, -12)));
      out.push(torus([60, T.top + 1, front * 0.2], 6.5, 1.1, oc, [0.3, 0, 0], Math.PI));
      sleeves.short = true;
      sleeves.color = WHITE;
      break;
    case "scrubs":
      out.push(torso(oc));
      out.push(
        pillow(
          [
            [60 - 6, T.top],
            [60 + 6, T.top],
            [60, T.top + 10],
          ],
          1,
          skin,
          front - 0.8,
          1,
        ),
      );
      out.push(rbox([60 - T.w * 0.24, T.top + 13, front + 0.5], [8, 7, 2], 2, shade(oc, -12)));
      sleeves.short = true;
      break;
    case "gown":
      out.push(lathe(FLARE, [60, (T.top + 105) / 2 + 1, 0], [T.w * 1.3, 105 - T.top - 2, T.d * 1.2], oc));
      for (const s of [-1, 1]) out.push(rbox([60 + s * 6, T.top + 16, front + 3], [6, 30, 2], 2.5, GOLD, [0, 0, s * -0.08]));
      sleeves.puff = true;
      break;
  }

  /* ---------- arms ---------- */
  const armR = kid ? 5 : 5.6;
  const sh = (s: number): V3 => [60 + s * (T.w / 2 - 3), T.top + 7, 0];
  const rest = (s: number): V3 => [60 + s * (T.w / 2 + 3.5), T.bottom - (long ? 2 : 6), 3];
  for (const s of [-1, 1] as const) {
    const hand = (s < 0 ? held.hands.l : held.hands.r) ?? rest(s);
    const a = sh(s);
    if (sleeves.short) {
      const m: V3 = [a[0] + (hand[0] - a[0]) * 0.45, a[1] + (hand[1] - a[1]) * 0.45, a[2] + (hand[2] - a[2]) * 0.45];
      out.push(limb(a, m, armR + 0.7, sleeves.color));
      out.push(limb(m, hand, armR - 0.6, skin));
    } else {
      out.push(limb(a, hand, sleeves.puff ? armR + 1.4 : armR, sleeves.color));
    }
    out.push(blob(hand, [armR * 2.3, armR * 2.3, armR * 2.2], skin));
  }

  /* ---------- head ---------- */
  out.push(limb([60, T.top - 3, -2], [60, T.top + 3, -2], 6, skin));
  for (const s of [-1, 1]) out.push(blob([hx + s * H.w * 0.49, hy + 3, -1], [9, 13, 9], skin));
  out.push(blob([hx, hy, 0], [H.w, H.h, H.d], skin));
  out.push(blob([hx, hy + 9, surf(9) - 1.2], [5, 4, 4], shade(skin, -12)));

  /* ---------- facial hair ---------- */
  const fh = mix(skin, hairHex, 0.85);
  switch (p.facial) {
    case "stubble":
      out.push(blob([hx, hy + 9, 0], [H.w * 0.985, H.h * 0.8, H.d * 1.005], mix(skin, hairHex, 0.28)));
      break;
    case "beard":
      out.push(blob([hx, hy + 11, 0.5], [H.w * 1.0, H.h * 0.84, H.d * 1.04], fh));
      out.push(blob([hx, hy + 25, surf(20) - 2], [H.w * 0.42, 13, 16], fh));
      break;
    case "goatee":
      out.push(blob([hx, hy + 22, surf(22) - 2], [11, 9, 8], fh));
      break;
    case "mustache":
      for (const s of [-1, 1]) out.push(blob([hx + s * 4.6, hy + 12, surf(12, 4.6) - 0.6], [10, 4.6, 4.5], fh, [0, 0, s * -0.32]));
      break;
  }

  /* ---------- hair (front) ---------- */
  const fullHat = ["beanie", "cap", "sunhat", "bucket", "beret", "party", "grad", "crown"].includes(p.headwear);
  const brow = ["beanie", "cap", "bucket", "grad"].includes(p.headwear);
  out.push(...hairParts.front.filter((o) => !(brow && hairParts.fringe.includes(o))));
  if (!fullHat) out.push(...hairParts.top);

  /* ---------- glasses ---------- */
  out.push(...glasses(p, H, surf));

  /* ---------- hats ---------- */
  out.push(...hat(p, H, hatHex, oc, hairTop(p)));

  /* ---------- the thing they hold ---------- */
  out.push(...held.objs);
  return out;
}

/* ---------- hair ---------- */

function hair(p: PersonConfig, H: (typeof LAYOUT)["adult"]["head"], c: string, surf: (dy: number, dx?: number) => number) {
  const { x: hx, y: hy, w, h, d } = H;
  const back: O[] = [];
  const front: O[] = [];
  const top: O[] = [];
  /** Fringe pieces: hidden under hats that come down over the forehead. */
  const fringe: O[] = [];
  const tag = (list: O[]) => {
    fringe.push(...list);
    return list;
  };
  const cap = (k = 1) => blob([hx, hy - h * 0.24, -d * 0.07], [w * 1.13 * k, h * 0.79 * k, d * 1.07 * k], c);
  const burns = () => [-1, 1].map((s) => blob([hx + s * w * 0.47, hy - 4, -1], [10, 18, 15], c));
  const sweep = () => tag([
    blob([hx - w * 0.28, hy - h * 0.32, d * 0.36], [w * 0.5, h * 0.3, d * 0.28], c, [0, 0, 0.45]),
    blob([hx + w * 0.2, hy - h * 0.36, d * 0.38], [w * 0.62, h * 0.28, d * 0.28], c, [0, 0, -0.25]),
  ]);
  const blunt = () => tag([blob([hx, hy - h * 0.29, d * 0.36], [w * 0.86, h * 0.26, d * 0.3], c)])[0]!;
  const panels = (len: number, wide = 0.22) => [-1, 1].map((s) => blob([hx + s * w * 0.47, hy + len * 0.32, d * 0.08], [w * wide, h * len * 0.012, d * 0.38], c));
  const longBack = (len = 1.15) => blob([hx, hy + h * 0.3 * len - 2, -d * 0.32], [w * 1.18, h * len, d * 0.56], c);
  const braid = (x0: number, y0: number, x1: number, y1: number, z: number, n = 5, r = 5.2) => {
    const parts: O[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      parts.push(blob([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z], [r * 2 * (1 - t * 0.25), r * 1.7, r * 1.8], c));
    }
    parts.push(blob([x1, y1 + r * 1.4, z], [4, 3, 4], "#F27A93"));
    return parts;
  };
  switch (p.hair) {
    case "crop":
      front.push(cap(), blob([hx - 3, hy - h * 0.32, d * 0.36], [w * 0.66, h * 0.22, d * 0.3], c, [0, 0, 0.1]), ...burns());
      break;
    case "side":
      front.push(cap(), ...sweep(), ...burns());
      break;
    case "messy":
      front.push(cap(), ...sweep(), ...burns());
      [-0.9, -0.55, -0.15, 0.25, 0.65].forEach((a, i) => {
        const ang = -Math.PI / 2 + a;
        front.push(cone([hx + Math.cos(ang) * w * 0.44, hy - h * 0.24 + Math.sin(ang) * h * 0.4, -2 + (i % 2) * 6], 14, 14, 12, c, ang + Math.PI / 2));
      });
      break;
    case "curls":
      front.push(cap(1.02), fluff([hx, hy - h * 0.18, -2], [w * 0.52, h * 0.42, d * 0.48], { count: 15, size: [12, 15], color: c, seed: 4, from: Math.PI * 0.95, to: Math.PI * 2.05, rows: 2, front: 0.25 }), ...burns());
      break;
    case "afro":
      back.push(blob([hx, hy - h * 0.16, -6], [w * 1.52, h * 1.24, d * 1.24], c));
      front.push(fluff([hx, hy - h * 0.16, -6], [w * 0.74, h * 0.6, d * 0.52], { count: 24, size: [13, 16], color: c, seed: 7, from: Math.PI * 0.8, to: Math.PI * 2.2, rows: 2, front: 0.15 }));
      break;
    case "buzz":
      front.push(blob([hx, hy - h * 0.2, -1.5], [w * 1.04, h * 0.76, d * 1.02], mix(c, "#E9B48F", 0.15)));
      break;
    case "spiky":
      front.push(cap(), blob([hx, hy - h * 0.3, d * 0.36], [w * 0.7, h * 0.2, d * 0.28], c), ...burns());
      for (let i = 0; i < 7; i++) {
        const ang = -Math.PI / 2 + (i - 3) * 0.32;
        top.push(cone([hx + Math.cos(ang) * w * 0.42, hy - h * 0.26 + Math.sin(ang) * h * 0.42, -2], 13, 18, 12, c, ang + Math.PI / 2));
      }
      break;
    case "quiff":
      front.push(cap(), blob([hx + 2, hy - h * 0.5, d * 0.22], [w * 0.72, h * 0.4, d * 0.52], c, [0, 0, -0.12]), ...burns());
      break;
    case "long":
      back.push(longBack());
      front.push(cap(), ...sweep(), ...panels(1));
      break;
    case "wavy":
      back.push(longBack(), fluff([hx, hy + h * 0.45, -d * 0.3], [w * 0.55, h * 0.3, d * 0.2], { count: 9, size: [13, 16], color: c, seed: 9, from: 0, to: Math.PI }));
      front.push(cap(), ...sweep(), ...panels(1, 0.24));
      for (const s of [-1, 1]) front.push(fluff([hx + s * w * 0.5, hy + h * 0.42, d * 0.08], [3, h * 0.2, 3], { count: 4, size: [9, 11], color: c, seed: 3 + s, from: -Math.PI / 2, to: Math.PI * 1.5 }));
      break;
    case "bob":
      back.push(blob([hx, hy + 2, -d * 0.24], [w * 1.16, h * 0.84, d * 0.62], c));
      front.push(cap(), blunt(), ...[-1, 1].map((s) => blob([hx + s * w * 0.46, hy + 5, d * 0.06], [w * 0.25, h * 0.6, d * 0.42], c)));
      break;
    case "pixie":
      front.push(cap(0.98), blob([hx - w * 0.18, hy - h * 0.33, d * 0.37], [w * 0.7, h * 0.24, d * 0.28], c, [0, 0, 0.3]), ...burns());
      break;
    case "ponytail":
      front.push(cap(), ...sweep(), ...burns());
      back.push(
        ...tube(
          [
            [hx + w * 0.3, hy - h * 0.42, -d * 0.36],
            [hx + w * 0.62, hy - h * 0.2, -d * 0.28],
            [hx + w * 0.66, hy + h * 0.2, -d * 0.2],
            [hx + w * 0.56, hy + h * 0.5, -d * 0.16],
          ],
          7,
          4,
          c,
        ),
      );
      front.push(blob([hx + w * 0.36, hy - h * 0.38, -d * 0.3], [7, 7, 7], "#F27A93"));
      break;
    case "bun":
      front.push(cap(), ...sweep(), ...burns());
      top.push(blob([hx, hy - h * 0.66, -4], [w * 0.4, h * 0.36, w * 0.38], c), torus([hx, hy - h * 0.54, -4], w * 0.13, 1.8, "#F27A93", [Math.PI / 2, 0, 0]));
      break;
    case "buns":
      front.push(cap(), blunt(), ...burns());
      for (const s of [-1, 1]) top.push(blob([hx + s * w * 0.38, hy - h * 0.56, -2], [w * 0.36, w * 0.34, w * 0.34], c));
      break;
    case "pigtails":
      front.push(cap(), blunt(), ...burns());
      for (const s of [-1, 1]) {
        back.push(
          ...tube(
            [
              [hx + s * w * 0.48, hy - h * 0.16, -4],
              [hx + s * w * 0.62, hy - h * 0.02, -4],
              [hx + s * w * 0.64, hy + h * 0.3, -2],
            ],
            6,
            4,
            c,
          ),
        );
        front.push(blob([hx + s * w * 0.53, hy - h * 0.12, -2], [7, 7, 7], "#F27A93"));
      }
      break;
    case "braids":
      back.push(blob([hx, hy, -d * 0.3], [w * 1.12, h * 0.9, d * 0.5], c));
      front.push(cap(), blob([hx - w * 0.2, hy - h * 0.32, d * 0.35], [w * 0.5, h * 0.24, d * 0.28], c, [0, 0, 0.5]), blob([hx + w * 0.2, hy - h * 0.32, d * 0.35], [w * 0.5, h * 0.24, d * 0.28], c, [0, 0, -0.5]));
      for (const s of [-1, 1]) front.push(...braid(hx + s * w * 0.44, hy + h * 0.12, hx + s * w * 0.38, hy + h * 0.72, d * 0.22));
      break;
    case "sidebraid":
      back.push(blob([hx, hy, -d * 0.3], [w * 1.12, h * 0.9, d * 0.5], c));
      front.push(cap(), ...sweep(), blob([hx + w * 0.47, hy - 2, 0], [10, 20, 15], c));
      front.push(...braid(hx - w * 0.46, hy + h * 0.06, hx - w * 0.34, hy + h * 0.78, d * 0.24, 6));
      break;
    case "bangs":
      back.push(longBack());
      front.push(cap(), blunt(), ...panels(1));
      break;
    case "longcurls":
      back.push(longBack(1.2), fluff([hx, hy + h * 0.2, -d * 0.3], [w * 0.62, h * 0.55, d * 0.22], { count: 18, size: [13, 16], color: c, seed: 12, from: -0.4, to: Math.PI + 0.4, rows: 2 }));
      front.push(cap(1.02), fluff([hx, hy - h * 0.2, 0], [w * 0.5, h * 0.36, d * 0.46], { count: 12, size: [11, 14], color: c, seed: 5, from: Math.PI * 1.05, to: Math.PI * 1.95, front: 0.3 }));
      for (const s of [-1, 1]) front.push(fluff([hx + s * w * 0.48, hy + h * 0.3, d * 0.06], [3, h * 0.3, 3], { count: 5, size: [10, 12], color: c, seed: 6 + s, from: -Math.PI / 2, to: Math.PI * 1.5 }));
      break;
    case "manbun":
      front.push(cap(), ...sweep(), ...burns());
      top.push(blob([hx, hy - h * 0.6, -d * 0.2], [w * 0.3, h * 0.27, w * 0.28], c));
      break;
    case "locs":
      front.push(cap(1.02), ...burns());
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const ang = Math.PI * (0.92 - t * 0.84);
        const x = hx + Math.cos(ang) * w * 0.52;
        const z = -d * 0.18 - Math.sin(ang) * d * 0.2;
        back.push(
          ...tube(
            [
              [x, hy - h * 0.3, z],
              [x + Math.cos(ang) * 4, hy + h * 0.1, z],
              [x + Math.cos(ang) * 6, hy + h * 0.5, z],
            ],
            3.6,
            3,
            c,
          ),
        );
      }
      front.push(blob([hx, hy - h * 0.3, d * 0.34], [w * 0.74, h * 0.22, d * 0.3], c));
      break;
    case "horseshoe":
      for (const s of [-1, 1]) front.push(blob([hx + s * w * 0.47, hy - 5, -5], [13, 22, 26], c));
      back.push(blob([hx, hy - 6, -d * 0.36], [w * 0.92, h * 0.5, d * 0.34], c));
      break;
    case "bald":
      break;
  }
  void surf;
  return { back, front, top, fringe };
}

/* ---------- glasses ---------- */

function glasses(p: PersonConfig, H: (typeof LAYOUT)["adult"]["head"], surf: (dy: number, dx?: number) => number): O[] {
  if (p.eyewear === "none") return [];
  const gap = H.w * 0.38;
  const ey = H.y + 3;
  const r = H.w * 0.115;
  const frame = p.eyewear === "hearts" ? "#E8577E" : INK;
  const out: O[] = [];
  for (const s of [-1, 1]) {
    const ex = H.x + (s * gap) / 2;
    const z = surf(3, gap / 2) + 1.6;
    if (p.eyewear === "hearts") {
      out.push(pillow(heartOutline(ex, ey + 0.5, r * 1.25), 1, "#F7A8C0", z - 1, 0.8));
    } else {
      const ring = torus([ex, ey, z], r, p.eyewear === "square" ? 1.7 : 1.15, frame);
      if (p.eyewear === "square") ring.scale.set(1.12, 0.88, 1);
      out.push(ring);
      if (p.eyewear === "sun") out.push(blob([ex, ey, z - 0.4], [r * 2, r * 1.8, 1.4], "#2E2A33", [0, 0, 0], { rough: 0.2, gloss: 0.9 }));
    }
    // Temples to the ears.
    out.push(limb([ex + s * r, ey - 0.5, z - 1], [H.x + s * H.w * 0.48, ey - 1, 2], 0.8, frame));
  }
  out.push(limb([H.x - gap / 2 + r * 0.9, ey - 1, surf(2, 3) + 1.6], [H.x + gap / 2 - r * 0.9, ey - 1, surf(2, 3) + 1.6], 0.9, frame));
  return out;
}

/* ---------- hats ---------- */

function hat(p: PersonConfig, H: (typeof LAYOUT)["adult"]["head"], color: string, outfit: string, crownY: number): O[] {
  const { x: hx, y: hy, w, h, d } = H;
  const band = (y: number, R: number, r: number, c: string, tilt = 0.25) => {
    const t = torus([hx, y, -1], R, r, c, [Math.PI / 2 - tilt, 0, 0]);
    t.scale.set(1, 1, d / w);
    return t;
  };
  switch (p.headwear) {
    case "beanie":
      return [blob([hx, hy - h * 0.3, -2], [w * 1.14, h * 0.74, d * 1.12], color), band(hy - h * 0.2, w * 0.54, 4.6, shade(color, -12)), blob([hx, hy - h * 0.7, -2], [12, 12, 12], WHITE)];
    case "cap":
      return [blob([hx, hy - h * 0.3, -2], [w * 1.12, h * 0.68, d * 1.1], color), blob([hx + 2, hy - h * 0.3, d * 0.5], [w * 0.74, 4, 22], shade(color, -10), [-0.15, 0, 0]), blob([hx, hy - h * 0.63, -2], [5, 4, 5], shade(color, -14))];
    case "sunhat":
      return [blob([hx, hy - h * 0.46, -2], [w * 0.92, h * 0.52, d * 0.92], "#F2D9A6"), blob([hx, hy - h * 0.3, 0], [w * 1.95, 4.5, d * 1.7], "#F2D9A6", [-0.18, 0, 0]), band(hy - h * 0.36, w * 0.45, 2.2, color, 0.18)];
    case "bucket":
      return [
        lathe(
          [
            [0, -0.5],
            [0.5, -0.5],
            [0.34, -0.3],
            [0.32, 0.4],
            [0.24, 0.5],
            [0, 0.5],
          ],
          [hx, hy - h * 0.42, -2],
          [w * 1.5, h * 0.62, d * 1.42],
          color,
          -0.12,
        ),
      ];
    case "beret":
      return [blob([hx + 5, hy - h * 0.48, -2], [w * 1.16, 15, d * 1.06], color, [0, 0, -0.18]), blob([hx + 6, hy - h * 0.62, -2], [4, 5, 4], shade(color, -12))];
    case "headband":
      return [band(hy - h * 0.3, w * 0.47, 2.6, color, 0.38)];
    case "bow":
      return [
        blob([hx + w * 0.22, hy - h * 0.5, 4], [16, 12, 9], color, [0, 0, 0.4]),
        blob([hx + w * 0.44, hy - h * 0.38, 4], [16, 12, 9], color, [0, 0, -0.3]),
        blob([hx + w * 0.33, hy - h * 0.44, 7], [7, 7, 7], shade(color, -14)),
      ];
    case "flowers": {
      const outF: O[] = [band(hy - h * 0.3, w * 0.47, 1.6, "#6FB27C", 0.38)];
      const cols = ["#F7A8C0", "#FFD166", "#FBF7F0", "#B9A3E0", "#F27A93"];
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.12 + (i / 6) * 0.76);
        const x = hx - Math.cos(a) * w * 0.47;
        const y = hy - h * 0.3 - Math.sin(a) * 4.5 + 2;
        const z = Math.sin(a) * d * 0.47 - 1;
        for (let k = 0; k < 5; k++) {
          const b = (k / 5) * Math.PI * 2;
          outF.push(blob([x + Math.cos(b) * 2.8, y + Math.sin(b) * 2.8, z], [4.4, 4.4, 3], cols[i % cols.length]!));
        }
        outF.push(blob([x, y, z + 1], [2.6, 2.6, 2.6], GOLD));
      }
      return outF;
    }
    case "party": {
      const base = crownY + 5;
      const top = base - 22;
      return [
        cone([hx + 3, base - 9, -2], 22, 24, 22, color, 0.14),
        ...[0, 1].map((i) => blob([hx + 1.5 + i * 2.2, base - 5 - i * 7, 6 - i * 2.4], [4, 4, 2.5], WHITE)),
        blob([hx + 6, top + 1, -2], [8, 8, 8], outfit === color ? WHITE : GOLD),
      ];
    }
    case "crown":
      return [
        lathe(
          [
            [0, -0.5],
            [0.5, -0.5],
            [0.5, 0.5],
            [0, 0.5],
          ],
          [hx, crownY + 4, -2],
          [w * 0.62, 9, d * 0.6],
          GOLD,
          0,
          GLOSS,
        ),
        ...[-2, -1, 0, 1, 2].map((i) => cone([hx + i * w * 0.12, crownY - 4 + Math.abs(i) * 1.2, -2 + (2 - Math.abs(i)) * 3], 7, 10, 7, GOLD, i * 0.12)),
        blob([hx, crownY + 4, d * 0.31], [5, 5, 3], "#E8577E", [0, 0, 0], GLOSS),
      ];
    case "grad":
      return [
        blob([hx, hy - h * 0.34, -2], [w * 1.06, h * 0.56, d * 1.06], INK),
        rbox([hx, hy - h * 0.6, -2], [w * 1.25, 3.5, w * 1.15], 1.4, INK, [0.2, 0.7, 0]),
        blob([hx, hy - h * 0.64, -2], [5, 4, 5], GOLD),
        limb([hx + 1, hy - h * 0.64, 2], [hx + w * 0.42, hy - h * 0.46, 8], 0.8, GOLD),
        blob([hx + w * 0.42, hy - h * 0.38, 8], [4, 9, 4], GOLD),
      ];
  }
  return [];
}

/* ---------- what they hold ---------- */

function heldItem(p: PersonConfig, cx: number, cy: number, cz: number, T: { top: number; bottom: number; w: number; d: number }, accent: string): { objs: O[]; hands: Hands } {
  const both = (dx: number, dy = 2, dz = 1): Hands => ({ l: [cx - dx, cy + dy, cz + dz], r: [cx + dx, cy + dy, cz + dz] });
  const raised: V3 = [60 + T.w / 2 + 6, T.top - 2, 8];
  switch (p.held) {
    case "none":
      return { objs: [], hands: { l: null, r: null } };
    case "book":
      return {
        objs: [
          rbox([cx, cy, cz - 2.5], [34, 23, 2.2], 2, accent, [0, 0, 0]),
          rbox([cx - 8, cy - 0.5, cz], [16, 21, 2.6], 1.5, WHITE, [0, 0.35, 0]),
          rbox([cx + 8, cy - 0.5, cz], [16, 21, 2.6], 1.5, WHITE, [0, -0.35, 0]),
        ],
        hands: both(15, 6, 2),
      };
    case "cup":
      return {
        objs: [lathe(CYL, [cx, cy, cz + 2], [15, 18, 15], WHITE), lathe(CYL, [cx, cy + 1, cz + 2], [15.6, 7, 15.6], "#B9774E"), lathe(CYL, [cx, cy - 9.5, cz + 2], [16, 3, 16], WHITE)],
        hands: both(9, 3, 3),
      };
    case "flowers": {
      const objs: O[] = [cone([cx, cy + 6, cz + 2], 16, 24, 14, "#F4EEE3", Math.PI)];
      const cols = ["#F27A93", "#FFD166", "#B9A3E0", "#F7A8C0", "#E8577E"];
      [
        [-6, -8],
        [5, -9],
        [0, -14],
        [-9, -14],
        [8, -15],
      ].forEach(([dx, dy], i) => {
        const x = cx + dx!;
        const y = cy + dy!;
        for (let k = 0; k < 5; k++) {
          const b = (k / 5) * Math.PI * 2;
          objs.push(blob([x + Math.cos(b) * 2.6, y + Math.sin(b) * 2.6, cz + 4], [4.5, 4.5, 3.4], cols[i]!));
        }
        objs.push(blob([x, y, cz + 5.5], [2.6, 2.6, 2.6], GOLD));
      });
      objs.push(blob([cx - 11, cy - 4, cz + 1], [6, 10, 3], "#6FB27C", [0, 0, 0.6]), blob([cx + 11, cy - 4, cz + 1], [6, 10, 3], "#6FB27C", [0, 0, -0.6]));
      return { objs, hands: both(4, 12, 5) };
    }
    case "balloon":
      return {
        objs: [
          ...tube(
            [
              [raised[0], raised[1] - 2, raised[2]],
              [raised[0] + 5, raised[1] - 12, raised[2] - 5],
              [raised[0] + 11, raised[1] - 23, raised[2] - 9],
            ],
            0.7,
            0.7,
            "#8A7F7A",
          ),
          blob([raised[0] + 12, raised[1] - 36, raised[2] - 10], [22, 26, 20], accent, [0, 0, 0], { rough: 0.3, gloss: 0.5 }),
        ],
        hands: { l: null, r: raised, raiseR: true },
      };
    case "gift":
      return {
        objs: [
          rbox([cx, cy + 3, cz], [26, 20, 18], 4, accent),
          rbox([cx, cy + 3, cz + 0.2], [5, 20.5, 18.5], 1.5, "#F27A93"),
          rbox([cx, cy + 3, cz + 0.2], [26.5, 5, 18.5], 1.5, "#F27A93"),
          blob([cx - 4, cy - 9, cz], [9, 6, 6], "#F27A93", [0, 0, 0.5]),
          blob([cx + 4, cy - 9, cz], [9, 6, 6], "#F27A93", [0, 0, -0.5]),
        ],
        hands: both(14, 5, 1),
      };
    case "cupcake":
      return {
        objs: [
          lathe(
            [
              [0, -0.5],
              [0.36, -0.5],
              [0.5, 0.5],
              [0, 0.5],
            ],
            [cx, cy + 4, cz + 2],
            [18, 11, 18],
            accent,
          ),
          blob([cx, cy - 3, cz + 2], [21, 11, 19], "#F7A8C0"),
          blob([cx, cy - 8, cz + 2], [13, 8, 12], "#F7A8C0"),
          blob([cx, cy - 13, cz + 3], [6, 6, 6], "#E8463C", [0, 0, 0], GLOSS),
        ],
        hands: both(9, 6, 3),
      };
    case "phone":
      return {
        objs: [rbox([cx + 6, cy, cz + 2], [14, 22, 3], 3, "#2E2A33", [0, 0, 0.12], GLOSS), rbox([cx + 6.2, cy - 0.5, cz + 3.6], [11, 17, 0.8], 2, "#9FD3F2", [0, 0, 0.12], { rough: 0.2, gloss: 0.8 })],
        hands: { l: null, r: [cx + 9, cy + 9, cz + 4] },
      };
    case "camera":
      return {
        objs: [
          rbox([cx, cy, cz], [30, 19, 14], 5, "#9CCFC4"),
          rbox([cx, cy - 4.5, cz + 0.2], [30.5, 6, 14.5], 2, "#FBF1E2"),
          torus([cx, cy + 1.5, cz + 7.5], 5.4, 1.8, shade("#9CCFC4", -20)),
          blob([cx, cy + 1.5, cz + 7.5], [8.6, 8.6, 3], "#2E2A33", [0, 0, 0], GLOSS),
        ],
        hands: both(15, 3, 1),
      };
    case "guitar":
      return {
        objs: [
          rbox([cx + 16, cy - 14, cz + 1], [6, 34, 3], 1.5, "#8A5A3C", [0, 0, -0.75]),
          rbox([cx + 28, cy - 26, cz + 1], [8, 9, 3], 2, "#5E3B26", [0, 0, -0.75]),
          blob([cx - 6, cy + 8, cz], [27, 23, 9], "#E39A4F", [0, 0, -0.75]),
          blob([cx + 2, cy - 1, cz], [21, 18, 9], "#E39A4F", [0, 0, -0.75]),
          blob([cx - 1, cy + 3, cz + 4.6], [7, 7, 1.2], INK),
        ],
        hands: { l: [cx + 20, cy - 16, cz + 4], r: [cx - 3, cy + 10, cz + 6] },
      };
    case "icecream":
      return {
        objs: [cone([cx + 6, cy + 4, cz + 2], 12, 18, 12, "#E3A65C", Math.PI), blob([cx + 6, cy - 6, cz + 2], [14, 12, 13], "#F7A8C0"), blob([cx + 6, cy - 14, cz + 2], [12, 10, 11], "#FBF1E2"), blob([cx + 6, cy - 20, cz + 3], [4.5, 4.5, 4.5], "#E8463C", [0, 0, 0], GLOSS)],
        hands: { l: null, r: [cx + 8, cy + 9, cz + 4] },
      };
    case "heart":
      return { objs: [pillow(heartOutline(cx, cy, 13), 6, "#F27A93", cz, 3)], hands: both(13, 2, 0) };
    case "wand":
      return {
        objs: [limb([raised[0], raised[1] + 2, raised[2]], [raised[0] + 6, raised[1] - 22, raised[2]], 1.1, GOLD), pillow(starOutline(raised[0] + 7, raised[1] - 28, 9, 0.5), 4, "#FFD166", raised[2], 2)],
        hands: { l: null, r: raised, raiseR: true },
      };
    case "pizza":
      return {
        objs: [
          pillow(
            [
              [cx - 11, cy - 8],
              [cx + 11, cy - 8],
              [cx, cy + 14],
            ],
            3,
            "#F6C350",
            cz,
            2,
          ),
          ...tube(
            [
              [cx - 12, cy - 9, cz + 2],
              [cx, cy - 11, cz + 2],
              [cx + 12, cy - 9, cz + 2],
            ],
            3,
            3,
            "#D9934A",
          ),
          ...[
            [-4, -3],
            [4, -2],
            [0, 4],
          ].map(([dx, dy]) => blob([cx + dx!, cy + dy!, cz + 3.5], [5, 5, 2], "#D9534F")),
        ],
        hands: both(11, -4, 1),
      };
    case "brush":
      return {
        objs: [
          limb([cx + 10, cy + 8, cz + 3], [cx + 18, cy - 14, cz + 3], 1.3, "#8A5A3C"),
          lathe(
            [
              [0, -0.5],
              [0.5, -0.2],
              [0.3, 0.5],
              [0, 0.5],
            ],
            [cx + 19, cy - 17, cz + 3],
            [4, 7, 4],
            accent,
          ),
          blob([cx - 12, cy + 4, cz], [22, 16, 3], "#E8C9A0", [0, 0, 0.2]),
          ...["#D9534F", "#4F7FD9", "#FFD166", "#6FB27C"].map((c, i) => blob([cx - 18 + i * 4, cy + 1 + (i % 2) * 3, cz + 2], [3.6, 3.6, 2], c)),
        ],
        hands: { l: [cx - 10, cy + 9, cz + 2], r: [cx + 10, cy + 8, cz + 4] },
      };
    case "ball":
      return {
        objs: [
          blob([cx, cy + 3, cz + 2], [24, 24, 24], WHITE),
          ...[
            [0, 0],
            [-7, -6],
            [7, -6],
            [-6, 8],
            [6, 8],
          ].map(([dx, dy]) => blob([cx + dx!, cy + 3 + dy!, cz + 2 + 11.5 - Math.hypot(dx!, dy!) * 0.45], [6, 6, 2.2], INK)),
        ],
        hands: both(13, 4, 1),
      };
    case "controller":
      return {
        objs: [
          rbox([cx, cy, cz], [30, 13, 9], 5, "#3E3A40"),
          blob([cx - 11, cy + 5, cz - 1], [11, 13, 9], "#3E3A40"),
          blob([cx + 11, cy + 5, cz - 1], [11, 13, 9], "#3E3A40"),
          rbox([cx - 8, cy, cz + 4.6], [7, 2.2, 1], 0.5, "#BFB8B8"),
          rbox([cx - 8, cy, cz + 4.6], [2.2, 7, 1], 0.5, "#BFB8B8"),
          blob([cx + 7, cy - 2, cz + 4.6], [3, 3, 2], "#E8577E", [0, 0, 0], GLOSS),
          blob([cx + 10.5, cy + 1, cz + 4.6], [3, 3, 2], "#FFD166", [0, 0, 0], GLOSS),
        ],
        hands: both(13, 7, 2),
      };
    case "plant":
      return {
        objs: [
          lathe(
            [
              [0, -0.5],
              [0.38, -0.5],
              [0.5, 0.5],
              [0, 0.5],
            ],
            [cx, cy + 5, cz + 1],
            [18, 13, 17],
            "#E08A5F",
          ),
          ...[
            [0, -10, 0],
            [-6, -7, 0.6],
            [6, -7, -0.6],
            [-3, -12, 0.25],
            [3, -12, -0.25],
          ].map(([dx, dy, r]) => blob([cx + dx!, cy + dy!, cz + 2], [6, 13, 5], "#6FB27C", [0, 0, r!])),
        ],
        hands: both(10, 6, 2),
      };
    case "letter":
      return {
        objs: [
          rbox([cx, cy, cz], [28, 19, 3], 2, "#FBF3E6"),
          pillow(
            [
              [cx - 13, cy - 9],
              [cx + 13, cy - 9],
              [cx, cy + 2],
            ],
            0.6,
            "#EADFCB",
            cz + 1.8,
            0.6,
          ),
          pillow(heartOutline(cx, cy + 1, 4), 1.4, "#E8577E", cz + 2.6, 0.8),
        ],
        hands: both(15, 4, 1),
      };
    case "popsicle":
      return {
        objs: [limb([cx + 7, cy + 4, cz + 2], [cx + 7, cy + 12, cz + 2], 1.4, "#E3C08A"), rbox([cx + 7, cy - 6, cz + 2], [13, 20, 7], 6, accent), rbox([cx + 7, cy - 13, cz + 2.2], [13.4, 6, 7.4], 3, "#F7A8C0")],
        hands: { l: null, r: [cx + 8, cy + 10, cz + 4] },
      };
    case "teddy":
      return {
        objs: [
          egg([cx, cy + 6, cz], 20, 18, 14, "#B9875A"),
          blob([cx, cy - 6, cz + 1], [17, 15, 14], "#B9875A"),
          blob([cx - 7, cy - 12, cz], [7, 7, 5], "#B9875A"),
          blob([cx + 7, cy - 12, cz], [7, 7, 5], "#B9875A"),
          blob([cx, cy - 3, cz + 7.5], [7, 5, 3], "#E8C9A0"),
          blob([cx, cy - 4, cz + 9], [2.4, 1.8, 1.4], INK, [0, 0, 0], GLOSS),
          blob([cx - 3.6, cy - 8, cz + 7.6], [1.8, 1.8, 1.2], INK, [0, 0, 0], GLOSS),
          blob([cx + 3.6, cy - 8, cz + 7.6], [1.8, 1.8, 1.2], INK, [0, 0, 0], GLOSS),
        ],
        hands: both(10, 6, 3),
      };
  }
  return { objs: [], hands: { l: null, r: null } };
}
