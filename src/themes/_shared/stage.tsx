/**
 * Shared building blocks for every opening: film grain, layered parallax
 * (pointer on desktop, tilt on phones), a beat timeline, haptics and the
 * accessible fallback button. Motion is springs everywhere.
 */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { buzz, reducedMotion } from "@/lib/play";

/* ---------- grain ---------- */

const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
);

/** Film grain over everything. Static (no animated noise), cheap to paint. */
export function Grain({ opacity = 0.16, blend = "multiply" }: { opacity?: number; blend?: React.CSSProperties["mixBlendMode"] }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[40]"
      style={{
        backgroundImage: `url("data:image/svg+xml,${GRAIN_SVG}")`,
        backgroundSize: "160px 160px",
        opacity,
        mixBlendMode: blend,
      }}
    />
  );
}

/* ---------- parallax ---------- */

type Tilt = { x: MotionValue<number>; y: MotionValue<number> };
const TiltContext = createContext<Tilt | null>(null);

/**
 * Tracks the pointer inside `children` (desktop) and the phone's tilt (where it
 * needs no permission, or after the first tap on iOS). Values are -1..1, sprung.
 */
export function ParallaxRoot({ children, className = "", style, enabled = true }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; enabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const x = useSpring(rx, { stiffness: 80, damping: 18, mass: 0.6 });
  const y = useSpring(ry, { stiffness: 80, damping: 18, mass: 0.6 });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || reducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      rx.set(Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)));
      ry.set(Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)));
    };
    const onLeave = () => {
      rx.set(0);
      ry.set(0);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      rx.set(Math.max(-1, Math.min(1, e.gamma / 25)));
      ry.set(Math.max(-1, Math.min(1, (e.beta - 45) / 25)));
    };
    let listening = false;
    const listen = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onTilt, { passive: true });
    };
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    const onFirstTap = () => {
      if (DOE?.requestPermission) void DOE.requestPermission().then((r) => r === "granted" && listen()).catch(() => {});
    };
    if (DOE && typeof DOE.requestPermission !== "function") listen();
    else el.addEventListener("pointerdown", onFirstTap, { once: true });
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onFirstTap);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, [enabled, rx, ry]);

  return (
    <TiltContext.Provider value={{ x, y }}>
      <div ref={ref} className={className} style={style}>
        {children}
      </div>
    </TiltContext.Provider>
  );
}

export function useTilt() {
  const ctx = useContext(TiltContext);
  const zero = useMotionValue(0);
  return ctx ?? { x: zero, y: zero };
}

/** A layer that drifts with the tilt. Positive depth moves with it, negative against. */
export function Layer({
  depth = 10,
  rotate = 0,
  className = "",
  style,
  children,
}: {
  depth?: number;
  rotate?: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) {
  const { x, y } = useTilt();
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth * 0.7);
  const rY = useTransform(x, (v) => v * rotate);
  const rX = useTransform(y, (v) => -v * rotate);
  return (
    <motion.div className={className} style={{ ...(style as object), x: tx, y: ty, rotateY: rY, rotateX: rX }}>
      {children}
    </motion.div>
  );
}

/* ---------- beats ---------- */

/**
 * A beat-based timeline: when `run` turns true, advances through `at` (ms from
 * start) and returns the current beat (0 = not started). Reduced motion jumps
 * straight to the last beat.
 */
export function useBeats(run: boolean, at: number[]) {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!run) {
      setBeat(0);
      return;
    }
    if (reducedMotion()) {
      setBeat(at.length);
      return;
    }
    // Dev only: freeze on a beat to inspect it (window.__jbBeat = 2).
    const frozen = import.meta.env.DEV ? (window as unknown as { __jbBeat?: number }).__jbBeat : undefined;
    if (typeof frozen === "number") {
      setBeat(Math.min(frozen, at.length - 1));
      return;
    }
    const timers = at.map((ms, i) => window.setTimeout(() => setBeat(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, at.join(",")]);
  return beat;
}

/* ---------- haptics ---------- */

export function useHaptics() {
  return {
    tick: () => buzz(6),
    tap: () => buzz(12),
    thud: () => buzz([18, 30, 10]),
    success: () => buzz([10, 40, 16, 40, 24]),
  };
}

/* ---------- springs ---------- */

/** House springs: soft for arrivals, snappy for reactions, heavy for objects with weight. */
export const SPRING = {
  soft: { type: "spring", stiffness: 140, damping: 18, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 22, mass: 0.6 },
  heavy: { type: "spring", stiffness: 90, damping: 16, mass: 1.6 },
  wobbly: { type: "spring", stiffness: 260, damping: 9, mass: 0.7 },
} as const;

/* ---------- press and hold ---------- */

/**
 * Press-and-hold with progress (0..1). Releasing early springs back. Calls
 * `onDone` once when held for `ms`. Keyboard: hold Space or Enter.
 */
export function useHold(ms: number, onDone: () => void, enabled = true) {
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const start = useRef<number | null>(null);
  const done = useRef(false);
  const lastTick = useRef(0);

  function step(now: number) {
    if (start.current == null) return;
    const p = Math.min(1, (now - start.current) / ms);
    setProgress(p);
    if (Math.floor(p * 8) > lastTick.current) {
      lastTick.current = Math.floor(p * 8);
      buzz(4);
    }
    if (p >= 1 && !done.current) {
      done.current = true;
      start.current = null;
      onDone();
      return;
    }
    raf.current = requestAnimationFrame(step);
  }
  function begin() {
    if (!enabled || done.current) return;
    start.current = performance.now();
    lastTick.current = 0;
    raf.current = requestAnimationFrame(step);
  }
  function end() {
    if (done.current) return;
    start.current = null;
    cancelAnimationFrame(raf.current);
    setProgress(0);
  }
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ok */
      }
      begin();
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        begin();
      }
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") end();
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  return { progress, handlers, reset: () => (done.current = false) };
}

/* ---------- fallback button ---------- */

/**
 * Every gesture has a plain button that does the same thing. Quiet on
 * purpose: the object is the invitation, the button is the safety net.
 */
export function FallbackButton({
  children,
  onClick,
  color,
  ink,
  hidden = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  color: string;
  /** Text color (usually the same family as `color`). */
  ink: string;
  hidden?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 8 : 0 }}
      transition={{ ...SPRING.soft, delay: hidden ? 0 : 0.9 }}
      whileTap={{ scale: 0.94 }}
      tabIndex={hidden ? -1 : 0}
      className="relative z-[45] min-h-10 rounded-full px-4 text-[13px] font-semibold backdrop-blur-sm outline-none focus-visible:ring-4 focus-visible:ring-current/40"
      style={{
        background: `${color}14`,
        boxShadow: `inset 0 0 0 1px ${color}40`,
        color: ink,
        pointerEvents: hidden ? "none" : undefined,
      }}
    >
      {children}
    </motion.button>
  );
}
