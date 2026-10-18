import { describe, expect, test } from "bun:test";
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
} from "./progress";

describe("dragProgress", () => {
  test("measures along the gesture's direction", () => {
    expect(dragProgress(50, 0, "x", 1, 100)).toBe(0.5);
    expect(dragProgress(0, -80, "y", -1, 100)).toBe(0.8);
  });
  test("never goes negative or past 1", () => {
    expect(dragProgress(-40, 0, "x", 1, 100)).toBe(0);
    expect(dragProgress(400, 0, "x", 1, 100)).toBe(1);
  });
  test("diagonal counts both axes", () => {
    expect(dragProgress(100, 100, "diagonal", 1, Math.SQRT2 * 100)).toBeCloseTo(1, 5);
    expect(dragProgress(100, 0, "diagonal", 1, 100)).toBeCloseTo(0.7071, 3);
  });
  test("zero distance completes", () => {
    expect(dragProgress(0, 0, "x", 1, 0)).toBe(1);
  });
});

describe("stageOf", () => {
  test("splits into equal stages", () => {
    expect(stageOf(0, 2)).toBe(0);
    expect(stageOf(0.49, 2)).toBe(0);
    expect(stageOf(0.5, 2)).toBe(1);
    expect(stageOf(1, 2)).toBe(2);
  });
});

describe("CoverageGrid", () => {
  test("a big brush clears everything", () => {
    const g = new CoverageGrid(8, 6);
    expect(g.brush(0.5, 0.5, 2)).toBe(1);
  });
  test("a small brush clears a little", () => {
    const g = new CoverageGrid(10, 10);
    const p = g.brush(0.5, 0.5, 0.08);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.1);
  });
  test("strokes fill the gaps between points", () => {
    const g = new CoverageGrid(20, 4);
    g.stroke(0, 0.5, 1, 0.5, 0.06);
    // One row of cells at least, across the whole width.
    expect(g.progress).toBeGreaterThanOrEqual(0.25);
  });
  test("reset clears progress", () => {
    const g = new CoverageGrid(4, 4);
    g.brush(0.5, 0.5, 1);
    g.reset();
    expect(g.progress).toBe(0);
  });
});

describe("AngleTracker", () => {
  test("a full circle completes a 360 target", () => {
    const t = new AngleTracker(360);
    for (let a = 0; a <= 360; a += 10) t.feed(Math.cos((a * Math.PI) / 180) * 50, Math.sin((a * Math.PI) / 180) * 50);
    expect(t.progress).toBeCloseTo(1, 1);
  });
  test("one-way ignores turning back", () => {
    const t = new AngleTracker(360, 1);
    for (let a = 90; a >= 0; a -= 10) t.feed(Math.cos((a * Math.PI) / 180) * 50, Math.sin((a * Math.PI) / 180) * 50);
    expect(t.progress).toBe(0);
  });
  test("ignores readings at the centre", () => {
    const t = new AngleTracker(360);
    t.feed(1, 1);
    t.feed(-1, 1);
    expect(t.progress).toBe(0);
  });
});

describe("BlowDetector", () => {
  test("quiet rooms don't complete", () => {
    const b = new BlowDetector(900);
    for (let i = 0; i < 200; i++) b.feed(0.01, 16);
    expect(b.progress).toBe(0);
  });
  test("a steady breath completes", () => {
    const b = new BlowDetector(900);
    for (let i = 0; i < 20; i++) b.feed(0.01, 16);
    for (let i = 0; i < 60; i++) b.feed(0.3, 16);
    expect(b.progress).toBe(1);
  });
  test("taps are puffs", () => {
    const b = new BlowDetector(900);
    b.puff();
    b.puff();
    b.puff();
    expect(b.progress).toBe(1);
  });
  test("rms of a square wave", () => {
    expect(rms([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5, 5);
    expect(rms([])).toBe(0);
  });
});

describe("ShakeDetector", () => {
  test("counts spaced peaks only", () => {
    const s = new ShakeDetector(3, 14, 150);
    s.feed(20, 0, 0, 0);
    s.feed(20, 0, 0, 50); // too soon, same shake
    s.feed(20, 0, 0, 200);
    s.feed(2, 0, 0, 400); // too gentle
    s.feed(0, 18, 0, 500);
    expect(s.progress).toBe(1);
  });
  test("taps count as shakes", () => {
    const s = new ShakeDetector(2);
    s.tap();
    expect(s.progress).toBe(0.5);
  });
});

describe("TapCounter and keys", () => {
  test("taps add up and stop at the target", () => {
    const t = new TapCounter(3);
    t.tap();
    t.tap();
    t.tap();
    t.tap();
    expect(t.progress).toBe(1);
  });
  test("three key presses finish a gesture", () => {
    let p = 0;
    p = keyStep(p);
    p = keyStep(p);
    p = keyStep(p);
    expect(p).toBe(1);
  });
});
