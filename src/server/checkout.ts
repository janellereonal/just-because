/**
 * Starting a checkout, safely. One gift has at most one checkout that can take money at a time:
 *
 *  - Clicking again (or a second tab) for the same plan within 30 minutes gets the same
 *    checkout back instead of a second one.
 *  - Starting a checkout for anything else first closes the older one at PayMongo (expire), so it
 *    can't be paid as well. If it turns out it was just paid, we apply it and stop, so the buyer
 *    can look before paying again.
 *  - Paused gifts and stale plan pickers are refused (see `quote`).
 *
 * Requests for the same gift wait for each other (a transaction-scoped advisory lock), so two
 * clicks at once can't both make an order. The lock is on the checkout, not the gift row, so the
 * editor can keep saving meanwhile.
 *
 * If closing an old checkout fails (PayMongo down, or a payment under way on it), we go on and
 * log it: should both get paid, `applyPaidEvent` flags the second one for a refund.
 */
import { and, desc, eq, sql } from "drizzle-orm";
import { PAY_SAFETY_COPY } from "@/copy/strings";
import { applyPaidEvent, logPayment, quote, quoteExtend, reconcileOrder, type Quote } from "./billing";
import { getDb, schema } from "./db";
import { cleanCode } from "./discounts";
import { track } from "./events";
import { HttpError } from "./guards";

/** How long an open checkout is handed out again for the same plan. */
export const REUSE_CHECKOUT_MS = 30 * 60_000;

export type CheckoutRequest =
  | {
      kind: "plan";
      tier: string;
      code?: string | null | undefined;
      /** What the plan picker showed (first plan or upgrade). Refused if the gift has changed since. */
      expect?: "publish" | "upgrade" | undefined;
    }
  | { kind: "extend" };

type Buyer = { id: string; email: string; name: string };
type Order = typeof schema.orders.$inferSelect;
type Site = typeof schema.giftSites.$inferSelect;

type Step =
  | { kind: "redirect"; orderId: string; checkoutUrl: string; isNew: boolean; quote: Quote | null }
  | { kind: "free"; orderId: string; isNew: boolean; quote: Quote | null }
  | { kind: "paidElsewhere"; orders: Order[] };

async function providerFor(name: string) {
  const { getProvider } = await import("./payments");
  return getProvider(name);
}

function lineItem(site: Site, q: Quote) {
  const recipient = ((site.customText as { recipient_name?: string } | null)?.recipient_name ?? "").trim() || site.title;
  const itemName =
    q.kind === "upgrade"
      ? `Upgrade to ${q.tier.name}`
      : q.kind === "extend"
        ? `Keep the gift open for ${q.tier.liveFor.label} more`
        : `Just Because ${q.tier.name}`;
  const itemDescription =
    q.kind === "extend"
      ? `${recipient}'s gift, ${q.tier.name} plan, open for another ${q.tier.liveFor.label}`
      : q.discount
        ? `${recipient}'s gift, ${q.tier.name} plan (${q.discount.code}), live for ${q.tier.liveFor.label}`
        : `${recipient}'s gift, ${q.tier.name} plan (live for ${q.tier.liveFor.label})`;
  return { itemName, itemDescription };
}

