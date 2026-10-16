import { describe, expect, test } from "bun:test";
import { orderThemes } from "./themeOrder";

const list = ["Happy Birthday", "Care Package", "Weddings", "Balikbayan Box", "Parol Christmas"].map((name) => ({ name }));
const names = (c: string | null) => orderThemes(list, c).map((t) => t.name);

describe("orderThemes", () => {
  test("everyone else: Care Package before Balikbayan Box", () => {
    const n = names("US");
    expect(n.indexOf("Care Package")).toBeLessThan(n.indexOf("Balikbayan Box"));
    expect(n).toHaveLength(5);
  });
  test("Philippines: the PH collection first, Balikbayan Box before Care Package", () => {
    const n = names("PH");
    expect(n.indexOf("Balikbayan Box")).toBeLessThan(n.indexOf("Care Package"));
    expect(n.slice(0, 2).sort()).toEqual(["Balikbayan Box", "Parol Christmas"]);
  });
  test("unknown country keeps the usual order", () => {
    expect(names(null)).toEqual(["Happy Birthday", "Care Package", "Weddings", "Balikbayan Box", "Parol Christmas"]);
  });
});
