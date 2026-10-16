/**
 * Light, material and depth for the openings.
 *
 * One key light for every theme: up, to the left and a little in front of the
 * viewer. Shadows fall down and to the right, highlights sit on top-left
 * edges, faces turned away from the light go darker. Everything here follows
 * the tilt (pointer, phone tilt, or the slow idle drift in ParallaxRoot), so
 * shadows slide, sheens glide and faces relight as the object turns. That is
 * what makes the objects read as real things in a room, not cut-outs.
 *
 * Rules: transform and opacity only in motion, textures are static SVG noise,
 * SVG lighting filters only inside SVG content (Safari ignores url() filters
 * on HTML), and nothing in a preserve-3d chain gets opacity, filter, overflow
 * or blend modes (those flatten the 3D). Leaves can have them.
 */
import { createContext, useContext, useEffect, useMemo } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useTilt } from "@/themes/_shared/stage";

/* ---------- the key light ---------- */

/** Direction towards the key light, CSS axes (x right, y down, z towards the viewer). */
const L = (() => {
  const v = [-0.45, -0.75, 0.6];
  const n = Math.hypot(v[0]!, v[1]!, v[2]!);
  return v.map((k) => k / n) as [number, number, number];
})();

/**
 * A layered shadow (contact, mid, far) that agrees with the key light.
 * `level` 0..1 is how high the object sits above the surface.
 * `tint` is the shadow's hue as "r,g,b" (warm rooms get warm shadows).
 */
export function elevation(level = 0.5, tint = "45,30,25", strength = 1) {
  const l = Math.max(0.05, level);
  const a = (k: number) => (k * strength).toFixed(3);
  const s = (y: number, blur: number, alpha: number, spread = 0) =>
    `${(y * 0.35).toFixed(1)}px ${y.toFixed(1)}px ${blur.toFixed(1)}px ${spread}px rgba(${tint},${a(alpha)})`;
  return [
    s(1, 1.5, 0.16),
    s(3 * l, 5 * l, 0.12),
    s(10 * l, 18 * l, 0.12),
    s(26 * l, 44 * l, 0.14, -4),
    s(52 * l, 70 * l, 0.1, -10),
  ].join(", ");
}

/** Inset rim light on the lit (top-left) edges and a little shade on the far ones. */
export function rim(strength = 1, light = "255,255,255", dark = "0,0,0") {
  return [
    `inset 1px 1.5px 0 rgba(${light},${(0.55 * strength).toFixed(3)})`,
    `inset 0 0 0 1px rgba(${light},${(0.08 * strength).toFixed(3)})`,
    `inset -1px -2px 0 rgba(${dark},${(0.1 * strength).toFixed(3)})`,
  ].join(", ");
}

/** Text that looks pressed into paper (letterpress). */
export function pressed(strength = 1) {
  return `0 1px 0 rgba(255,255,255,${0.7 * strength}), 0 -0.5px 0 rgba(0,0,0,${0.18 * strength})`;
}

/* ---------- materials ---------- */

