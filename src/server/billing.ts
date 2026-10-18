/**
 * Plans, limits and payments for gifts. Prices come only from
 * src/config/pricing.ts; nothing about an amount is taken from the browser.
 */
import { track } from "@/server/events";
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
  tierAllowsLook,
  tierRank,
  type Tier,
  type TierId,
} from "@/config/pricing";
import { getDb, schema } from "./db";
import { HttpError } from "./guards";
import { codeProblem, countUse, findCode, limitProblem, priceWith } from "./discounts";
import { PAY_SAFETY_COPY } from "@/copy/strings";
import { notifyPaid } from "./notify";
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

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Db = ReturnType<typeof getDb> | Tx;

/**
 * Contributors are counted as different devices (friends don't have accounts,
 * so each browser keeps a random id in localStorage). Older notes sent before
 * device ids existed fall back to the name, and a name already seen with a
 * device id isn't counted twice. Hidden items don't count, so an owner can make
 * room by hiding something. The owner's own notes aren't a friend, so they never
 * take a contributor slot (their photos still count towards the photo cap).
 */
export async function siteUsage(siteId: string, db: Db = getDb()) {
  const rows = await db.execute<{ contributors: number; photos: number }>(sql`
    with live as (
      select device_id, lower(trim(author_name)) as name, module_type, by_owner
      from contributions
      where site_id = ${siteId} and status in ('pending', 'approved')
    ), friends as (
      select device_id, name from live where not by_owner
    )
    select
      ((select count(distinct device_id) from friends where device_id is not null)
        + (select count(distinct name) from friends
           where device_id is null
             and name not in (select name from friends where device_id is not null)))::int as contributors,
      (select count(*) from live where module_type = 'photobooth')::int as photos
  `);
  const row = rows[0];
  return { contributors: Number(row?.contributors ?? 0), photos: Number(row?.photos ?? 0) };
}

export type Usage = Awaited<ReturnType<typeof siteUsage>>;

/** Why a tier doesn't fit this gift right now, or null if it does. */
export function tierBlocker(tier: Tier, usage: Usage, format: string, style?: string | null): string | null {
  if (usage.contributors > tier.contributors.cap)
    return `This gift has ${usage.contributors} contributors. ${tier.name} fits ${tier.contributors.cap}.`;
  if (usage.photos > tier.photos.cap)
    return `This gift has ${usage.photos} photos. ${tier.name} fits ${tier.photos.cap}.`;
  if (!tierAllowsLook(tier, format, style))
    return `${tier.name} doesn't include this format. Switch to ${tier.formats.map((f) => formatInfo(f).title).join(" or ")} to use it.`;
  return null;
}

/**
 * Is there room for one more item from this friend on this gift?
 * A friend is "already in" if this device has added before, or (for notes
 * from before device ids) the same name has. The owner's own notes only count
 * towards the photo cap. Only paid tiers have caps. Drafts are free to collect
 * in; the tier picker checks fit at checkout.
 *
 * On its own this is only a guess: two friends asking at once both hear "yes".
 * Anything that adds or shows an item goes through `withRoom`, which checks and
 * saves under one lock.
 */
export async function checkRoom(
  site: Site,
  authorName: string,
  moduleType: string,
  deviceId: string | null = null,
  opts: { byOwner?: boolean; db?: Db } = {},
) {
  if (site.status !== "published") return { ok: true as const };
  if (isExpired(site)) return { ok: false as const, reason: "ended" as const };
  const tier = getTier(site.tier);
  if (!tier) return { ok: true as const }; // legacy: no caps
  const db = opts.db ?? getDb();
  const usage = await siteUsage(site.id, db);
  if (!opts.byOwner) {
    const c = schema.contributions;
    const sameName = sql`lower(trim(${c.authorName})) = lower(trim(${authorName}))`;
    const [known] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(c)
      .where(
        and(
          eq(c.siteId, site.id),
          inArray(c.status, ["pending", "approved"]),
          eq(c.byOwner, false),
          deviceId ? sql`(${c.deviceId} = ${deviceId} or (${c.deviceId} is null and ${sameName}))` : sameName,
        ),
      );
    const isNewPerson = (known?.n ?? 0) === 0;
    if (isNewPerson && usage.contributors >= tier.contributors.cap)
      return { ok: false as const, reason: "contributors" as const };
  }
  if (moduleType === "photobooth" && usage.photos >= tier.photos.cap)
    return { ok: false as const, reason: "photos" as const };
  return { ok: true as const };
}

