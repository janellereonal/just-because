/**
 * Clay objects with faces (the "little friends"). Same box and rules as
 * scene.ts. Each sits on the floor at y = 112 and leaves room for its face.
 */
import { blob, cone, feet, GLOSS, heartOutline, lathe, limb, pillow, rbox, shade, starOutline, torus, tube, type ClayRecipe } from "@/lib/clay/shapes";

const INK = "#2E2A33";
const GOLD = "#E5C26B";

/** A teardrop profile for lathe(): point on top, round at the bottom. */
const DROP: [number, number][] = (() => {
  const raw = Array.from({ length: 49 }, (_, i) => {
    const u = (i / 48) * Math.PI;
    return [Math.sin(u) * Math.pow(Math.sin(u / 2), 1.3), Math.cos(u)] as [number, number];
  });
  const max = Math.max(...raw.map(([r]) => r));
  return raw.map(([r, y]) => [(r / max) * 0.5, y * 0.5] as [number, number]).reverse();
})();

/** A straight-sided cylinder profile with soft edges. */
const CYL = (soft = 0.08): [number, number][] => [
  [0, -0.5],
  [0.5 - soft, -0.5],
  [0.5, -0.5 + soft],
  [0.5, 0.5 - soft],
  [0.5 - soft, 0.5],
  [0, 0.5],
];

/** A flame (candles, cake). */
function flame(x: number, y: number, s = 1) {
  const outer = lathe(DROP, [x, y, 2], [10 * s, 18 * s, 10 * s], "#FFB547", 0, { rough: 0.3, gloss: 0.4, sheen: 0.8 });
  const inner = lathe(DROP, [x, y + 3 * s, 4], [5 * s, 9 * s, 5 * s], "#FFF0B8", 0, { rough: 0.3, sheen: 1 });
  return [outer, inner];
}

/** A cone pointing at the viewer (carrot noses). */
function pointer(x: number, y: number, z: number, w: number, len: number, color: string) {
  const o = cone([x, y, z + len / 2], w, len, w, color);
  o.rotation.set(Math.PI / 2, 0, 0);
  return o;
}

