/**
 * The small surface every payment provider implements. PayMongo is the only
 * one today; PayPal (or anything else) would be a sibling module with the
 * same two functions, picked in ./index.ts.
 */

/**
 * Currencies an order can be charged in. Only PHP is live: PayMongo's hosted
 * checkout takes pesos only, and USD needs PayMongo to switch it on for our
 * account plus a card page of our own (docs/payments-international.md).
 */
export type ChargeCurrency = "PHP" | "USD";

/** How the buyer paid, as far as the provider tells us. Used for metrics only. */
export type PayMethod = "card" | "gcash" | "paymaya" | "qrph" | "other";

/** Whether a card was issued in the Philippines. Unknown when the provider doesn't say. */
export type CardOrigin = "local" | "foreign" | "unknown";

export type CheckoutOrder = {
  orderId: string;
  siteId: string;
  /** Smallest unit of `currency` (centavos for PHP, cents for USD). Always computed on our server from src/config/pricing.ts. */
  amount: number;
  currency: ChargeCurrency;
  itemName: string;
  itemDescription: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
};

export type CheckoutResult = {
  /** The provider's id for this checkout, stored on the order. */
  checkoutId: string;
  /** Where to send the browser. */
  checkoutUrl: string;
};

/** A verified, provider-neutral "this checkout was paid" signal. */
export type PaidEvent = {
  eventId: string;
  eventType: string;
  checkoutId: string;
  /** Our order id, as we sent it in the checkout's reference/metadata. */
  orderId: string | null;
  paymentId: string | null;
  /** Total actually paid, in the smallest unit of `currency`. */
  amountPaid: number;
  /** Currency of the payment as the provider reports it. Missing means the provider didn't say. */
  currency?: string | null;
  /** For metrics: what paid, and for cards whether they were foreign. Never used to decide anything. */
  method?: PayMethod | null;
  cardOrigin?: CardOrigin | null;
};

export type WebhookOutcome =
  | { kind: "paid"; event: PaidEvent }
  /** Verified, but an event type we don't act on. */
  | { kind: "ignored"; eventId: string; eventType: string }
  /**
   * Unsigned (or signed with a secret we don't have): treat it only as a hint to
   * ask the provider about this checkout. Safe, because the answer comes from
   * the provider's API with our secret key, not from the request.
   */
  | { kind: "check"; checkoutId: string; reason: string }
  /** `malformed`: not even a JSON object, answered with 400. */
  | { kind: "rejected"; reason: string; malformed?: boolean };

/**
 * What happened when we tried to close a checkout:
 *  - closed: it can't take a payment any more (we closed it, or it already was)
 *  - paid: it was paid, so it can't be closed (apply that payment)
 *  - open: we couldn't close it and it isn't paid, so a payment may still come in
 */
export type ExpireResult = "closed" | "paid" | "open";

export interface PaymentProvider {
  readonly name: string;
  createCheckout(order: CheckoutOrder): Promise<CheckoutResult>;
  /** Verifies the signature against the raw body and turns the payload into a PaidEvent. */
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome>;
  /**
   * Asks the provider directly whether a checkout has been paid. Used as a
   * backup while the buyer waits on the confirm page, in case the webhook is
   * slow or missing. Returns null when nothing has been paid yet.
   */
  checkPaid(checkoutId: string): Promise<PaidEvent | null>;
  /** The checkout page again, if it can still take a payment (not paid, not expired). Null otherwise. */
  reopenCheckout(checkoutId: string): Promise<string | null>;
  /**
   * Stops a checkout from taking a payment, so a gift can only be paid for in one place at a
   * time. Never throws.
   */
  expireCheckout(checkoutId: string): Promise<ExpireResult>;
}