const svg = (w: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${w}'>${body}</svg>`)}")`;
const noise = (id: string, freq: string, octaves: number, matrix: string, seed = 2) =>
  `<filter id='${id}' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#${id})'/>`;
// Alpha from the noise, color fixed: "0 0 0 0 r  0 0 0 0 g  0 0 0 0 b  0 0 0 a k".
const ink = (r: number, g: number, b: number, a: number, k: number) => `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} ${k}`;

export const TEXTURE = {
  /** Cotton paper: soft formation clouds and a fine tooth. */
  paper: svg(260, noise("d", ".018", 3, ink(0.45, 0.38, 0.3, 0.5, -0.18), 7) + noise("c", ".85", 2, ink(0.35, 0.3, 0.25, 0.22, 0), 5)),
  /** Smooth card stock: just the tooth. */
  card: svg(180, noise("c", "1.1", 2, ink(0.3, 0.27, 0.22, 0.22, 0), 4)),
  /** Frosted vellum: soft clouds, a few long fibers. */
  vellum: svg(
    320,
    noise("v", ".035", 3, ink(1, 1, 1, 0.9, -0.25), 6) + noise("f", ".006 .3", 1, ink(0.6, 0.6, 0.6, 0.6, -0.35), 11),
  ),
  /** Linen weave with slubs. */
  linen: svg(
    200,
    noise("h", ".006 .9", 2, ink(0.38, 0.28, 0.2, 0.5, -0.16), 2) +
      noise("w", ".9 .006", 2, ink(0.38, 0.28, 0.2, 0.5, -0.17), 8) +
      noise("s", ".01 .5", 1, ink(0.3, 0.22, 0.15, 1.2, -0.72), 13),
  ),
  /** Felt: dense short fuzz. */
  felt: svg(160, noise("u", ".7", 3, ink(0.2, 0.2, 0.25, 0.55, -0.05), 7) + noise("l", ".08", 2, ink(1, 1, 1, 0.5, -0.2), 3)),
  /** Wood grain along x (walnut veneer). */
  wood: svg(
    400,
    noise("g", ".004 .05", 4, ink(0.1, 0.05, 0.02, 1.6, -0.55), 4) +
      noise("h", ".003 .4", 2, ink(0.1, 0.05, 0.02, 1.4, -0.62), 8) +
      noise("p", ".01 .7", 2, ink(1, 0.9, 0.8, 0.6, -0.3), 12),
  ),
  /** Kraft board: coarse flecks. */
  kraft: svg(200, noise("k", ".55", 3, ink(0.3, 0.2, 0.1, 0.7, -0.15), 5) + noise("d", ".03", 2, ink(0.25, 0.15, 0.05, 0.5, -0.2), 9)),
  /** Brushed metal: long fine streaks. */
  brushed: svg(220, noise("m", ".002 .9", 2, ink(1, 1, 1, 0.5, -0.18), 3) + noise("n", ".002 .7", 2, ink(0, 0, 0, 0.35, -0.15), 7)),
  /** Plain fine noise for anything else. */
  grain: svg(160, noise("r", ".85", 3, ink(0, 0, 0, 0.16, 0), 1)),
} as const;
export type Material = keyof typeof TEXTURE;

/** Background layers that need a quieter texture (backgrounds can't take opacity). */
export const TEXTURE_SOFT = {
  paper: svg(260, noise("d", ".018", 3, ink(0.45, 0.38, 0.3, 0.12, -0.045), 7) + noise("c", ".85", 2, ink(0.35, 0.3, 0.25, 0.1, 0), 5)),
  linen: svg(
    200,
    noise("h", ".006 .9", 2, ink(0.38, 0.28, 0.2, 0.3, -0.1), 2) +
      noise("w", ".9 .006", 2, ink(0.38, 0.28, 0.2, 0.3, -0.1), 8) +
      noise("s", ".01 .5", 1, ink(0.3, 0.22, 0.15, 0.7, -0.42), 13),
  ),
} as const;

const TEXTURE_SIZE: Record<Material, number> = { paper: 260, card: 180, vellum: 320, linen: 200, felt: 160, wood: 400, kraft: 200, brushed: 220, grain: 160 };

/** A material laid over a surface. Put it inside the surface (it fills it and keeps its corners). */
export function Texture({
  material,
  opacity = 1,
  blend = "normal",
  scale = 1,
  className = "",
  style,
}: {
  material: Material;
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
  scale?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const s = TEXTURE_SIZE[material] * scale;
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 block ${className}`}
      style={{ borderRadius: "inherit", backgroundImage: TEXTURE[material], backgroundSize: `${s}px ${s}px`, mixBlendMode: blend, opacity, ...style }}
    />
  );
}

/* ---------- light that follows the tilt ---------- */

/**
 * A specular highlight that glides across a surface as the tilt changes, the
 * way light slides over a glossy card when you turn it. Put it inside the
 * surface; it clips to the surface's corners.
 */
export function Sheen({
  strength = 0.5,
  angle = 115,
  width = 26,
  travel = 55,
  blend = "normal",
  color = "255,255,255",
  className = "",
}: {
  strength?: number;
  angle?: number;
  /** Width of the bright band, in % of the surface. */
  width?: number;
  /** How far the band travels with a full tilt, in %. */
  travel?: number;
  blend?: React.CSSProperties["mixBlendMode"];
  color?: string;
  className?: string;
}) {
  const { x, y, live } = useTilt();
  const tx = useTransform(() => `${-x.get() * travel - y.get() * travel * 0.3}%`);
  const half = width / 2;
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 block overflow-hidden ${className}`} style={{ borderRadius: "inherit", mixBlendMode: blend }}>
      <motion.span
        className="absolute inset-y-[-20%] left-[-60%] block w-[220%]"
        style={{
          x: tx,
          willChange: live ? "transform" : undefined,
          background: `linear-gradient(${angle}deg, transparent ${50 - half - 14}%, rgba(${color},${(strength * 0.18).toFixed(3)}) ${50 - half}%, rgba(${color},${(strength * 0.5).toFixed(3)}) 50%, rgba(${color},${(strength * 0.18).toFixed(3)}) ${50 + half}%, transparent ${50 + half + 14}%)`,
        }}
      />
    </span>
  );
}

