/**
 * PayMongo hosted checkout (Checkout Sessions API).
 * Docs: https://developers.paymongo.com/docs/checkout-implementation
 *
 *  - createCheckout: POST /v1/checkout_sessions with Basic auth (secret key).
 *  - expireCheckout: POST /v1/checkout_sessions/{id}/expire, so an older checkout for the
 *    same gift can't be paid as well (PayMongo answers 400 if it's paid or already expired).
 *  - handleWebhook: verifies `Paymongo-Signature` (t=…,te=…,li=…) as
 *    HMAC-SHA256(webhook secret, `${t}.${rawBody}`), compared to `te` in test
 *    mode or `li` in live mode. For `checkout_session.payment.paid` it then
 *    re-fetches the session from PayMongo, so the amount we trust comes from
 *    PayMongo's API rather than from the webhook body alone.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { enabledPaymentMethods, statementDescriptor } from "@/config/pricing";
import type { CardOrigin, CheckoutOrder, CheckoutResult, ExpireResult, PaidEvent, PayMethod, PaymentProvider, WebhookOutcome } from "./types";

const PAID_EVENT = "checkout_session.payment.paid";
/** How old a webhook signature may be, in seconds. */
export const SIGNATURE_TOLERANCE_S = 600;

function apiBase() {
  // Override only for local testing against a fake server.
  return (process.env["PAYMONGO_API_URL"] ?? "https://api.paymongo.com").replace(/\/$/, "");
}

function secretKey() {
  const key = process.env["PAYMONGO_SECRET_KEY"];
  if (!key) throw new Error("PAYMONGO_SECRET_KEY isn't set.");
  if (key.startsWith("sk_live_") && process.env["PAYMONGO_ALLOW_LIVE"] !== "true") {
    // Guard rail: we're in test mode until going live is a deliberate decision.
    throw new Error("Live PayMongo keys are blocked. Set PAYMONGO_ALLOW_LIVE=true when it's time to go live.");
  }
  return key;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    // A hung request shouldn't hold up a checkout (or a database transaction around it).
    signal: AbortSignal.timeout(20_000),
    ...init,
    headers: {
      Authorization: `Basic ${Buffer.from(`${secretKey()}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayMongo ${init.method ?? "GET"} ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as T;
}

type CheckoutSession = {
  data: {
    id: string;
    attributes: {
      checkout_url: string;
      /** "active" or "expired". Read defensively: missing means we don't know. */
      status?: string | null;
      livemode: boolean;
      reference_number?: string | null;
      metadata?: Record<string, string> | null;
      payments?: PaymentRow[];
    };
  };
};

/**
 * A payment inside a checkout session. PayMongo's docs only promise id, amount,
 * status, currency and billing; real card payments also carry the card's brand
 * and country on `source`. Everything past amount and status is read defensively.
 */
type PaymentRow = {
  id: string;
  attributes: {
    amount: number;
    status: string;
    currency?: string | null;
    foreign_fee?: number | null;
    source?: { id?: string | null; type?: string | null; brand?: string | null; country?: string | null } | null;
    billing?: { address?: { country?: string | null } | null } | null;
  };
};

const WALLETS: Record<string, PayMethod> = { gcash: "gcash", paymaya: "paymaya", qrph: "qrph" };

/** What paid, and for cards whether the card came from outside the Philippines. Metrics only. */
export function describePayment(p: PaymentRow["attributes"]): { method: PayMethod; cardOrigin: CardOrigin | null } {
  const type = (p.source?.type ?? "").toLowerCase();
  if (WALLETS[type]) return { method: WALLETS[type]!, cardOrigin: null };
  const isCard = type === "card" || !!p.source?.brand || (p.source?.id ?? "").startsWith("card_");
  if (!isCard) return { method: "other", cardOrigin: null };
  // The card's own country is the real answer; a foreign-card fee or the billing country are fallbacks.
  const cardCountry = (p.source?.country ?? "").toUpperCase();
  if (cardCountry) return { method: "card", cardOrigin: cardCountry === "PH" ? "local" : "foreign" };
  if ((p.foreign_fee ?? 0) > 0) return { method: "card", cardOrigin: "foreign" };
  const billing = (p.billing?.address?.country ?? "").toUpperCase();
  if (billing) return { method: "card", cardOrigin: billing === "PH" ? "local" : "foreign" };
  return { method: "card", cardOrigin: "unknown" };
}

async function createCheckout(order: CheckoutOrder): Promise<CheckoutResult> {
  // Hosted checkout is pesos only. Dollars need the Payment Intents flow (docs/payments-international.md).
  if (order.currency !== "PHP") throw new Error(`PayMongo hosted checkout only takes PHP, not ${order.currency}.`);
  const body = {
    data: {
      attributes: {
        line_items: [
          {
            name: order.itemName,
            description: order.itemDescription.slice(0, 255),
            amount: order.amount,
            currency: order.currency,
            quantity: 1,
          },
        ],
        payment_method_types: enabledPaymentMethods,
        success_url: order.successUrl,
        cancel_url: order.cancelUrl,
        reference_number: order.orderId,
        description: order.itemDescription,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        metadata: { order_id: order.orderId, site_id: order.siteId },
        ...(statementDescriptor ? { statement_descriptor: statementDescriptor } : {}),
        ...(order.customerEmail
          ? { billing: { email: order.customerEmail, ...(order.customerName ? { name: order.customerName } : {}) } }
          : {}),
      },
    },
  };
  const session = await call<CheckoutSession>("/v1/checkout_sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { checkoutId: session.data.id, checkoutUrl: session.data.attributes.checkout_url };
}

function parseSignature(header: string | null) {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;
  if (!parts["t"]) return null;
  return { t: parts["t"], te: parts["te"] ?? "", li: parts["li"] ?? "" };
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length > 0 && ab.length === bb.length && timingSafeEqual(ab, bb);
}

type EventPayload = {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      livemode?: boolean;
      data?: { id?: string; attributes?: { reference_number?: string; metadata?: Record<string, string> } };
    };
  };
};

