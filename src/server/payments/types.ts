/**
 * The small surface every payment provider implements. PayMongo is the only
 * one today; PayPal (or anything else) would be a sibling module with the
 * same two functions, picked in ./index.ts.
 */

export type CheckoutOrder = {
  orderId: string;
  siteId: string;
  /** Centavos. Always computed on our server from src/config/pricing.ts. */
  amount: number;
  currency: "PHP";
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
  /** Total actually paid, in centavos. */
  amountPaid: number;
};

export type WebhookOutcome =
  | { kind: "paid"; event: PaidEvent }
  /** Verified, but an event type we don't act on. */
  | { kind: "ignored"; eventId: string; eventType: string }
  | { kind: "rejected"; reason: string };

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
}
