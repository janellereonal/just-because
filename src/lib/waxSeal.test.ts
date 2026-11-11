import { describe, expect, test } from "bun:test";
import {
  calendarLink,
  cardWords,
  directionsLink,
  eventView,
  normalizeEvent,
  normalizeSeal,
  partOfDay,
  sealInitial,
} from "./waxSeal";
import { STYLES, fitsOccasion, splitForOccasion, styleInfo, stylePalette } from "./styles";
import { OCCASIONS } from "./occasions";
import { normalizeIntroSettings } from "./intro";
import { babyHint, babyName, normalizeSectionData, sectionAsText } from "./sections";
import { stylesWithOwnBody } from "@/components/bodies/registry";

describe("Wax Seal style", () => {
  const wax = styleInfo("wax-seal");

  test("shows under bridal shower, birthday and send-off, and nowhere else", () => {
    const listed = OCCASIONS.filter((o) => fitsOccasion(wax, o.id))
      .map((o) => o.id)
      .sort();
    expect(listed).toEqual(["birthday", "bridal-shower", "send-off"]);
    expect(splitForOccasion("graduation").fits.map((s) => s.id)).not.toContain("wax-seal");
  });

  test("is on every plan (reads as a scrapbook underneath) and wears its own colors", async () => {
    const { TIERS, tierAllowsLook } = await import("@/config/pricing");
    for (const tier of TIERS) expect(tierAllowsLook(tier, wax.body, "wax-seal")).toBe(true);
    expect(stylePalette("wax-seal")?.background).toBe("#261a17");
    expect(stylePalette("cake")).toBeNull();
  });

  test("has its own body, and is the only style of its kind so far", () => {
    expect(stylesWithOwnBody()).toContain("wax-seal");
    expect(STYLES.filter((s) => s.origin === "own").map((s) => s.id)).toEqual(["wax-seal"]);
  });
});

describe("the seal", () => {
  test("keeps only known fields, trimmed, one or two letters, a real day", () => {
    expect(
      normalizeSeal({
        initial: " Chai ",
        for_line: "  for chai ",
        card_line: "a little shower",
        date: "2026-11-17",
        evil: "<x>",
      }),
    ).toEqual({
      initial: "Ch",
      for_line: "for chai",
      card_line: "a little shower",
      date: "2026-11-17",
    });
    expect(normalizeSeal({ date: "17/11/2026", initial: "<>" })).toBeUndefined();
    expect(normalizeIntroSettings({ seal: { initial: "c" } }).seal).toEqual({ initial: "c" });
  });

  test("falls back to the name and the occasion", () => {
    expect(sealInitial(undefined, "Chai")).toBe("c");
    expect(sealInitial({ initial: "S" }, "Chai")).toBe("s");
    expect(cardWords("bridal-shower", "Chai").line).toBe("a little shower");
    expect(cardWords("birthday", "Ana").line).toBe("ana’s birthday");
  });
});

describe("the day", () => {
  test("cleans times, places and lists", () => {
    const e = normalizeEvent({
      time: "14:00",
      end: "25:00",
      tz: "Asia/Manila",
      place: " One Legazpi Park ",
      schedule: [{ time: "2:00 PM", what: "Meet up" }, "nope", { what: "x".repeat(500) }],
      menu: new Array(20).fill({ label: "a", what: "b" }),
    });
    expect(e.time).toBe("14:00");
    expect(e.end).toBeUndefined();
    expect(e.place).toBe("One Legazpi Park");
    expect(e.schedule).toHaveLength(2);
    expect(e.schedule![1]!.what).toHaveLength(120);
    expect(e.menu).toHaveLength(8);
  });

  test("links to the calendar in the creator's zone, and to directions", () => {
    const day = eventView(
      { date: "2026-11-17" },
      {
        time: "14:00",
        end: "21:00",
        tz: "Asia/Manila",
        place: "One Legazpi Park",
        address: "Makati",
      },
    );
    const link = new URL(calendarLink("Chai's shower", day)!);
    expect(link.searchParams.get("dates")).toBe("20261117T140000/20261117T210000");
    expect(link.searchParams.get("ctz")).toBe("Asia/Manila");
    expect(directionsLink(day)).toContain("One%20Legazpi%20Park%20Makati");
    // No date, no calendar link; no time, an all-day one.
    expect(calendarLink("x", eventView(undefined, {}))).toBeNull();
    expect(
      new URL(calendarLink("x", eventView({ date: "2026-12-31" }, {}))!).searchParams.get("dates"),
    ).toBe("20261231/20270101");
    expect(partOfDay("14:00")).toBe("the afternoon");
  });
});

describe("guess the baby", () => {
  test("keeps whose photo it is, else it's the sender's", () => {
    expect(normalizeSectionData("babies", { who: "  Chai " })).toEqual({ who: "Chai" });
    expect(normalizeSectionData("babies", {})).toEqual({});
    expect(babyName({ who: "Chai" }, "Danielle")).toBe("Chai");
    expect(babyName(null, "Danielle")).toBe("Danielle");
    expect(sectionAsText("babies", { who: "Chai" }, null, (x) => x)).toBe("Baby Chai");
    expect(babyHint(sectionAsText("babies", { who: "Chai" }, "I was two", (x) => x))).toBe(
      "I was two",
    );
    expect(babyHint("Baby Chai")).toBe("");
  });
});
