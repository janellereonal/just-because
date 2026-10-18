/**
 * Something moves while you scroll a gift: a little plane flies its route,
 * balloons rise, paw prints wander down the page, a record turns, petals and
 * snow drift with your speed. Each theme has its own motif, drawn behind the
 * notes and kept to the margins. Works on the real page (window scroll) and
 * inside previews (any scrolling parent). Reduced motion: nothing moves.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import type { ThemeKind } from "@/lib/themeKind";
import type { IconSet } from "@/themes/_shared/iconSets";
import { pick } from "@/themes/_shared/iconSets";
import { IconGlyph } from "@/themes/_shared/Sprinkles";

type Props = {
  kind: ThemeKind;
  rootRef: React.RefObject<HTMLDivElement | null>;
  icons: IconSet;
  accent: string;
  ink: string;
};

/** Nearest ancestor that scrolls, or null for the window. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  let n = el?.parentElement ?? null;
  while (n) {
    const o = getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight + 4) return n;
    n = n.parentElement;
  }
  return null;
}

export function ScrollStory({ kind, rootRef, icons, accent, ink }: Props) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0); // 0..1 through the gift
  const offset = useMotionValue(0); // keeps the layer pinned to the viewport
  const viewH = useMotionValue(800);
  const velocity = useMotionValue(0);
  const smooth = useSpring(progress, { stiffness: 90, damping: 22, mass: 0.6 });
  const vel = useSpring(velocity, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduce) return;
    let raf = 0;
    let last = 0;
    let lastT = performance.now();
    let parent: HTMLElement | null = null;
    const read = () => {
      raf = 0;
      parent = scrollParent(root);
      const vh = parent ? parent.clientHeight : window.innerHeight;
      const top = root.getBoundingClientRect().top - (parent ? parent.getBoundingClientRect().top : 0);
      const span = Math.max(1, root.offsetHeight - vh);
      const p = Math.min(1, Math.max(0, -top / span));
      const now = performance.now();
      velocity.set(Math.max(-3, Math.min(3, ((p - last) * 1000) / Math.max(16, now - lastT) * 4)));
      last = p;
      lastT = now;
      progress.set(p);
      offset.set(Math.max(0, Math.min(root.offsetHeight - vh, -top)));
      viewH.set(vh);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    const target: HTMLElement | Window = parent ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const settle = window.setInterval(() => velocity.set(velocity.get() * 0.6), 120);
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearInterval(settle);
      cancelAnimationFrame(raf);
    };
  }, [rootRef, reduce, progress, offset, viewH, velocity]);

  const height = useTransform(viewH, (v) => `${v}px`);
  if (reduce) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: -1 }} aria-hidden="true">
      <motion.div className="absolute inset-x-0 top-0" style={{ y: offset, height }}>
        <Motif kind={kind} p={smooth} vel={vel} icons={icons} accent={accent} ink={ink} />
      </motion.div>
    </div>
  );
}

type MotifProps = { kind: ThemeKind; p: MotionValue<number>; vel: MotionValue<number>; icons: IconSet; accent: string; ink: string };

function Motif(props: MotifProps) {
  switch (props.kind) {
    case "voyage":
      return <PlaneRoute {...props} />;
    case "birthday":
      return <Balloons {...props} />;
    case "pets":
      return <PawTrail {...props} />;
    case "anniversary":
      return <Record {...props} />;
    case "wedding":
    case "bridal":
    case "valentine":
    case "christmas":
    case "baby":
    case "newyear":
    case "default":
    default:
      return <Drift {...props} />;
  }
}

/* Voyage: a plane flies a dotted route across the screen as you read. */
function PlaneRoute({ p, accent }: MotifProps) {
  // Route in a 100x100 box: from top left, swooping, to bottom right.
  const pt = (t: number) => {
    const x = 6 + t * 88;
    const y = 12 + t * 70 + Math.sin(t * Math.PI * 2.2) * 9;
    return [x, y] as const;
  };
  const left = useTransform(p, (t) => `${pt(t)[0]}%`);
  const top = useTransform(p, (t) => `${pt(t)[1]}%`);
  const rot = useTransform(p, (t) => {
    const [x1, y1] = pt(Math.max(0, t - 0.01));
    const [x2, y2] = pt(Math.min(1, t + 0.01));
    return (Math.atan2((y2 - y1) * 1.6, x2 - x1) * 180) / Math.PI;
  });
  return (
    <>
      {[12, 46, 78].map((y, i) => (
        <Cloud key={i} p={p} y={y} speed={0.6 + i * 0.4} from={i % 2 ? 110 : -20} />
      ))}
      <motion.div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left, top, rotate: rot }}>
        <svg width="34" height="34" viewBox="0 0 24 24">
          <path fill={accent} d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5v5.5l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5V13z" transform="rotate(90 12 12)" />
        </svg>
      </motion.div>
    </>
  );
}