async function handleWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
  let payload: EventPayload;
  try {
    payload = JSON.parse(rawBody) as EventPayload;
  } catch {
    return { kind: "rejected", reason: "body isn't JSON", malformed: true };
  }
  // `null`, a number or a list parse fine but aren't an event.
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { kind: "rejected", reason: "body isn't a JSON object", malformed: true };
  }
  const eventId = payload.data?.id ?? "";
  const eventType = payload.data?.attributes?.type ?? "";
  if (eventType !== PAID_EVENT) return { kind: "ignored", eventId, eventType };
  const checkoutId = payload.data?.attributes?.data?.id;
  if (!checkoutId || !/^cs_[A-Za-z0-9]+$/.test(checkoutId)) {
    return { kind: "rejected", reason: "paid event has no valid checkout session id" };
  }

  // A valid signature lets us use PayMongo's event id. Without one, we still
  // never trust the body: we only ask PayMongo about this checkout.
  const secret = process.env["PAYMONGO_WEBHOOK_SECRET"];
  const sig = parseSignature(headers.get("paymongo-signature"));
  const live = payload.data?.attributes?.livemode === true;
  const signed =
    !!secret &&
    !!sig &&
    safeEqualHex(createHmac("sha256", secret).update(`${sig.t}.${rawBody}`).digest("hex"), live ? sig.li : sig.te);
  // A signature older than this could be a replay; treat it as a hint instead (we re-fetch either way).
  const fresh = !!sig && Math.abs(Date.now() / 1000 - Number(sig.t)) <= SIGNATURE_TOLERANCE_S;
  if (!signed || !eventId || !fresh) {
    return {
      kind: "check",
      checkoutId,
      reason: !secret
        ? "no webhook secret set"
        : !sig
          ? "no signature"
          : !signed
            ? "signature didn't match our secret"
            : !fresh
              ? "signature too old"
              : "no event id",
    };
  }

  const event = await checkPaid(checkoutId, { eventId, eventType });
  // A paid event whose session shows nothing paid: let applyPaidEvent log it as underpaid.
  return { kind: "paid", event: event ?? { eventId, eventType, checkoutId, orderId: null, paymentId: null, amountPaid: 0 } };
}

