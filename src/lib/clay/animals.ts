/**
 * Clay animals. Same box and rules as scene.ts: bodies sit on the floor at
 * y = 112, faces are live SVG on top (see `clay` in cast/library.tsx), and
 * noses, beaks and muzzles are modelled here.
 */
import { blob, cone, egg, feet, fluff, GLOSS, limb, shade, tube, type ClayRecipe, type V3 } from "@/lib/clay/shapes";

/** A cone pointing outwards from (cx, cy) at angle `a` (box coords, y down). */
function spike(cx: number, cy: number, r: number, a: number, len: number, w: number, color: string, z = 0) {
  const x = cx + Math.cos(a) * r;
  const y = cy + Math.sin(a) * r;
  // cone() points up; its tilt turns it clockwise (box coords).
  const tilt = a + Math.PI / 2;
  return cone([x + Math.cos(a) * len * 0.35, y + Math.sin(a) * len * 0.35, z], w, len, w * 0.8, color, tilt);
}

/** Points along a flat spiral on the front of a dome (snail shells). */
function spiral(cx: number, cy: number, z: number, r0: number, r1: number, turns: number, depth: number): V3[] {
  const pts: V3[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const a = -Math.PI / 2 + t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    const k = Math.min(1, r / r0);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z + depth * Math.sqrt(Math.max(0, 1 - k * k * 0.85))]);
  }
  return pts;
}

const INK = "#2E2220";

/**
 * A flat marking that the eyes sit in (panda patches, owl eye discs). It doesn't cast a
 * shadow: with the key light up on the left, a shadow falls only to the right of each patch
 * and makes the two sides of the face look different.
 */
function marking<T extends { castShadow: boolean }>(m: T): T {
  m.castShadow = false;
  return m;
}

