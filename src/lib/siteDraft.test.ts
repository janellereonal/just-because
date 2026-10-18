import { describe, expect, test } from "bun:test";
import { normalizeSite } from "./gift";
import { applyFlat, canonicalFields, changedKeys, checkSave, findConflicts, flatten, rebase, same, toPatch, withoutKeys } from "./siteDraft";

/** A stored gift row as the server sends it (snake_case). */
const row = {
  id: "11111111-1111-4111-8111-111111111111",
  creator_id: "u1",
  title: "Happy birthday, Kai",
  theme_id: "t-cake",
  slug: "abc",
  status: "draft",
  format: "scrapbook",
  style: "cake",
  occasion: "birthday",
  format_settings: {},
  custom_text: { heading: "Happy birthday, Kai", recipient_name: "Kai" },
  custom_colors: { background: "#ffffff", primary: "#111111", accent: "#ff0000" },
  palette_id: "p1",
  share_notes: false,
  font_choice: "theme",
  countdown_date: null,
  countdown_at: "2026-12-01T10:00:00.000Z",
  calendar_locked: false,
  intro_text: null,
  intro_settings: { stickers: [{ id: "s1", emoji: "🎈", x: 0.2, y: 0.3, r: 0, s: 1 }], button_text: "Open" },
  solo: false,
  character: null,
  icon_set: null,
  background_style: "paper",
  tree_reveal_date: null,
  tier: null,
  published_at: null,
  expires_at: null,
  created_at: "2026-10-18T00:00:00.000Z",
  updated_at: "2026-10-18T00:00:00.000Z",
};