function Cloud({ p, y, speed, from }: { p: MotionValue<number>; y: number; speed: number; from: number }) {
  const left = useTransform(p, (t) => `${from + (from < 50 ? 1 : -1) * t * 120 * speed}%`);
  return (
    <motion.div className="absolute" style={{ left, top: `${y}%` }}>
      <div className="h-6 w-20 rounded-full bg-white/70 blur-[1px]" style={{ boxShadow: "18px -8px 0 4px rgba(255,255,255,.7), -14px -4px 0 0 rgba(255,255,255,.6)" }} />
    </motion.div>
  );
}

/*
 * Birthday: the balloons are released as you start reading. Each one floats up
 * and away over the first part of the gift, fading near the top, and doesn't
 * come back, so the rest of the page is calm. They sway with your scroll speed
 * and bob a little on their own.
 */
function Balloons({ p, vel, accent }: MotifProps) {
  // Phones have almost no margin, so fewer, smaller, softer balloons that don't sit on the text.
  const narrow = useNarrow();
  const colors = ["#FF7EB6", "#FFD166", "#6C8EF2", "#7ED7C1", accent, "#B48AF2"].slice(0, narrow ? 3 : 6);
  return (
    <>
      {colors.map((c, i) => (
        <Balloon
          soft={narrow}
          key={i}
          p={p}
          vel={vel}
          color={c}
          x={i % 2 ? 88 - (i % 3) * 5 : 3 + (i % 3) * 5}
          start={42 + ((i * 23) % 52)}
          delay={i * 0.035}
          span={0.32 + (i % 3) * 0.09}
          bob={2.6 + (i % 3) * 0.7}
          size={(narrow ? 26 : 34) + (i % 3) * 8}
        />
      ))}
    </>
  );
}

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

function Balloon({
  soft = false,
  p,
  vel,
  color,
  x,
  start,
  delay,
  span,
  bob,
  size,
}: {
  soft?: boolean;
  p: MotionValue<number>;
  vel: MotionValue<number>;
  color: string;
  x: number;
  /** Where it waits at the top of the gift, in % of the screen height. */
  start: number;
  /** When it lets go, and over how much of the gift it rises (0..1 of the scroll). */
  delay: number;
  span: number;
  /** Seconds per idle bob. */
  bob: number;
  size: number;
}) {
  const rise = (t: number) => Math.min(1, Math.max(0, (t - delay) / span));
  // Eased so it lifts off gently, then speeds up as it goes.
  const topOf = (t: number) => start - (start + 40) * rise(t) ** 1.6;
  const top = useTransform(p, (t) => `${topOf(t)}%`);
  const peak = soft ? 0.55 : 1;
  const opacity = useTransform(p, (t) => peak * Math.min(1, Math.max(0, (topOf(t) + 18) / 30)));
  const sway = useTransform(vel, (v) => v * 8);
  return (
    <motion.div className="absolute" style={{ left: `${x}%`, top, rotate: sway, opacity }}>
      <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: bob, repeat: Infinity, ease: "easeInOut" }}>
        <svg width={size} height={size * 2} viewBox="0 0 40 80">
          <path d="M20 46q4 12-2 22t2 12" stroke="#2B2522" strokeOpacity=".25" fill="none" />
          <ellipse cx="20" cy="22" rx="17" ry="21" fill={color} />
          <ellipse cx="13" cy="14" rx="4" ry="7" fill="#fff" opacity=".4" />
          <path d="M17 43h6l-3 4z" fill={color} />
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* Pets: paw prints walk down the margin as you read. */
function PawTrail({ p, icons, accent }: MotifProps) {
  const paw = icons.items[0]!;
  const steps = 18;
  return (
    <>
      {Array.from({ length: steps }, (_, i) => (
        <Print key={i} p={p} i={i} steps={steps} item={paw} color={accent} />
      ))}
    </>
  );
}

