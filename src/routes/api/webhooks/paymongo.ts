import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { applyPaidEvent } from "@/server/billing";
import { getDb, schema } from "@/server/db";
import { getProvider } from "@/server/payments";

/**
 * PayMongo webhook. Register this URL in the PayMongo dashboard for the
 * `checkout_session.payment.paid` event:  {APP_BASE_URL}/api/webhooks/paymongo
 *
 *  - Signed events are applied directly. Unsigned or unmatched ones only make us
 *    ask PayMongo about that checkout (and only if we have a pending order for it).
 *  - 401 for bodies that aren't a usable paid event.
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
            console.warn(`[payments] webhook rejected: ${outcome.reason}`);
            return Response.json({ error: "rejected" }, { status: 401 });
          }
          if (outcome.kind === "ignored") {
            console.info(`[payments] webhook ${outcome.eventId} (${outcome.eventType}) ignored`);
            return Response.json({ ok: true });
          }
          if (outcome.kind === "check") {
            // Only ask PayMongo about checkouts we're actually waiting on.
            const [order] = await getDb()
              .select({ id: schema.orders.id })
              .from(schema.orders)
              .where(
                and(
                  eq(schema.orders.providerCheckoutId, outcome.checkoutId),
                  eq(schema.orders.status, "pending"),
                ),
              );
            if (!order) {
              console.info(`[payments] webhook for ${outcome.checkoutId} (${outcome.reason}): no pending order, skipped`);
              return Response.json({ ok: true });
            }
            const paid = await provider.checkPaid(outcome.checkoutId);
            const msg = paid ? await applyPaidEvent(paid, provider.name) : "PayMongo says not paid yet";
            console.info(`[payments] webhook for ${outcome.checkoutId} (${outcome.reason}, checked with PayMongo): ${msg}`);
            return Response.json({ ok: true });
          }
          const msg = await applyPaidEvent(outcome.event, provider.name);
          console.info(`[payments] webhook ${outcome.event.eventId}: ${msg}`);
          return Response.json({ ok: true });
        } catch (error) {
          console.error("[payments] webhook failed", error);
          return Response.json({ error: "failed" }, { status: 500 });
        }
      },
    },
  },
});
