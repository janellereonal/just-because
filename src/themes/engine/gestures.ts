/**
 * The gesture library. One hook, `useGesture(kind, options)`, for every way a
 * theme's object opens: tear, peel, pull, untie, blow, shake, scratch, press
 * and hold, slide, spin, unfold, pop and wipe.
 *
 * Every gesture works three ways:
 * - touch and mouse, through pointer events on the element you `bind` to;
 * - keyboard: the element is focusable; Enter or Space moves it along (and is
 *   held for press and hold), arrow keys work for drags;
 * - a plain button: call `complete()` from the theme's FallbackButton.
 * Blow and shake also take taps, so they work without a mic or motion sensor.
 *
 * Progress is a MotionValue (0..1), so the object can follow it every frame
 * without React re-rendering. Under reduced motion, completing jumps straight
 * to the end and the theme should fade rather than fly.
 *
 * The maths lives in ./core/progress.ts and is unit tested.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { animate, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { t, type MessageKey } from "@/i18n";
import {
  AngleTracker,
  BlowDetector,
  CoverageGrid,
  ShakeDetector,
  TapCounter,
  dragProgress,
  keyStep,
  rms,
  stageOf,
  type DragAxis,
} from "./core/progress";
import { haptic, playSound, type SoundName } from "./sound";

export const GESTURES = ["tear", "peel", "pull", "untie", "blow", "shake", "scratch", "hold", "slide", "spin", "unfold", "pop", "wipe"] as const;
export type GestureKind = (typeof GESTURES)[number];

type DragSpec = { axis: DragAxis; direction: 1 | -1 };

/** How each drag-style gesture moves by default. */
const DRAGS: Partial<Record<GestureKind, DragSpec>> = {
  tear: { axis: "x", direction: 1 },
  peel: { axis: "diagonal", direction: 1 },
  pull: { axis: "y", direction: 1 },
  untie: { axis: "x", direction: 1 },
  slide: { axis: "y", direction: -1 },
  unfold: { axis: "y", direction: 1 },
};

/** Sensible defaults per gesture, so most themes only pass `onDone`. */
const DEFAULTS: Record<GestureKind, { threshold: number }> = {
  tear: { threshold: 0.85 },
  peel: { threshold: 0.8 },
  pull: { threshold: 0.85 },
  untie: { threshold: 0.85 },
  slide: { threshold: 0.8 },
  unfold: { threshold: 1 },
  blow: { threshold: 1 },
  shake: { threshold: 1 },
  scratch: { threshold: 0.55 },
  wipe: { threshold: 0.6 },
  hold: { threshold: 1 },
  spin: { threshold: 1 },
  pop: { threshold: 1 },
};

export type GestureOptions = {
  onDone: () => void;
  enabled?: boolean;
  /** Drags: how far (px) a full drag goes. Default 160. */
  distance?: number;
  /** Drags: which way. Defaults per gesture (tear goes right, slide goes up...). */
  axis?: DragAxis;
  direction?: 1 | -1;
  /** Progress at which it completes. Defaults per gesture. */
  threshold?: number;
  /** Unfold: how many folds. Default 2. */
  steps?: number;
  /** Pop: how many taps. Default 5. */
  taps?: number;
  /** Hold: how long, ms. Default 1100. */
  holdMs?: number;
  /** Spin: how far, degrees. Default 300. */
  degrees?: number;
  /** Scratch and wipe: brush radius as a share of the width, and the grid. */
  brush?: number;
  grid?: [number, number];
  /** Shake: how many shakes. Default 5. Blow: how long a breath, ms. Default 900. */
  shakes?: number;
  breathMs?: number;
  /** Sounds while it moves and when it's done. */
  sound?: { tick?: SoundName; done?: SoundName };
  /** Phone taps as it moves. Default true. */
  haptics?: boolean;
  /** Called as progress changes (not every frame for drags: on change). */
  onProgress?: (p: number) => void;
};

export type Stroke = { u0: number; v0: number; u1: number; v1: number; radius: number };

export type SensorState = "idle" | "asking" | "on" | "denied" | "unsupported";

