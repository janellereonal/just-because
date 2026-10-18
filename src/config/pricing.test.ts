import { describe, expect, test } from "bun:test";
import { addMonths, discountCodes, discountedAmount } from "./pricing";

describe("addMonths", () => {
  test("keeps the day when it exists", () => {
    expect(addMonths(new Date("2026-01-15T10:00:00Z"), 3).toISOString()).toBe("2026-04-15T10:00:00.000Z");
  });
  test("never spills into the next month", () => {
    expect(addMonths(new Date("2026-11-30T10:00:00Z"), 3).toISOString()).toBe("2027-02-28T10:00:00.000Z");
    expect(addMonths(new Date("2027-12-31T00:00:00Z"), 2).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });
  test("negative months work too", () => {
    expect(addMonths(new Date("2026-03-31T00:00:00Z"), -1).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
  test("years", () => {
    expect(addMonths(new Date("2026-10-17T00:00:00Z"), 120).toISOString()).toBe("2036-10-17T00:00:00.000Z");
  });
});

describe("discountedAmount", () => {
  test("percent off lands on a whole peso", () => {
    expect(discountedAmount(29900, { type: "percent", value: 20 })).toBe(23900);
    expect(discountedAmount(59900, { type: "percent", value: 20 })).toBe(47900);
    expect(discountedAmount(99900, { type: "percent", value: 15 })).toBe(84900);
  });
  test("fixed takes pesos off", () => {
    expect(discountedAmount(29900, { type: "fixed", value: 10000 })).toBe(19900);
  });
  test("free and 100% are free", () => {
    expect(discountedAmount(99900, { type: "free", value: 0 })).toBe(0);
    expect(discountedAmount(99900, { type: "percent", value: 100 })).toBe(0);
    expect(discountedAmount(29900, { type: "fixed", value: 50000 })).toBe(0);
  });
  test("a tiny leftover goes up to the minimum charge, never above the full price", () => {
    expect(discountedAmount(29900, { type: "fixed", value: 29000 })).toBe(discountCodes.minCharge);
    expect(discountedAmount(29900, { type: "percent", value: 99 })).toBe(discountCodes.minCharge);
    expect(discountedAmount(1000, { type: "percent", value: 10 })).toBe(1000);
  });
  test("odd values can't make it cost more", () => {
    expect(discountedAmount(29900, { type: "percent", value: -50 })).toBe(29900);
    expect(discountedAmount(29900, { type: "fixed", value: -100 })).toBe(29900);
  });
});

describe("plan cards count only the formats on offer", () => {
  test("a format behind a flag that's off isn't counted", async () => {
    const { TIERS, featureList } = await import("./pricing");
    const { offeredFormats } = await import("@/lib/formats");
    const offered = offeredFormats().length;
    const keepsake = TIERS.find((t) => t.id === "keepsake")!;
    expect(featureList(keepsake)).toContain(`All ${offered} formats, including Storybook and Mixtape`);
    // The same number the homepage says ("Nine ways to open the same gift.").
    const { LANDING_MORE } = await import("@/copy/strings");
    expect(LANDING_MORE.formats.title(9)).toBe("Nine ways to open the same gift.");
    expect(LANDING_MORE.formats.title(10)).toBe("Ten ways to open the same gift.");
    expect(LANDING_MORE.formats.title(14)).toBe("14 ways to open the same gift.");
  });
});