/** Asks PayMongo what was paid on this checkout session. Null if nothing yet. */
async function checkPaid(
  checkoutId: string,
  source: { eventId: string; eventType: string } = { eventId: `check:${checkoutId}`, eventType: "checkout_session.check" },
): Promise<PaidEvent | null> {
  const session = await call<CheckoutSession>(`/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`);
  const paid = (session.data.attributes.payments ?? []).filter((p) => p.attributes.status === "paid");
  if (paid.length === 0) return null;
  const attrs = session.data.attributes;
  const first = paid[0]!.attributes;
  const currencies = new Set(paid.map((p) => (p.attributes.currency ?? "PHP").toUpperCase()));
  return {
    eventId: source.eventId,
    eventType: source.eventType,
    checkoutId,
    orderId: attrs.metadata?.["order_id"] ?? attrs.reference_number ?? null,
    paymentId: paid[0]?.id ?? null,
    amountPaid: paid.reduce((sum, p) => sum + p.attributes.amount, 0),
    // Mixed currencies on one checkout should never happen; "MIXED" makes applyPaidEvent refuse it.
    currency: currencies.size === 1 ? [...currencies][0]! : "MIXED",
    ...describePayment(first),
  };
}

function hasPaid(session: CheckoutSession) {
  return (session.data.attributes.payments ?? []).some((p) => p.attributes.status === "paid");
}

async function reopenCheckout(checkoutId: string): Promise<string | null> {
  try {
    const session = await call<CheckoutSession>(`/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`);
    const a = session.data.attributes;
    if (hasPaid(session) || a.status === "expired" || !a.checkout_url) return null;
    return a.checkout_url;
  } catch (error) {
    console.warn("[payments] couldn't look up checkout", checkoutId, error);
    return null;
  }
}

async function expireCheckout(checkoutId: string): Promise<ExpireResult> {
  try {
    await call<CheckoutSession>(`/v1/checkout_sessions/${encodeURIComponent(checkoutId)}/expire`, { method: "POST" });
    return "closed";
  } catch (error) {
    // 400 means paid, already expired, or a payment under way. Ask which.
    try {
      const session = await call<CheckoutSession>(`/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`);
      if (hasPaid(session)) return "paid";
      if (session.data.attributes.status === "expired") return "closed";
    } catch {
      // fall through
    }
    console.warn("[payments] couldn't expire checkout", checkoutId, error);
    return "open";
  }
}

/* ---------------- webhook setup (admin) ---------------- */

export type WebhookInfo = { id: string; url: string; events: string[]; status: string; livemode: boolean };

type WebhookResource = {
  id: string;
  attributes: { url: string; events: string[]; status: string; livemode: boolean; secret_key?: string };
};

/** Never return or log `secret_key`. */
function toInfo(w: WebhookResource): WebhookInfo {
  return { id: w.id, url: w.attributes.url, events: w.attributes.events, status: w.attributes.status, livemode: w.attributes.livemode };
}

/** Webhooks registered for whichever mode our secret key is in (test key → test webhooks). */
export async function listWebhooks(): Promise<WebhookInfo[]> {
  const res = await call<{ data: WebhookResource[] }>("/v1/webhooks");
  return res.data.map(toInfo);
}

/**
 * Makes sure PayMongo will call `url` for paid checkouts, in the same mode as our
 * key. Creates, re-enables or updates the webhook as needed. The secret PayMongo
 * returns on create is thrown away: unsigned or unmatched calls are handled as
 * "check this checkout" hints (see handleWebhook), so no secret has to be copied.
 */
export async function ensureWebhook(url: string): Promise<{ action: string; webhook: WebhookInfo }> {
  const existing = (await listWebhooks()).find((w) => w.url === url);
  if (!existing) {
    const created = await call<{ data: WebhookResource }>("/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({ data: { attributes: { url, events: [PAID_EVENT] } } }),
    });
    return { action: "created", webhook: toInfo(created.data) };
  }
  let webhook = existing;
  let action = "already set up";
  if (!webhook.events.includes(PAID_EVENT)) {
    const updated = await call<{ data: WebhookResource }>(`/v1/webhooks/${webhook.id}`, {
      method: "PUT",
      body: JSON.stringify({ data: { attributes: { url, events: [...webhook.events, PAID_EVENT] } } }),
    });
    webhook = toInfo(updated.data);
    action = "added the paid event";
  }
  if (webhook.status !== "enabled") {
    const enabled = await call<{ data: WebhookResource }>(`/v1/webhooks/${webhook.id}/enable`, { method: "POST" });
    webhook = toInfo(enabled.data);
    action = action === "already set up" ? "turned it on" : `${action} and turned it on`;
  }
  return { action, webhook };
}

export const paymongo: PaymentProvider = { name: "paymongo", createCheckout, handleWebhook, checkPaid, reopenCheckout, expireCheckout };