export type Gesture = {
  kind: GestureKind;
  progress: MotionValue<number>;
  done: boolean;
  /** Unfold: folds opened so far. Pop: taps so far. */
  stage: number;
  reduced: boolean;
  /** Spread onto the object. */
  bind: React.HTMLAttributes<HTMLElement> & { tabIndex: number; role: string; "aria-label": string };
  /** Finish now (the plain button). */
  complete: () => void;
  /** Set progress from the theme's own targets (lighting panels one by one, say). Completes at the threshold. */
  setProgress: (p: number) => void;
  reset: () => void;
  label: string;
  hint: string;
  /** Blow: start listening (ask on a tap, never on load). */
  mic: { state: SensorState; start: () => Promise<void> } | null;
  /** Shake: start reading motion (iOS asks for permission on a tap). */
  motion: { state: SensorState; start: () => Promise<void> } | null;
  /** Scratch and wipe: draw each stroke into your mask. Returns an unsubscribe. */
  onStroke: (cb: (s: Stroke) => void) => () => void;
};

export function useGesture(kind: GestureKind, options: GestureOptions): Gesture {
  const opts = useRef(options);
  opts.current = options;
  const enabled = options.enabled ?? true;
  const reduced = !!useReducedMotion();
  const progress = useMotionValue(0);
  const [done, setDone] = useState(false);
  const [stage, setStage] = useState(0);
  const doneRef = useRef(false);
  const threshold = options.threshold ?? DEFAULTS[kind].threshold;

  // Trackers, created once per kind.
  const trackers = useMemo(
    () => ({
      grid: new CoverageGrid(options.grid?.[0] ?? 16, options.grid?.[1] ?? 12),
      angle: new AngleTracker(options.degrees ?? 300),
      blow: new BlowDetector(options.breathMs ?? 900),
      shake: new ShakeDetector(options.shakes ?? 5),
      taps: new TapCounter(options.taps ?? 5),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind],
  );
  const strokeSubs = useRef(new Set<(s: Stroke) => void>());
  const lastSoundAt = useRef(0);
  const lastTickStep = useRef(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setDone(true);
    if (reduced) progress.set(1);
    else void animate(progress, 1, { type: "spring", stiffness: 160, damping: 22 });
    const o = opts.current;
    if (o.sound?.done) playSound(o.sound.done);
    if (o.haptics !== false) haptic.success();
    o.onProgress?.(1);
    o.onDone();
  }, [progress, reduced]);

  /** Every progress change goes through here: sounds, ticks, completion. */
  const report = useCallback(
    (p: number, opts2: { animateTo?: boolean } = {}) => {
      if (doneRef.current) return;
      const o = opts.current;
      if (opts2.animateTo && !reduced) void animate(progress, p, { type: "spring", stiffness: 260, damping: 26 });
      else progress.set(p);
      o.onProgress?.(p);
      const now = performance.now();
      if (o.sound?.tick && now - lastSoundAt.current > 110 && p > 0) {
        lastSoundAt.current = now;
        playSound(o.sound.tick);
      }
      const tickStep = Math.floor(p * 8);
      if (o.haptics !== false && tickStep > lastTickStep.current) haptic.tick();
      lastTickStep.current = tickStep;
      if (p >= threshold) finish();
    },
    [finish, progress, reduced, threshold],
  );

  const reset = useCallback(() => {
    doneRef.current = false;
    setDone(false);
    setStage(0);
    progress.set(0);
    lastTickStep.current = 0;
    trackers.grid.reset();
    trackers.angle.reset();
    trackers.blow.reset();
    trackers.shake.reset();
    trackers.taps.reset();
  }, [progress, trackers]);

  /* ---------- pointer handling ---------- */

  const drag = DRAGS[kind];
  const axis = options.axis ?? drag?.axis ?? "x";
  const direction = options.direction ?? drag?.direction ?? 1;
  const distance = options.distance ?? 160;
  const steps = Math.max(1, options.steps ?? 2);
  const holdMs = options.holdMs ?? 1100;
  const pointer = useRef<{ id: number; x: number; y: number; base: number; moved: boolean; u: number; v: number } | null>(null);
  const holdTimer = useRef<{ raf: number; start: number } | null>(null);

  const stopHold = useCallback(() => {
    if (!holdTimer.current) return;
    cancelAnimationFrame(holdTimer.current.raf);
    holdTimer.current = null;
    if (!doneRef.current) {
      if (reduced) progress.set(0);
      else void animate(progress, 0, { type: "spring", stiffness: 300, damping: 30 });
      lastTickStep.current = 0;
    }
  }, [progress, reduced]);

  const startHold = useCallback(() => {
    if (doneRef.current || holdTimer.current) return;
    const start = performance.now();
    const step = (now: number) => {
      if (!holdTimer.current) return;
      const p = Math.min(1, (now - start) / holdMs);
      report(p);
      if (p < 1 && !doneRef.current) holdTimer.current.raf = requestAnimationFrame(step);
      else holdTimer.current = null;
    };
    holdTimer.current = { start, raf: requestAnimationFrame(step) };
  }, [holdMs, report]);

  useEffect(() => () => stopHold(), [stopHold]);

  /** Taps (and key presses) for gestures that count. */
  const tapOnce = useCallback(() => {
    if (doneRef.current || !enabled) return;
    if (kind === "pop") {
      const p = trackers.taps.tap();
      setStage(trackers.taps.taps);
      haptic.tap();
      playSound(opts.current.sound?.tick ?? "pop");
      report(p);
    } else if (kind === "blow") {
      report(trackers.blow.puff());
    } else if (kind === "shake") {
      haptic.tap();
      report(trackers.shake.tap());
    } else if (kind === "unfold") {
      const next = Math.min(steps, stageOf(progress.get(), steps) + 1);
      setStage(next);
      playSound(opts.current.sound?.tick ?? "paper-rustle");
      report(next / steps, { animateTo: true });
    } else {
      report(keyStep(progress.get()), { animateTo: true });
    }
  }, [enabled, kind, progress, report, steps, trackers]);

  const local = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { u: (e.clientX - r.left) / Math.max(1, r.width), v: (e.clientY - r.top) / Math.max(1, r.height), r };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!enabled || doneRef.current) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* fine */
    }
    const { u, v } = local(e);
    pointer.current = { id: e.pointerId, x: e.clientX, y: e.clientY, base: progress.get(), moved: false, u, v };
    if (kind === "hold") {
      e.preventDefault();
      startHold();
    }
    if (kind === "scratch" || kind === "wipe") {
      const radius = opts.current.brush ?? (kind === "wipe" ? 0.14 : 0.08);
      strokeSubs.current.forEach((cb) => cb({ u0: u, v0: v, u1: u, v1: v, radius }));
      report(trackers.grid.brush(u, v, radius));
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const pt = pointer.current;
    if (!pt || pt.id !== e.pointerId || doneRef.current) return;
    const dx = e.clientX - pt.x;
    const dy = e.clientY - pt.y;
    if (Math.hypot(dx, dy) > 6) pt.moved = true;
    if (drag || options.axis) {
      if (kind === "unfold") {
        // Each fold is its own drag: progress within the current fold.
        const fold = dragProgress(dx, dy, axis, direction, distance);
        report(Math.min(1, pt.base + fold / steps));
      } else {
        report(Math.max(pt.base, dragProgress(dx, dy, axis, direction, distance)));
      }
    } else if (kind === "spin") {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      report(trackers.angle.feed(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)));
    } else if (kind === "scratch" || kind === "wipe") {
      const { u, v } = local(e);
      const radius = opts.current.brush ?? (kind === "wipe" ? 0.14 : 0.08);
      strokeSubs.current.forEach((cb) => cb({ u0: pt.u, v0: pt.v, u1: u, v1: v, radius }));
      const p = trackers.grid.stroke(pt.u, pt.v, u, v, radius);
      pt.u = u;
      pt.v = v;
      report(p);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const pt = pointer.current;
    pointer.current = null;
    if (kind === "hold") return stopHold();
    if (kind === "spin") trackers.angle.release();
    if (!pt || doneRef.current) return;
    // A tap (no real movement) on counting gestures.
    if (!pt.moved && (kind === "pop" || kind === "blow" || kind === "shake" || kind === "unfold")) {
      tapOnce();
      return;
    }
    if (kind === "unfold") {
      // Settle on the nearest fold reached.
      const s = stageOf(progress.get() + 0.15 / steps, steps);
      setStage(s);
      if (s > stageOf(pt.base, steps)) playSound(opts.current.sound?.tick ?? "paper-rustle");
      report(s / steps, { animateTo: true });
      return;
    }
    if (drag || options.axis) {
      // Not far enough: spring back.
      if (progress.get() < threshold) {
        if (reduced) progress.set(0);
        else void animate(progress, 0, { type: "spring", stiffness: 260, damping: 24 });
        lastTickStep.current = 0;
      }
    }
    void e;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!enabled || doneRef.current) return;
    const isPress = e.key === "Enter" || e.key === " ";
    if (kind === "hold") {
      if (isPress && !e.repeat) {
        e.preventDefault();
        startHold();
      }
      return;
    }
    const arrows: Record<string, boolean> = {
      ArrowRight: axis !== "y" && direction === 1,
      ArrowLeft: axis !== "y" && direction === -1,
      ArrowDown: axis !== "x" && direction === 1,
      ArrowUp: axis !== "x" && direction === -1,
    };
    if (isPress || arrows[e.key]) {
      e.preventDefault();
      if (kind === "scratch" || kind === "wipe") {
        // Clear a band at a time, top to bottom.
        const band = Math.min(1, progress.get() + 0.34);
        const radius = 0.2;
        for (let v = 0; v <= band; v += 0.1) {
          strokeSubs.current.forEach((cb) => cb({ u0: 0, v0: v, u1: 1, v1: v, radius }));
          trackers.grid.stroke(0, v, 1, v, radius);
        }
        report(band >= 0.95 ? 1 : Math.max(trackers.grid.progress, band));
      } else if (kind === "spin") {
        trackers.angle.total += (options.degrees ?? 300) * 0.34;
        report(trackers.angle.progress, { animateTo: true });
      } else {
        tapOnce();
      }
    }
  };

  const onKeyUp = (e: React.KeyboardEvent) => {
    if (kind === "hold" && (e.key === "Enter" || e.key === " ")) stopHold();
  };

  /* ---------- sensors: mic and motion, only after a tap ---------- */

  const [micState, setMicState] = useState<SensorState>("idle");
  const micStop = useRef<(() => void) | null>(null);
  const startMic = useCallback(async () => {
    if (kind !== "blow" || micState === "on" || doneRef.current) return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicState("unsupported");
      return;
    }
    setMicState("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error("no audio");
      const ctx = new Ctor();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let raf = 0;
      let last = performance.now();
      const loop = (now: number) => {
        an.getFloatTimeDomainData(buf);
        report(trackers.blow.feed(rms(buf), now - last));
        last = now;
        if (!doneRef.current) raf = requestAnimationFrame(loop);
        else micStop.current?.();
      };
      raf = requestAnimationFrame(loop);
      micStop.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((tr) => tr.stop());
        void ctx.close();
        micStop.current = null;
      };
      setMicState("on");
    } catch {
      setMicState("denied");
    }
  }, [kind, micState, report, trackers]);
  useEffect(() => () => micStop.current?.(), []);

  const [motionState, setMotionState] = useState<SensorState>("idle");
  const motionStop = useRef<(() => void) | null>(null);
  const startMotion = useCallback(async () => {
    if (kind !== "shake" || motionState === "on" || doneRef.current) return;
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setMotionState("unsupported");
      return;
    }
    const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if (DME.requestPermission) {
        setMotionState("asking");
        if ((await DME.requestPermission()) !== "granted") throw new Error("denied");
      }
      const onMotion = (ev: DeviceMotionEvent) => {
        const a = ev.acceleration ?? ev.accelerationIncludingGravity;
        if (!a) return;
        const grav = ev.acceleration ? 0 : 9.8;
        report(trackers.shake.feed(a.x ?? 0, a.y ?? 0, Math.abs(a.z ?? 0) - grav, performance.now()));
        if (doneRef.current) motionStop.current?.();
      };
      window.addEventListener("devicemotion", onMotion);
      motionStop.current = () => {
        window.removeEventListener("devicemotion", onMotion);
        motionStop.current = null;
      };
      setMotionState("on");
    } catch {
      setMotionState("denied");
    }
  }, [kind, motionState, report, trackers]);
  useEffect(() => () => motionStop.current?.(), []);

  const onStroke = useCallback((cb: (s: Stroke) => void) => {
    strokeSubs.current.add(cb);
    return () => {
      strokeSubs.current.delete(cb);
    };
  }, []);

  const label = t(`gesture.${kind}.label` as MessageKey);
  const hint = t(`gesture.${kind}.hint` as MessageKey);

  return {
    kind,
    progress,
    done,
    stage,
    reduced,
    bind: {
      tabIndex: enabled && !done ? 0 : -1,
      role: "button",
      "aria-label": `${label}. ${t("gesture.keys")}`,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      onKeyUp,
      onContextMenu: (e) => kind === "hold" && e.preventDefault(),
      style: { touchAction: kind === "scratch" || kind === "wipe" || kind === "spin" || drag ? "none" : "manipulation" },
    },
    complete: finish,
    setProgress: (p: number) => report(Math.max(0, Math.min(1, p)), { animateTo: true }),
    reset,
    label,
    hint,
    mic: kind === "blow" ? { state: micState, start: startMic } : null,
    motion: kind === "shake" ? { state: motionState, start: startMotion } : null,
    onStroke,
  };
}
