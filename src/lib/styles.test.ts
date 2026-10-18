import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { en } from "@/i18n/en";
import { FORMAT_IDS, type GiftFormat } from "./formats";
import { KIND_WORDS, giftHeading, giftWords, occasionTitle, themeKindOf } from "./themeKind";
import { MODULES } from "./gift";
import { NEW_SECTION_TYPES } from "./sections";
import { OCCASIONS, OCCASION_IDS, OCCASION_FOR_KIND, occasionGreeting, occasionInfo } from "./occasions";
import { STYLES, STYLE_IDS, lookFor, resolveStyle, styleForLegacy, styleInfo, stylesForOccasion } from "./styles";
import { OPENINGS } from "@/themes/TactileOpening";
import { engineThemeForName } from "@/themes/engine/registry";

const MODULE_TYPES = [...MODULES.map((m) => m.type as string), ...NEW_SECTION_TYPES];

// Theme names from the seed (the seed is a script that talks to a database, so read it as text).
const seed = readFileSync(new URL("../../scripts/seed.ts", import.meta.url), "utf8");
const themeBlock = seed.slice(seed.indexOf("const themes:"), seed.indexOf("await sql.begin"));
const SEEDED = [...themeBlock.matchAll(/^\s*\["([^"]+)",\s*"/gm)].map((m) => m[1]!);
const theme = (name: string) => ({ name, category: "" });

describe("styles", () => {
  test("every style has its words and reads in a real layout", () => {
    for (const s of STYLES) {
      expect(FORMAT_IDS).toContain(s.body);
      if (s.fallbackBody) expect(FORMAT_IDS).toContain(s.fallbackBody);
      for (const f of ["title", "copy", "about"]) expect(Object.keys(en)).toContain(`style.${s.id}.${f}`);
    }
    expect(STYLES.map((s) => s.id).sort()).toEqual([...STYLE_IDS].sort());
  });

  test("every seeded theme has a style, and every style's look is a seeded theme", () => {
    const looks = STYLES.flatMap((s) => s.looks.map((l) => l.theme));
    for (const name of SEEDED) expect(looks).toContain(name);
    for (const name of looks) expect(SEEDED).toContain(name);
    expect(SEEDED.length).toBeGreaterThanOrEqual(18);
  });

  test("every layout is a style of its own", () => {
    for (const f of FORMAT_IDS) {
      const own = STYLES.filter((s) => s.origin === "layout" && s.body === f);
      // The notebook layout became part of the Handwritten style.
      if (f === "handwritten") expect(styleInfo("handwritten").body).toBe("handwritten");
      else expect(own).toHaveLength(1);
    }
  });

  test("theme styles open with a real opening", () => {
    for (const s of STYLES.filter((x) => x.origin === "theme")) {
      for (const look of s.looks) {
        const engine = engineThemeForName(look.theme);
        const kind = themeKindOf(theme(look.theme));
        expect(!!engine || (kind !== "default" && !!OPENINGS[kind])).toBe(true);
      }
    }
  });

  test("engine styles read in their theme's own layout", () => {
    for (const s of STYLES) {
      for (const look of s.looks) {
        const engine = engineThemeForName(look.theme);
        if (engine) expect(s.body).toBe(engine.occasion.defaultFormat);
      }
    }
  });

  test("Invitation wears blush for a bridal shower and ivory otherwise", () => {
    const inv = styleInfo("invitation");
    expect(lookFor(inv, "bridal-shower")?.theme).toBe("Bridal Shower");
    expect(lookFor(inv, "wedding")?.theme).toBe("Weddings");
    expect(lookFor(inv, null)?.theme).toBe("Weddings");
    expect(lookFor(inv, "wedding", "blush")?.theme).toBe("Bridal Shower");
    expect(lookFor(styleInfo("scrapbook"), "birthday")).toBeNull();
  });
});

