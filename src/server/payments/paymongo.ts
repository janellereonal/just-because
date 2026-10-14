/**
 * PayMongo hosted checkout (Checkout Sessions API).
 * Docs: https://developers.paymongo.com/docs/checkout-implementation
 *
 *  - createCheckout: POST /v1/checkout_sessions with Basic auth (secret key).
 *  - handleWebhook: verifies `Paymongo-Signature` (t=…,te=…,li=…) as
 *    HMAC-SHA256(webhook secret, `${t}.${rawBody}`), compared to `te` in test
 *    mode or `li` in live mode. For `checkout_session.payment.paid` it then
 *    re-fetches the session from PayMongo, so the amount we trust comes from
 *    PayMongo's API rather than from the webhook body alone.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { enabledPaymentMethods } from "@/config/pricing";
import type { CheckoutOrder, CheckoutResult, PaidEvent, PaymentProvider, WebhookOutcome } from "./types";

const PAID_EVENT = "checkout_session.payment.paid";

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
      livemode: boolean;
      reference_number?: string | null;
      metadata?: Record<string, string> | null;
      payments?: { id: string; attributes: { amount: number; status: string } }[];
    };
  };
};

async function createCheckout(order: CheckoutOrder): Promise<CheckoutResult> {
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
    return { kind: "rejected", reason: "body isn't JSON" };
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
  if (!signed || !eventId) {
    return {
      kind: "check",
      checkoutId,
      reason: !secret ? "no webhook secret set" : !sig ? "no signature" : "signature didn't match our secret",
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
  return {
    eventId: source.eventId,
    eventType: source.eventType,
    checkoutId,
    orderId: attrs.metadata?.["order_id"] ?? attrs.reference_number ?? null,
    paymentId: paid[0]?.id ?? null,
    amountPaid: paid.reduce((sum, p) => sum + p.attributes.amount, 0),
  };
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

export const paymongo: PaymentProvider = { name: "paymongo", createCheckout, handleWebhook, checkPaid };
