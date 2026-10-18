import { describe, expect, test } from "bun:test";
import { NOTE_RULES_COPY } from "@/copy/strings";
import { clearlyNot, fileFits, hasWord, isGiftMedia, isSongLink, mediaKindFor, noteProblem } from "./noteRules";
import { sectionFields } from "./sections";
import { giftShareUrl } from "./track";

const SITE = "3f2c1b7a-1111-4222-8333-944455556666";
const OTHER = "9a8b7c6d-1111-4222-8333-944455556666";
const blob = (site: string, name: string) => `https://abc123xyz.public.blob.vercel-storage.com/gifts/${site}/${name}`;
const dev = (site: string, name: string) => `/api/dev-uploads/1792349587239-gifts_${site}_${name}`;

describe("song links", () => {
  test("Spotify, YouTube and Apple Music over https", () => {
    for (const ok of [
      "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      "https://spotify.link/abc123",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://music.apple.com/ph/album/blinding-lights/1499378108?i=1499378615",
      "  https://open.spotify.com/track/x  ",
    ])
      expect(isSongLink(ok)).toBe(true);
  });
  test("anything else is refused", () => {
    for (const bad of [
      "javascript:alert(1)",
      "my favourite song",
      "http://open.spotify.com/track/x",
      "https://open.spotify.com/",
      "https://evil.com/open.spotify.com/track/x",
      "https://open.spotify.com.evil.com/track/x",
      "https://user:pass@open.spotify.com/track/x",
      "data:text/html,hi",
      "",
    ])
      expect(isSongLink(bad)).toBe(false);
  });
});

test("words need a letter or a digit", () => {
  expect(hasWord(",,,")).toBe(false);
  expect(hasWord(" ! , . ")).toBe(false);
  expect(hasWord("")).toBe(false);
  expect(hasWord(null)).toBe(false);
  expect(hasWord("kind, funny")).toBe(true);
  expect(hasWord(",,,ok")).toBe(true);
  expect(hasWord("マイ")).toBe(true);
  expect(hasWord("100")).toBe(true);
});

describe("files", () => {
  test("each section takes its own kind", () => {
    expect(mediaKindFor("voice")).toBe("voice");
    expect(mediaKindFor("video")).toBe("video");
    for (const t of ["photobooth", "capsule", "map", "doodle"]) expect(mediaKindFor(t)).toBe("photo");
    for (const t of ["letters", "songs", "wordcloud", "tree", "quiz"]) expect(mediaKindFor(t)).toBeNull();
  });
  test("an image is not a voice note or a video", () => {
    const png = { type: "image/png", name: "me.png" };
    expect(fileFits(png, "photo")).toBe(true);
    expect(fileFits(png, "voice")).toBe(false);
    expect(fileFits(png, "video")).toBe(false);
    expect(fileFits({ type: "audio/x-m4a", name: "memo.m4a" }, "voice")).toBe(true);
    expect(fileFits({ type: "video/quicktime", name: "clip.mov" }, "video")).toBe(true);
    expect(fileFits({ type: "video/mp4", name: "clip.mp4" }, "voice")).toBe(false);
    // No type from the system: go by the name.
    expect(fileFits({ type: "", name: "memo.M4A" }, "voice")).toBe(true);
    expect(fileFits({ type: "", name: "IMG_1.heic" }, "photo")).toBe(true);
    expect(fileFits({ type: "", name: "notes.txt" }, "photo")).toBe(false);
  });
  test("stored files must be this gift's", () => {
    expect(isGiftMedia(blob(SITE, "me-x1y2.webp"), SITE)).toBe(true);
    expect(isGiftMedia(dev(SITE, "me.webp"), SITE)).toBe(true);
    expect(isGiftMedia(blob(OTHER, "me.webp"), SITE)).toBe(false);
    expect(isGiftMedia(dev(OTHER, "me.webp"), SITE)).toBe(false);
    expect(isGiftMedia(`https://abc.public.blob.vercel-storage.com/themes/${SITE}/x.png`, SITE)).toBe(false);
    expect(isGiftMedia(`https://evil.com/gifts/${SITE}/x.png`, SITE)).toBe(false);
    expect(isGiftMedia(`https://abc.public.blob.vercel-storage.com.evil.com/gifts/${SITE}/x.png`, SITE)).toBe(false);
    expect(isGiftMedia(blob(SITE, "x.png"), "")).toBe(false);
  });
  test("a stored file named as another kind", () => {
    expect(clearlyNot(blob(SITE, "me.png"), "voice")).toBe(true);
    expect(clearlyNot(blob(SITE, "me.png"), "video")).toBe(true);
    expect(clearlyNot(blob(SITE, "clip.mp4"), "photo")).toBe(true);
    expect(clearlyNot(blob(SITE, "memo.m4a"), "voice")).toBe(false);
    expect(clearlyNot(blob(SITE, "memo.webm"), "voice")).toBe(false);
    expect(clearlyNot(blob(SITE, "noext"), "voice")).toBe(false);
  });
});

