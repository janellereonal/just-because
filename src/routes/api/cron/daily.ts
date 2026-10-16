import { createFileRoute } from "@tanstack/react-router";
import { and, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { logPayment, reconcileOrder } from "@/server/billing";
import { sendExpiryReminders } from "@/server/notify";

/**
 * Runs once a day (vercel.json "crons"). Vercel calls it with
 * `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set, it refuses to
 * run, so nobody else can trigger it.
 *
 *  1. Emails organisers whose plan ends in the next 14 days (once per end date).
 *  2. Finds payments whose webhook never arrived: asks PayMongo about unpaid
 *     orders from the last two days, and opens the gift if they were paid.
 *  3. Marks checkouts older than a day that were never paid as expired.
 */
export const Route = createFileRoute("/api/cron/daily")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) {
          console.warn("[cron] CRON_SECRET isn't set, so the daily job is off.");
          return Response.json({ error: "not configured" }, { status: 503 });
        }
        if (request.headers.get("authorization") !== `Bearer ${secret}`) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const db = getDb();
        const reminders = await sendExpiryReminders();
        const unpaid = await db
          .select()
          .from(schema.orders)
          .where(
            and(
              inArray(schema.orders.status, ["pending", "failed", "expired"]),
              sql`${schema.orders.providerCheckoutId} is not null`,
              sql`${schema.orders.createdAt} > now() - interval '2 days'`,
            ),
          )
          .limit(200);
        let recovered = 0;
        for (const o of unpaid) if (await reconcileOrder(o, "cron", 0)) recovered += 1;
        const expired = await db
          .update(schema.orders)
          .set({ status: "expired", updatedAt: new Date() })
          .where(and(inArray(schema.orders.status, ["pending"]), sql`${schema.orders.createdAt} < now() - interval '24 hours'`))
          .returning({ id: schema.orders.id });
        const summary = `reminders ${reminders}, checked ${unpaid.length} unpaid orders, recovered ${recovered}, expired ${expired.length}`;
        if (unpaid.length || expired.length) await logPayment("cron", "daily", summary);
        console.info(`[cron] daily: ${summary}`);
        return Response.json({ ok: true, reminders, checked: unpaid.length, recovered, expired: expired.length });
      },
    },
  },
});
