import { describe, expect, test } from "bun:test";
import { normalizeIntroSettings } from "./intro";

describe("Love Letter opening choice", () => {
  test("keeps peel and slide", () => {
    expect(normalizeIntroSettings({ letter: "peel" }).letter).toBe("peel");
    expect(normalizeIntroSettings({ letter: "slide" }).letter).toBe("slide");
  });
  test("seal is the default, so it isn't stored", () => {
    expect(normalizeIntroSettings({ letter: "seal" })).toEqual({});
  });
  test("drops anything else", () => {
    expect(normalizeIntroSettings({ letter: "<script>" })).toEqual({});
    expect(normalizeIntroSettings({ letter: 3 })).toEqual({});
  });
});
