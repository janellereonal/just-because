/**
 * Discount codes: finding one, checking it can be used, and what it does to a price.
 * Prices and the rules for each code type come from src/config/pricing.ts.
 *
 * Uses are counted only on a confirmed payment (`countUse`, called inside the transaction that
 * marks the order paid), so an abandoned checkout never uses up a code. Codes only apply to a
 * gift's first plan (not upgrades or extensions).
 *
 * Limits also hold a use for every checkout that's still open with the code (from the last day,
 * after which an unpaid order counts as abandoned), so "one per person" can't be beaten by
 * starting checkouts on two gifts before paying either, and the last use of a limited code can't
 * be started by two people at once. `openCheckout` checks codes one at a time per code (a lock),
 * and `applyPaidEvent` checks again when the money lands.
 */
import { eq, sql } from "drizzle-orm";
import { discountedAmount, getTier, type Tier } from "@/config/pricing";
import { CODE_LIMIT_COPY } from "@/copy/strings";
import { getDb, schema } from "./db";

export type DiscountCode = typeof schema.discountCodes.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type Db = ReturnType<typeof getDb> | Tx;

/** Trims and drops spaces, so "launch 20 " finds LAUNCH20. Case is ignored by the lookup. */
export function cleanCode(raw: string): string {
  return raw.replace(/\s+/g, "").slice(0, 40);
}

export async function findCode(raw: string, db: Db = getDb(), lock = false): Promise<DiscountCode | null> {
  const code = cleanCode(raw);
  if (!code) return null;
  const q = db
    .select()
    .from(schema.discountCodes)
    .where(sql`lower(${schema.discountCodes.code}) = lower(${code})`)
    .limit(1);
  const [row] = lock ? await q.for("update") : await q;
  return row ?? null;
}

/** How long an unpaid checkout holds a use of its code (after that it counts as abandoned). */
const HOLD = sql`interval '24 hours'`;

export type CodeCount = {
  /** The gift being paid for. Its own open checkouts don't hold a use: starting again reuses or closes them. */
  siteId?: string | null;
  /** Count confirmed uses only, as when a payment lands (the order being paid isn't paid yet, so it's left out). */
  paidOnly?: boolean;
  now?: Date;
};

/**
 * Uses of this code: confirmed (`used`), and held by checkouts still open on other gifts (`held`),
 * overall and by this person. One statement, so an order turning paid in between is counted once.
 */
async function usesOf(code: DiscountCode, userId: string, db: Db, opts: CodeCount) {
  const o = schema.orders;
  const open = opts.paidOnly
    ? sql`false`
    : sql`${o.status} = 'pending' and ${o.createdAt} > now() - ${HOLD} and ${o.siteId} is distinct from ${opts.siteId ?? null}::uuid`;
  const rows = await db.execute<{ used: number; held: number; mine_used: number; mine_held: number }>(sql`
    select
      (select ${schema.discountCodes.usedCount} from ${schema.discountCodes} where ${schema.discountCodes.id} = ${code.id})::int as used,
      count(*) filter (where ${open})::int as held,
      count(*) filter (where ${o.ownerId} = ${userId} and ${o.status} = 'paid')::int as mine_used,
      count(*) filter (where ${o.ownerId} = ${userId} and ${open})::int as mine_held
    from ${o}
    where ${o.discountCodeId} = ${code.id}
  `);
  const r = rows[0];
  return { used: Number(r?.used ?? code.usedCount), held: Number(r?.held ?? 0), mineUsed: Number(r?.mine_used ?? 0), mineHeld: Number(r?.mine_held ?? 0) };
}

/** Why this code can't be used for this plan by this person right now, or null if it can. */
export async function codeProblem(code: DiscountCode | null, tier: Tier | null, userId: string, db: Db = getDb(), opts: CodeCount = {}): Promise<string | null> {
  const now = opts.now ?? new Date();
  if (!code) return "We don't know that code. Check the spelling?";
  if (!code.active) return "That code isn't working anymore.";
  if (code.expiresAt && code.expiresAt.getTime() <= now.getTime()) return "That code has ended.";
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return "That code has been used up.";
  if (tier && code.plans.length > 0 && !code.plans.includes(tier.id)) {
    const names = code.plans.map((p) => getTier(p)?.name ?? p);
    return `That code works on the ${names.join(" or ")} plan${names.length > 1 ? "s" : ""}.`;
  }
  return limitProblem(code, userId, db, opts);
}

/** Just the use limits (overall and per person), counted as `codeProblem` does. */
export async function limitProblem(code: DiscountCode, userId: string, db: Db = getDb(), opts: CodeCount = {}): Promise<string | null> {
  if (code.maxUses === null && code.maxPerUser === null) return null;
  const u = await usesOf(code, userId, db, opts);
  if (code.maxUses !== null && u.used >= code.maxUses) return "That code has been used up.";
  if (code.maxPerUser !== null && u.mineUsed >= code.maxPerUser) return "You've already used that code.";
  if (code.maxPerUser !== null && u.mineUsed + u.mineHeld >= code.maxPerUser) return CODE_LIMIT_COPY.yoursElsewhere;
  if (code.maxUses !== null && u.used + u.held >= code.maxUses) return CODE_LIMIT_COPY.allHeld;
  return null;
}

/** The price of `amount` with this code, and how much it took off. */
export function priceWith(code: DiscountCode, amount: number) {
  const next = discountedAmount(amount, code);
  return { amount: next, off: amount - next };
}

/** Counts one confirmed use. Call it inside the transaction that marks the order paid. */
export async function countUse(codeId: string, tx: Tx) {
  await tx
    .update(schema.discountCodes)
    .set({ usedCount: sql`${schema.discountCodes.usedCount} + 1` })
    .where(eq(schema.discountCodes.id, codeId));
}

/** Code guesses per person: 20 per 10 minutes (in memory, per server instance). */
const tries = new Map<string, number[]>();
export function tooManyTries(userId: string, now = Date.now()): boolean {
  const recent = (tries.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  tries.set(userId, recent);
  if (tries.size > 5000) tries.clear();
  return recent.length > 20;
}
