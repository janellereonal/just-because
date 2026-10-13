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
import type { CheckoutOrder, CheckoutResult, PaymentProvider, WebhookOutcome } from "./types";

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
  const secret = process.env["PAYMONGO_WEBHOOK_SECRET"];
  if (!secret) return { kind: "rejected", reason: "PAYMONGO_WEBHOOK_SECRET isn't set" };

  const sig = parseSignature(headers.get("paymongo-signature"));
  if (!sig) return { kind: "rejected", reason: "missing or malformed Paymongo-Signature header" };

  let payload: EventPayload;
  try {
    payload = JSON.parse(rawBody) as EventPayload;
  } catch {
    return { kind: "rejected", reason: "body isn't JSON" };
  }
  const live = payload.data?.attributes?.livemode === true;
  const expected = createHmac("sha256", secret).update(`${sig.t}.${rawBody}`).digest("hex");
  if (!safeEqualHex(expected, live ? sig.li : sig.te)) {
    return { kind: "rejected", reason: `signature mismatch (${live ? "live" : "test"} mode)` };
  }

  const eventId = payload.data?.id ?? "";
  const eventType = payload.data?.attributes?.type ?? "";
  if (!eventId) return { kind: "rejected", reason: "event has no id" };
  if (eventType !== PAID_EVENT) return { kind: "ignored", eventId, eventType };

  const checkoutId = payload.data?.attributes?.data?.id;
  if (!checkoutId) return { kind: "rejected", reason: "paid event has no checkout session id" };

  // Ask PayMongo directly what was paid on this session.
  const session = await call<CheckoutSession>(`/v1/checkout_sessions/${encodeURIComponent(checkoutId)}`);
  const paid = (session.data.attributes.payments ?? []).filter((p) => p.attributes.status === "paid");
  const attrs = session.data.attributes;
  return {
    kind: "paid",
    event: {
      eventId,
      eventType,
      checkoutId,
      orderId: attrs.metadata?.["order_id"] ?? attrs.reference_number ?? null,
      paymentId: paid[0]?.id ?? null,
      amountPaid: paid.reduce((sum, p) => sum + p.attributes.amount, 0),
    },
  };
}

export const paymongo: PaymentProvider = { name: "paymongo", createCheckout, handleWebhook };
