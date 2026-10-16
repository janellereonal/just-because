/**
 * The wishing tree and its sixteen ornaments, in clay, for the Tree section
 * (src/components/GiftTree.tsx). Rendered like the cast by tools/screens/clay.js
 * into public/clay/xtree.webp and public/clay/orn-<key>.webp.
 *
 * Ornaments are drawn hanging from a loop at the top center (60, 16) so they
 * can swing from that point in the browser.
 */
import { blob, egg, GLOSS, heartOutline, lathe, limb, pillow, rbox, shade, starOutline, torus, tube, type ClayRecipe, type V3 } from "@/lib/clay/shapes";

const GOLD = "#E8C266";
const RED = "#E0475A";
const WHITE = "#FBF7F0";
const INK = "#2E2A33";
const GREEN = "#5DAE6A";
const SHINY = { rough: 0.28, gloss: 0.7 };

const CYL: [number, number][] = [
  [0, -0.5],
  [0.46, -0.5],
  [0.5, -0.4],
  [0.5, 0.4],
  [0.46, 0.5],
  [0, 0.5],
];

/** Gold cap and hanging loop shared by most ornaments. */
const cap = (y = 27, w = 16) => [lathe(CYL, [60, y, 0], [w, 9, w * 0.92], GOLD, 0, SHINY), torus([60, y - 9, 0], 4.6, 1.5, GOLD, [0, 0, 0])];

/** A tiny face: two glossy eyes and a smile. */
function face(x: number, y: number, z: number, s = 1): ReturnType<typeof blob>[] {
  const eyes = [-1, 1].map((k) => blob([x + k * 5 * s, y, z], [3.4 * s, 4 * s, 2.4 * s], INK, [0, 0, 0], GLOSS));
  const smile = tube(
    [
      [x - 3.4 * s, y + 4.4 * s, z],
      [x, y + 6.6 * s, z + 0.4],
      [x + 3.4 * s, y + 4.4 * s, z],
    ],
    0.8 * s,
    0.8 * s,
    INK,
  );
  const cheeks = [-1, 1].map((k) => blob([x + k * 9 * s, y + 4 * s, z - 1.2], [4.6 * s, 3 * s, 1.6 * s], "#F59AAE"));
  return [...eyes, ...smile, ...cheeks] as ReturnType<typeof blob>[];
}

/** Points along a curve on the front of a cone tier (garlands). */
function swag(y0: number, y1: number, w: number, z: number): V3[] {
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const x = 60 - w / 2 + w * t;
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 4;
    return [x, y, z + Math.sin(t * Math.PI) * 6] as V3;
  });
}