/**
 * A soft shadow on the surface under an object. It slides against the tilt (so
 * the object seems to float above it) and spreads and fades as `lift` rises.
 * Position it like the object's footprint; it offsets itself away from the light.
 */
export function FloorShadow({
  lift = 0,
  tint = "45,30,25",
  strength = 1,
  shape = "rect",
  radius = 8,
  depth = 18,
  className = "",
  style,
}: {
  /** 0 resting on the surface, 1 well above it. */
  lift?: number | MotionValue<number>;
  tint?: string;
  strength?: number;
  shape?: "rect" | "ellipse";
  radius?: number;
  /** How far the shadow parallaxes with a full tilt, in px. */
  depth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { x, y, live } = useTilt();
  const zero = useMotionValue(0);
  const liftMv = typeof lift === "number" ? zero : lift;
  const liftN = typeof lift === "number" ? lift : null;
  const l = () => liftN ?? liftMv.get();
  const tx = useTransform(() => -x.get() * depth + 6 + l() * 26);
  const ty = useTransform(() => -y.get() * depth * 0.6 + 10 + l() * 34);
  const sc = useTransform(() => 1 + l() * 0.1);
  const op = useTransform(() => (1 - l() * 0.45) * strength);
  const round = shape === "ellipse" ? "50%" : radius;
  return (
    <motion.span aria-hidden="true" className={`pointer-events-none absolute block ${className}`} style={{ ...(style as object), x: tx, y: ty, scale: sc, opacity: op, willChange: live ? "transform, opacity" : undefined }}>
      {/* Wide, soft penumbra */}
      <span className="absolute inset-[-6%] block" style={{ borderRadius: round, background: `rgba(${tint},.28)`, filter: "blur(18px)" }} />
      {/* Tighter core */}
      <span className="absolute inset-[3%] block" style={{ borderRadius: round, background: `rgba(${tint},.22)`, filter: "blur(7px)" }} />
    </motion.span>
  );
}

/** Contact shadow: the thin dark line where an object touches the surface. */
export function ContactShadow({ tint = "45,30,25", strength = 1, className = "", style }: { tint?: string; strength?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute block rounded-[50%] ${className}`}
      style={{ background: `radial-gradient(closest-side, rgba(${tint},${0.55 * strength}), rgba(${tint},${0.18 * strength}) 60%, transparent)`, ...style }}
    />
  );
}

/** A pool of light. `intensity` 0..1. Additive by default (screen). */
export function LightPool({
  color,
  intensity = 1,
  blend = "screen",
  className = "",
  style,
  shape = "50% 50% at 50% 50%",
}: {
  color: string;
  intensity?: number | MotionValue<number>;
  blend?: React.CSSProperties["mixBlendMode"];
  className?: string;
  style?: React.CSSProperties;
  /** radial-gradient size and position. */
  shape?: string;
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={`pointer-events-none absolute block ${className}`}
      style={{ ...(style as object), opacity: intensity, mixBlendMode: blend, background: `radial-gradient(${shape}, ${color}, transparent 70%)` }}
    />
  );
}

/** A soft shaft of window light falling from the top left, with slow dust in it. */
export function LightShaft({
  color = "255,246,226",
  strength = 0.5,
  angle = 28,
  motes = 10,
  className = "",
}: {
  color?: string;
  strength?: number;
  angle?: number;
  motes?: number;
  className?: string;
}) {
  const dots = useMemo(
    () =>
      Array.from({ length: motes }, (_, i) => {
        const r = (k: number) => ((Math.sin(i * 91.7 + k * 13.1) + 1) / 2) % 1;
        return { left: 8 + r(1) * 70, top: 6 + r(2) * 80, size: 1.5 + r(3) * 2.5, dur: 9 + r(4) * 9, delay: -r(5) * 12, dx: (r(6) - 0.5) * 40 };
      }),
    [motes],
  );
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 block ${className}`}>
      <span
        className="absolute top-[-40%] left-[-10%] block h-[300cqi] w-[70cqi]"
        style={{
          transform: `rotate(${-angle}deg)`,
          transformOrigin: "50% 0%",
          background: `linear-gradient(90deg, transparent, rgba(${color},${(strength * 0.22).toFixed(3)}) 30%, rgba(${color},${(strength * 0.4).toFixed(3)}) 50%, rgba(${color},${(strength * 0.22).toFixed(3)}) 70%, transparent)`,
          filter: "blur(18px)",
        }}
      />
      {dots.map((d, i) => (
        <span
          key={i}
          className="jb-mote absolute block rounded-full"
          style={
            {
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: d.size,
              height: d.size,
              background: `radial-gradient(circle, rgba(${color},.95) 0 35%, rgba(${color},0) 70%)`,
              animationDuration: `${d.dur}s`,
              animationDelay: `${d.delay}s`,
              "--dx": `${d.dx}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/* ---------- real 3D ---------- */

type Pose = { x: number; y: number; z?: number };
const PoseContext = createContext<{ ax: MotionValue<number>; ay: MotionValue<number> } | null>(null);

/**
 * A real 3D stage for one object: perspective, a resting pose, and the tilt
 * turning it a few more degrees. Children are in the same 3D space
 * (preserve-3d), so faces at different depths parallax for real.
 */
export function Object3D({
  pose = { x: 0, y: 0 },
  strength = 10,
  settle = false,
  perspective = 1100,
  className = "",
  style,
  innerClassName = "",
  innerStyle,
  children,
}: {
  pose?: Pose;
  /** Degrees of turn at a full tilt. */
  strength?: number;
  /** Turn to face the viewer square on (for reading: text stays crisp). */
  settle?: boolean;
  perspective?: number;
  className?: string;
  style?: React.CSSProperties;
  innerClassName?: string;
  innerStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { x, y, live } = useTilt();
  const k0 = useMotionValue(settle ? 0 : 1);
  const k = useSpring(k0, { stiffness: 90, damping: 20, mass: 1 });
  useEffect(() => k0.set(settle ? 0 : 1), [settle, k0]);
  const ax = useTransform(() => (pose.x - y.get() * strength * 0.75) * k.get());
  const ay = useTransform(() => (pose.y + x.get() * strength) * k.get());
  // Exactly flat once settled, so the browser draws text sharp again.
  const transform = useTransform(() =>
    k.get() < 0.002 ? "none" : `rotateX(${ax.get().toFixed(2)}deg) rotateY(${ay.get().toFixed(2)}deg) rotateZ(${((pose.z ?? 0) * k.get()).toFixed(2)}deg)`,
  );
  return (
    <PoseContext.Provider value={{ ax, ay }}>
      <div className={className} style={{ perspective, ...style }}>
        <motion.div className={`relative size-full ${innerClassName}`} style={{ ...(innerStyle as object), transformStyle: "preserve-3d", transform, willChange: live ? "transform" : undefined }}>
          {children}
        </motion.div>
      </div>
    </PoseContext.Provider>
  );
}

/** World normal of a face normal under rotateX(ax) rotateY(ay) (CSS applies Ry first). */
function rotate(n: [number, number, number], axDeg: number, ayDeg: number): [number, number, number] {
  const ax = (axDeg * Math.PI) / 180;
  const ay = (ayDeg * Math.PI) / 180;
  const [x0, y0, z0] = n;
  // rotateY
  const x1 = x0 * Math.cos(ay) + z0 * Math.sin(ay);
  const z1 = -x0 * Math.sin(ay) + z0 * Math.cos(ay);
  // rotateX
  const y2 = y0 * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = y0 * Math.sin(ax) + z1 * Math.cos(ax);
  return [x1, y2, z2];
}

/** How much key light a face catches (0..1, Lambert), as the object turns. */
export function useLambert(normal: [number, number, number]) {
  const pose = useContext(PoseContext);
  const zero = useMotionValue(0);
  const ax = pose?.ax ?? zero;
  const ay = pose?.ay ?? zero;
  return useTransform(() => {
    const n = rotate(normal, ax.get(), ay.get());
    return Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
  });
}

/**
 * Shading for one face of an Object3D: darker as it turns from the light, a
 * touch of bloom when it faces it. Put it last inside the face.
 */
export function FaceLight({
  normal,
  shade = "0,0,0",
  max = 0.55,
  ambient = 0.35,
  bloom = 0.18,
}: {
  normal: [number, number, number];
  shade?: string;
  max?: number;
  ambient?: number;
  bloom?: number;
}) {
  const lam = useLambert(normal);
  const { live } = useTilt();
  const dark = useTransform(lam, (v) => (1 - (ambient + (1 - ambient) * v)) * max);
  const lit = useTransform(lam, (v) => Math.max(0, (v - 0.72) / 0.28) * bloom);
  return (
    <>
      <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 block" style={{ borderRadius: "inherit", background: `rgb(${shade})`, opacity: dark, willChange: live ? "opacity" : undefined }} />
      <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 block" style={{ borderRadius: "inherit", background: "#fff", opacity: lit }} />
    </>
  );
}

/**
 * Thickness for a flat object inside an Object3D: a stack of thin slices
 * behind the face, so its edge shows when it turns. `depth` in px.
 */
export function Extrude({
  depth,
  color,
  edge,
  radius = 0,
  slices,
  clipPath,
  className = "",
}: {
  depth: number;
  /** Color of the slices (the side of the object). */
  color: string;
  /** Optional darker color for the back slice (its bottom face). */
  edge?: string;
  radius?: number | string;
  slices?: number;
  clipPath?: string;
  className?: string;
}) {
  const n = slices ?? Math.max(2, Math.min(14, Math.round(depth / 1.6)));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 block ${className}`}
          style={{
            borderRadius: radius,
            clipPath,
            background: i === n - 1 && edge ? edge : color,
            transform: `translateZ(${(-(i + 1) * depth) / n}px)`,
          }}
        />
      ))}
    </>
  );
}

/* ---------- SVG lighting filters ---------- */

/**
 * Lighting filters for SVG art inside the openings. Rendered once per opening
 * stage. Use on SVG elements: filter="url(#jb-gloss)".
 * - jb-gloss: hard, wet highlight (wax, candy, enamel)
 * - jb-puff: soft, plush relief (felt, frosting, fabric)
 * - jb-emboss: shallow pressed relief (stamps, blind emboss)
 */
export function LightDefs() {
  // One copy per document, on <body>: several openings on a page (previews,
  // galleries) would otherwise repeat the ids, and a copy inside a hidden
  // subtree can stop the filters working for everyone.
  useEffect(() => {
    if (document.getElementById("jb-light-defs")) return;
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.id = "jb-light-defs";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("width", "0");
    el.setAttribute("height", "0");
    el.setAttribute("focusable", "false");
    el.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
    el.innerHTML = LIGHT_DEFS;
    document.body.appendChild(el);
  }, []);
  return null;
}

// azimuth 225 = light from the top left; elevation sets how raking it is.
const LIGHT_DEFS = `<defs>
<filter id="jb-gloss" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/>
  <feSpecularLighting in="b" surfaceScale="5" specularConstant="1" specularExponent="26" lighting-color="#fff" result="s"><feDistantLight azimuth="225" elevation="42"/></feSpecularLighting>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/>
  <feDiffuseLighting in="b" surfaceScale="4" diffuseConstant="1.05" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1=".72" k2=".4" k3="0" k4="0" result="lit"/>
  <feComposite in="lit" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".85" k4="0" result="out"/>
  <feComposite in="out" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="jb-puff" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="b"/>
  <feDiffuseLighting in="b" surfaceScale="3.2" diffuseConstant="1.12" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1=".75" k2=".42" k3="0" k4="0" result="lit"/>
  <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/>
  <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0" result="fuzz"/>
  <feComposite in="fuzz" in2="lit" operator="over" result="out"/>
  <feComposite in="out" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="jb-emboss" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="b"/>
  <feDiffuseLighting in="b" surfaceScale="1.6" diffuseConstant="1.15" lighting-color="#fff" result="d"><feDistantLight azimuth="225" elevation="48"/></feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1=".7" k2=".38" k3="0" k4="0" result="lit"/>
  <feComposite in="lit" in2="SourceAlpha" operator="in"/>
</filter>
</defs>`;
