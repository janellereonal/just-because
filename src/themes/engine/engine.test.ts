import { describe, expect, test } from "bun:test";
import { monogramOf, resolveSlots, WORST_SLOTS } from "./slots";
import { availableIn, themeNameFor, validateTheme, type ThemeDefinition } from "./define";
import { ENGINE_THEMES } from "./registry";
import { t, formatMoney } from "@/i18n";

const D = { accent: "#B5623E", accent2: "#2F5D50" };

describe("slots", () => {
  test("empty input gets fallbacks", () => {
    const s = resolveSlots({}, D);
    expect(s.recipient).toBe(t("slot.recipient.fallback"));
    expect(s.age).toBeNull();
    expect(s.place.label).toBe(t("slot.place.fallback"));
    expect(s.accent).toBe(D.accent);
    expect(s.given.recipient).toBe(false);
    expect(s.monogram).toBe("");
  });
  test("worst case stays drawable", () => {
    const s = resolveSlots(WORST_SLOTS, D);
    expect(s.monogram).toBe("A&Z");
    expect(s.recipientShort.length).toBeLessThanOrEqual(16);
    expect(s.age).toBe(103);
    expect(s.ageOrdinal).toBe("103rd");
    expect(s.place.label).toContain("Llanfairpwllgwyngyll");
  });
  test("bad values fall back", () => {
    const s = resolveSlots({ age: "abc", accent: "red", photo: "javascript:alert(1)", date: "not a date" }, D);
    expect(s.age).toBeNull();
    expect(s.accent).toBe(D.accent);
    expect(s.photo).toBeNull();
    expect(s.date).toBeNull();
  });
  test("monograms are letters only", () => {
    expect(monogramOf("1🎉a.b", "x")).toBe("AB");
    expect(monogramOf("", "Ana and Ben")).toBe("A&B");
    expect(monogramOf("", "")).toBe("");
  });
  test("places use country names", () => {
    const s = resolveSlots({ place: { city: "Cebu", country: "ph" } }, D);
    expect(s.place.countryCode).toBe("PH");
    expect(s.place.label.startsWith("Cebu, ")).toBe(true);
  });
});

describe("theme definitions", () => {
  test("every registered theme passes validation", () => {
    for (const th of ENGINE_THEMES) expect(validateTheme(th)).toEqual([]);
  });
  test("validation catches mistakes", () => {
    const bad = { ...ENGINE_THEMES[0]!, id: "Bad Id", slots: ["age"], palette: { ...ENGINE_THEMES[0]!.palette, ink: "black" }, status: "draft" } as ThemeDefinition;
    const problems = validateTheme(bad);
    expect(problems.some((p) => p.includes("id"))).toBe(true);
    expect(problems.some((p) => p.includes("recipient"))).toBe(true);
    expect(problems.some((p) => p.includes("palette.ink"))).toBe(true);
    expect(problems.some((p) => p.includes("flag"))).toBe(true);
  });
  test("regional names and availability", () => {
    const th = { ...ENGINE_THEMES[0]!, name: "Care Package", regionalNames: { PH: "Balikbayan Box" }, regions: { available: ["PH"] } } as ThemeDefinition;
    expect(themeNameFor(th, "ph")).toBe("Balikbayan Box");
    expect(themeNameFor(th, "US")).toBe("Care Package");
    expect(availableIn(th, "PH")).toBe(true);
    expect(availableIn(th, "US")).toBe(false);
  });
});

describe("i18n", () => {
  test("placeholders fill in", () => {
    expect(t("gesture.progress", { percent: 40 })).toBe("40% done");
  });
  test("money uses Intl", () => {
    expect(formatMoney(299, "PHP")).toContain("299");
  });
});
