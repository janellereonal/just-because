/**
 * Pricing: the single source of truth.
 *
 * Every price, limit and label shown in the app, and every amount charged,
 * comes from this file. The server reads the tier by id and computes the
 * amount itself, so nothing here can be changed from the browser.
 *
 * Amounts are in centavos (PayMongo's unit): ₱599 = 59900.
 */

export type TierId = "sweet" | "celebration" | "keepsake";
export type GiftFormatId = import("@/lib/formats").GiftFormat;

/**
 * Feature switches per tier. To add a new paid feature later (for example
 * password protection), add a flag here, set it per tier, add a line to
 * `featureList()` below, and check the flag where the feature lives.
 */
export type TierFeatures = {
  customLinkName: boolean;
  /** The recipient's link asks for a password the owner sets. */
  passwordProtection: boolean;
};

export type Tier = {
  id: TierId;
  name: string;
  /** Price in centavos. */
  amount: number;
  /** Who it's for, shown on the card. */
  audience: string;
  mostPopular?: boolean;
  /** Max different people who can add to the gift. `unlimited` shows as "Unlimited" but a fair-use cap still applies. */
  contributors: { cap: number; unlimited: boolean };
  /** Max photos on the gift. Same idea as contributors. */
  photos: { cap: number; unlimited: boolean };
  formats: GiftFormatId[];
  /** How long the gift stays open after it's published. */
  liveFor: { months: number; label: string };
  /** Price in centavos to keep the gift open for another `liveFor` (same plan, same caps). */
  extendAmount: number;
  features: TierFeatures;
};

export const CURRENCY = "PHP" as const;

export const TIERS: Tier[] = [
  {
    id: "sweet",
    name: "Sweet",
    amount: 29900,
    audience: "Small group birthdays",
    contributors: { cap: 10, unlimited: false },
    photos: { cap: 30, unlimited: false },
    formats: ["scrapbook", "bento"],
    liveFor: { months: 3, label: "3 months" },
    extendAmount: 14900,
    features: { customLinkName: false, passwordProtection: false },
  },
  {
    id: "celebration",
    name: "Celebration",
    amount: 59900,
    audience: "Birthdays, showers and anniversaries",
    mostPopular: true,
    contributors: { cap: 30, unlimited: false },
    photos: { cap: 150, unlimited: false },
    formats: ["scrapbook", "comic", "bento", "hunt", "zine", "storybook", "mixtape", "scratch", "stars", "handwritten"],
    liveFor: { months: 12, label: "1 year" },
    extendAmount: 29900,
    features: { customLinkName: false, passwordProtection: true },
  },
  {
    id: "keepsake",
    name: "Keepsake",
    amount: 99900,
    audience: "Milestones like debuts and weddings",
    // "Unlimited" on the card, with a fair-use cap so one gift can't run away with storage.
    contributors: { cap: 500, unlimited: true },
    photos: { cap: 1000, unlimited: true },
    formats: ["scrapbook", "comic", "bento", "hunt", "zine", "storybook", "mixtape", "scratch", "stars", "handwritten"],
    liveFor: { months: 36, label: "3 years" },
    extendAmount: 49900,
    features: { customLinkName: true, passwordProtection: true },
  },
];

/**
 * PayMongo payment method types offered at checkout. Edit this list to match
 * what's switched on for our PayMongo account (Dashboard → Settings → Payment
 * methods). Allowed values include: gcash, paymaya, card, qrph, grab_pay,
 * shopee_pay, billease, dob, dob_ubp, brankas_bdo, brankas_landbank,
 * brankas_metrobank.
 */
export const enabledPaymentMethods: string[] = ["gcash", "paymaya", "card", "qrph"];

