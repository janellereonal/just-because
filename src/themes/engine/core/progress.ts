/**
 * The maths behind every gesture, kept free of React and the DOM so it can be
 * tested on its own (`bun test src/themes/engine`). Each tracker turns raw
 * input (pointer positions, angles, mic levels, motion readings, taps) into a
 * progress number from 0 to 1.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- drags: tear, peel, pull, untie, slide, unfold ---------- */

export type DragAxis = "x" | "y" | "diagonal";

/**
 * How far a drag has gone along the gesture's direction, as 0..1.
 * `direction` is +1 (right or down) or -1 (left or up). A diagonal drag is
 * measured along (direction, direction), so +1 is towards the bottom right.
 * Movement the other way counts as zero, never negative.
 */
export function dragProgress(dx: number, dy: number, axis: DragAxis, direction: 1 | -1, distance: number): number {
  if (distance <= 0) return 1;
  let along: number;
  if (axis === "x") along = dx * direction;
  else if (axis === "y") along = dy * direction;
  else along = ((dx + dy) * direction) / Math.SQRT2;
  return clamp01(along / distance);
}

/** Snap a 0..1 value to `steps` equal stages (unfold in two folds, say). Returns the stage reached. */
export function stageOf(progress: number, steps: number): number {
  if (steps <= 1) return progress >= 1 ? 1 : 0;
  return Math.min(steps, Math.floor(clamp01(progress) * steps + 1e-9));
}

/* ---------- scratch and wipe: how much of the surface has been cleared ---------- */

/**
 * A coarse grid over the surface. Every pointer position clears the cells
 * under a round brush; progress is the share of cells cleared. Coarse on
 * purpose: it's cheap, and nobody can clear a surface to the last pixel.
 */
export class CoverageGrid {
  readonly cols: number;
  readonly rows: number;
  private cleared: Uint8Array;
  private count = 0;

  constructor(cols = 16, rows = 12) {
    this.cols = Math.max(1, Math.round(cols));
    this.rows = Math.max(1, Math.round(rows));
    this.cleared = new Uint8Array(this.cols * this.rows);
  }

  /** Clear around (u, v), both 0..1 across the surface, with a brush radius as a share of the width. */
  brush(u: number, v: number, radius: number): number {
    const r = Math.max(0.001, radius);
    const aspect = this.rows / this.cols;
    for (let row = 0; row < this.rows; row++) {
      const cy = (row + 0.5) / this.rows;
      for (let col = 0; col < this.cols; col++) {
        const cx = (col + 0.5) / this.cols;
        const i = row * this.cols + col;
        if (this.cleared[i]) continue;
        // Distances in width units, so the brush stays round on wide surfaces.
        const ddx = cx - u;
        const ddy = (cy - v) * aspect;
        if (ddx * ddx + ddy * ddy <= r * r) {
          this.cleared[i] = 1;
          this.count += 1;
        }
      }
    }
    return this.progress;
  }

  /** A stroke from one point to the next, so fast swipes don't skip cells. */
  stroke(u0: number, v0: number, u1: number, v1: number, radius: number): number {
    const len = Math.hypot(u1 - u0, v1 - v0);
    const steps = Math.max(1, Math.ceil(len / Math.max(0.002, radius * 0.5)));
    for (let s = 1; s <= steps; s++) this.brush(u0 + ((u1 - u0) * s) / steps, v0 + ((v1 - v0) * s) / steps, radius);
    return this.progress;
  }

  get progress() {
    return this.count / this.cleared.length;
  }

  reset() {
    this.cleared.fill(0);
    this.count = 0;
  }
}

/* ---------- spin: total turning, in degrees ---------- */

/** Adds up how far something has been turned around a centre, in either direction or one only. */
export class AngleTracker {
  private last: number | null = null;
  total = 0;

  constructor(private readonly target = 360, private readonly oneWay: 1 | -1 | 0 = 0) {}

  /** Feed a pointer position relative to the centre. Returns progress 0..1. */
  feed(x: number, y: number): number {
    if (Math.hypot(x, y) < 6) return this.progress; // too close to the centre to read an angle
    const a = (Math.atan2(y, x) * 180) / Math.PI;
    if (this.last !== null) {
      let d = a - this.last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      if (this.oneWay === 0) this.total += Math.abs(d);
      else if (Math.sign(d) === this.oneWay) this.total += Math.abs(d);
    }
    this.last = a;
    return this.progress;
  }

  release() {
    this.last = null;
  }

  get progress() {
    return clamp01(this.total / this.target);
  }

  reset() {
    this.last = null;
    this.total = 0;
  }
}

/* ---------- blow: the mic hears a breath ---------- */

/** Root mean square of a block of samples (-1..1). */
export function rms(samples: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return samples.length ? Math.sqrt(sum / samples.length) : 0;
}

/**
 * Counts how long the mic has heard a breath. A breath is broadband noise, so
 * anything above `threshold` counts; `needMs` of it in total completes the
 * gesture. The threshold follows the room's quiet level, so a fan or traffic
 * doesn't blow the candles out by itself.
 */
export class BlowDetector {
  private floor = 0.01;
  private heard = 0;

  constructor(private readonly needMs = 900, private readonly margin = 0.06) {}

  /** Feed one level reading taken `dtMs` after the last. Returns progress 0..1. */
  feed(level: number, dtMs: number): number {
    const threshold = this.floor + this.margin;
    if (level > threshold) this.heard += dtMs;
    else this.floor = this.floor * 0.95 + level * 0.05; // learn the room while it's quiet
    return this.progress;
  }

  /** A tap counts as a short puff, for when there's no mic. */
  puff(share = 0.34) {
    this.heard += this.needMs * share;
    return this.progress;
  }

  get progress() {
    return clamp01(this.heard / this.needMs);
  }

  reset() {
    this.heard = 0;
  }
}

/* ---------- shake: the phone is shaken ---------- */

/**
 * Counts shakes from device motion. One shake is a reading above `threshold`
 * (m/s², gravity removed) at least `gapMs` after the previous one.
 */
export class ShakeDetector {
  private shakes = 0;
  private lastAt = -Infinity;

  constructor(private readonly need = 5, private readonly threshold = 14, private readonly gapMs = 160) {}

  feed(x: number, y: number, z: number, atMs: number): number {
    const mag = Math.hypot(x, y, z);
    if (mag >= this.threshold && atMs - this.lastAt >= this.gapMs) {
      this.shakes += 1;
      this.lastAt = atMs;
    }
    return this.progress;
  }

  /** A tap counts as one shake. */
  tap() {
    this.shakes += 1;
    return this.progress;
  }

  get progress() {
    return clamp01(this.shakes / this.need);
  }

  reset() {
    this.shakes = 0;
    this.lastAt = -Infinity;
  }
}

/* ---------- pop: a number of taps ---------- */

export class TapCounter {
  taps = 0;
  constructor(private readonly need = 5) {}
  tap() {
    this.taps = Math.min(this.need, this.taps + 1);
    return this.progress;
  }
  get progress() {
    return clamp01(this.taps / this.need);
  }
  reset() {
    this.taps = 0;
  }
}

/* ---------- keyboard ---------- */

/** How far one key press moves a gesture: a few presses finish it, so it's never a chore. */
export const KEY_STEP = 0.34;

/** The next progress after a key press, snapping to 1 once it's nearly there. */
export function keyStep(progress: number, step = KEY_STEP): number {
  const next = progress + step;
  return next >= 0.95 ? 1 : next;
}