export const TREE: Record<string, ClayRecipe> = {
  xtree: () => {
    const tier = (y: number, w: number, h: number, color: string) =>
      lathe(
        [
          [0, -0.46],
          [0.44, -0.5],
          [0.5, -0.42],
          [0.47, -0.32],
          [0.3, 0.06],
          [0.13, 0.38],
          [0, 0.5],
        ],
        [60, y, 0],
        [w, h, w * 0.9],
        color,
      );
    const lights: [number, number, number, string][] = [
      [40, 92, 34, "#FFD166"],
      [58, 96, 42, "#F48FB1"],
      [78, 92, 34, "#8EC0E8"],
      [30, 98, 22, "#FFB4A2"],
      [90, 98, 22, "#FFD166"],
      [46, 68, 30, "#8EC0E8"],
      [70, 70, 30, "#FFD166"],
      [58, 46, 22, "#F48FB1"],
    ];
    return [
      // Pot and trunk
      lathe(CYL, [60, 104, 0], [16, 14, 14], "#8A5A3C"),
      lathe(
        [
          [0, -0.5],
          [0.4, -0.5],
          [0.5, 0.42],
          [0.52, 0.5],
          [0, 0.5],
        ],
        [60, 109, 0],
        [40, 14, 34],
        "#D9775A",
      ),
      lathe(CYL, [60, 102.5, 0], [42, 4, 36], shade("#D9775A", 14)),
      // Three soft tiers, lightest on top
      tier(84, 100, 40, shade(GREEN, -10)),
      tier(60, 80, 38, GREEN),
      tier(37, 58, 34, shade(GREEN, 12)),
      // Snowy tips on each tier
      ...[84, 60, 37].map((y, i) => blob([60, y - [16, 15, 13][i]!, [8, 6, 4][i]!], [[16, 13, 10][i]!, 6, [14, 11, 9][i]!], WHITE)),
      // Garlands
      ...tube(swag(76, 90, 74, 28), 1.8, 1.8, "#FBE6C8"),
      ...tube(swag(54, 66, 56, 22), 1.6, 1.6, "#FBE6C8"),
      // Little lights
      ...lights.map(([x, y, z, c]) => blob([x, y, z], [7, 7, 7], c, [0, 0, 0], { rough: 0.2, gloss: 0.9, sheen: 1 })),
      // Star
      pillow(starOutline(60, 13, 12, 0.48), 5, GOLD, 0, 3),
    ];
  },

  "orn-bauble": () => [...cap(), blob([60, 66, 0], [68, 68, 64], RED, [0, 0, 0], SHINY), lathe(CYL, [60, 66, 0], [69, 9, 65], WHITE), ...[-20, -8, 4, 16].map((x) => blob([60 + x, 66, 33 - Math.abs(x) * 0.5], [4, 4, 3], GOLD, [0, 0, 0], SHINY))],
  "orn-star": () => [torus([60, 18, 0], 4.6, 1.5, GOLD), pillow(starOutline(60, 62, 40, 0.5), 14, GOLD, 0, 6), ...face(60, 62, 15, 1.35)],
  "orn-stocking": () => [
    torus([48, 22, 0], 4.6, 1.5, GOLD),
    pillow(
      [
        [36, 34],
        [64, 34],
        [64, 76],
        [88, 90],
        [90, 102],
        [80, 110],
        [58, 108],
        [38, 92],
        [36, 80],
      ],
      14,
      RED,
      0,
      6,
    ),
    rbox([50, 34, 4], [36, 14, 22], 7, WHITE),
    blob([82, 101, 9], [16, 12, 8], WHITE),
  ],
  "orn-candy-cane": () => {
    const path: V3[] = [
      [52, 108, 0],
      [52, 80, 0],
      [52, 52, 0],
      [54, 34, 0],
      [64, 24, 0],
      [76, 28, 0],
      [80, 40, 0],
    ];
    const pieces = [];
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i]!;
      const b = path[i + 1]!;
      for (let k = 0; k < 3; k++) {
        const t0 = k / 3;
        const t1 = (k + 1) / 3;
        const p0: V3 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0, 0];
        const p1: V3 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1, 0];
        pieces.push(limb(p0, p1, 7, (i * 3 + k) % 2 ? WHITE : RED));
      }
    }
    return [torus([64, 14, 0], 4.6, 1.5, GOLD), ...pieces];
  },
  "orn-snowman": () => [
    torus([60, 14, 0], 4.6, 1.5, GOLD),
    blob([60, 86, 0], [50, 46, 46], WHITE),
    blob([60, 50, 0], [40, 38, 38], WHITE),
    lathe(CYL, [60, 28, 0], [30, 14, 28], INK),
    lathe(CYL, [60, 35, 0], [40, 4, 36], INK),
    torus([60, 66, 0], 17, 4, RED, [Math.PI / 2 - 0.15, 0, 0]),
    ...face(60, 48, 18, 0.9),
    blob([60, 54, 20], [6, 4, 8], "#F28C38"),
    ...[80, 92].map((y) => blob([60, y, 23], [4, 4, 3], INK, [0, 0, 0], GLOSS)),
  ],
  "orn-gingerbread": () => {
    const body = pillow(
      [
        [60, 22],
        [72, 26],
        [76, 38],
        [72, 48],
        [92, 52],
        [94, 62],
        [76, 64],
        [80, 98],
        [70, 104],
        [60, 88],
        [50, 104],
        [40, 98],
        [44, 64],
        [26, 62],
        [28, 52],
        [48, 48],
        [44, 38],
        [48, 26],
      ],
      12,
      "#C98B52",
      0,
      5,
    );
    return [torus([60, 14, 0], 4.6, 1.5, GOLD), body, ...face(60, 36, 12.5, 1.05), ...[62, 74, 86].map((y) => blob([60, y, 12], [5, 5, 3], RED, [0, 0, 0], SHINY)), ...tube([[30, 57, 12], [40, 58, 12]], 1.2, 1.2, WHITE), ...tube([[80, 58, 12], [90, 57, 12]], 1.2, 1.2, WHITE)];
  },
  "orn-bell": () => [
    torus([60, 16, 0], 4.6, 1.5, GOLD),
    lathe(
      [
        [0, 0.5],
        [0.18, 0.46],
        [0.26, 0.2],
        [0.32, -0.2],
        [0.48, -0.42],
        [0.5, -0.5],
        [0, -0.5],
      ],
      [60, 62, 0],
      [70, 72, 66],
      "#F7D46A",
      0,
      SHINY,
    ),
    blob([60, 100, 6], [12, 12, 12], shade(GOLD, -30), [0, 0, 0], SHINY),
    blob([50, 32, 18], [16, 10, 8], RED, [0, 0, 0.4]),
    blob([70, 32, 18], [16, 10, 8], RED, [0, 0, -0.4]),
    blob([60, 32, 21], [7, 7, 7], shade(RED, -20)),
  ],
  "orn-wreath": () => [
    torus([60, 14, 0], 4.6, 1.5, GOLD),
    torus([60, 64, 0], 30, 11, GREEN),
    ...Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      return blob([60 + Math.cos(a) * 30, 64 + Math.sin(a) * 30, 9], [9, 6, 5], shade(GREEN, 16), [0, 0, a]);
    }),
    ...[0.6, 2.3, 4.1].map((a) => blob([60 + Math.cos(a) * 32, 64 + Math.sin(a) * 32, 12], [6, 6, 6], RED, [0, 0, 0], SHINY)),
    blob([50, 94, 12], [18, 12, 8], RED, [0, 0, 0.4]),
    blob([70, 94, 12], [18, 12, 8], RED, [0, 0, -0.4]),
    blob([60, 94, 15], [8, 8, 8], shade(RED, -20)),
  ],
  "orn-mitten": () => [
    torus([56, 18, 0], 4.6, 1.5, GOLD),
    pillow(
      [
        [40, 44],
        [74, 44],
        [78, 64],
        [92, 60],
        [96, 70],
        [84, 82],
        [82, 98],
        [70, 108],
        [50, 108],
        [38, 96],
        [36, 70],
      ],
      16,
      "#4F7FD9",
      0,
      7,
    ),
    rbox([56, 36, 6], [42, 16, 24], 7, WHITE),
    ...[[52, 72], [64, 84], [52, 92], [68, 66]].map(([x, y]) => blob([x!, y!, 14], [6, 6, 3], WHITE)),
  ],
  "orn-snow-globe": () => [
    torus([60, 14, 0], 4.6, 1.5, GOLD),
    blob([60, 56, 0], [64, 64, 60], "#CFE8F7", [0, 0, 0], { rough: 0.15, gloss: 1, sheen: 0.6 }),
    blob([60, 74, 14], [36, 10, 20], WHITE),
    lathe(
      [
        [0, -0.5],
        [0.5, -0.5],
        [0.42, 0.5],
        [0, 0.5],
      ],
      [60, 66, 18],
      [16, 24, 10],
      GREEN,
    ),
    lathe(CYL, [60, 94, 0], [56, 16, 50], "#8A5A3C"),
    lathe(CYL, [60, 101, 0], [60, 4, 54], GOLD, 0, SHINY),
    ...[[44, 46], [72, 40], [56, 34], [80, 60]].map(([x, y]) => blob([x!, y!, 24], [4, 4, 4], WHITE)),
  ],
  "orn-gift": () => [
    torus([60, 14, 0], 4.6, 1.5, GOLD),
    rbox([60, 72, 0], [62, 56, 54], 10, "#7ED7C1"),
    rbox([60, 72, 0], [12, 57, 55], 3, RED),
    rbox([60, 72, 0], [63, 12, 55], 3, RED),
    blob([49, 40, 16], [24, 15, 12], RED, [0, 0, 0.5]),
    blob([71, 40, 16], [24, 15, 12], RED, [0, 0, -0.5]),
    blob([60, 42, 20], [11, 11, 11], shade(RED, -20)),
  ],
  "orn-heart": () => [torus([60, 18, 0], 4.6, 1.5, GOLD), pillow(heartOutline(60, 62, 42), 16, "#F27A93", 0, 8), ...face(60, 56, 17, 1.4)],
  "orn-candy": () => [
    torus([60, 26, 0], 4.6, 1.5, GOLD),
    limb([60, 30, 0], [60, 40, 0], 1.2, GOLD),
    blob([60, 66, 0], [44, 40, 38], "#B9A3E0", [0, 0, 0], SHINY),
    ...[-1, 1].map((s) => lathe(
      [
        [0, -0.5],
        [0.5, -0.5],
        [0.14, 0.5],
        [0, 0.5],
      ],
      [60 + s * 32, 66, 0],
      [26, 22, 22],
      "#FFD166",
    )).map((o, i) => {
      o.rotation.z = i === 0 ? -Math.PI / 2 : Math.PI / 2;
      return o;
    }),
    ...[-12, 0, 12].map((x) => tube([[60 + x - 4, 50, 16], [60 + x + 4, 82, 16]], 1.6, 1.6, WHITE)).flat(),
  ],
  "orn-cookie": () => [
    torus([60, 18, 0], 4.6, 1.5, GOLD),
    lathe(CYL, [60, 64, 0], [76, 18, 74], "#D9A066", Math.PI / 2),
    ...[[44, 52], [74, 50], [50, 82], [76, 78], [62, 90]].map(([x, y]) => blob([x!, y!, 9], [8, 7, 4], "#5E3B26")),
    ...face(60, 64, 10.5, 1.45),
  ],
  "orn-pinecone": () => [
    torus([60, 14, 0], 4.6, 1.5, GOLD),
    egg([60, 68, 0], 46, 70, 44, "#8A5A3C", { bulge: -0.1 }),
    ...Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 4 - (r % 2) }, (_, k) => {
        const n = 4 - (r % 2);
        const x = 60 + (k - (n - 1) / 2) * 11;
        const y = 44 + r * 12;
        return blob([x, y, 18 - Math.abs(x - 60) * 0.3], [12, 9, 8], shade("#8A5A3C", 14), [0.3, 0, 0]);
      }),
    ).flat(),
    blob([52, 28, 6], [16, 8, 6], GREEN, [0, 0, 0.5]),
    blob([68, 28, 6], [16, 8, 6], GREEN, [0, 0, -0.5]),
  ],
  "orn-angel": () => [
    torus([60, 22, 0], 11, 2, GOLD, [1.2, 0, 0]),
    blob([38, 70, -8], [26, 36, 8], WHITE, [0, 0, 0.5]),
    blob([82, 70, -8], [26, 36, 8], WHITE, [0, 0, -0.5]),
    lathe(
      [
        [0, -0.5],
        [0.5, -0.5],
        [0.2, 0.5],
        [0, 0.5],
      ],
      [60, 82, 0],
      [44, 52, 40],
      "#F7D6E0",
    ),
    blob([60, 44, 0], [30, 30, 28], "#F6D2B8"),
    blob([60, 36, -2], [32, 18, 28], "#E8C27A"),
    ...face(60, 46, 14, 0.85),
  ],
};