describe("occasions", () => {
  test("every occasion has all its words, a name placeholder and no em dashes", () => {
    for (const id of OCCASION_IDS) {
      for (const f of ["name", "greeting", "greetingFor", "badge", "countdown", "letters", "from"]) {
        const v = (en as Record<string, string>)[`occasion.${id}.${f}`];
        expect(v).toBeTruthy();
        expect(v).not.toContain("—");
      }
      expect((en as Record<string, string>)[`occasion.${id}.greetingFor`]).toContain("{name}");
    }
    expect(OCCASIONS.map((o) => o.id).sort()).toEqual([...OCCASION_IDS].sort());
  });

  test("recommended styles and sections exist, parents are real", () => {
    for (const o of OCCASIONS) {
      expect(o.styles.length).toBeGreaterThan(0);
      for (const s of o.styles) expect(STYLE_IDS).toContain(s);
      expect(new Set(o.styles).size).toBe(o.styles.length);
      for (const m of o.sections) expect(MODULE_TYPES).toContain(m);
      if (o.parent) expect(occasionInfo(o.parent).parent).toBeUndefined();
    }
  });

  test("quiet occasions don't say happy and don't open with a party", () => {
    for (const o of OCCASIONS.filter((x) => x.quiet)) {
      expect(occasionGreeting(o.id, "Ana").toLowerCase()).not.toContain("happy");
      for (const s of o.styles) expect(styleInfo(s).mood).not.toBe("party");
      const order = stylesForOccasion(o.id).map((s) => s.id);
      const firstParty = order.findIndex((id) => styleInfo(id).mood === "party");
      const lastCalm = Math.max(...order.map((id, i) => (styleInfo(id).mood !== "party" ? i : -1)));
      expect(firstParty).toBeGreaterThan(lastCalm);
    }
  });

  test("greetings with and without a name", () => {
    expect(occasionGreeting("birthday", "Ana")).toBe("Happy birthday, Ana");
    expect(occasionGreeting("birthday", "  ")).toBe("Happy birthday");
    expect(occasionGreeting("pets", "Milo")).toBe("For Milo, the best pet ever");
    expect(occasionTitle(null, "Ana", "anniversary")).toBe("Happy anniversary, Ana");
  });

  test("an occasion sorts the styles but keeps every one", () => {
    const birthday = stylesForOccasion("birthday").map((s) => s.id);
    expect(birthday[0]).toBe("cake");
    expect(birthday).toHaveLength(STYLES.length);
    const anniversary = stylesForOccasion("anniversary").map((s) => s.id);
    expect(anniversary.slice(0, 4)).toEqual(["love-letter", "stars", "storybook", "mixtape"]);
    expect(stylesForOccasion(null).map((s) => s.id)).toEqual(STYLES.map((s) => s.id));
  });

  test("old theme kinds map to occasions that exist", () => {
    for (const id of Object.values(OCCASION_FOR_KIND)) expect(OCCASION_IDS).toContain(id!);
  });
});

describe("gifts made before styles look exactly the same", () => {
  test("every theme and layout: same opening, same layout, same words", () => {
    for (const name of [...SEEDED, null]) {
      const th = name ? theme(name) : null;
      const kind = themeKindOf(th);
      for (const format of FORMAT_IDS) {
        const site = { format: format as GiftFormat, style: null, occasion: null };
        const r = resolveStyle(site, th);
        expect(r.style).toBeNull();
        expect(r.introKind).toBe(kind);
        expect(r.body).toBe(format);
        expect(giftWords(th, null)).toEqual(KIND_WORDS[kind]);
        expect(giftHeading({}, th, null)).toBe(KIND_WORDS[kind].occasion);
      }
    }
  });

  test("an unknown or empty style or occasion in the database is ignored", () => {
    const th = theme("Happy Birthday");
    const r = resolveStyle({ format: "storybook", style: "not-a-style", occasion: "nope" }, th);
    expect(r.style).toBeNull();
    expect(r.introKind).toBe("birthday");
    expect(giftWords(th, "nope")).toEqual(KIND_WORDS.birthday);
  });

  test("a styled gift plays its style's opening", () => {
    expect(resolveStyle({ format: "scrapbook", style: "cake", occasion: "birthday" }, theme("Happy Birthday")).introKind).toBe("birthday");
    expect(resolveStyle({ format: "stars", style: "stars", occasion: null }, null).introKind).toBe("default");
    expect(giftWords(null, "graduation").occasion).toBe("Congrats, graduate");
  });

  test("old theme and layout pairs find their matching style", () => {
    expect(styleForLegacy(theme("Happy Birthday"), "scrapbook")?.id).toBe("cake");
    expect(styleForLegacy(theme("Valentine's"), "storybook")?.id).toBe("love-letter");
    expect(styleForLegacy(theme("Valentine's"), "mixtape")).toBeNull();
    expect(styleForLegacy(theme("Handwritten"), "zine")?.id).toBe("handwritten");
    expect(styleForLegacy(null, "mixtape")?.id).toBe("mixtape");
  });
});

describe("plans", () => {
  test("styles made from themes come with every plan, layout styles keep their plan", async () => {
    const { TIERS, tierAllowsLook, stylePlanTag } = await import("@/config/pricing");
    const sweet = TIERS[0]!;
    expect(tierAllowsLook(sweet, "storybook", "love-letter")).toBe(true);
    expect(tierAllowsLook(sweet, "stars", "countdown")).toBe(true);
    expect(tierAllowsLook(sweet, "storybook", "storybook")).toBe(sweet.formats.includes("storybook"));
    expect(tierAllowsLook(sweet, "storybook", null)).toBe(sweet.formats.includes("storybook"));
    expect(tierAllowsLook(sweet, "scrapbook", "scrapbook")).toBe(true);
    expect(stylePlanTag("love-letter")).toBeNull();
    expect(stylePlanTag("scrapbook")).toBeNull();
    expect(stylePlanTag("mixtape")).toBe(`${TIERS[1]!.name} plan`);
  });
});
