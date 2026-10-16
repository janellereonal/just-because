/**
 * Plans, limits and payments for gifts. Prices come only from
 * src/config/pricing.ts; nothing about an amount is taken from the browser.
 */
import { formatInfo } from "@/lib/formats";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  LEGACY_TIER,
  TIERS,
  addMonths,
  expiryFrom,
  extendedExpiry,
  getTier,
  promo,
  tierRank,
  type Tier,
  type TierId,
} from "@/config/pricing";
import { getDb, schema } from "./db";
import { HttpError } from "./guards";
import { notifyPaid } from "./notify";
import type { PaidEvent } from "./payments/types";

type Site = typeof schema.giftSites.$inferSelect;

/* ---------------- open / ended ---------------- */

export function isExpired(site: Pick<Site, "expiresAt">, now = new Date()) {
  return !!site.expiresAt && site.expiresAt.getTime() <= now.getTime();
}

/** The recipient link works: published, paid (or legacy) and not ended. */
export function isOpen(site: Pick<Site, "status" | "tier" | "expiresAt">) {
  return site.status === "published" && !!site.tier && !isExpired(site);
}

/* ---------------- usage & limits ---------------- */

/**
 * Contributors are counted as different devices (friends don't have accounts,
 * so each browser keeps a random id in localStorage). Older notes sent before
 * device ids existed fall back to the name, and a name already seen with a
 * device id isn't counted twice. Hidden items don't count, so an owner can make
 * room by hiding something.
 */
export async function siteUsage(siteId: string) {
  const rows = await getDb().execute<{ contributors: number; photos: number }>(sql`
    with live as (
      select device_id, lower(trim(author_name)) as name, module_type
      from contributions
      where site_id = ${siteId} and status in ('pending', 'approved')
    )
    select
      ((select count(distinct device_id) from live where device_id is not null)
        + (select count(distinct name) from live
           where device_id is null
             and name not in (select name from live where device_id is not null)))::int as contributors,
      (select count(*) from live where module_type = 'photobooth')::int as photos
  `);
  const row = rows[0];
  return { contributors: Number(row?.contributors ?? 0), photos: Number(row?.photos ?? 0) };
}

export type Usage = Awaited<ReturnType<typeof siteUsage>>;

/** Why a tier doesn't fit this gift right now, or null if it does. */
export function tierBlocker(tier: Tier, usage: Usage, format: string): string | null {
  if (usage.contributors > tier.contributors.cap)
    return `This gift has ${usage.contributors} contributors. ${tier.name} fits ${tier.contributors.cap}.`;
  if (usage.photos > tier.photos.cap)
    return `This gift has ${usage.photos} photos. ${tier.name} fits ${tier.photos.cap}.`;
  if (!tier.formats.includes(format as Tier["formats"][number]))
    return `${tier.name} doesn't include this format. Switch to ${tier.formats.map((f) => formatInfo(f).title).join(" or ")} to use it.`;
  return null;
}

/**
 * Is there room for one more item from this friend on this gift?
 * A friend is "already in" if this device has added before, or (for notes
 * from before device ids) the same name has. Only paid tiers have caps.
 * Drafts are free to collect in; the tier picker checks fit at checkout.
 */
export async function checkRoom(site: Site, authorName: string, moduleType: string, deviceId: string | null = null) {
  if (site.status !== "published") return { ok: true as const };
  if (isExpired(site)) return { ok: false as const, reason: "ended" as const };
  const tier = getTier(site.tier);
  if (!tier) return { ok: true as const }; // legacy: no caps
  const usage = await siteUsage(site.id);
  const c = schema.contributions;
  const sameName = sql`lower(trim(${c.authorName})) = lower(trim(${authorName}))`;
  const [known] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(c)
    .where(
      and(
        eq(c.siteId, site.id),
        inArray(c.status, ["pending", "approved"]),
        deviceId ? sql`(${c.deviceId} = ${deviceId} or (${c.deviceId} is null and ${sameName}))` : sameName,
      ),
    );
  const isNewPerson = (known?.n ?? 0) === 0;
  if (isNewPerson && usage.contributors >= tier.contributors.cap)
    return { ok: false as const, reason: "contributors" as const };
  if (moduleType === "photobooth" && usage.photos >= tier.photos.cap)
    return { ok: false as const, reason: "photos" as const };
  return { ok: true as const };
}

/* ---------------- pricing quotes ---------------- */

async function promoAvailable() {
  if (!promo.enabled) return false;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.promoApplied, true), eq(schema.orders.status, "paid")));
  return (row?.n ?? 0) < promo.maxUses;
}

export type Quote = {
  kind: "publish" | "upgrade" | "extend";
  tier: Tier;
  fromTier: TierId | null;
  amount: number;
  promoApplied: boolean;
};

