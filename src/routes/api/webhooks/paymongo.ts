import { createFileRoute } from "@tanstack/react-router";
import { and, eq, notInArray } from "drizzle-orm";
import { SETTLED_STATUSES, applyPaidEvent, logPayment, reconcileOrder } from "@/server/billing";
import { clientIp, rateLimit } from "@/server/rateLimit";

function underLogLimit() {
  try {
    rateLimit(`webhook-log:${clientIp()}`, 30, 10 * 60_000, "slow down");
    return true;
  } catch {
    return false;
  }
}
import { getDb, schema } from "@/server/db";
import { getProvider } from "@/server/payments";

/**
 * PayMongo webhook. Register this URL in the PayMongo dashboard for the
 * `checkout_session.payment.paid` event:  {APP_BASE_URL}/api/webhooks/paymongo
 *
 *  - Signed events (signed in the last 10 minutes) are applied directly. Unsigned,
 *    old or unmatched ones only make us ask PayMongo about that checkout, and only
 *    if we have an unpaid order for it.
 *  - Every call is written to payment_log with what we did.
 *  - 400 for bodies that aren't even a JSON object, 401 for ones that aren't a usable paid event.
 *    Both are logged only a little per sender, so junk can't flood payment_log.
 *  - 200 for anything handled, ignored or already seen.
 *  - 500 only on a real failure, so PayMongo retries later.
 */
export const Route = createFileRoute("/api/webhooks/paymongo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const provider = getProvider("paymongo");
        try {
          const outcome = await provider.handleWebhook(rawBody, request.headers);
          if (outcome.kind === "rejected") {
            // Anyone can post junk here; only log a little of it per sender.
            if (underLogLimit()) await logPayment("webhook", "rejected", outcome.reason);
            return Response.json({ error: "rejected" }, { status: outcome.malformed ? 400 : 401 });
          }
          if (outcome.kind === "ignored") {
            if (underLogLimit()) await logPayment("webhook", outcome.eventType || "unknown", `ignored (${outcome.eventId || "no id"})`);
            return Response.json({ ok: true });
          }
          if (outcome.kind === "check") {
            // An unsigned call is only a hint: we ask PayMongo about checkouts we have an
            // unpaid order for (pending, cancelled or timed out: a late payment still counts).
            try {
              rateLimit(`webhook-check:${outcome.checkoutId}`, 6, 60_000, "slow down");
            } catch {
              return Response.json({ ok: true });
            }
            const [order] = await getDb()
              .select()
              .from(schema.orders)
              .where(and(eq(schema.orders.providerCheckoutId, outcome.checkoutId), notInArray(schema.orders.status, [...SETTLED_STATUSES])));
            if (!order) {
              await logPayment("webhook", "hint", `${outcome.reason}; no unpaid order, skipped`, { checkoutId: outcome.checkoutId });
              return Response.json({ ok: true });
            }
            const paid = await reconcileOrder(order, "webhook", 0);
            if (!paid) await logPayment("webhook", "hint", `${outcome.reason}; PayMongo says not paid yet`, { checkoutId: outcome.checkoutId, orderId: order.id });
            return Response.json({ ok: true });
          }
          await applyPaidEvent(outcome.event, provider.name, "webhook");
          return Response.json({ ok: true });
        } catch (error) {
          console.error("[payments] webhook failed", error);
          await logPayment("webhook", "error", error instanceof Error ? error.message : String(error));
          return Response.json({ error: "failed" }, { status: 500 });
        }
      },
    },
  },
});