describe("noteProblem (what the server checks)", () => {
  const base = { textContent: null, externalLink: null, mediaUrl: null };
  test("songs", () => {
    expect(noteProblem("songs", { ...base, externalLink: "javascript:alert(1)" }, SITE)).toBe(NOTE_RULES_COPY.songLink);
    expect(noteProblem("songs", base, SITE)).toBe(NOTE_RULES_COPY.songLink);
    expect(noteProblem("songs", { ...base, externalLink: "https://youtu.be/x1" }, SITE)).toBeNull();
  });
  test("other links must be https", () => {
    expect(noteProblem("letters", { ...base, textContent: "hi", externalLink: "javascript:alert(1)" }, SITE)).toBe(NOTE_RULES_COPY.badLink);
    expect(noteProblem("letters", { ...base, textContent: "hi" }, SITE)).toBeNull();
  });
  test("word cloud", () => {
    expect(noteProblem("wordcloud", { ...base, textContent: ",,," }, SITE)).toBe(NOTE_RULES_COPY.noWord);
    expect(noteProblem("wordcloud", { ...base, textContent: "kind" }, SITE)).toBeNull();
  });
  test("files", () => {
    expect(noteProblem("voice", { ...base, mediaUrl: blob(SITE, "me.png") }, SITE)).toBe(NOTE_RULES_COPY.wrongFile("voice"));
    expect(noteProblem("video", { ...base, mediaUrl: dev(SITE, "me.png") }, SITE)).toBe(NOTE_RULES_COPY.wrongFile("video"));
    expect(noteProblem("voice", { ...base, mediaUrl: blob(SITE, "memo.m4a") }, SITE)).toBeNull();
    expect(noteProblem("photobooth", { ...base, mediaUrl: blob(OTHER, "me.webp") }, SITE)).toBe(NOTE_RULES_COPY.notThisGift);
    expect(noteProblem("photobooth", { ...base, mediaUrl: "https://example.com/me.webp" }, SITE)).toBe(NOTE_RULES_COPY.notThisGift);
    expect(noteProblem("letters", { ...base, textContent: "hi", mediaUrl: blob(SITE, "me.webp") }, SITE)).toBe(NOTE_RULES_COPY.noFileHere);
    // Re-saving a note keeps the file it already had (older notes may live elsewhere).
    expect(noteProblem("photobooth", { ...base, mediaUrl: "https://old.example/me.jpg" }, SITE, "https://old.example/me.jpg")).toBeNull();
  });
});

test("the organiser sees every extra field of a newer note", () => {
  expect(sectionFields("quiz", { question: "Where did we meet?", answer: "Cebu", wrong: ["Manila", "Davao"] })).toEqual([
    { field: "question", value: "Where did we meet?" },
    { field: "answer", value: "Cebu" },
    { field: "wrong", value: "Manila, Davao" },
  ]);
  expect(sectionFields("superlatives", { award: "Best laugh" })).toEqual([{ field: "award", value: "Best laugh" }]);
  expect(sectionFields("coupons", { title: "Dinner", fine_print: "Fridays" })).toEqual([
    { field: "coupon", value: "Dinner" },
    { field: "fine_print", value: "Fridays" },
  ]);
  expect(sectionFields("openwhen", { when: "you miss home" })).toEqual([{ field: "when", value: "you miss home" }]);
  expect(sectionFields("map", { place: "Siargao" })).toEqual([{ field: "place", value: "Siargao" }]);
  expect(sectionFields("capsule", { unlock_at: "2027-10-19T00:00:00.000Z" })).toEqual([{ field: "unlock_at", value: "2027-10-19T00:00:00.000Z" }]);
  expect(sectionFields("letters", null)).toEqual([]);
  expect(sectionFields("video", {})).toEqual([]);
});

test("Share copies the clean gift link", () => {
  expect(giftShareUrl("ana-bday", "https://justbecause.site")).toBe("https://justbecause.site/g/ana-bday");
});
