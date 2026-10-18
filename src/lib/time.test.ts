import { describe, expect, test } from "bun:test";
import { dayStartedSomewhere, describeWait, formatMomentWithYear, msToLocalMidnight, splitWait } from "./time";

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

describe("dayStartedSomewhere", () => {
  const H = 3600000;
  test("a day starts at midnight in UTC+14, 14 hours before UTC midnight", () => {
    const utcMidnight = Date.UTC(2026, 11, 25);
    expect(dayStartedSomewhere("2026-12-25", utcMidnight - 14 * H - 1)).toBe(false);
    expect(dayStartedSomewhere("2026-12-25", utcMidnight - 14 * H)).toBe(true);
    expect(dayStartedSomewhere("2026-12-25", utcMidnight + 30 * H)).toBe(true);
  });
  test("every viewer's local midnight comes after it, so a door never stays blank once it opens", () => {
    // Local midnight in UTC-12 (the last zone) is 12:00 UTC that day; in UTC+13, 11:00 UTC the day before.
    const lastZoneMidnight = Date.UTC(2026, 11, 25, 12);
    const earlyZoneMidnight = Date.UTC(2026, 11, 24, 11);
    expect(dayStartedSomewhere("2026-12-25", lastZoneMidnight)).toBe(true);
    expect(dayStartedSomewhere("2026-12-25", earlyZoneMidnight)).toBe(true);
  });
  test("tomorrow hasn't started anywhere when it's early morning in UTC", () => {
    expect(dayStartedSomewhere("2026-12-26", Date.UTC(2026, 11, 25, 2))).toBe(false);
    expect(dayStartedSomewhere("2026-12-27", Date.UTC(2026, 11, 25, 23))).toBe(false);
  });
  test("full timestamps use their date; junk counts as started", () => {
    expect(dayStartedSomewhere("2026-12-25T00:00:00Z", Date.UTC(2026, 11, 25, 2))).toBe(true);
    expect(dayStartedSomewhere("soon", 0)).toBe(true);
  });
});

describe("msToLocalMidnight", () => {
  test("counts to the next local midnight", () => {
    expect(msToLocalMidnight(new Date(2026, 9, 18, 23, 0))).toBe(3600000);
    expect(msToLocalMidnight(new Date(2026, 9, 18, 0, 0))).toBe(DAY);
  });
});
