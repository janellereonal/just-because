import { describe, expect, test } from "bun:test";
import { nightOfNote, notesByNight, openedNotes, simbangNight, simbangYear } from "./simbang";

const at = (iso: string) => new Date(`${iso}T00:30:00`);

describe("simbangNight", () => {
  test("closed before 16 December", () => {
    expect(simbangNight(at("2026-10-16"), 2026)).toBe(0);
    expect(simbangNight(at("2026-12-15"), 2026)).toBe(0);
  });
  test("one a night, at local midnight", () => {
    expect(simbangNight(at("2026-12-16"), 2026)).toBe(1);
    expect(simbangNight(new Date("2026-12-16T23:59:00"), 2026)).toBe(1);
    expect(simbangNight(at("2026-12-20"), 2026)).toBe(5);
    expect(simbangNight(at("2026-12-24"), 2026)).toBe(9);
    expect(simbangNight(at("2026-12-31"), 2026)).toBe(9);
  });
  test("other years", () => {
    expect(simbangNight(at("2027-01-05"), 2026)).toBe(9);
    expect(simbangNight(at("2026-12-20"), 2027)).toBe(0);
  });
});

describe("notes per night", () => {
  test("fewer than nine: the last opens on Christmas Eve", () => {
    expect([0, 1, 2].map((i) => nightOfNote(i, 3))).toEqual([3, 6, 9]);
    expect(nightOfNote(0, 1)).toBe(9);
  });
  test("nine: one a night", () => {
    expect(Array.from({ length: 9 }, (_, i) => nightOfNote(i, 9))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  test("more than nine: grouped, every night has some", () => {
    const groups = notesByNight(Array.from({ length: 20 }, (_, i) => i));
    expect(groups.every((g) => g.length >= 2)).toBe(true);
    expect(groups.flat().length).toBe(20);
  });
  test("opened notes follow the night", () => {
    expect(openedNotes(["a", "b", "c"], 0)).toEqual([]);
    expect(openedNotes(["a", "b", "c"], 6)).toEqual(["a", "b"]);
    expect(openedNotes(["a", "b", "c"], 9)).toEqual(["a", "b", "c"]);
  });
  test("gift year", () => {
    expect(simbangYear("2026-10-16T10:00:00")).toBe(2026);
    expect(simbangYear("2026-12-28T10:00:00")).toBe(2027);
  });
});
