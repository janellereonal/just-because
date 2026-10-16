import { describe, expect, test } from "bun:test";
import { addMonths } from "./pricing";

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
