import { describe, expect, test } from "bun:test";
import { OCCASION_IDS, occasionInSentence, occasionName } from "./occasions";

describe("occasion names inside a sentence", () => {
  test("names of days and festivals keep their capitals", () => {
    expect(occasionInSentence("eid")).toBe("Eid");
    expect(occasionInSentence("valentines")).toBe("Valentine's Day");
    expect(occasionInSentence("christmas")).toBe("Christmas");
    expect(occasionInSentence("lunar-new-year")).toBe("Lunar New Year");
  });
  test("ordinary words go lower case", () => {
    expect(occasionInSentence("birthday")).toBe("birthday");
    expect(occasionInSentence("bridal-shower")).toBe("bridal shower");
  });
  test("every occasion gives a name", () => {
    for (const id of OCCASION_IDS) expect(occasionInSentence(id).toLowerCase()).toBe(occasionName(id).toLowerCase());
  });
});
