import { describe, expect, test } from "bun:test";
import { countNotes, friendsIn, noteSummary } from "./noteCounts";
import { friendAddLine, sampleLetter } from "@/copy/strings";

describe("note counts", () => {
  const rows = [
    { status: "approved", by_owner: true, author_name: "Me" },
    { status: "approved", author_name: "Jo" },
    { status: "pending", author_name: "jo " },
    { status: "pending", author_name: "Ben" },
    { status: "hidden", author_name: "Ken" },
  ];
  test("in the gift counts the organiser's notes too", () => {
    expect(countNotes(rows)).toEqual({ inGift: 2, waiting: 2, hidden: 1 });
    expect(noteSummary(countNotes(rows))).toBe("2 in the gift · 2 waiting");
    expect(noteSummary({ inGift: 0, waiting: 0, hidden: 3 })).toBe("No notes yet");
  });
  test("the friend page counts people and leaves out the organiser", () => {
    expect(friendsIn(rows)).toBe(3);
  });
});

describe("friend page line", () => {
  test("built from the sections that are on", () => {
    expect(friendAddLine(["letters"])).toBe("Add a note.");
    expect(friendAddLine(["letters", "photobooth", "songs"])).toBe("Add a note, a photo or a song.");
    expect(friendAddLine(["letters", "photobooth", "songs", "voice"])).toBe("Add a note, a photo, a song and more.");
    expect(friendAddLine([])).toBe("");
  });
  test("sample letters match the occasion", () => {
    expect(sampleLetter("birthday", 0, "Ana")).toBe("Happy birthday, Ana. Here's to your best year yet.");
    expect(sampleLetter("nonsense", 1)).toBe("You make every room warmer.");
  });
});
