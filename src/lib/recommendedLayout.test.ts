import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { RECOMMENDED_LAYOUTS, recommendedLayout } from "@/lib/recommendedLayout";
import { FORMAT_IDS } from "@/lib/formats";

// Theme names straight from the seed, so a new theme can't ship without a recommended layout.
const seed = readFileSync(new URL("../../scripts/seed.ts", import.meta.url), "utf8");
const themeBlock = seed.slice(seed.indexOf("const themes"));
const seededThemes = [...themeBlock.matchAll(/^ {2}\["([^"]+)", "[^"]+", "/gm)].map((m) => m[1]!).filter((n) => !n.includes("(sample)"));

describe("recommendedLayout", () => {
  test("every seeded theme has a pick with a reason", () => {
    expect(seededThemes.length).toBeGreaterThan(10);
    for (const name of seededThemes) {
      const pick = RECOMMENDED_LAYOUTS[name.toLowerCase()];
      expect(pick, name).toBeDefined();
      expect(pick!.why.length).toBeGreaterThan(10);
    }
  });

  test("every pick is a real layout", () => {
    for (const pick of Object.values(RECOMMENDED_LAYOUTS)) expect(FORMAT_IDS).toContain(pick.layout);
  });

  test("matches the table in docs/theme-bible.md", () => {
    expect(recommendedLayout("Happy Birthday").layout).toBe("scrapbook");
    expect(recommendedLayout("Valentine's").layout).toBe("storybook");
    expect(recommendedLayout("Pets").layout).toBe("bento");
    expect(recommendedLayout("New Year").layout).toBe("stars");
    expect(recommendedLayout("Game Night").layout).toBe("hunt");
    expect(recommendedLayout("Care Package").layout).toBe("hunt");
    expect(recommendedLayout("Debut").layout).toBe("storybook");
  });

  test("no theme falls back to Scrapbook", () => {
    expect(recommendedLayout(null).layout).toBe("scrapbook");
    expect(recommendedLayout("Something new").layout).toBe("scrapbook");
  });

  test("engine themes start on the same layout", () => {
    for (const dir of ["care-package", "balikbayan-box", "parol", "winter-cabin", "debut"]) {
      const src = readFileSync(new URL(`../themes/engine/themes/${dir}/theme.ts`, import.meta.url), "utf8");
      const name = /name: "([^"]+)"/.exec(src)![1]!;
      const def = /defaultFormat: "([^"]+)"/.exec(src)![1]!;
      expect(def, name).toBe(recommendedLayout(name).layout);
    }
  });
});
