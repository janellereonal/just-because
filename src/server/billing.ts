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
import { notifyGiftLive } from "./notify";
import type { PaidEvent } from "./payments/types";

type Site = typeof schema.giftSites.$inferSelect;

/* ---------------- open / ended ---------------- */

export function isExpired(site: Pick<Site, "expiresAt">, now = new Date()) {
  return !!site.expiresAt && site.expiresAt.getTime() <= now.getTime();
}

/** The recipient link works: published, paid (or legacy) and not ended. */
export function isOpen(site: Pick<Site, "status" | "tier" | "expiresAt"> & { disabledAt?: Date | null }) {
  return site.status === "published" && !!site.tier && !isExpired(site) && !site.disabledAt;
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

/**
 * Marks the order paid and opens (or upgrades) the gift, exactly once per
 * order. Safe to call again for the same event or order: it does nothing.
 * Returns what happened, for logging.
 */
export async function applyPaidEvent(event: PaidEvent, provider: string): Promise<string> {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.webhookEvents)
      .values({ id: `${provider}:${event.eventId}`, provider, type: event.eventType })
      .onConflictDoNothing()
      .returning({ id: schema.webhookEvents.id });
    if (inserted.length === 0) return { msg: "duplicate event, skipped" };

    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.providerCheckoutId, event.checkoutId))
      .for("update");
    if (!order) return { msg: `no order for checkout ${event.checkoutId}` };
    if (event.orderId && event.orderId !== order.id)
      return { msg: `order mismatch: session says ${event.orderId}, we have ${order.id}` };
    if (order.status === "paid") return { msg: `order ${order.id} already paid` };
    if (event.amountPaid < order.amount)
      return { msg: `order ${order.id}: paid ${event.amountPaid} < expected ${order.amount}, not publishing` };

    const tier = getTier(order.tier)!;
    const now = new Date();
    await tx
      .update(schema.orders)
      .set({ status: "paid", providerPaymentId: event.paymentId, updatedAt: now })
      .where(eq(schema.orders.id, order.id));

    const [site] = await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, order.siteId)).for("update");
    if (!site) return { msg: `order ${order.id}: gift was deleted` };

    // Paid twice (e.g. two tabs)? Keep the better plan and flag it. Refunds would be handled here later
    // (see "Refunds" in HANDOFF.md). Extends always stack, so paying twice just adds more time.
    const alreadyCovered =
      order.kind === "upgrade"
        ? tierRank(site.tier) >= tierRank(tier.id)
        : order.kind === "extend"
          ? !getTier(site.tier)
          : !!site.tier;
    if (alreadyCovered) {
      console.warn(`[payments] order ${order.id} paid but gift ${site.id} already on ${site.tier}. Needs a refund.`);
      return { msg: `order ${order.id}: duplicate payment flagged for refund` };
    }

    if (order.kind === "extend") {
      const expiresAt = extendedExpiry(site.expiresAt, tier, now);
      await tx.update(schema.giftSites).set({ expiresAt }).where(eq(schema.giftSites.id, site.id));
      return { msg: `order ${order.id}: extended gift ${site.id} to ${expiresAt.toISOString()}` };
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
        .set({ tier: tier.id, expiresAt })
        .where(eq(schema.giftSites.id, site.id));
      return { msg: `order ${order.id}: upgraded gift ${site.id} to ${tier.id}` };
    }
    await tx
      .update(schema.giftSites)
      .set({ status: "published", tier: tier.id, publishedAt: now, expiresAt: expiryFrom(now, tier) })
      .where(eq(schema.giftSites.id, site.id));
    return { msg: `order ${order.id}: published gift ${site.id} on ${tier.id}`, publishedSiteId: site.id };
  });
  if ("publishedSiteId" in result && result.publishedSiteId) {
    await notifyGiftLive(result.publishedSiteId).catch((e) => console.error("[notify]", e));
  }
  return result.msg;
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
