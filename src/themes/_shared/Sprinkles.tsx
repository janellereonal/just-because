import { useMemo } from "react";
import { iconElement, pick, type IconItem, type IconSet } from "@/themes/_shared/iconSets";
import { reducedMotion } from "@/lib/play";

/** One icon from a set, as React. */
export function IconGlyph({
  item,
  color,
  size = 18,
  className = "",
  style,
}: {
  item: IconItem;
  color: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (item.kind === "path")
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true">
        <path d={item.d} fill={color} />
      </svg>
    );
  if (item.kind === "image")
    return (
      <img
        src={item.url}
        alt=""
        draggable={false}
        className={className}
        style={{ width: size * 1.3, height: size * 1.3, objectFit: "contain", ...style }}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ fontSize: size, lineHeight: 1, color, fontWeight: 700, fontFamily: "var(--jb-display, inherit)", ...style }}
    >
      {item.kind === "emoji" ? item.char : item.text}
    </span>
  );
}

/**
 * Spray icons from a point (viewport coords) inside `host` (must be positioned).
 * Spring-ish curves via Web Animations; reduced motion gets a gentle fade.
 * Works inside scaled previews.
 */
export function burstSet(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
  set: IconSet,
  {
    colors: fallbackColors = ["#E8577E", "#FFD166", "#7A5CFF"],
    count = 18,
    spread = 1,
    up = false,
    gravity = 1,
  }: { colors?: string[]; count?: number; spread?: number; up?: boolean; gravity?: number } = {},
) {
  if (!host || typeof window === "undefined") return;
  const rect = host.getBoundingClientRect();
  const scale = host.offsetWidth ? rect.width / host.offsetWidth : 1;
  const x = (clientX - rect.left) / (scale || 1);
  const y = (clientY - rect.top) / (scale || 1);
  const reduce = reducedMotion();
  const colors = set.colors.length ? set.colors : fallbackColors;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:80;contain:layout";
  host.appendChild(layer);
  const n = reduce ? Math.min(4, count) : count;
  let longest = 0;
  const rising = set.physics === "float" || set.physics === "drift";
  for (let i = 0; i < n; i++) {
    const size = 12 + ((i * 37) % 13);
    const el = iconElement(pick(set.items, i), pick(colors, i), size);
    const wrap = document.createElement("span");
    wrap.style.cssText = `position:absolute;left:${x}px;top:${y}px;will-change:transform,opacity`;
    wrap.appendChild(el);
    layer.appendChild(wrap);
    const angle = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.7 : Math.random() * Math.PI * 2;
    const dist = (60 + Math.random() * 100) * spread;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const settle = (rising ? -50 - Math.random() * 40 : 70 + Math.random() * 70) * gravity;
    const spin = (Math.random() - 0.5) * (set.physics === "burst" ? 900 : 360);
    const dur = reduce ? 700 : 1000 + Math.random() * 800;
    longest = Math.max(longest, dur);
    wrap.animate(
      reduce
        ? [
            { opacity: 0, transform: "translate(-50%,-50%) scale(.7)" },
            { opacity: 1, transform: "translate(-50%,-90%) scale(1)", offset: 0.3 },
            { opacity: 0, transform: "translate(-50%,-130%) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translate(-50%,-50%) scale(.2) rotate(0deg)" },
            {
              opacity: 1,
              transform: `translate(calc(-50% + ${dx * 0.85}px), calc(-50% + ${dy * 0.85}px)) scale(1.08) rotate(${spin * 0.5}deg)`,
              offset: 0.35,
              easing: "cubic-bezier(.2,.8,.3,1)",
            },
            {
              opacity: 0,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + settle}px)) scale(.85) rotate(${spin}deg)`,
            },
          ],
      { duration: dur, easing: "cubic-bezier(.12,.75,.3,1)", fill: "forwards" },
    );
  }
  window.setTimeout(() => layer.remove(), longest + 100);
}

/** Seeded random so server and browser draw the same layout. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ANIM: Record<IconSet["physics"], string> = {
  float: "jb-sprinkle-rise",
  fall: "jb-sprinkle-fall",
  drift: "jb-sprinkle-drift",
  burst: "jb-sprinkle-fall",
};

/**
 * A field of icons moving with the set's physics, for backgrounds. Absolutely
 * positioned; put it inside an overflow-hidden, positioned parent.
 */
export function SprinkleField({
  set,
  count = 16,
  seed = 7,
  colors: fallbackColors,
  className = "",
  opacity = 0.8,
}: {
  set: IconSet;
  count?: number;
  seed?: number;
  colors?: string[];
  className?: string;
  opacity?: number;
}) {
  const parts = useMemo(() => {
    const r = rng(seed * 131 + set.id.length);
    return Array.from({ length: count }, (_, i) => ({
      i,
      left: r() * 100,
      top: r() * 100,
      size: 10 + r() * 16,
      delay: -r() * 16,
      dur: 10 + r() * 12,
      dx: (r() - 0.5) * 90,
      rot: (r() - 0.5) * 90,
    }));
  }, [count, seed, set.id]);
  const colors = set.colors.length ? set.colors : (fallbackColors ?? ["#C2366B", "#FFD166", "#FFFFFF"]);
  return (
    <div className={`jb-sprinkles pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {parts.map((p) => (
        <span
          key={p.i}
          className="jb-sprinkle"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              opacity,
              animationName: ANIM[set.physics],
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        >
          <IconGlyph item={pick(set.items, p.i)} color={pick(colors, p.i)} size={p.size} />
        </span>
      ))}
    </div>
  );
}