describe("same", () => {
  test("blank values are all the same", () => {
    expect(same(undefined, null)).toBe(true);
    expect(same("", null)).toBe(true);
    expect(same("", "x")).toBe(false);
    expect(same(false, null)).toBe(false);
  });
  test("objects compare by content, not key order", () => {
    expect(same({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(same({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe("flatten", () => {
  test("JSON fields are split by key", () => {
    const flat = flatten(row);
    expect(flat["custom_text.heading"]).toBe("Happy birthday, Kai");
    expect(flat["custom_colors.accent"]).toBe("#ff0000");
    expect(flat["style"]).toBe("cake");
    expect(flat["status"]).toBeUndefined();
    expect(flat["tier"]).toBeUndefined();
  });
  test("the editor's copy and the server's check read a stored gift the same way", () => {
    const editor = flatten(normalizeSite(row) as unknown as Record<string, unknown>);
    const server = flatten(canonicalFields(row));
    expect(changedKeys(editor, server)).toEqual([]);
  });
});

describe("toPatch", () => {
  test("rebuilds nested fields and sends blanks as null", () => {
    const flat = { title: "Hi", "custom_text.heading": "Hi", "custom_text.footer_note": "", palette_id: undefined };
    expect(toPatch(["title", "custom_text.heading", "custom_text.footer_note", "palette_id"], flat)).toEqual({
      title: "Hi",
      custom_text: { heading: "Hi", footer_note: null },
      palette_id: null,
    });
  });
});

describe("findConflicts", () => {
  const current = flatten(row);
  test("a field nobody else touched saves", () => {
    const patch = flatten({ custom_text: { heading: "Happy birthday, Kai!" } });
    const base = flatten({ custom_text: { heading: "Happy birthday, Kai" } });
    expect(findConflicts(current, base, patch)).toEqual([]);
  });
  test("a stale tab can't put back a style that was changed elsewhere", () => {
    // Tab B still thinks the gift is Love Letter; tab A already moved it to Cake.
    expect(findConflicts(current, { style: "love-letter" }, { style: "comic" })).toEqual(["style"]);
  });
  test("a retry of a save that already went through isn't a clash", () => {
    expect(findConflicts(current, { style: "love-letter" }, { style: "cake" })).toEqual([]);
  });
  test("different words in two tabs both save", () => {
    const patch = { "custom_text.footer_note": "With love" };
    const base = { "custom_text.footer_note": null };
    expect(findConflicts(current, base, patch)).toEqual([]);
  });
  test("a value still on its way from this tab counts as seen", () => {
    const cur = { ...current, "custom_text.heading": "ab" };
    expect(findConflicts(cur, { "custom_text.heading": "a" }, { "custom_text.heading": "abc" })).toEqual(["custom_text.heading"]);
    expect(findConflicts(cur, { "custom_text.heading": "a" }, { "custom_text.heading": "abc" }, { alt: { "custom_text.heading": "ab" } })).toEqual([]);
  });
  test("fields without a base and skipped fields aren't checked", () => {
    expect(findConflicts(current, {}, { style: "comic" })).toEqual([]);
    expect(findConflicts(current, { format: "zine" }, { format: "storybook" }, { skip: ["format"] })).toEqual([]);
  });
});

describe("checkSave (soft keys)", () => {
  // Tab B added "!" to the heading; tab A, which hasn't seen it, changes the occasion and its heading follows.
  const current = { ...flatten(row), "custom_text.heading": "Happy birthday, Kai!" };
  const base = { occasion: "birthday", "custom_text.heading": "Happy birthday, Kai" };
  const patch = { occasion: "thank-you", "custom_text.heading": "Thank you, Kai" };
  test("a soft key changed elsewhere is skipped and the rest saves", () => {
    expect(checkSave(current, base, patch, { soft: ["custom_text.heading"] })).toEqual({ clashes: [], skipped: ["custom_text.heading"] });
  });
  test("a soft key nobody else touched saves", () => {
    expect(checkSave(flatten(row), base, patch, { soft: ["custom_text.heading"] })).toEqual({ clashes: [], skipped: [] });
  });
  test("the same change typed (not soft) is still refused", () => {
    expect(checkSave(current, base, patch)).toEqual({ clashes: ["custom_text.heading"], skipped: [] });
    expect(findConflicts(current, base, patch)).toEqual(["custom_text.heading"]);
  });
  test("a soft key doesn't excuse a hard clash elsewhere in the save", () => {
    const cur = { ...current, occasion: "anniversary" };
    expect(checkSave(cur, base, patch, { soft: ["custom_text.heading"] })).toEqual({ clashes: ["occasion"], skipped: ["custom_text.heading"] });
  });
  test("skipped keys are taken out of the patch", () => {
    const out = withoutKeys({ occasion: "thank-you", title: "Thank you", custom_text: { heading: "Thank you, Kai", footer_note: "x" } }, ["custom_text.heading", "title"]);
    expect(out).toEqual({ occasion: "thank-you", custom_text: { footer_note: "x" } });
  });
});

describe("rebase", () => {
  const base = flatten(row);
  test("brings in a change made elsewhere when nothing here is unsaved", () => {
    const server = { ...base, style: "love-letter", format: "storybook" };
    const r = rebase({ draft: base, sent: base, known: base, server });
    expect(r.draft["style"]).toBe("love-letter");
    expect(r.pulled).toEqual(["format", "style"]);
    expect(r.clashes).toEqual([]);
  });
  test("keeps unsaved typing and the other tab's change to a different field", () => {
    const draft = { ...base, "custom_text.heading": "Happy birthday, Kai!" };
    const server = { ...base, style: "love-letter" };
    const r = rebase({ draft, sent: base, known: base, server });
    expect(r.draft["custom_text.heading"]).toBe("Happy birthday, Kai!");
    expect(r.draft["style"]).toBe("love-letter");
    expect(r.clashes).toEqual([]);
  });
  test("an unsaved change to a field changed elsewhere is a clash and keeps the old base", () => {
    const draft = { ...base, style: "comic" };
    const server = { ...base, style: "love-letter" };
    const r = rebase({ draft, sent: base, known: base, server });
    expect(r.clashes).toEqual(["style"]);
    expect(r.draft["style"]).toBe("comic");
    expect(r.known["style"]).toBe("cake");
  });
  test("a field this tab just saved keeps what's typed (the server trims)", () => {
    const draft = { ...base, "custom_text.heading": "Hello " };
    const sent = { ...draft };
    const server = { ...base, "custom_text.heading": "Hello" };
    const r = rebase({ draft, sent, known: base, server, saved: new Set(["custom_text.heading"]) });
    expect(r.draft["custom_text.heading"]).toBe("Hello ");
    expect(r.known["custom_text.heading"]).toBe("Hello");
    expect(r.pulled).toEqual([]);
  });
  test("a soft key the server skipped is pulled in, not left unsaved", () => {
    // Sent "Thank you, Kai" as soft; the server kept the other tab's heading. Not in `saved`.
    const draft = { ...base, occasion: "thank-you", "custom_text.heading": "Thank you, Kai" };
    const server = { ...base, occasion: "thank-you", "custom_text.heading": "Happy birthday, Kai!" };
    const r = rebase({ draft, sent: draft, known: base, server, saved: new Set(["occasion"]) });
    expect(r.draft["custom_text.heading"]).toBe("Happy birthday, Kai!");
    expect(r.sent["custom_text.heading"]).toBe("Happy birthday, Kai!");
    expect(r.known["custom_text.heading"]).toBe("Happy birthday, Kai!");
    expect(r.clashes).toEqual([]);
    expect(changedKeys(r.draft, r.sent)).toEqual([]);
  });
  test("a key removed elsewhere goes away here too", () => {
    const server = { ...base };
    delete server["intro_settings.button_text"];
    const r = rebase({ draft: base, sent: base, known: base, server });
    expect("intro_settings.button_text" in r.draft).toBe(false);
  });
});

describe("applyFlat", () => {
  test("puts flat fields back on a gift", () => {
    const site = normalizeSite(row);
    const flat = { ...flatten(site as unknown as Record<string, unknown>), "custom_text.footer_note": "Love", style: "comic" };
    const out = applyFlat(site as unknown as Record<string, unknown>, flat) as unknown as typeof site;
    expect(out.custom_text).toEqual({ heading: "Happy birthday, Kai", recipient_name: "Kai", footer_note: "Love" });
    expect(out.style).toBe("comic");
    expect(out.slug).toBe("abc");
    expect(out.intro_settings.stickers?.length).toBe(1);
  });
});