export const ANIMALS: Record<string, ClayRecipe> = {
  snail: (c) => [
    blob([70, 66, -6], [62, 62, 36], c.primary),
    ...tube(spiral(70, 66, -6, 25, 4, 1.9, 18), 2.6, 2, shade(c.primary, -30)),
    ...tube(
      [
        [26, 102, 6],
        [60, 106, 6],
        [94, 106, 4],
        [104, 104, 2],
      ],
      9,
      4,
      c.skin,
    ),
    egg([31, 74, 10], 30, 50, 30, c.skin, { bulge: 0.1 }),
    limb([27, 54, 12], [21, 32, 10], 2.6, c.skin),
    limb([37, 54, 12], [43, 32, 10], 2.6, c.skin),
    blob([21, 29, 10], [12, 12, 11], "#FFFFFF"),
    blob([43, 29, 10], [12, 12, 11], "#FFFFFF"),
  ],
  octopus: (c) => {
    const arms = [
      [-30, -6],
      [-18, 10],
      [-6, 16],
      [6, 16],
      [18, 10],
      [30, -6],
    ].flatMap(([dx, z]) => {
      const s = Math.sign(dx!);
      const x0 = 60 + dx! * 0.55;
      return tube(
        [
          [x0, 84, z!],
          [60 + dx! * 1.0, 100, z!],
          [60 + dx! * 1.35, 106, z!],
          [60 + dx! * 1.6 + s * 4, 100, z!],
          [60 + dx! * 1.55 + s * 2, 94, z!],
        ],
        9,
        3.5,
        c.primary,
      );
    });
    return [...arms, egg([60, 56, 0], 76, 68, 62, c.primary, { bulge: -0.05, flat: 0.1 })];
  },
  bee: (c) => [
    blob([35, 44, -14], [32, 24, 6], "#D9EEFA", [0, 0, -0.5], { rough: 0.4, sheen: 0.6 }),
    blob([85, 44, -14], [32, 24, 6], "#D9EEFA", [0, 0, 0.5], { rough: 0.4, sheen: 0.6 }),
    limb([50, 40, 2], [43, 20, 0], 1.8, c.secondary),
    limb([70, 40, 2], [77, 20, 0], 1.8, c.secondary),
    blob([43, 19, 0], [8, 8, 8], c.secondary),
    blob([77, 19, 0], [8, 8, 8], c.secondary),
    egg([60, 72, 0], 72, 72, 62, c.primary),
    blob([60, 85, 0], [73, 10, 63], c.secondary),
    blob([60, 99, 0], [61, 8, 53], c.secondary),
    ...feet(108, c.secondary, [48, 72], [13, 7, 12]),
  ],
  chick: (c) => [
    blob([53, 36, 0], [10, 10, 9], c.secondary),
    blob([60, 31, 0], [11, 12, 10], c.secondary),
    blob([67, 36, 0], [10, 10, 9], c.secondary),
    egg([60, 74, 0], 70, 74, 60, c.primary),
    blob([26, 80, 2], [14, 24, 12], shade(c.primary, -10), [0, 0, 0.5]),
    blob([94, 80, 2], [14, 24, 12], shade(c.primary, -10), [0, 0, -0.5]),
    blob([60, 71, 30], [13, 7, 12], c.skin, [0, 0, 0], { rough: 0.45, gloss: 0.2 }),
    blob([60, 75, 29], [10, 5, 9], shade(c.skin, -20), [0, 0, 0], { rough: 0.45 }),
    blob([60, 83, 28], [7, 9, 6], c.secondary),
    ...feet(109, c.skin, [48, 72], [15, 6, 13]),
  ],
  elephant: (c) => [
    blob([23, 64, -6], [34, 46, 10], c.primary, [0, 0, 0.25]),
    blob([97, 64, -6], [34, 46, 10], c.primary, [0, 0, -0.25]),
    blob([24, 64, -1], [22, 32, 4], c.secondary, [0, 0, 0.25]),
    blob([96, 64, -1], [22, 32, 4], c.secondary, [0, 0, -0.25]),
    egg([60, 74, 0], 70, 72, 60, c.primary),
    ...tube(
      [
        [60, 72, 26],
        [60, 84, 33],
        [61, 96, 32],
        [67, 102, 28],
      ],
      7.5,
      5.5,
      c.primary,
    ),
    blob([46, 106, 6], [17, 14, 17], c.primary),
    blob([74, 106, 6], [17, 14, 17], c.primary),
    blob([46, 111, 8], [14, 4, 13], shade(c.primary, 22)),
    blob([74, 111, 8], [14, 4, 13], shade(c.primary, 22)),
  ],
  turtle: (c) => [
    blob([60, 86, -12], [92, 50, 50], c.secondary),
    blob([60, 92, -12], [96, 22, 52], shade(c.secondary, 18)),
    egg([60, 70, 8], 64, 70, 54, c.primary),
    blob([28, 100, 6], [18, 12, 16], c.primary, [0, 0, 0.3]),
    blob([92, 100, 6], [18, 12, 16], c.primary, [0, 0, -0.3]),
    ...feet(108, c.primary, [44, 76], [18, 9, 16]),
  ],
  pig: (c) => [
    cone([37, 40, 0], 22, 20, 12, c.primary, -0.55),
    cone([83, 40, 0], 22, 20, 12, c.primary, 0.55),
    blob([33, 41, 7], [12, 10, 6], c.secondary, [0, 0, 0.6]),
    blob([87, 41, 7], [12, 10, 6], c.secondary, [0, 0, -0.6]),
    egg([60, 74, 0], 78, 72, 62, c.primary),
    blob([60, 82, 29], [25, 17, 13], c.secondary),
    blob([55, 82, 36], [4, 5.5, 3], shade(c.secondary, -45), [0, 0, 0], GLOSS),
    blob([65, 82, 36], [4, 5.5, 3], shade(c.secondary, -45), [0, 0, 0], GLOSS),
    ...feet(108, c.secondary, [46, 74], [16, 9, 15]),
  ],
  penguin: (c) => [
    blob([23, 80, 0], [12, 32, 14], c.primary, [0, 0, 0.42]),
    blob([97, 80, 0], [12, 32, 14], c.primary, [0, 0, -0.42]),
    egg([60, 72, 0], 72, 78, 60, c.primary),
    blob([60, 78, 13], [56, 64, 38], c.secondary),
    blob([60, 74, 31], [12, 8, 10], c.skin, [0, 0, 0], { rough: 0.45, gloss: 0.2 }),
    ...feet(109, c.skin, [47, 73], [17, 6, 14]),
  ],
  giraffe: (c) => [
    limb([50, 26, 0], [47, 13, 0], 2.8, c.primary),
    limb([70, 26, 0], [73, 13, 0], 2.8, c.primary),
    blob([47, 12, 0], [9, 9, 9], c.secondary),
    blob([73, 12, 0], [9, 9, 9], c.secondary),
    blob([30, 38, -2], [18, 10, 8], c.primary, [0, 0, 0.45]),
    blob([90, 38, -2], [18, 10, 8], c.primary, [0, 0, -0.45]),
    egg([60, 96, -4], 52, 34, 44, c.primary, { flat: 0.3 }),
    limb([60, 64, -2], [60, 84, -2], 12, c.primary),
    egg([60, 48, 0], 58, 48, 50, c.primary, { bulge: 0 }),
    blob([60, 61, 20], [30, 17, 14], c.skin),
    blob([55, 60, 27], [3, 3, 2], shade(c.secondary, -20)),
    blob([65, 60, 27], [3, 3, 2], shade(c.secondary, -20)),
    ...(
      [
        [38, 46, 18, 7],
        [82, 42, 18, 6],
        [44, 92, 16, 8],
        [74, 98, 16, 7],
        [60, 82, 8, 6],
      ] as const
    ).map(([x, y, z, s]) => blob([x, y, z], [s, s * 0.8, 3], c.secondary)),
    blob([48, 104, 10], [12, 14, 12], c.primary),
    blob([72, 104, 10], [12, 14, 12], c.primary),
    ...feet(110, c.secondary, [48, 72], [13, 6, 12]),
  ],
  dino: (c) => [
    ...tube(
      [
        [82, 98, -8],
        [98, 94, -10],
        [110, 82, -12],
      ],
      9,
      3,
      c.primary,
    ),
    ...[-1.95, -1.6, -1.25, -0.9, -0.55, -0.2].map((a, i) => spike(64, 74, 33, a, 15 - Math.abs(i - 2) * 1.2, 10, c.secondary, -10)),
    egg([60, 72, 0], 72, 74, 60, c.primary),
    blob([60, 90, 17], [40, 32, 22], c.skin),
    blob([29, 86, 10], [10, 14, 10], c.primary, [0, 0, 0.5]),
    blob([91, 86, 10], [10, 14, 10], c.primary, [0, 0, -0.5]),
    ...feet(108, c.primary, [46, 74], [17, 10, 16]),
  ],
  koala: (c) => [
    blob([29, 44, -4], [32, 30, 16], c.primary),
    blob([91, 44, -4], [32, 30, 16], c.primary),
    fluff([29, 45, 3], [8, 8, 4], { count: 7, size: [7, 9], color: c.skin, seed: 3 }),
    fluff([91, 45, 3], [8, 8, 4], { count: 7, size: [7, 9], color: c.skin, seed: 5 }),
    egg([60, 74, 0], 72, 74, 58, c.primary),
    blob([60, 96, 18], [32, 22, 16], c.skin),
    blob([60, 79, 30], [14, 18, 10], c.secondary, [0, 0, 0], GLOSS),
    blob([30, 94, 10], [12, 18, 12], c.primary, [0, 0, 0.4]),
    blob([90, 94, 10], [12, 18, 12], c.primary, [0, 0, -0.4]),
    ...feet(108, shade(c.primary, -12)),
  ],
  hedgehog: (c) => {
    const quills = Array.from({ length: 15 }, (_, i) => {
      const a = Math.PI * (0.95 + (i / 14) * 1.1);
      return spike(60, 68, 40, a, 14, 12, shade(c.primary, i % 2 ? -10 : 6), -6);
    });
    return [
      ...quills,
      blob([60, 70, -8], [88, 84, 54], c.primary),
      egg([60, 80, 14], 60, 58, 42, c.skin),
      blob([60, 80, 35], [8, 6, 5], INK, [0, 0, 0], GLOSS),
      blob([40, 96, 26], [12, 10, 10], shade(c.skin, -14)),
      blob([80, 96, 26], [12, 10, 10], shade(c.skin, -14)),
      ...feet(109, shade(c.skin, -14), [46, 74], [15, 8, 14]),
    ];
  },
  sheep: (c) => [
    blob([28, 60, 4], [20, 10, 10], c.secondary, [0, 0, 0.4]),
    blob([92, 60, 4], [20, 10, 10], c.secondary, [0, 0, -0.4]),
    blob([46, 106, 4], [10, 14, 10], INK),
    blob([74, 106, 4], [10, 14, 10], INK),
    egg([60, 74, 0], 74, 70, 60, c.primary),
    fluff([60, 74, 0], [34, 30, 26], { count: 18, size: [18, 24], color: c.primary, seed: 21, front: 0.05 }),
    fluff([60, 40, 10], [12, 6, 6], { count: 6, size: [13, 16], color: c.primary, seed: 8 }),
    egg([60, 74, 20], 40, 40, 24, c.secondary, { bulge: 0.05 }),
  ],
  panda: (c) => [
    blob([35, 42, -4], [22, 22, 14], c.secondary),
    blob([85, 42, -4], [22, 22, 14], c.secondary),
    egg([60, 74, 0], 74, 74, 60, c.primary),
    marking(blob([45, 70, 26], [17, 21, 6], "#5D585E", [0, 0, -0.55])),
    marking(blob([75, 70, 26], [17, 21, 6], "#5D585E", [0, 0, 0.55])),
    blob([60, 82, 32], [8, 6, 5], INK, [0, 0, 0], GLOSS),
    blob([27, 92, 8], [13, 18, 13], c.secondary, [0, 0, 0.4]),
    blob([93, 92, 8], [13, 18, 13], c.secondary, [0, 0, -0.4]),
    ...feet(108, c.secondary),
  ],
  fox: (c) => [
    ...tube(
      [
        [84, 100, -14],
        [101, 90, -16],
        [107, 72, -14],
        [101, 58, -12],
      ],
      9,
      9,
      c.primary,
    ),
    blob([100, 56, -12], [16, 16, 16], c.skin),
    cone([38, 34, -2], 22, 28, 14, c.primary, -0.3),
    cone([82, 34, -2], 22, 28, 14, c.primary, 0.3),
    cone([35, 24, 1], 10, 12, 8, c.secondary, -0.3),
    cone([85, 24, 1], 10, 12, 8, c.secondary, 0.3),
    egg([60, 74, 0], 74, 72, 60, c.primary),
    blob([60, 86, 24], [44, 24, 18], c.skin),
    blob([60, 102, 20], [30, 14, 14], c.skin),
    blob([60, 79, 34], [8, 6, 5], INK, [0, 0, 0], GLOSS),
    ...feet(108, c.secondary),
  ],
  mouse: (c) => [
    ...tube(
      [
        [82, 104, -10],
        [100, 104, -10],
        [108, 92, -10],
        [102, 84, -10],
      ],
      2.6,
      1.8,
      c.secondary,
    ),
    blob([31, 42, -4], [32, 32, 8], c.primary),
    blob([89, 42, -4], [32, 32, 8], c.primary),
    blob([31, 43, 0], [20, 20, 4], c.secondary),
    blob([89, 43, 0], [20, 20, 4], c.secondary),
    egg([60, 76, 0], 68, 68, 58, c.primary),
    blob([60, 82, 30], [8, 6, 6], c.secondary, [0, 0, 0], { rough: 0.4, gloss: 0.3 }),
    ...feet(108, c.secondary, [47, 73], [15, 8, 14]),
  ],
  owl: (c) => [
    cone([38, 36, -2], 16, 18, 12, c.primary, -0.4),
    cone([82, 36, -2], 16, 18, 12, c.primary, 0.4),
    blob([24, 82, 0], [14, 34, 14], shade(c.primary, -14), [0, 0, 0.3]),
    blob([96, 82, 0], [14, 34, 14], shade(c.primary, -14), [0, 0, -0.3]),
    egg([60, 72, 0], 72, 78, 60, c.primary),
    blob([60, 96, 17], [40, 26, 20], c.skin),
    marking(blob([46, 64, 24], [28, 28, 10], c.skin)),
    marking(blob([74, 64, 24], [28, 28, 10], c.skin)),
    blob([60, 76, 31], [8, 10, 7], c.secondary, [0, 0, 0], { rough: 0.45, gloss: 0.2 }),
    ...feet(109, c.secondary, [50, 70], [12, 5, 10]),
  ],
  whale: (c) => [
    ...tube(
      [
        [92, 88, -6],
        [102, 76, -8],
        [104, 62, -8],
      ],
      9,
      5,
      c.primary,
    ),
    blob([97, 56, -8], [18, 10, 9], c.primary, [0, 0, -0.6]),
    blob([111, 56, -8], [18, 10, 9], c.primary, [0, 0, 0.6]),
    blob([54, 80, 0], [88, 60, 60], c.primary),
    blob([52, 96, 13], [62, 24, 32], c.skin),
    blob([46, 40, 0], [7, 11, 7], c.secondary, [0, 0, 0], { rough: 0.3, gloss: 0.5 }),
    blob([38, 34, 0], [5, 8, 5], c.secondary, [0, 0, 0.5], { rough: 0.3, gloss: 0.5 }),
    blob([54, 34, 0], [5, 8, 5], c.secondary, [0, 0, -0.5], { rough: 0.3, gloss: 0.5 }),
  ],
};
