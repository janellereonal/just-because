import { describe, expect, test } from "bun:test";
import { MAX_FRIENDS, STORY_ANIMALS, shortName, storyAccessory, storyCast, storySeats } from "./cast";

describe("storyCast", () => {
  test("one character per friend, never the same animal twice", () => {
    const { friends, total, extra } = storyCast(["Jo", "Ben", "Aiko", "Sam", "Lola", "Rafa", "Dee"]);
    expect(friends).toHaveLength(7);
    expect(new Set(friends.map((f) => f.animal)).size).toBe(7);
    expect(total).toBe(7);
    expect(extra).toBe(0);
    for (const f of friends) expect(STORY_ANIMALS).toContain(f.animal as (typeof STORY_ANIMALS)[number]);
  });
  test("the same friend is the same animal every time", () => {
    expect(storyCast(["Jo", "Ben"]).friends.map((f) => f.animal)).toEqual(storyCast(["Jo", "Ben"]).friends.map((f) => f.animal));
  });
  test("names are de-duplicated and counted, extras are not drawn", () => {
    const names = ["Jo", "jo ", "Ben", ...Array.from({ length: 12 }, (_, i) => `Friend ${i}`)];
    const { friends, total, extra } = storyCast(names);
    expect(total).toBe(14);
    expect(friends).toHaveLength(MAX_FRIENDS);
    expect(extra).toBe(14 - MAX_FRIENDS);
  });
  test("no notes yet: three unnamed friends", () => {
    const { friends, total } = storyCast(["", "  "]);
    expect(friends).toHaveLength(3);
    expect(friends.every((f) => f.name === "")).toBe(true);
    expect(total).toBe(0);
  });
  test("short names", () => {
    expect(shortName("Maria Clara Santos")).toBe("Maria");
    expect(shortName("Bartholomewington")).toBe("Bartholomew…");
  });
});

describe("storySeats", () => {
  test("everyone fits on a phone", () => {
    for (let n = 1; n <= MAX_FRIENDS; n++) {
      const seats = storySeats(n, 390, 500);
      expect(seats).toHaveLength(n);
      for (const s of seats) {
        expect(Math.abs(s.x) + s.size / 2).toBeLessThanOrEqual(390 / 2);
      }
    }
  });
  test("five or more make two rows", () => {
    expect(new Set(storySeats(4, 390, 500).map((s) => s.y)).size).toBe(1);
    expect(new Set(storySeats(5, 390, 500).map((s) => s.y)).size).toBe(2);
  });
});

test("costumes", () => {
  expect(storyAccessory("birthday")).toBe("party-hat");
  expect(storyAccessory("christmas")).toBe("scarf");
});
