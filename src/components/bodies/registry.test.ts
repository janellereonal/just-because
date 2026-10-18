import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { STYLES } from "@/lib/styles";
import { stylesWithOwnBody } from "@/components/bodies/registry";
import { en } from "@/i18n/en";

describe("every theme style reads in a body of its own", () => {
  const own = new Set(stylesWithOwnBody());
  // Handwritten already had its own notebook body.
  const themeStyles = STYLES.filter((s) => s.origin === "theme" && s.id !== "handwritten");

  test("each theme style has one", () => {
    for (const s of themeStyles) expect(own.has(s.id)).toBe(true);
  });

  test("layout styles keep their layout", () => {
    for (const s of STYLES.filter((x) => x.origin === "layout")) expect(own.has(s.id)).toBe(false);
  });

  test("no two styles share a body", () => {
    const src = readFileSync(new URL("./registry.ts", import.meta.url), "utf8");
    const files = [
      ...src.matchAll(/^body\(\s*"([^"]+)",\s*\(\) =>\s*import\("@\/components\/bodies\/(\w+)"\)/gm),
    ].map((m) => m[2]);
    expect(files.length).toBe(own.size);
    expect(new Set(files).size).toBe(files.length);
  });

  test("each one describes its body in the gallery", () => {
    const keys = new Set(Object.keys(en));
    for (const s of themeStyles) expect(keys.has(`style.${s.id}.aboutOwn`)).toBe(true);
  });
});
