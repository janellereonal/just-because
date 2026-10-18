/**
 * A fake PayMongo for local testing: just enough of /v1/checkout_sessions to
 * create a checkout, mark it paid, and sign webhooks like PayMongo does.
 *
 * Run it on its own:
 *   bun tools/payments/fake-paymongo.ts            # http://localhost:8787
 * then start the app with
 *   PAYMONGO_API_URL=http://localhost:8787 PAYMONGO_SECRET_KEY=sk_test_fake PAYMONGO_WEBHOOK_SECRET=whsk_fake bun run dev
 * and use:
 *   GET  /pay/:checkoutId           a stand-in for PayMongo's checkout page (Pay / Cancel buttons)
 *   POST /_test/pay/:checkoutId     marks it paid (and posts a signed webhook to the app if WEBHOOK_TARGET is set)
 *   GET  /_test/sessions            lists sessions
 * Like PayMongo, an expired session (POST /v1/checkout_sessions/:id/expire) can't be paid.
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

type Session = {
  id: string;
  amount: number;
  orderId: string;
  paid: number;
  checkoutUrl: string;
  name?: string;
  description?: string;
  details?: FakePaymentDetails | undefined;
  expired?: boolean;
  /** Pretend a payment is under way: PayMongo then refuses to expire it. */
  busy?: boolean;
  successUrl?: string;
  cancelUrl?: string;
};

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
        const body = (await req.json()) as {
          data: { attributes: { line_items: { amount: number; name?: string; description?: string }[]; reference_number: string; success_url?: string; cancel_url?: string } };
        };
        const a = body.data.attributes;
        const id = `cs_${Math.random().toString(36).slice(2, 14)}`;
        const s: Session = {
          id,
          amount: a.line_items[0]!.amount,
          orderId: a.reference_number,
          paid: 0,
          checkoutUrl: `${url.origin}/pay/${id}`,
          name: a.line_items[0]!.name,
          description: a.line_items[0]!.description,
          ...(a.success_url ? { successUrl: a.success_url } : {}),
          ...(a.cancel_url ? { cancelUrl: a.cancel_url } : {}),
        };
        sessions.set(id, s);
        return Response.json(view(s));
      }
      const m = /^\/v1\/checkout_sessions\/([\w]+)$/.exec(url.pathname);
      if (req.method === "GET" && m) {
        const s = sessions.get(m[1]!);
        return s ? Response.json(view(s)) : Response.json({ errors: [{ detail: "not found" }] }, { status: 404 });
      }
      const expire = /^\/v1\/checkout_sessions\/([\w]+)\/expire$/.exec(url.pathname);
      if (req.method === "POST" && expire) {
        const s = sessions.get(expire[1]!);
        if (!s) return Response.json({ errors: [{ detail: "not found" }] }, { status: 404 });
        // Like PayMongo: a paid or already expired session can't be expired.
        if (s.paid || s.expired || s.busy) return Response.json({ errors: [{ detail: s.paid ? "already paid" : s.expired ? "already expired" : "payment in progress" }] }, { status: 400 });
        s.expired = true;
        return Response.json(view(s));
      }
      const page = /^\/pay\/([\w]+)$/.exec(url.pathname);
      if (req.method === "GET" && page) {
        const s = sessions.get(page[1]!);
        if (!s) return new Response("no such session", { status: 404 });
        return new Response(payPage(s), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      const pay = /^\/_test\/pay\/([\w]+)$/.exec(url.pathname);
      if (req.method === "POST" && pay) {
        const s = sessions.get(pay[1]!);
        if (!s) return new Response("no such session", { status: 404 });
        if (s.expired) return Response.json({ error: "This checkout has expired." }, { status: 400 });
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
      if (s.expired) throw new Error(`checkout ${id} has expired`);
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
        status: s.expired ? "expired" : "active",
        livemode: false,
        reference_number: s.orderId,
        metadata: { order_id: s.orderId },
        payments: s.paid ? [{ id: `pay_${s.id}`, attributes: { amount: s.paid, status: "paid", ...s.details } }] : [],
      },
    },
  };
}

/** A bare stand-in for PayMongo's hosted page, so a browser test can pay or cancel. */
function payPage(s: Session) {
  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const money = `₱${(s.amount / 100).toFixed(2)}`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fake PayMongo</title>
<body style="font:16px system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<p style="font-size:12px;color:#888">FAKE PAYMONGO (local testing)</p>
<h1 style="font-size:22px">${esc(s.name ?? "Checkout")}</h1><p>${esc(s.description ?? "")}</p>
<p id="state">${s.paid ? "Paid." : s.expired ? "This checkout has expired." : `Amount: <b>${money}</b>`}</p>
<button id="pay" ${s.paid || s.expired ? "disabled" : ""} style="padding:12px 20px">Pay ${money}</button>
<a id="cancel" href="${esc(s.cancelUrl ?? "#")}" style="margin-left:12px">Cancel</a>
<script>
document.getElementById("pay").onclick = async () => {
  const r = await fetch("/_test/pay/${s.id}", { method: "POST" });
  if (!r.ok) { document.getElementById("state").textContent = (await r.json()).error || "Payment failed."; return; }
  location.href = ${JSON.stringify(s.successUrl ?? "/")};
};
</script></body>`;
}

if (import.meta.main) {
  const fake = startFakePaymongo(Number(process.env["PORT"] ?? 8787));
  console.log(`Fake PayMongo on ${fake.url}`);
}
