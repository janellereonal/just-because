/**
 * The soft, pastel kit the layout openings are drawn with: clay stickers from
 * /public/clay, twinkling sparkles, rounded stage backgrounds, colored soft
 * shadows, glossy highlights and the gift's character as a little buddy.
 * Each style keeps its own designed palette (like the theme openings do), so
 * the intro always looks finished whatever palette the gift picked.
 */
import { forwardRef, useEffect } from "react";
import { motion } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { loadFont, type FontSpec } from "@/themes/_shared/design";
import { SPRING } from "@/themes/_shared/stage";
import { TEXTURE } from "@/themes/_shared/light";

/* ---------- fonts ---------- */

const google = (family: string, query: string, fallback: string): FontSpec => ({
  family: `'${family}', ${fallback}`,
  source: "google",
  query,
});

export const FONTS = {
  /** Round and friendly: titles, stickers, labels. */
  round: google("Fredoka", "Fredoka:wght@400..700", "system-ui, sans-serif"),
  /** Chunky and bubbly: the magazine's masthead. */
  bubble: google("Bagel Fat One", "Bagel+Fat+One", "system-ui, sans-serif"),
  /** Bold and bouncy: the comic. */
  pop: google("Lilita One", "Lilita+One", "system-ui, sans-serif"),
  /** A soft storybook serif. */
  story: google(
    "Fraunces",
    // Same query as the theme fonts, so it's only fetched once.
    "Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100",
    "Georgia, serif",
  ),
} as const;

/**
 * Loads the style's faces and returns the CSS variables for its subtree:
 * --cute-display and --cute-text (plus --jb-display so the shared Greeting
 * picks the style's face too).
 */
export function useStyleFonts(display: FontSpec, text: FontSpec = FONTS.round) {
  useEffect(() => {
    loadFont(display, "high");
    loadFont(text, "low");
  }, [display, text]);
  return {
    ["--cute-display" as string]: display.family,
    ["--cute-text" as string]: text.family,
    ["--jb-display" as string]: display.family,
  } as React.CSSProperties;
}

export const display = (weight = 700): { fontFamily: string; fontWeight: number } => ({
  fontFamily: "var(--cute-display)",
  fontWeight: weight,
});
export const text = (weight = 500): { fontFamily: string; fontWeight: number } => ({
  fontFamily: "var(--cute-text)",
  fontWeight: weight,
});

/* ---------- light ---------- */

/** A soft shadow in the object's own color family ("r,g,b"), never grey. */
export function soft(tint: string, k = 1) {
  const n = (v: number) => (v * k).toFixed(1);
  return [
    `0 ${n(2)}px ${n(4)}px rgba(${tint},.18)`,
    `0 ${n(10)}px ${n(18)}px -${n(4)}px rgba(${tint},.22)`,
    `0 ${n(28)}px ${n(46)}px -${n(14)}px rgba(${tint},.34)`,
  ].join(", ");
}

/** Puffy edges: a light rim on top, a deeper one under, like a soft toy or a glossy candy. */
export function puffy(tint: string, k = 1) {
  return `inset 0 ${2 * k}px 0 rgba(255,255,255,.7), inset 0 -${4 * k}px ${8 * k}px rgba(${tint},.22)`;
}

/** A glossy highlight across the top of a surface. Put it inside; it keeps the corners. */
export function Gloss({ strength = 0.55, height = "42%" }: { strength?: number; height?: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 block"
      style={{
        height,
        borderRadius: "inherit",
        background: `linear-gradient(180deg, rgba(255,255,255,${strength}), rgba(255,255,255,0))`,
      }}
    />
  );
}

/* ---------- stickers and sparkles ---------- */

export type ClayId =
  | "heart"
  | "star"
  | "letter"
  | "camera"
  | "cake"
  | "cloud"
  | "moon"
  | "balloon"
  | "candle"
  | "cup"
  | "sun"
  | "planet"
  | "plant"
  | "bubble"
  | "drop"
  | "bulb"
  | "pencil"
  | "suitcase"
  | "orn-gift"
  | "orn-heart"
  | "orn-star"
  | "orn-bauble";

/**
 * A clay sticker. `show` pops it in on a wobbly spring; `float` keeps it
 * bobbing gently. Size and position go in `style` (it is absolutely placed).
 */