/**
 * Checks for room and saves in one transaction, holding a lock on the gift's caps, so friends
 * sending at the same moment are counted one after another and can't pass a cap together
 * (9 of 10 friends plus 3 at once stays at 10). The lock is a transaction-scoped advisory lock
 * just for this (not the gift row), so the editor can keep saving the gift meanwhile.
 *
 * `run` gets the transaction and the gift as it is now, and calls `room()` for each item it is
 * about to add or show; it must save through the same transaction.
 */
export async function withRoom<T>(siteId: string, run: (tx: Tx, site: Site, room: (who: RoomCheck) => Promise<RoomResult>) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`room:${siteId}`}))`);
    const [site] = await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
    if (!site) throw new HttpError(404, "We couldn't find that gift.");
    return run(tx, site, (who) => checkRoom(site, who.authorName, who.moduleType, who.deviceId ?? null, { byOwner: who.byOwner ?? false, db: tx }));
  });
}

type RoomCheck = { authorName: string; moduleType: string; deviceId?: string | null; byOwner?: boolean };
type RoomResult = Awaited<ReturnType<typeof checkRoom>>;

/* ---------------- pricing quotes ---------------- */

async function promoAvailable(db: Db) {
  if (!promo.enabled) return false;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.promoApplied, true), eq(schema.orders.status, "paid")));
  return (row?.n ?? 0) < promo.maxUses;
}

export type Quote = {
  kind: "publish" | "upgrade" | "extend";
  tier: Tier;
  fromTier: TierId | null;
  /** What to charge, in centavos (after any promo or code). 0 means a free code covers it. */
  amount: number;
  promoApplied: boolean;
  /** The code used, and how much it took off. */
  discount: { id: string; code: string; off: number } | null;
};

/**
 * Works out what this gift owes for `tierId`, with an optional discount code (first plan only;
 * it replaces the early-bird promo rather than stacking). Throws a friendly error if it can't
 * be bought or the code can't be used.
 */
export async function quote(site: Site, tierId: string, opts: { code?: string | null | undefined; userId?: string; db?: Db } = {}): Promise<Quote> {
  // Inside openCheckout this is its transaction: reading through it (not the pool) means a
  // request holding the checkout lock never waits for a free connection held by those queued behind it.
  const db = opts.db ?? getDb();
  const tier = getTier(tierId);
  if (!tier) throw new HttpError(400, "That plan doesn't exist.");
  if (site.disabledAt) throw new HttpError(403, PAY_SAFETY_COPY.paused);
  if (site.tier === LEGACY_TIER) throw new HttpError(400, "This gift is already open for good. No payment needed.");
  const onPlan = getTier(site.tier);
  if (onPlan && tierRank(tier.id) <= tierRank(onPlan.id)) throw new HttpError(400, `This gift is already on ${onPlan.name}.`);

  const usage = await siteUsage(site.id, db);
  const blocker = tierBlocker(tier, usage, site.format, site.style);
  if (blocker) throw new HttpError(400, blocker);

  const current = getTier(site.tier);
  if (opts.code && current) throw new HttpError(400, "Codes work when you first pick a plan.");
  if (!current && opts.code) {
    const code = await findCode(opts.code, db);
    const problem = await codeProblem(code, tier, opts.userId ?? "", db, { siteId: site.id });
    if (problem || !code) throw new HttpError(400, problem ?? "We don't know that code.");
    const { amount, off } = priceWith(code, tier.amount);
    return { kind: "publish", tier, fromTier: null, amount, promoApplied: false, discount: { id: code.id, code: code.code, off } };
  }
  if (!current) {
    let amount = tier.amount;
    let promoApplied = false;
    if (await promoAvailable(db)) {
      amount = Math.max(amount - promo.amountOff, 100);
      promoApplied = true;
    }
    return { kind: "publish", tier, fromTier: null, amount, promoApplied, discount: null };
  }
  if (isExpired(site)) throw new HttpError(400, "This gift has ended. Extend it first, then you can upgrade.");
  if (tierRank(tier.id) <= tierRank(current.id))
    throw new HttpError(400, `This gift is already on ${current.name}.`);
  return { kind: "upgrade", tier, fromTier: current.id, amount: tier.amount - current.amount, promoApplied: false, discount: null };
}

/** Keeps a paid gift open for another stretch of its current plan. */
export function quoteExtend(site: Site): Quote {
  if (site.disabledAt) throw new HttpError(403, PAY_SAFETY_COPY.paused);
  if (site.tier === LEGACY_TIER) throw new HttpError(400, "This gift is already open for good. No payment needed.");
  const tier = getTier(site.tier);
  if (!tier) throw new HttpError(400, "Pick a plan to publish this gift first.");
  return { kind: "extend", tier, fromTier: tier.id, amount: tier.extendAmount, promoApplied: false, discount: null };
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
 * Order statuses that are final: the money arrived and we've decided what it bought.
 * `refund_pending` is a payment that bought nothing (paid twice, or the gift was deleted)
 * and has to be refunded by hand in the PayMongo dashboard for now (HANDOFF.md, Refunds).
 */
export const SETTLED_STATUSES = ["paid", "refund_pending"] as const;
export const isSettled = (status: string) => (SETTLED_STATUSES as readonly string[]).includes(status);

/**
 * Money we owe back is written to payment_log as its own line, `event = "refund due"`, with the
 * amount in centavos at the start of the outcome ("refund 29900: why"). Written in the same
 * transaction as the order update, so it's there exactly once. /admin lists these, and the
 * confirm page tells the buyer.
 */
export const REFUND_EVENT = "refund due";

/** A code used past its limit on a paid order (two checkouts started before the new checks). Needs a look by hand. */
export const CODE_REVIEW_EVENT = "code over limit";

export function refundAmountOf(outcome: string): number {
  const m = /^refund (\d+):/.exec(outcome);
  return m ? Number(m[1]) : 0;
}

async function recordRefund(tx: Tx, source: PaymentSource, order: { id: string; providerCheckoutId: string | null }, amount: number, why: string) {
  if (amount <= 0) return;
  await tx.insert(schema.paymentLog).values({
    source,
    event: REFUND_EVENT,
    outcome: `refund ${amount}: ${why}`.slice(0, 500),
    checkoutId: order.providerCheckoutId,
    orderId: order.id,
  });
}

/** What we owe back on each of these orders, in centavos. */
export async function refundsDue(orderIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (orderIds.length === 0) return out;
  const rows = await getDb()
    .select({ orderId: schema.paymentLog.orderId, outcome: schema.paymentLog.outcome })
    .from(schema.paymentLog)
    .where(and(eq(schema.paymentLog.event, REFUND_EVENT), inArray(schema.paymentLog.orderId, orderIds)));
  for (const r of rows) if (r.orderId) out.set(r.orderId, (out.get(r.orderId) ?? 0) + refundAmountOf(r.outcome));
  return out;
}

const peso = (centavos: number) => `₱${(centavos / 100).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

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
 *
 * Paid twice for one gift (two tabs, or an old checkout paid after a newer one)?
 *  - If this payment is for a higher plan than the gift has now, it's applied as an upgrade
 *    from the plan the gift is really on, and anything paid above that upgrade's price is
 *    flagged for a refund.
 *  - Otherwise it bought nothing: the order becomes `refund_pending` and the whole amount is
 *    flagged for a refund. Extends always stack, so paying twice just adds more time.
 * A paused gift still gets what was paid for (it stays paused); the log says so.
 */
type Purchased = { siteId: string; ownerId: string | null; plan: string; kind: string; method: string | null; cardOrigin: string | null };

export async function applyPaidEvent(event: PaidEvent, provider: string, source: PaymentSource = "webhook"): Promise<string> {
  const db = getDb();
  /** Set once the payment is applied, for the metrics event after the transaction. */
  let purchased: Purchased | null = null;
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.providerCheckoutId, event.checkoutId))
      .for("update");
    if (!order) return { msg: `no order for checkout ${event.checkoutId}` };
    if (event.orderId && event.orderId !== order.id)
      return { msg: `order mismatch: session says ${event.orderId}, we have ${order.id}`, orderId: order.id };
    if (isSettled(order.status)) return { msg: `order ${order.id} already paid`, orderId: order.id };
    // Amounts are only comparable in the same currency (₱599 is not $599).
    if (event.currency && event.currency.toUpperCase() !== order.currency.toUpperCase())
      return { msg: `order ${order.id}: paid in ${event.currency}, expected ${order.currency}, not publishing`, orderId: order.id };
    if (event.amountPaid < order.amount)
      return { msg: `order ${order.id}: paid ${event.amountPaid} < expected ${order.amount}, not publishing`, orderId: order.id };

    // Every code is checked again here, with the code row locked, counting confirmed uses only, so
    // its last use (or a "one per person" use) can't be taken twice. A free code over its limit is
    // refused: no money moved. A paid one is honoured (the buyer has paid) and flagged for a look.
    let codeOver: string | null = null;
    if (order.discountCodeId) {
      const [code] = await tx.select().from(schema.discountCodes).where(eq(schema.discountCodes.id, order.discountCodeId)).for("update");
      if (order.amount === 0) {
        const problem = await codeProblem(code ?? null, null, order.ownerId ?? "", tx, { paidOnly: true });
        if (problem) {
          await tx.update(schema.orders).set({ status: "failed", updatedAt: new Date() }).where(eq(schema.orders.id, order.id));
          return { msg: `order ${order.id}: free code ${order.discountCode} refused: ${problem}`, orderId: order.id, refused: problem };
        }
      } else if (code) {
        codeOver = await limitProblem(code, order.ownerId ?? "", tx, { paidOnly: true });
      }
    }

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
    const markOrder = (status: string) =>
      tx.update(schema.orders).set({ status, providerPaymentId: event.paymentId, updatedAt: now }).where(eq(schema.orders.id, order.id));

    const site = order.siteId
      ? (await tx.select().from(schema.giftSites).where(eq(schema.giftSites.id, order.siteId)).for("update"))[0]
      : undefined;
    if (!site) {
      // Kept as before: the order counts as paid (it was), and the money goes back.
      await markOrder("paid");
      if (order.discountCodeId) await countUse(order.discountCodeId, tx);
      await recordRefund(tx, source, order, order.amount, `order ${order.id} paid after its gift was deleted`);
      return { msg: `order ${order.id}: paid${late}, but its gift was deleted. Needs a refund.`, orderId: order.id };
    }

    // What this payment can still do for the gift as it is now (not as it was at checkout).
    const current = getTier(site.tier);
    const legacy = site.tier === LEGACY_TIER;
    const action: "extend" | "upgrade" | "publish" | "nothing" =
      order.kind === "extend"
        ? current
          ? "extend"
          : "nothing"
        : legacy
          ? "nothing"
          : !current
            ? "publish"
            : tierRank(tier.id) > tierRank(current.id)
              ? "upgrade"
              : "nothing";

    if (action === "nothing") {
      // Nothing to give for it. A free code that lost the race: no money moved, so it just fails.
      await markOrder(order.amount > 0 ? "refund_pending" : "failed");
      await recordRefund(tx, source, order, order.amount, `charged twice: gift ${site.id} was already on ${site.tier ?? "no plan"} when this ${order.kind} to ${tier.id} was paid`);
      return {
        msg:
          order.amount > 0
            ? `order ${order.id}: duplicate payment${late}, gift ${site.id} already on ${site.tier}. Needs a refund of ${peso(order.amount)}.`
            : `order ${order.id}: free code order not used, gift ${site.id} already on ${site.tier}. Nothing was charged.`,
        orderId: order.id,
      };
    }

    await markOrder("paid");
    // Counted once, together with the order turning paid.
    if (order.discountCodeId) await countUse(order.discountCodeId, tx);
    if (codeOver) {
      // Written once, with the order turning paid. Shown in /admin's payment log.
      await tx.insert(schema.paymentLog).values({
        source,
        event: CODE_REVIEW_EVENT,
        outcome: `order ${order.id} used ${order.discountCode} (${peso(order.discountAmount)} off) past its limit: ${codeOver} The gift opened anyway. Check it, and ask for the difference or let it go.`.slice(0, 500),
        checkoutId: order.providerCheckoutId,
        orderId: order.id,
      });
    }
    purchased = { siteId: site.id, ownerId: order.ownerId, plan: tier.id, kind: order.kind, method: event.method ?? null, cardOrigin: event.cardOrigin ?? null };
    const paused = site.disabledAt ? " (gift is paused: it stays paused)" : "";

    if (action === "extend") {
      const expiresAt = extendedExpiry(site.expiresAt, tier, now);
      // A new end date gets its own reminder.
      await tx.update(schema.giftSites).set({ expiresAt, expiryRemindedAt: null }).where(eq(schema.giftSites.id, site.id));
      return { msg: `order ${order.id}${late}: extended gift ${site.id} to ${expiresAt.toISOString()}${paused}`, orderId: order.id, paid: order.id };
    }

    if (action === "upgrade") {
      // From the plan the gift is really on now. Add the extra months on top of the current
      // end date, so earlier extensions are kept.
      const from = current!;
      const currentEnd = site.expiresAt ?? expiryFrom(site.publishedAt ?? now, from);
      const expiresAt = addMonths(currentEnd, tier.liveFor.months - from.liveFor.months);
      await tx
        .update(schema.giftSites)
        .set({ tier: tier.id, expiresAt, expiryRemindedAt: null })
        .where(eq(schema.giftSites.id, site.id));
      // Bought from another plan than the gift ended up on (two tabs): anything above the real
      // difference goes back. An upgrade from the expected plan was priced exactly; leave it be.
      const stale = order.kind !== "upgrade" || order.fromTier !== from.id;
      const over = stale ? order.amount - (tier.amount - from.amount) : 0;
      let note = "";
      if (over > 0) {
        await recordRefund(tx, source, order, over, `paid ${peso(order.amount)} for ${tier.id}, but the gift was already on ${from.id}, so it only cost ${peso(tier.amount - from.amount)}`);
        note = `. Paid ${peso(over)} too much: needs a refund of ${peso(over)}`;
      }
      return { msg: `order ${order.id}${late}: upgraded gift ${site.id} to ${tier.id} from ${from.id}${paused}${note}`, orderId: order.id, paid: order.id };
    }

    await tx
      .update(schema.giftSites)
      .set({ status: "published", tier: tier.id, publishedAt: now, expiresAt: expiryFrom(now, tier), expiryRemindedAt: null })
      .where(eq(schema.giftSites.id, site.id));
    return { msg: `order ${order.id}${late}: published gift ${site.id} on ${tier.id}${paused}`, orderId: order.id, paid: order.id };
  });
  await logPayment(source, event.eventType, result.msg, { checkoutId: event.checkoutId, orderId: result.orderId ?? null });
  if ("paid" in result && result.paid) {
    // One email per order: the receipt (with "it's live" for a first payment).
    await notifyPaid(result.paid).catch((e) => console.error("[notify]", e));
  }
  const bought = purchased as Purchased | null;
  if (bought) {
    const props: Record<string, string> = { plan: bought.plan, kind: bought.kind };
    if (bought.method) props["method"] = bought.method;
    if (bought.cardOrigin) props["card_origin"] = bought.cardOrigin;
    await track("plan_purchased", { siteId: bought.siteId, userId: bought.ownerId, props });
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
  if (isSettled(order.status) || !order.providerCheckoutId) return isSettled(order.status);
  if (order.provider === "free") return false; // free codes never went to a payment provider
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
    return /published|upgraded|extended|already paid|duplicate payment|Needs a refund/.test(msg);
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
