/**
 * Hand-drawn doodles for the Handwritten format. Every doodle is a few pen strokes made of
 * points (in a 100x100 box), given a little seeded wobble and smoothed into curves, then
 * traced twice like a real pen going over a line. Original drawings, no assets.
 *
 * <Doodle> draws itself in (stroke by stroke) the first time it scrolls into view.
 * Under reduced motion it simply appears.
 */
import { useEffect, useRef, useState } from "react";

type Pt = [number, number];
type Stroke = Pt[];

/** Deterministic random numbers from a string. */
function rng(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/** Catmull-Rom through the points, as cubic beziers. */
function smooth(pts: Pt[]): string {
  if (pts.length < 2) return "";
  const p = (i: number) => pts[Math.max(0, Math.min(pts.length - 1, i))]!;
  let d = `M${pts[0]![0].toFixed(1)} ${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function wobble(stroke: Stroke, r: () => number, amount: number): Pt[] {
  return stroke.map(([x, y]) => [x + (r() - 0.5) * amount, y + (r() - 0.5) * amount]);
}

const ring = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n = 14,
  from = 0,
  turns = 1.08,
): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = from + (i / n) * Math.PI * 2 * turns;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });

/* ---------- the doodles ---------- */

const SHAPES = {
  heart: (): Stroke[] => [
    Array.from({ length: 26 }, (_, i) => {
      const t = (i / 25) * Math.PI * 2 + 0.12;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return [50 + x * 2.7, 47 + y * 2.7] as Pt;
    }),
  ],
  star: (): Stroke[] => {
    const pts: Stroke = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 19 : 44;
      pts.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r]);
    }
    pts.push([pts[1]![0] * 0.9 + 5, pts[1]![1] * 0.9 + 5]);
    return [pts];
  },
  sun: (): Stroke[] => [
    ring(50, 50, 20, 20, 12),
    ...Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      return [
        [50 + Math.cos(a) * 29, 50 + Math.sin(a) * 29],
        [50 + Math.cos(a) * 43, 50 + Math.sin(a) * 43],
      ] as Stroke;
    }),
  ],
  flower: (): Stroke[] => [
    ...Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return ring(50 + Math.cos(a) * 15, 38 + Math.sin(a) * 15, 11, 11, 9, a, 1.02);
    }),
    ring(50, 38, 6, 6, 7),
    [
      [50, 52],
      [52, 70],
      [49, 94],
    ],
    [
      [51, 78],
      [64, 70],
      [70, 72],
      [60, 80],
      [51, 79],
    ],
  ],
  swirl: (): Stroke[] => [
    Array.from({ length: 30 }, (_, i) => {
      const t = i / 29;
      const a = t * Math.PI * 5;
      const r = 4 + t * 38;
      return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r] as Pt;
    }),
  ],
  arrow: (): Stroke[] => [
    [
      [8, 70],
      [30, 46],
      [56, 40],
      [84, 46],
    ],
    [
      [70, 32],
      [86, 46],
      [70, 60],
    ],
  ],
  smiley: (): Stroke[] => [
    ring(50, 50, 38, 36, 16),
    [
      [37, 38],
      [37, 46],
    ],
    [
      [63, 38],
      [63, 46],
    ],
    [
      [30, 60],
      [42, 72],
      [58, 72],
      [70, 59],
    ],
  ],
  sparkle: (): Stroke[] => [
    [
      [50, 6],
      [54, 44],
      [94, 50],
      [54, 56],
      [50, 94],
      [46, 56],
      [6, 50],
      [46, 44],
      [50, 6],
    ],
  ],
  cloud: (): Stroke[] => [
    [
      [14, 70],
      [10, 56],
      [22, 46],
      [30, 30],
      [48, 26],
      [60, 34],
      [74, 30],
      [88, 44],
      [90, 62],
      [80, 72],
      [14, 70],
    ],
  ],
  music: (): Stroke[] => [
    ring(30, 76, 10, 8, 10),
    ring(72, 66, 10, 8, 10),
    [
      [40, 74],
      [40, 22],
      [82, 12],
      [82, 64],
    ],
    [
      [40, 34],
      [82, 24],
    ],
  ],
  burst: (): Stroke[] => [
    [
      [20, 40],
      [36, 48],
    ],
    [
      [44, 14],
      [50, 34],
    ],
    [
      [76, 22],
      [64, 40],
    ],
  ],
  bow: (): Stroke[] => [
    [
      [50, 50],
      [24, 30],
      [12, 46],
      [24, 64],
      [50, 50],
      [76, 30],
      [88, 46],
      [76, 64],
      [50, 50],
    ],
    [
      [48, 52],
      [38, 86],
    ],
    [
      [52, 52],
      [64, 86],
    ],
  ],
  check: (): Stroke[] => [
    [
      [14, 54],
      [36, 76],
      [86, 20],
    ],
  ],
} as const;

export type DoodleName = keyof typeof SHAPES;
export const DOODLES = Object.keys(SHAPES) as DoodleName[];

/** One doodle as SVG path strings: each stroke, plus a fainter second pass. */
function strokesFor(name: DoodleName, key: string) {
  const r = rng(`${name}:${key}`);
  const raw = SHAPES[name]();
  return raw.map((s) => ({ main: smooth(wobble(s, r, 3.2)), echo: smooth(wobble(s, r, 4.5)) }));
}

/** Draws in once it scrolls into view (or at once under reduced motion). */
function useDrawn<T extends Element>(instant: boolean) {
  const ref = useRef<T | null>(null);
  const [drawn, setDrawn] = useState(instant);
  useEffect(() => {
    if (drawn || !ref.current) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDrawn(true);
      return;
    }
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [drawn]);
  return { ref, drawn };
}

export function Doodle({
  name,
  seedKey = "",
  color = "currentColor",
  size = 56,
  width = 3.4,
  className = "",
  style,
  instant = false,
  delay = 0,
}: {
  name: DoodleName;
  seedKey?: string;
  color?: string;
  size?: number | string;
  width?: number;
  className?: string;
  style?: React.CSSProperties;
  instant?: boolean;
  /** Seconds before the first stroke starts. */
  delay?: number;
}) {
  const { ref, drawn } = useDrawn<SVGSVGElement>(instant);
  const strokes = strokesFor(name, seedKey);
  const per = 0.5 / Math.max(1, strokes.length / 2);
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`hw-doodle ${drawn ? "is-drawn" : ""} ${className}`}
      style={style}
      aria-hidden
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {strokes.map((s, i) => (
        <g key={i} style={{ "--hw-d": `${(delay + i * per).toFixed(2)}s` } as React.CSSProperties}>
          <path d={s.main} pathLength={1} strokeWidth={width} className="hw-stroke" />
          <path
            d={s.echo}
            pathLength={1}
            strokeWidth={width * 0.55}
            className="hw-stroke hw-echo"
          />
        </g>
      ))}
    </svg>
  );
}

/** A loose underline that draws in under a word or signature. */
export function Underline({
  color,
  seedKey = "",
  className = "",
}: {
  color: string;
  seedKey?: string;
  className?: string;
}) {
  const { ref, drawn } = useDrawn<SVGSVGElement>(false);
  const r = rng(`u:${seedKey}`);
  const pts: Pt[] = Array.from({ length: 7 }, (_, i) => [
    2 + i * 16,
    8 + Math.sin(i * 1.4 + r() * 2) * 3,
  ]);
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 16"
      preserveAspectRatio="none"
      className={`hw-underline ${drawn ? "is-drawn" : ""} ${className}`}
      aria-hidden
      fill="none"
      stroke={color}
      strokeLinecap="round"
    >
      <path
        d={smooth(wobble(pts, r, 2))}
        pathLength={1}
        strokeWidth={2.6}
        className="hw-stroke"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** A scribbled loop around something (a name, a big number). */
export function CircleAround({
  color,
  seedKey = "",
  className = "",
}: {
  color: string;
  seedKey?: string;
  className?: string;
}) {
  const { ref, drawn } = useDrawn<SVGSVGElement>(false);
  const r = rng(`c:${seedKey}`);
  const pts = wobble(ring(50, 50, 47, 42, 18, -0.6, 1.12), r, 3);
  return (
    <svg
      ref={ref}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`hw-circle ${drawn ? "is-drawn" : ""} ${className}`}
      aria-hidden
      fill="none"
      stroke={color}
      strokeLinecap="round"
    >
      <path
        d={smooth(pts)}
        pathLength={1}
        strokeWidth={2.4}
        className="hw-stroke"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
