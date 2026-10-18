/**
 * A fake PayMongo for local testing: just enough of /v1/checkout_sessions to
 * create a checkout, mark it paid, and sign webhooks like PayMongo does.
 *
 * Run it on its own:
 *   bun tools/payments/fake-paymongo.ts            # http://localhost:8787
 * then start the app with
 *   PAYMONGO_API_URL=http://localhost:8787 PAYMONGO_SECRET_KEY=sk_test_fake PAYMONGO_WEBHOOK_SECRET=whsk_fake bun run dev
 * and use:
 *   POST /_test/pay/:checkoutId     marks it paid (and posts a signed webhook to the app if WEBHOOK_TARGET is set)
 *   GET  /_test/sessions            lists sessions
 *
 * The tests in src/server/payments/*.test.ts start it in-process with startFakePaymongo().
 */
import { createHmac } from "node:crypto";

/** Optional extras on the fake payment, shaped like a real PayMongo card or wallet payment. */
export type FakePaymentDetails = {
  currency?: string;
  foreign_fee?: number;
  source?: { id?: string; type?: string; brand?: string; country?: string };
  billing?: { address?: { country?: string } };
};

type Session = { id: string; amount: number; orderId: string; paid: number; checkoutUrl: string; details?: FakePaymentDetails | undefined };

export function sign(secret: string, body: string, t = Math.floor(Date.now() / 1000), live = false) {
  const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},${live ? "te=,li=" : "te="}${sig}${live ? "" : ",li="}`;
}

export function paidEventBody(checkoutId: string, eventId = `evt_${Math.random().toString(36).slice(2, 12)}`) {
  return JSON.stringify({
    data: { id: eventId, attributes: { type: "checkout_session.payment.paid", livemode: false, data: { id: checkoutId, attributes: {} } } },
  });
}

export function startFakePaymongo(port = 0) {
  const sessions = new Map<string, Session>();
  const server = Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url);
      if (req.method === "POST" && url.pathname === "/v1/checkout_sessions") {
        const body = (await req.json()) as { data: { attributes: { line_items: { amount: number }[]; reference_number: string } } };
        const id = `cs_${Math.random().toString(36).slice(2, 14)}`;
        const s: Session = { id, amount: body.data.attributes.line_items[0]!.amount, orderId: body.data.attributes.reference_number, paid: 0, checkoutUrl: `${url.origin}/pay/${id}` };
        sessions.set(id, s);
        return Response.json(view(s));
      }
      const m = /^\/v1\/checkout_sessions\/([\w]+)$/.exec(url.pathname);
      if (req.method === "GET" && m) {
        const s = sessions.get(m[1]!);
        return s ? Response.json(view(s)) : Response.json({ errors: [{ detail: "not found" }] }, { status: 404 });
      }
      const pay = /^\/_test\/pay\/([\w]+)$/.exec(url.pathname);
      if (req.method === "POST" && pay) {
        const s = sessions.get(pay[1]!);
        if (!s) return new Response("no such session", { status: 404 });
        const amount = Number(url.searchParams.get("amount") ?? s.amount);
        s.paid += amount;
        const target = process.env["WEBHOOK_TARGET"];
        if (target) {
          const body = paidEventBody(s.id);
          const secret = process.env["PAYMONGO_WEBHOOK_SECRET"];
          await fetch(target, { method: "POST", body, headers: { "content-type": "application/json", ...(secret ? { "paymongo-signature": sign(secret, body) } : {}) } });
        }
        return Response.json({ ok: true, paid: s.paid });
      }
      if (url.pathname === "/_test/sessions") return Response.json([...sessions.values()]);
      return new Response("not found", { status: 404 });
    },
  });
  return {
    url: `http://localhost:${server.port}`,
    sessions,
    /** Adds a session as if our app had created it (for tests that insert orders directly). */
    add(id: string, amount: number, orderId: string) {
      sessions.set(id, { id, amount, orderId, paid: 0, checkoutUrl: "" });
    },
    pay(id: string, amount?: number, details?: FakePaymentDetails) {
      const s = sessions.get(id)!;
      s.paid += amount ?? s.amount;
      if (details) s.details = details;
    },
    stop: () => server.stop(true),
  };
}

function view(s: Session) {
  return {
    data: {
      id: s.id,
      attributes: {
        checkout_url: s.checkoutUrl,
        livemode: false,
        reference_number: s.orderId,
        metadata: { order_id: s.orderId },
        payments: s.paid ? [{ id: `pay_${s.id}`, attributes: { amount: s.paid, status: "paid", ...s.details } }] : [],
      },
    },
  };
}

if (import.meta.main) {
  const fake = startFakePaymongo(Number(process.env["PORT"] ?? 8787));
  console.log(`Fake PayMongo on ${fake.url}`);
}
