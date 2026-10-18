/**
 * Guesses which currency a visitor thinks in, for guide prices only ("≈ €9").
 * We always charge in pesos; this never touches an amount we charge.
 *
 * Order of evidence: a Philippine time zone means "in the Philippines" (many
 * people there use an en-US browser, so the locale alone would say dollars);
 * otherwise the region of the browser language. Unknown means dollars.
 */
import { useEffect, useState } from "react";
import { perUsdDisplayRates } from "@/config/pricing";

const EURO = new Set(["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"]);

const REGION_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  NZ: "NZD",
  SG: "SGD",
  HK: "HKD",
  JP: "JPY",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
  KW: "KWD",
};

export type ViewerMoney = {
  /** In the Philippines: no guide price needed, pesos are their money. */
  local: boolean;
  /** Currency for the guide price, always one of `perUsdDisplayRates`. */
  currency: string;
};

export function currencyForRegion(region: string | null | undefined): string {
  const r = (region ?? "").toUpperCase();
  const code = EURO.has(r) ? "EUR" : (REGION_CURRENCY[r] ?? "USD");
  return perUsdDisplayRates[code] ? code : "USD";
}

/** Pure, for tests: the time zone and browser languages decide. */
export function detectViewerMoney(timeZone: string | undefined, languages: readonly string[]): ViewerMoney {
  if (timeZone === "Asia/Manila") return { local: true, currency: "PHP" };
  for (const lang of languages) {
    try {
      const region = new Intl.Locale(lang).maximize().region;
      if (region === "PH") return { local: true, currency: "PHP" };
      if (region) return { local: false, currency: currencyForRegion(region) };
    } catch {
      // A malformed language tag: try the next one.
    }
  }
  return { local: false, currency: "USD" };
}

/**
 * Null on the server and on the first browser render (so the HTML matches),
 * then the visitor's guess once the page has loaded.
 */
export function useViewerMoney(): ViewerMoney | null {
  const [money, setMoney] = useState<ViewerMoney | null>(null);
  useEffect(() => {
    let timeZone: string | undefined;
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      timeZone = undefined;
    }
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    setMoney(detectViewerMoney(timeZone, langs.filter(Boolean)));
  }, []);
  return money;
}