export const OBJECTS: Record<string, ClayRecipe> = {
  robot: (c) => [
    limb([60, 32, 0], [60, 18, 0], 2, shade(c.primary, -30)),
    blob([60, 16, 0], [9, 9, 9], c.secondary),
    rbox([60, 56, 0], [66, 52, 46], 16, c.primary),
    rbox([60, 57, 23], [48, 36, 6], 9, INK, [0, 0, 0], GLOSS),
    blob([25, 56, 0], [8, 14, 10], shade(c.primary, -14)),
    blob([95, 56, 0], [8, 14, 10], shade(c.primary, -14)),
    rbox([60, 95, 0], [46, 26, 34], 11, c.primary),
    pillow(heartOutline(60, 95, 7), 2, c.secondary, 18, 1.5),
    blob([31, 94, 4], [10, 16, 10], c.primary, [0, 0, 0.3]),
    blob([89, 94, 4], [10, 16, 10], c.primary, [0, 0, -0.3]),
    ...feet(109, shade(c.primary, -14), [48, 72], [15, 7, 14]),
  ],
  star: (c) => [
    pillow(starOutline(60, 66, 46, 0.48), 20, c.primary, 0, 9),
    ...feet(108, shade(c.primary, -16), [46, 74], [15, 8, 13]),
  ],
  candle: (c) => [
    limb([60, 50, 0], [60, 42, 0], 1.6, INK),
    ...flame(60, 34, 1.1),
    lathe(CYL(0.1), [60, 82, 0], [58, 56, 54], c.primary),
    lathe(CYL(0.2), [60, 56, 0], [62, 8, 58], shade(c.primary, 8)),
    ...(
      [
        [38, 62, 18, 14],
        [52, 64, 24, 18],
        [70, 61, 23, 12],
        [82, 63, 16, 16],
      ] as const
    ).map(([x, y, z, h]) => blob([x, y, z], [10, h, 8], shade(c.primary, 8))),
    ...feet(110, c.secondary, [46, 74], [14, 6, 12]),
  ],
  pencil: (c) => [
    lathe(
      [
        [0, -0.5],
        [0.5, 0.42],
        [0.46, 0.5],
        [0, 0.5],
      ],
      [60, 30, 0],
      [34, 22, 32],
      c.skin,
    ),
    lathe(
      [
        [0, -0.5],
        [0.5, 0.45],
        [0, 0.5],
      ],
      [60, 22, 0],
      [11, 8, 10],
      INK,
    ),
    lathe(CYL(0.04), [60, 64, 0], [36, 48, 34], c.primary),
    lathe(CYL(0.15), [60, 92, 0], [38, 12, 36], "#C9CCD2", 0, { rough: 0.35, gloss: 0.5 }),
    torus([60, 88, 0], 18.6, 1.4, "#AEB2BA", [Math.PI / 2, 0, 0]),
    torus([60, 96, 0], 18.6, 1.4, "#AEB2BA", [Math.PI / 2, 0, 0]),
    lathe(CYL(0.3), [60, 104, 0], [36, 14, 34], c.secondary),
  ],
  camera: (c) => [
    rbox([60, 52, -2], [32, 14, 22], 5, c.skin),
    rbox([84, 50, -2], [12, 8, 10], 3, c.primary),
    rbox([60, 82, 0], [80, 50, 36], 12, c.primary),
    rbox([60, 66, 1], [80.5, 17, 37], 6, c.skin),
    torus([60, 88, 18], 13, 4.5, shade(c.primary, -18)),
    blob([60, 88, 18], [22, 22, 8], INK, [0, 0, 0], GLOSS),
    blob([56, 84, 22], [6, 6, 2], "#FFFFFF", [0, 0, 0], { rough: 0.2, gloss: 0.8 }),
    ...feet(110, shade(c.primary, -14), [42, 78], [14, 6, 12]),
  ],
  backpack: (c) => [
    torus([60, 52, -6], 10, 3.2, shade(c.primary, -18), [0, 0, 0], Math.PI),
    limb([36, 58, 8], [33, 102, 8], 3.6, shade(c.primary, -18)),
    limb([84, 58, 8], [87, 102, 8], 3.6, shade(c.primary, -18)),
    rbox([60, 80, 0], [58, 58, 36], 18, c.primary),
    rbox([60, 97, 16], [44, 20, 10], 7, shade(c.primary, -10)),
    rbox([60, 88, 20], [44, 5, 4], 2, shade(c.primary, -22)),
    blob([60, 90, 23], [5, 4, 3], GOLD, [0, 0, 0], { rough: 0.3, gloss: 0.6 }),
    ...feet(110, shade(c.primary, -18), [46, 74], [14, 6, 12]),
  ],
  drop: (c) => [lathe(DROP, [60, 70, 0], [64, 80, 58], c.primary, 0, { rough: 0.45, gloss: 0.25 }), ...feet(110, shade(c.primary, -14), [48, 72], [14, 6, 12])],
  planet: (c) => [
    blob([60, 62, 0], [66, 66, 62], c.primary),
    blob([60, 44, 0], [56, 6, 53], shade(c.primary, 16)),
    blob([60, 80, 0], [60, 6, 57], shade(c.primary, -12)),
    torus([60, 82, 0], 46, 4.4, c.secondary, [1.32, 0, 0.12]),
    ...feet(108, shade(c.primary, -18), [48, 72], [14, 7, 12]),
  ],
  bulb: (c) => [
    blob([60, 50, 0], [62, 60, 58], c.primary, [0, 0, 0], { rough: 0.4, gloss: 0.35, sheen: 0.6 }),
    lathe(
      [
        [0.2, -0.5],
        [0.34, 0],
        [0.5, 0.5],
        [0, 0.5],
      ],
      [60, 80, 0],
      [44, 16, 42],
      c.primary,
      0,
      { rough: 0.4, gloss: 0.35 },
    ),
    ...[90, 96, 102].map((y) => lathe(CYL(0.3), [60, y, 0], [30, 6, 29], "#9EA3AC", 0, { rough: 0.35, gloss: 0.5 })),
    lathe(CYL(0.4), [60, 108, 0], [16, 6, 15], INK),
  ],
  bubble: (c) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 360; i += 3) {
      const a = (i * Math.PI) / 180;
      if (i > 100 && i < 135) continue;
      if (i === 135) pts.push([30, 110]);
      pts.push([60 + Math.cos(a) * 42, 64 + Math.sin(a) * 38]);
    }
    return [
      pillow(pts, 22, c.primary, 0, 9),
      ...[44, 60, 76].map((x) => blob([x, 52, 22], [11, 11, 7], c.secondary)),
    ];
  },
  heart: (c) => [pillow(heartOutline(60, 64, 48), 20, c.primary, 0, 10)],
  cake: (c) => [
    limb([60, 50, 0], [60, 36, 0], 3.2, c.skin),
    ...flame(60, 28, 0.9),
    lathe(CYL(0.12), [60, 88, 0], [80, 36, 66], c.skin),
    lathe(CYL(0.25), [60, 70, 0], [84, 14, 70], c.primary),
    ...[26, 40, 56, 72, 88].map((x, i) => blob([x, 79 + (i % 2) * 3, 26 - Math.abs(x - 60) * 0.25], [10, 12 + (i % 2) * 4, 8], c.primary)),
    blob([60, 62, 6], [10, 10, 10], c.secondary, [0, 0, 0], { rough: 0.3, gloss: 0.6 }),
  ],
  balloon: (c) => [
    ...tube(
      [
        [60, 92, 0],
        [56, 100, 2],
        [62, 106, 2],
        [58, 111, 2],
      ],
      0.9,
      0.9,
      shade(c.primary, -30),
    ),
    blob([60, 50, 0], [62, 70, 58], c.primary, [0, 0, 0], { rough: 0.35, gloss: 0.45 }),
    lathe(
      [
        [0, -0.5],
        [0.5, 0.2],
        [0.3, 0.5],
        [0, 0.5],
      ],
      [60, 88, 0],
      [10, 8, 10],
      shade(c.primary, -10),
    ),
  ],
  letter: (c) => {
    const flap = pillow(
      [
        [22, 50],
        [98, 50],
        [60, 82],
      ],
      2,
      shade(c.primary, -10),
      8,
      2,
    );
    return [
      rbox([60, 78, 0], [86, 58, 14], 8, c.primary),
      flap,
      pillow(heartOutline(60, 78, 9), 4, c.secondary, 11, 2),
      ...feet(110, shade(c.primary, -20), [44, 76], [14, 6, 10]),
    ];
  },
  snowman: (c) => [
    limb([30, 80, 0], [14, 66, 0], 1.8, "#8A5A3C"),
    limb([90, 80, 0], [106, 66, 0], 1.8, "#8A5A3C"),
    blob([60, 92, 0], [58, 40, 52], c.primary),
    blob([60, 56, 0], [48, 44, 46], c.primary),
    torus([60, 75, 0], 19, 4.6, c.secondary, [Math.PI / 2 - 0.15, 0, 0]),
    blob([72, 86, 22], [9, 18, 6], c.secondary, [0, 0, -0.2]),
    pointer(60, 61, 22, 6, 14, "#F28C38"),
    lathe(CYL(0.3), [60, 34, 0], [40, 12, 36], c.secondary),
    blob([60, 25, 0], [10, 10, 10], "#FFFFFF"),
    ...[88, 98].map((y) => blob([60, y, 26], [5, 5, 4], INK, [0, 0, 0], GLOSS)),
  ],
  ornament: (c) => [
    torus([60, 26, 0], 5, 1.6, GOLD, [0, 0, 0]),
    lathe(CYL(0.2), [60, 36, 0], [20, 10, 18], GOLD, 0, { rough: 0.3, gloss: 0.6 }),
    blob([60, 72, 0], [68, 68, 62], c.primary, [0, 0, 0], { rough: 0.3, gloss: 0.6 }),
    blob([60, 92, 0], [55, 6, 51], c.secondary, [0, 0, 0], { rough: 0.3, gloss: 0.6 }),
  ],
  suitcase: (c) => [
    torus([60, 50, -2], 10, 3.2, shade(c.primary, -30), [0, 0, 0], Math.PI),
    rbox([60, 78, 0], [82, 56, 34], 11, c.primary),
    rbox([60, 78, 17], [82.5, 4, 2], 1.5, shade(c.primary, -18)),
    rbox([30, 66, 17.5], [12, 9, 2], 2, c.secondary, [0, 0, -0.18]),
    rbox([89, 94, 17.5], [12, 9, 2], 2, "#7ED7C1", [0, 0, 0.2]),
    ...[34, 86].map((x) => blob([x, 108, 4], [9, 9, 9], INK)),
  ],
  sun: (c) => [
    ...Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const x = 60 + Math.cos(a) * 44;
      const y = 64 + Math.sin(a) * 44;
      return cone([x, y, -4], 14, 14, 10, c.secondary, a + Math.PI / 2);
    }),
    blob([60, 64, 0], [72, 72, 60], c.primary),
  ],
};