function Print({ p, i, steps, item, color }: { p: MotionValue<number>; i: number; steps: number; item: IconSet["items"][number]; color: string }) {
  // A wandering path down one side, then the other.
  const side = Math.floor((i / steps) * 2);
  const k = (i % (steps / 2)) / (steps / 2);
  const x = side ? 90 + Math.sin(k * 7) * 3 + (i % 2 ? 2.5 : -2.5) : 4 + Math.sin(k * 7) * 3 + (i % 2 ? 2.5 : -2.5);
  const y = 6 + k * 88;
  const show = (i + 1) / steps;
  const opacity = useTransform(p, (t) => (t + 0.08 >= show ? 0.5 : 0));
  const scale = useTransform(p, (t) => (t + 0.08 >= show ? 1 : 0.4));
  return (
    <motion.div className="absolute" style={{ left: `${x}%`, top: `${y}%`, opacity, scale, rotate: side ? 170 : 170 + (i % 2 ? 10 : -10) }}>
      <IconGlyph item={item} color={color} size={18} />
    </motion.div>
  );
}

/* Anniversary: a record turns in the corner, gold dust drifts. */
function Record({ p, vel, icons, accent }: MotifProps) {
  const rotate = useTransform(p, (t) => t * 1440);
  return (
    <>
      <Drift p={p} vel={vel} icons={icons} accent={accent} ink="" kind="anniversary" />
      <motion.div className="absolute -right-16 bottom-[8%] opacity-30" style={{ rotate }}>
        <svg width="150" height="150" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="49" fill="#1C1210" />
          {[44, 38, 32, 26].map((r) => (
            <circle key={r} cx="50" cy="50" r={r} fill="none" stroke="#fff" strokeOpacity=".08" />
          ))}
          <circle cx="50" cy="50" r="15" fill={accent} />
          <circle cx="50" cy="50" r="2" fill="#1C1210" />
          <path d="M50 5a45 45 0 0 1 32 13" stroke="#fff" strokeOpacity=".18" strokeWidth="3" fill="none" />
        </svg>
      </motion.div>
    </>
  );
}

/* Everyone else: the gift's own icons drift at different depths, quicker as you scroll. */
function Drift({ p, vel, icons }: MotifProps) {
  const items = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        i,
        x: i % 2 ? 84 + ((i * 37) % 13) : 2 + ((i * 29) % 13),
        y: (i * 61) % 100,
        depth: 0.4 + ((i * 17) % 10) / 10,
        size: 12 + ((i * 13) % 14),
      })),
    [],
  );
  const colors = icons.colors.length ? icons.colors : ["#E8577E", "#E5C26B", "#8EC0E8"];
  return (
    <>
      {items.map((it) => (
        <DriftBit key={it.i} p={p} vel={vel} {...it} item={pick(icons.items, it.i)} color={pick(colors, it.i)} />
      ))}
    </>
  );
}

function DriftBit({ p, vel, x, y, depth, size, item, color }: { p: MotionValue<number>; vel: MotionValue<number>; x: number; y: number; depth: number; size: number; item: IconSet["items"][number]; color: string; i: number }) {
  const top = useTransform(p, (t) => `${((y - t * 160 * depth) % 100 + 100) % 100}%`);
  const rotate = useTransform([p, vel], ([t, v]) => (t as number) * 360 * depth + (v as number) * 20);
  return (
    <motion.div className="absolute" style={{ left: `${x}%`, top, rotate, opacity: 0.25 + depth * 0.35 }}>
      <IconGlyph item={item} color={color} size={size} />
    </motion.div>
  );
}
