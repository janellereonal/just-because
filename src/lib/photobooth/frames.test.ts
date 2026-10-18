import { describe, expect, test } from "bun:test";
import { FRAMES, OUT_H, OUT_W, coverCrop, fitMessage, isDark, messageBox, photoSlots, photoWindow } from "@/lib/photobooth/frames";

// A fake measure: every character is 0.55 of the font size wide.
const measure = (line: string, size: number) => [...line].length * size * 0.55;

describe("photobooth frames", () => {
  test("every frame keeps the photo and the message on the canvas, apart", () => {
    for (const { id } of FRAMES) {
      const w = photoWindow(id);
      const m = messageBox(id);
      for (const r of [w, m]) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(OUT_W);
        expect(r.y + r.h).toBeLessThanOrEqual(OUT_H);
      }
      if (id !== "clean") expect(m.y).toBeGreaterThanOrEqual(w.y + w.h);
    }
  });

  test("four photos make a 2x2 grid inside the window", () => {
    const win = { x: 100, y: 100, w: 800, h: 1000 };
    const slots = photoSlots(win, 4, 20);
    expect(slots).toHaveLength(4);
    expect(slots[0]).toEqual({ x: 100, y: 100, w: 390, h: 490 });
    expect(slots[3]!.x + slots[3]!.w).toBe(900);
    expect(slots[3]!.y + slots[3]!.h).toBe(1100);
    expect(photoSlots(win, 1)).toEqual([win]);
  });

  test("cover crop keeps the aspect ratio and stays centred", () => {
    const c = coverCrop(1600, 900, { x: 0, y: 0, w: 800, h: 1000 });
    expect(c.sh).toBe(900);
    expect(Math.round(c.sw)).toBe(720);
    expect(Math.round(c.sx)).toBe(440);
  });

  test("short messages stay big on one line", () => {
    expect(fitMessage("Happy birthday", 900, measure)).toEqual({ lines: ["Happy birthday"], size: 76 });
    expect(fitMessage("   ", 900, measure).lines).toEqual([]);
  });

  test("long messages wrap to two lines and shrink", () => {
    const r = fitMessage("Happy birthday from all of us, we love you so much", 600, measure);
    expect(r.lines.length).toBeLessThanOrEqual(2);
    for (const l of r.lines) expect(measure(l, r.size)).toBeLessThanOrEqual(600);
  });

  test("a message that can't fit ends with an ellipsis", () => {
    const r = fitMessage("word ".repeat(40), 300, measure);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[1]!.endsWith("…")).toBe(true);
  });

  test("dark colours get light text", () => {
    expect(isDark("#141B3A")).toBe(true);
    expect(isDark("#FBF8F2")).toBe(false);
  });
});