export function Clay({
  id,
  show = true,
  float = false,
  delay = 0,
  rotate = 0,
  reduced = false,
  shadow = "120,80,120",
  className = "",
  style,
}: {
  id: ClayId;
  show?: boolean;
  float?: boolean;
  delay?: number;
  rotate?: number;
  reduced?: boolean;
  shadow?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none absolute block ${className}`}
      style={{ ...(style as object) }}
      animate={float && !reduced ? { y: [0, -5, 0] } : { y: 0 }}
      transition={
        float && !reduced
          ? { duration: 3.2 + (delay % 1), repeat: Infinity, ease: "easeInOut", delay }
          : { duration: 0 }
      }
    >
      <motion.img
        src={`/clay/${id}@256.webp`}
        alt=""
        draggable={false}
        className="block h-auto w-full select-none"
        style={{ filter: `drop-shadow(0 6px 7px rgba(${shadow},.28))` }}
        initial={false}
        animate={
          show ? { scale: 1, opacity: 1, rotate } : { scale: 0.2, opacity: 0, rotate: rotate - 24 }
        }
        transition={reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: show ? delay : 0 }}
      />
    </motion.span>
  );
}

const SPARK =
  "M12 0C13 8.5 15.5 11 24 12C15.5 13 13 15.5 12 24C11 15.5 8.5 13 0 12C8.5 11 11 8.5 12 0Z";

/** One four-point sparkle that twinkles. */
export function Twinkle({
  x,
  y,
  size = 14,
  color = "#FFFFFF",
  delay = 0,
  reduced = false,
}: {
  x: string;
  y: string;
  size?: number;
  color?: string;
  delay?: number;
  reduced?: boolean;
}) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      animate={
        reduced
          ? { opacity: 0.8 }
          : { scale: [0.55, 1, 0.55], opacity: [0.35, 1, 0.35], rotate: [0, 45, 0] }
      }
      transition={
        reduced ? { duration: 0 } : { duration: 2.6, repeat: Infinity, delay, ease: "easeInOut" }
      }
    >
      <path d={SPARK} fill={color} />
    </motion.svg>
  );
}

/** A handful of sparkles around an object. Spots are [x%, y%, size px]. */
export function Sparkles({
  spots,
  color = "#FFFFFF",
  reduced = false,
}: {
  spots: [number, number, number][];
  color?: string;
  reduced?: boolean;
}) {
  return (
    <>
      {spots.map(([x, y, s], i) => (
        <Twinkle
          key={i}
          x={`${x}%`}
          y={`${y}%`}
          size={s}
          color={color}
          delay={i * 0.45}
          reduced={reduced}
        />
      ))}
    </>
  );
}

/* ---------- the buddy ---------- */

/** The gift's own character, when the organiser picked one (never the house mascot on gift pages). */
export function hasBuddy(p: OpeningProps) {
  const c = p.character;
  if (!c || c.type === "none") return false;
  return !(c.type === "library" && c.id === "mascot");
}

/** The gift's character beside the object. Renders nothing without one. */
export const Buddy = forwardRef<
  CharacterHandle,
  { p: OpeningProps; size?: number; className?: string; style?: React.CSSProperties }
>(function Buddy({ p, size = 84, className = "", style }, ref) {
  if (!hasBuddy(p)) return null;
  return (
    <div className={`absolute z-[6] ${className}`} style={style}>
      <Character
        ref={ref}
        setting={p.character}
        accessory={p.accessory}
        size={size}
        live={!p.paused}
        showName={false}
      />
    </div>
  );
});

/* ---------- stages ---------- */

/**
 * A pastel room: a soft vertical wash, a glow behind the object, a few
 * colored clouds of light and an optional pattern, with the house paper grain.
 */
export function pastelStage({
  top,
  bottom,
  glow = "#FFFFFF",
  blobs = [],
  pattern,
  patternSize = "auto",
}: {
  top: string;
  bottom: string;
  glow?: string;
  /** [color, x%, y%, size%] */
  blobs?: [string, number, number, number][];
  /** One layer, or several (gingham is two). */
  pattern?: string | string[];
  patternSize?: string;
}): React.CSSProperties {
  const pat = pattern ? (Array.isArray(pattern) ? pattern : [pattern]) : [];
  const layers = [
    `radial-gradient(48% 34% at 50% 46%, ${glow}, transparent 72%)`,
    ...blobs.map(
      ([c, x, y, s]) => `radial-gradient(${s}% ${s * 0.75}% at ${x}% ${y}%, ${c}, transparent 70%)`,
    ),
    ...pat,
    `linear-gradient(180deg, ${top}, ${bottom})`,
    TEXTURE.grain,
  ];
  const sizes = [
    "auto",
    ...blobs.map(() => "auto"),
    ...pat.map(() => patternSize),
    "auto",
    "160px 160px",
  ];
  return {
    backgroundColor: bottom,
    backgroundImage: layers.join(","),
    backgroundSize: sizes.join(","),
  };
}

/** Polka dots as one background layer (no size): for stages, with `patternSize`. */
export const dotLayer = (color = "rgba(255,255,255,.55)", r = 2.2) =>
  `radial-gradient(circle, ${color} ${r}px, transparent ${r + 0.6}px)`;

/** Polka dots for a `background` shorthand (with their size). */
export const dots = (color = "rgba(255,255,255,.55)", r = 2.2, gap = 22) =>
  `${dotLayer(color, r)} 0 0 / ${gap}px ${gap}px`;

/** Gingham, like a picnic cloth: two layers, for `pastelStage({ pattern })`. */
export const gingham = (color: string, band = 16) => [
  `repeating-linear-gradient(0deg, ${color} 0 ${band}px, transparent ${band}px ${band * 2}px)`,
  `repeating-linear-gradient(90deg, ${color} 0 ${band}px, transparent ${band}px ${band * 2}px)`,
];

/* ---------- the greeting after it opens ---------- */

/** Reserved space above the object; the greeting springs into it once the gift is open. */
export function PayoffLine({
  show,
  textValue,
  color,
  reduced,
  className = "",
  style,
}: {
  show: boolean;
  textValue: string;
  color: string;
  reduced: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative z-[3] h-[clamp(56px,16cqi,96px)] w-[90cqi] max-w-[460px] text-center ${className}`}
      style={{ color, ...style }}
    >
      {show ? (
        <motion.span
          className="block text-[clamp(1.8rem,10cqi,3.1rem)] leading-[0.95] [overflow-wrap:anywhere]"
          style={display(700)}
          initial={{ y: 26, opacity: 0, scale: 0.86 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0 } : SPRING.wobbly}
        >
          {textValue}
        </motion.span>
      ) : null}
    </div>
  );
}
