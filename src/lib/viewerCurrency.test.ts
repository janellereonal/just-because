/** Run: bun test src/lib/viewerCurrency.test.ts */
import { describe, expect, test } from "bun:test";
import { formatApprox } from "@/config/pricing";
import { currencyForRegion, detectViewerMoney } from "./viewerCurrency";

describe("detectViewerMoney", () => {
  test("a Manila time zone is local, even with a US browser", () => {
    expect(detectViewerMoney("Asia/Manila", ["en-US"])).toEqual({ local: true, currency: "PHP" });
  });
  test("a Filipino language tag is local", () => {
    expect(detectViewerMoney("Asia/Dubai", ["fil-PH"]).local).toBe(true);
  });
  test("abroad, the browser region picks the currency", () => {
    expect(detectViewerMoney("Europe/London", ["en-GB"])).toEqual({ local: false, currency: "GBP" });
    expect(detectViewerMoney("Europe/Berlin", ["de-DE"]).currency).toBe("EUR");
    expect(detectViewerMoney("Asia/Dubai", ["ar-AE"]).currency).toBe("AED");
  });
  test("a bare language is expanded to its likely region", () => {
    expect(detectViewerMoney("Asia/Tokyo", ["ja"]).currency).toBe("JPY");
  });
  test("unknown regions and junk fall back to dollars", () => {
    expect(detectViewerMoney("America/Sao_Paulo", ["pt-BR"]).currency).toBe("USD");
    expect(detectViewerMoney(undefined, ["not a tag!!"])).toEqual({ local: false, currency: "USD" });
    expect(currencyForRegion(null)).toBe("USD");
  });
});

describe("formatApprox", () => {
  test("shows a rough guide in the asked currency, dollars if we don't have a rate", () => {
    expect(formatApprox(59900, "USD")).toMatch(/≈ .*10/);
    expect(formatApprox(59900, "XYZ")).toBe(formatApprox(59900, "USD"));
  });
});
