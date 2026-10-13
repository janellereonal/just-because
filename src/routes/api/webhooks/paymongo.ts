import { createFileRoute } from "@tanstack/react-router";
import { applyPaidEvent } from "@/server/billing";
import { getProvider } from "@/server/payments";

/**
 * PayMongo webhook. Register this URL in the PayMongo dashboard for the
 * `checkout_session.payment.paid` event:  {APP_BASE_URL}/api/webhooks/paymongo
 *
 *  - 401 when the signature doesn't check out (PayMongo didn't send it).
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
