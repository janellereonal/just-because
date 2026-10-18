import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { isFlagOn } from "@/config/flags";
import { OCCASIONS } from "@/lib/occasions";
import { bodyFor, giftLookTitle, splitForOccasion, styleForLegacy, styleInfo } from "@/lib/styles";
import { THEME_KINDS } from "@/lib/themeKind";
import { themeStillUrl } from "@/components/Theme3D";

describe("style choices", () => {
  test("Gift box (the Christmas theme) is only offered for Christmas", () => {
    for (const o of OCCASIONS) {
      if (o.groupOnly || o.id === "christmas") continue;
      expect(splitForOccasion(o.id).fits.map((s) => s.id)).not.toContain("gift-box");
    }
    expect(splitForOccasion("christmas").fits.map((s) => s.id)).toContain("gift-box");
  });

  test("Handwritten reads as a calm storybook while the notebook layout is off", () => {
    const hw = styleInfo("handwritten");
    expect(hw.fallbackBody).toBe("storybook");
    if (!isFlagOn("handwrittenFormat")) expect(bodyFor(hw)).toBe("storybook");
    // Gifts saved as a zine before still count as Handwritten.
    expect(styleForLegacy({ name: "Handwritten" }, "zine")?.id).toBe("handwritten");
    expect(styleForLegacy({ name: "Handwritten" }, "storybook")?.id).toBe("handwritten");
  });

  test("lists name the style, not the layout underneath", () => {
    expect(giftLookTitle({ style: "cake", format: "scrapbook" })).toBe("Cake");
    expect(giftLookTitle({ style: "love-letter", format: "storybook" })).toBe("Love Letter");
    expect(giftLookTitle({ style: null, format: "mixtape" })).toBe("Mixtape");
  });

  test("every theme still the app asks for exists", () => {
    for (const kind of THEME_KINDS) {
      const file = themeStillUrl(kind).split("?")[0]!;
      expect(existsSync(join(process.cwd(), "public", file))).toBe(true);
    }
  });
});
