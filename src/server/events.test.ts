import { describe, expect, test } from "bun:test";
import { cleanProps } from "./events";

describe("event labels", () => {
  test("keeps only known labels and values", () => {
    expect(cleanProps("invite_shared", { channel: "whatsapp", text: "hello" })).toEqual({ channel: "whatsapp" });
    expect(cleanProps("invite_shared", { channel: "carrier pigeon" })).toEqual({});
    expect(cleanProps("make_your_own_clicked", { source: "gift_footer" })).toEqual({ source: "gift_footer" });
  });
  test("free-form labels are short and safe, never note text", () => {
    expect(cleanProps("note_added", { type: "letters", by_owner: true, text_content: "a secret" })).toEqual({ type: "letters", by_owner: true });
    expect(cleanProps("note_added", { type: "<script>".repeat(10) })["type"]!.toString().length).toBeLessThanOrEqual(40);
    expect(cleanProps("gift_opened", { anything: "x" })).toEqual({});
  });
});