/** Saves the order and opens a checkout for it. The amount always comes from the quote. */
export async function openCheckout(user: Buyer, siteId: string, req: CheckoutRequest): Promise<{ orderId: string; checkoutUrl: string }> {
  const db = getDb();
  const step: Step = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`checkout:${siteId}`}))`);
    // Open orders before the gift: a payment applied in between turns an order paid and the gift's
    // plan in one commit, so we can never see the order gone but the gift still unpaid.
    const open = await tx
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.siteId, siteId), eq(schema.orders.status, "pending")))
      .orderBy(desc(schema.orders.createdAt));
    const [site] = await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    // Checkouts with the same code take turns too (any gift, anyone), so its limits are counted with
    // every open checkout in (one per person on two gifts at once, or the last use started twice).
    // Always taken after the gift's lock, so two requests never wait on each other the other way round.
    const code = req.kind === "plan" ? cleanCode(req.code ?? "").toLowerCase() : "";
    if (code) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`code:${code}`}))`);

    const q = req.kind === "extend" ? quoteExtend(site) : await quote(site, req.tier, { code: req.code ?? null, userId: user.id, db: tx });
    // The picker showed first-plan prices but the gift was paid for meanwhile (or the other way round).
    if (req.kind === "plan" && req.expect && req.expect !== q.kind) throw new HttpError(409, PAY_SAFETY_COPY.planChanged);
    const free = q.amount === 0 && !!q.discount;
    const providerName = free ? "free" : "paymongo";

    const now = Date.now();
    const sameAsThis = (o: Order) =>
      o.kind === q.kind &&
      o.tier === q.tier.id &&
      o.amount === q.amount &&
      (o.discountCodeId ?? null) === (q.discount?.id ?? null) &&
      o.provider === providerName &&
      o.ownerId === user.id &&
      !!o.providerCheckoutId &&
      now - o.createdAt.getTime() < REUSE_CHECKOUT_MS;
    let keep = open.find(sameAsThis) ?? null;

    // A checkout for the same plan that's still open: hand it out again.
    if (keep && keep.provider !== "free") {
      const url = await (await providerFor(keep.provider)).reopenCheckout(keep.providerCheckoutId!);
      if (url) {
        // Closing the others below still matters, so remember the answer and carry on.
        const reused = { orderId: keep.id, checkoutUrl: url };
        const paid = await closeOthers(tx, open, keep.id);
        if (paid.length) return { kind: "paidElsewhere", orders: paid };
        return { kind: "redirect", ...reused, isNew: false, quote: null };
      }
      keep = null; // paid or expired at PayMongo: closeOthers works out which
    }
    const paid = await closeOthers(tx, open, keep?.id ?? null);
    if (paid.length) return { kind: "paidElsewhere", orders: paid };
    if (keep) return { kind: "free", orderId: keep.id, isNew: false, quote: null };

    const freeId = free ? crypto.randomUUID() : null;
    const [order] = await tx
      .insert(schema.orders)
      .values({
        ...(freeId ? { id: freeId, providerCheckoutId: `free_${freeId}` } : {}),
        siteId: site.id,
        ownerId: user.id,
        kind: q.kind,
        tier: q.tier.id,
        fromTier: q.fromTier,
        amount: q.amount,
        currency: "PHP",
        promoApplied: q.promoApplied,
        discountCodeId: q.discount?.id ?? null,
        discountCode: q.discount?.code ?? null,
        discountAmount: q.discount?.off ?? 0,
        provider: providerName,
      })
      .returning({ id: schema.orders.id });
    if (freeId) return { kind: "free", orderId: freeId, isNew: true, quote: q };

    const { siteUrl } = await import("./email");
    const base = siteUrl();
    try {
      const checkout = await (await providerFor("paymongo")).createCheckout({
        orderId: order!.id,
        siteId: site.id,
        amount: q.amount,
        currency: "PHP",
        ...lineItem(site, q),
        successUrl: `${base}/checkout/${order!.id}`,
        cancelUrl: `${base}/checkout/${order!.id}?cancelled=1`,
        customerEmail: user.email,
        customerName: user.name,
      });
      await tx
        .update(schema.orders)
        .set({ providerCheckoutId: checkout.checkoutId, updatedAt: new Date() })
        .where(eq(schema.orders.id, order!.id));
      return { kind: "redirect", orderId: order!.id, checkoutUrl: checkout.checkoutUrl, isNew: true, quote: q };
    } catch (error) {
      // Rolls back the order too: nothing was opened, so there's nothing to keep.
      console.error("[payments] createCheckout failed", error);
      throw new HttpError(502, "We couldn't open the payment page just now. Please try again.");
    }
  });

  if (step.kind === "paidElsewhere") {
    for (const o of step.orders) await reconcileOrder(o, "billing", 0);
    throw new HttpError(409, PAY_SAFETY_COPY.paidElsewhere);
  }
  if (step.isNew && step.quote?.kind === "publish") {
    await track("gift_wrapped", { siteId, userId: user.id, props: { tier: step.quote.tier.id } });
  }
  if (step.kind === "redirect") return { orderId: step.orderId, checkoutUrl: step.checkoutUrl };

  // A free code: no payment page. Opened through the same path as a paid order, so the use
  // is counted once and the gift opens exactly as if it had been paid.
  const checkoutId = `free_${step.orderId}`;
  await applyPaidEvent({ eventId: checkoutId, eventType: "free_code", checkoutId, orderId: step.orderId, paymentId: null, amountPaid: 0 }, "free", "confirm");
  const [after] = await db.select({ status: schema.orders.status }).from(schema.orders).where(eq(schema.orders.id, step.orderId));
  if (after?.status !== "paid") throw new HttpError(400, "That code was just used up. You can still pick a plan without it.");
  return { orderId: step.orderId, checkoutUrl: `/checkout/${step.orderId}` };
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Closes every open checkout on the gift except `keepId`, and marks those orders expired.
 * Returns the ones that turned out to be paid (they're left for `applyPaidEvent`).
 */
async function closeOthers(tx: Tx, open: Order[], keepId: string | null): Promise<Order[]> {
  const paid: Order[] = [];
  for (const o of open) {
    if (o.id === keepId) continue;
    if (o.provider !== "free" && o.providerCheckoutId) {
      const result = await (await providerFor(o.provider)).expireCheckout(o.providerCheckoutId);
      if (result === "paid") {
        paid.push(o);
        continue;
      }
      if (result === "open") {
        await logPayment("billing", "expire failed", `couldn't close order ${o.id}'s checkout before opening a new one; if both are paid, the second is flagged for a refund`, {
          checkoutId: o.providerCheckoutId,
          orderId: o.id,
        });
      }
    }
    // A late payment on it still counts (applyPaidEvent takes expired orders too).
    await tx
      .update(schema.orders)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(schema.orders.id, o.id), eq(schema.orders.status, "pending")));
  }
  return paid;
}

/**
 * The buyer came back from the payment page with "cancel". The order stops counting as open, and
 * its checkout is closed at PayMongo so it can't be paid later from another tab. A payment that
 * got in first still counts.
 */
export async function cancelCheckout(order: Order) {
  if (order.status !== "pending") return;
  await getDb()
    .update(schema.orders)
    .set({ status: "failed", updatedAt: new Date() })
    .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, "pending")));
  if (order.provider === "free" || !order.providerCheckoutId) return;
  const result = await (await providerFor(order.provider)).expireCheckout(order.providerCheckoutId);
  if (result === "paid") await reconcileOrder({ ...order, status: "failed" }, "confirm", 0);
}
