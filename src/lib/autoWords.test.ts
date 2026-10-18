import { describe, expect, test } from "bun:test";
import { followAutoWords } from "@/lib/autoWords";

const site = (heading: string | undefined, title = heading ?? "Gift", extra: Record<string, string> = {}) => ({
  title,
  custom_text: { recipient_name: "Ana", ...(heading !== undefined ? { heading } : {}), ...extra },
});
const cake = { name: "Happy Birthday" };
const valentine = { name: "Valentine's" };

describe("automatic words follow the occasion", () => {
  test("the automatic heading and name change with the occasion", () => {
    const out = followAutoWords(site("Happy birthday, Ana"), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "anniversary" });
    expect(out.custom_text?.heading).toBe("Happy anniversary, Ana");
    expect(out.title).toBe("Happy anniversary, Ana");
    expect(out.custom_text?.recipient_name).toBe("Ana");
  });

  test("the greeting without a name changes too", () => {
    const out = followAutoWords(site("Happy birthday", "My gift"), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "anniversary" });
    expect(out.custom_text?.heading).toBe("Happy anniversary");
    expect(out.title).toBeUndefined();
  });

  test("words the organiser wrote stay", () => {
    expect(followAutoWords(site("Ana turns 30!"), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "anniversary" })).toEqual({});
    expect(followAutoWords(site("Happy birthday, Ana B"), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "anniversary" })).toEqual({});
    expect(followAutoWords(site(undefined, "Gift"), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "anniversary" })).toEqual({});
    // A typed section title stays; an automatic one we never saved has nothing to change.
    const typed = followAutoWords(site("Happy birthday, Ana", "x", { letters_title: "Our letters" }), { theme: cake, occasion: "birthday" }, { theme: cake, occasion: "christmas" });
    expect(typed.custom_text?.letters_title).toBe("Our letters");
  });

  test("clearing the occasion falls back to the style's words", () => {
    const out = followAutoWords(site("Happy anniversary, Ana"), { theme: valentine, occasion: "anniversary" }, { theme: valentine, occasion: null });
    expect(out.custom_text?.heading).not.toBe("Happy anniversary, Ana");
    expect(out.custom_text?.heading).toContain("Ana");
  });

  test("a new style on a gift without an occasion brings its own heading", () => {
    const out = followAutoWords(site("Happy birthday, Ana"), { theme: cake, occasion: null }, { theme: valentine, occasion: null });
    expect(out.custom_text?.heading).toBeDefined();
    expect(out.custom_text?.heading).not.toBe("Happy birthday, Ana");
    // With an occasion, the style doesn't change the words.
    expect(followAutoWords(site("Happy birthday, Ana"), { theme: cake, occasion: "birthday" }, { theme: valentine, occasion: "birthday" })).toEqual({});
  });
});