/** Works out what this gift owes for `tierId`. Throws a friendly error if it can't be bought. */
export async function quote(site: Site, tierId: string): Promise<Quote> {
  const tier = getTier(tierId);
  if (!tier) throw new HttpError(400, "That plan doesn't exist.");
  if (site.tier === LEGACY_TIER) throw new HttpError(400, "This gift is already open for good. No payment needed.");

  const usage = await siteUsage(site.id);
  const blocker = tierBlocker(tier, usage, site.format);
  if (blocker) throw new HttpError(400, blocker);

  const current = getTier(site.tier);
  if (!current) {
    let amount = tier.amount;
    let promoApplied = false;
    if (await promoAvailable()) {
      amount = Math.max(amount - promo.amountOff, 100);
      promoApplied = true;
    }
    return { kind: "publish", tier, fromTier: null, amount, promoApplied };
  }
  if (isExpired(site)) throw new HttpError(400, "This gift has ended. Extend it first, then you can upgrade.");
  if (tierRank(tier.id) <= tierRank(current.id))
    throw new HttpError(400, `This gift is already on ${current.name}.`);
  return { kind: "upgrade", tier, fromTier: current.id, amount: tier.amount - current.amount, promoApplied: false };
}

/** Keeps a paid gift open for another stretch of its current plan. */
export function quoteExtend(site: Site): Quote {
  if (site.tier === LEGACY_TIER) throw new HttpError(400, "This gift is already open for good. No payment needed.");
  const tier = getTier(site.tier);
  if (!tier) throw new HttpError(400, "Pick a plan to publish this gift first.");
  return { kind: "extend", tier, fromTier: tier.id, amount: tier.extendAmount, promoApplied: false };
}

export function upgradeOptions(currentTier: string | null) {
  const current = getTier(currentTier);
  if (!current) return [];
  return TIERS.filter((t) => tierRank(t.id) > tierRank(current.id));
}

/* ---------------- confirming payment (webhook) ---------------- */

export type PaymentSource = "webhook" | "confirm" | "billing" | "cron";

/** Writes one line to payment_log. Never throws: logging must not break a payment. */
export async function logPayment(source: PaymentSource, event: string, outcome: string, ids: { checkoutId?: string | null; orderId?: string | null } = {}) {
  console.info(`[payments] ${source} ${event}${ids.checkoutId ? ` ${ids.checkoutId}` : ""}: ${outcome}`);
  try {
    await getDb()
      .insert(schema.paymentLog)
      .values({ source, event: event.slice(0, 120), outcome: outcome.slice(0, 500), checkoutId: ids.checkoutId ?? null, orderId: ids.orderId ?? null });
  } catch (error) {
    console.error("[payments] couldn't write payment_log", error);
  }
}

/**
 * Marks the order paid and opens (or upgrades, or extends) the gift, exactly
 * once per order. Safe to call any number of times, from any path (webhook,
 * confirm page, editor, daily job): the order row is locked, and once it's
 * paid nothing else happens.
 *
 * A payment that arrives after the order was cancelled or timed out still
 * counts: the buyer was charged, so the gift opens.
 *
 * The event id is only recorded once the order is actually applied, so an
 * early check that found nothing (or a mismatch) never blocks a later one.
 */
export async function applyPaidEvent(event: PaidEvent, provider: string, source: PaymentSource = "webhook"): Promise<string> {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.providerCheckoutId, event.checkoutId))
      .for("update");
    if (!order) return { msg: `no order for checkout ${event.checkoutId}` };
    if (event.orderId && event.orderId !== order.id)
      return { msg: `order mismatch: session says ${event.orderId}, we have ${order.id}`, orderId: order.id };
    if (order.status === "paid") return { msg: `order ${order.id} already paid`, orderId: order.id };
    if (event.amountPaid < order.amount)
      return { msg: `order ${order.id}: paid ${event.amountPaid} < expected ${order.amount}, not publishing`, orderId: order.id };

    // Recorded here, inside the same transaction as the order update.
    const inserted = await tx
      .insert(schema.webhookEvents)
      .values({ id: `${provider}:${event.eventId}`, provider, type: event.eventType })
      .onConflictDoNothing()
      .returning({ id: schema.webhookEvents.id });
    if (inserted.length === 0) return { msg: "duplicate event, skipped", orderId: order.id };

    const tier = getTier(order.tier)!;
    const now = new Date();
    const late = order.status !== "pending" ? ` (late: order was ${order.status})` : "";
    await tx
      .update(schema.orders)
      .set({ status: "paid", providerPaymentId: event.paymentId, updatedAt: now })
      .where(eq(schema.orders.id, order.id));

    if (!order.siteId) return { msg: `order ${order.id}: paid${late}, but its gift was deleted. Needs a refund.`, orderId: order.id };
    const [site] = await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, order.siteId)).for("update");
    if (!site) return { msg: `order ${order.id}: paid${late}, but its gift was deleted. Needs a refund.`, orderId: order.id };

    // Paid twice (e.g. two tabs)? Keep the better plan and flag it. Refunds would be handled here later
    // (see "Refunds" in HANDOFF.md). Extends always stack, so paying twice just adds more time.
    const alreadyCovered =
      order.kind === "upgrade"
        ? tierRank(site.tier) >= tierRank(tier.id)
        : order.kind === "extend"
          ? !getTier(site.tier)
          : !!site.tier;
    if (alreadyCovered) {
      return { msg: `order ${order.id}: duplicate payment${late}, gift ${site.id} already on ${site.tier}. Needs a refund.`, orderId: order.id };
    }

    if (order.kind === "extend") {
      const expiresAt = extendedExpiry(site.expiresAt, tier, now);
      // A new end date gets its own reminder.
      await tx.update(schema.giftSites).set({ expiresAt, expiryRemindedAt: null }).where(eq(schema.giftSites.id, site.id));
      return { msg: `order ${order.id}${late}: extended gift ${site.id} to ${expiresAt.toISOString()}`, orderId: order.id, paid: order.id };
    }

    if (order.kind === "upgrade") {
      // Add the extra months on top of the current end date, so earlier extensions are kept.
      const current = getTier(site.tier);
      const publishedAt = site.publishedAt ?? now;
      const currentEnd = site.expiresAt ?? (current ? expiryFrom(publishedAt, current) : now);
      const expiresAt = current
        ? addMonths(currentEnd, tier.liveFor.months - current.liveFor.months)
        : expiryFrom(publishedAt, tier);
      await tx
        .update(schema.giftSites)
        .set({ tier: tier.id, expiresAt, expiryRemindedAt: null })
        .where(eq(schema.giftSites.id, site.id));
      return { msg: `order ${order.id}${late}: upgraded gift ${site.id} to ${tier.id}`, orderId: order.id, paid: order.id };
    }
    await tx
      .update(schema.giftSites)
      .set({ status: "published", tier: tier.id, publishedAt: now, expiresAt: expiryFrom(now, tier), expiryRemindedAt: null })
      .where(eq(schema.giftSites.id, site.id));
    return { msg: `order ${order.id}${late}: published gift ${site.id} on ${tier.id}`, orderId: order.id, paid: order.id };
  });
  await logPayment(source, event.eventType, result.msg, { checkoutId: event.checkoutId, orderId: result.orderId ?? null });
  if ("paid" in result && result.paid) {
    // One email per order: the receipt (with "it's live" for a first payment).
    await notifyPaid(result.paid).catch((e) => console.error("[notify]", e));
  }
  return result.msg;
}