/** Friendly names for the "Pay with ..." line. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  gcash: "GCash",
  paymaya: "Maya",
  card: "cards",
  qrph: "QR Ph",
  grab_pay: "GrabPay",
  shopee_pay: "ShopeePay",
  billease: "BillEase",
  dob: "online banking",
  dob_ubp: "UnionBank",
  brankas_bdo: "BDO",
  brankas_landbank: "Landbank",
  brankas_metrobank: "Metrobank",
};

/**
 * Approximate PHP → USD rate, for display only ("≈ $10"). Update it by hand
 * now and then. We never call a live FX API, and we always charge in PHP.
 */
export const usdDisplayRate = 0.017;

/**
 * Early-bird promo, applied automatically on the server to the first
 * `maxUses` paid publishes. Off by default. Doesn't apply to upgrades.
 */
export const promo = {
  enabled: false,
  /** Discount in centavos (e.g. 10000 = ₱100 off). */
  amountOff: 10000,
  maxUses: 50,
  label: "Early-bird discount",
};

/** A gift published before paid plans existed. Stays open with no expiry and no caps. */
export const LEGACY_TIER = "legacy" as const;
export type SiteTier = TierId | typeof LEGACY_TIER;

/* ---------------- helpers ---------------- */

/** Does a gift on this tier get this feature? Legacy gifts get every feature. */
export function hasFeature(tierId: string | null | undefined, feature: keyof TierFeatures): boolean {
  if (tierId === LEGACY_TIER) return true;
  return !!TIERS.find((t) => t.id === tierId)?.features[feature];
}

export function getTier(id: string | null | undefined): Tier | null {
  return TIERS.find((t) => t.id === id) ?? null;
}

/** The plan a format first appears in, when that isn't the first plan ("Celebration" for Storybook). */
export function formatPlanTag(format: GiftFormatId): string | null {
  const first = TIERS.findIndex((t) => t.formats.includes(format));
  return first > 0 ? TIERS[first]!.name : null;
}

export function tierRank(id: string | null | undefined): number {
  if (id === LEGACY_TIER) return Number.POSITIVE_INFINITY;
  return TIERS.findIndex((t) => t.id === id);
}

export function formatPeso(centavos: number): string {
  const pesos = centavos / 100;
  // Charged in pesos; written the way the viewer's locale writes money.
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "PHP", currencyDisplay: "narrowSymbol", maximumFractionDigits: pesos % 1 === 0 ? 0 : 2 }).format(pesos);
}

export function formatUsdApprox(centavos: number): string {
  const usd = Math.round((centavos / 100) * usdDisplayRate);
  return `≈ ${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(usd)}`;
}

/** "GCash, Maya, cards, or QR Ph" */
export function paymentMethodsSentence(): string {
  const names = enabledPaymentMethods.map((m) => PAYMENT_METHOD_LABELS[m] ?? m);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

/** The feature lines on a tier card, generated from the tier's settings. */
export function featureList(tier: Tier): string[] {
  const lines = [
    tier.contributors.unlimited ? "Unlimited contributors" : `Up to ${tier.contributors.cap} contributors`,
    tier.photos.unlimited ? "Unlimited photos" : `Up to ${tier.photos.cap} photos`,
    tier.formats.length >= 5 ? `All ${tier.formats.length} formats, including Storybook and Mixtape` : "Scrapbook and Bento formats",
  ];
  if (tier.features.passwordProtection) lines.push("Password protection");
  if (tier.features.customLinkName) lines.push("Custom link name");
  lines.push(`Live for ${tier.liveFor.label}`);
  return lines;
}

/** Calendar months later, keeping the day but never spilling into the next month (30 Nov + 3 = 28 Feb). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** When a gift on this tier stops being open, counted from when it was published. */
export function expiryFrom(publishedAt: Date, tier: Tier): Date {
  return addMonths(publishedAt, tier.liveFor.months);
}

/**
 * New end date after paying to extend: another `liveFor` on top of the current
 * end date, or on top of today if the gift has already ended.
 */
export function extendedExpiry(expiresAt: Date | null, tier: Tier, now = new Date()): Date {
  const base = expiresAt && expiresAt.getTime() > now.getTime() ? expiresAt : now;
  return addMonths(base, tier.liveFor.months);
}
