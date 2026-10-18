import { describe, expect, test } from "bun:test";
import { describeWait, formatMomentWithYear, splitWait } from "./time";

const DAY = 86400000;
const now = new Date(2026, 9, 18, 14, 0).getTime();

describe("describeWait", () => {
  test("short waits stay a live countdown", () => {
    expect(describeWait(now + 2 * DAY, now)).toBeNull();
    expect(describeWait(now + 6.9 * DAY, now)).toBeNull();
    expect(describeWait(now - DAY, now)).toBeNull();
  });
  test("weeks, months and years", () => {
    expect(describeWait(now + 21 * DAY, now)).toContain("3");
    expect(describeWait(now + 150 * DAY, now)).toContain("5");
    expect(describeWait(now + 365.5 * DAY, now)).toContain("1");
    expect(describeWait(now + 365 * 5 * DAY, now)).toContain("5");
  });
  test("a year plus a few hours reads as one year, not 365 days", () => {
    const words = describeWait(now + 365 * DAY + 5 * 3600000, now) ?? "";
    expect(words).not.toContain("365");
    expect(words).toMatch(/1/);
  });
});

describe("formatMomentWithYear", () => {
  test("adds the year only when it's a different year", () => {
    expect(formatMomentWithYear(new Date(2027, 9, 18, 19).getTime(), now)).toContain("2027");
    expect(formatMomentWithYear(new Date(2026, 11, 1, 19).getTime(), now)).not.toContain("2026");
  });
});

describe("splitWait", () => {
  test("days, hours and minutes", () => {
    expect(splitWait(now + 2 * DAY + 3 * 3600000 + 4 * 60000, now)).toEqual({ days: 2, hours: 3, minutes: 4 });
    expect(splitWait(now - 1000, now)).toEqual({ days: 0, hours: 0, minutes: 0 });
  });
});