/** Last time we asked the provider about each order, so polling and page loads don't hammer it. */
const lastProviderCheck = new Map<string, number>();

/**
 * Asks the payment provider whether an order that isn't marked paid actually
 * was (paid in another tab after cancelling, after it timed out, or the
 * webhook never came), and applies it if so. At most once per `everyMs` per
 * order and instance. Returns true if the order is now paid.
 */
export async function reconcileOrder(
  order: Pick<typeof schema.orders.$inferSelect, "id" | "status" | "provider" | "providerCheckoutId" | "createdAt">,
  source: PaymentSource,
  everyMs = 5000,
): Promise<boolean> {
  if (order.status === "paid" || !order.providerCheckoutId) return order.status === "paid";
  // Checkout sessions don't take payments after about a day; a week is plenty of margin.
  if (Date.now() - order.createdAt.getTime() > 7 * 86_400_000) return false;
  const last = lastProviderCheck.get(order.id) ?? 0;
  if (Date.now() - last < everyMs) return false;
  lastProviderCheck.set(order.id, Date.now());
  if (lastProviderCheck.size > 5000) lastProviderCheck.clear();
  try {
    const { getProvider } = await import("./payments");
    const provider = getProvider(order.provider);
    const paid = await provider.checkPaid(order.providerCheckoutId);
    if (!paid) return false;
    const msg = await applyPaidEvent(paid, provider.name, source);
    return /published|upgraded|extended|already paid/.test(msg);
  } catch (error) {
    await logPayment(source, "check failed", error instanceof Error ? error.message : String(error), { checkoutId: order.providerCheckoutId, orderId: order.id });
    return false;
  }
}

/** Checks a gift's recent unpaid orders with the provider (used when the editor loads billing). */
export async function reconcileSiteOrders(siteId: string, source: PaymentSource = "billing") {
  const recent = await getDb()
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.siteId, siteId), inArray(schema.orders.status, ["pending", "failed", "expired"]), sql`${schema.orders.createdAt} > now() - interval '7 days'`, sql`${schema.orders.providerCheckoutId} is not null`))
    .limit(5);
  for (const o of recent) await reconcileOrder(o, source, 60_000);
}

/**
 * Pending checkouts older than a day are treated as abandoned.
 *
 * We deliberately don't listen to PayMongo's `payment.failed`: it's about a
 * single payment attempt (linked to a payment intent, not our checkout
 * session), and on hosted checkout the buyer can simply try again with
 * another method on the same session. Failing the order on the first failed
 * attempt would show "No payment was made" while they're still paying.
 * Cancelling from checkout already marks the order failed (cancelOrder).
 */
export async function expireStaleOrders(siteId: string) {
  await getDb()
    .update(schema.orders)
    .set({ status: "expired", updatedAt: new Date() })
    .where(
      and(
        eq(schema.orders.siteId, siteId),
        eq(schema.orders.status, "pending"),
        sql`${schema.orders.createdAt} < now() - interval '24 hours'`,
      ),
    );
}
