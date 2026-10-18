/**
 * Discount codes: finding one, checking it can be used, and what it does to a price.
 * Prices and the rules for each code type come from src/config/pricing.ts.
 *
 * Uses are counted only on a confirmed payment (`countUse`, called inside the transaction that
 * marks the order paid), so an abandoned checkout never uses up a code. Codes only apply to a
 * gift's first plan (not upgrades or extensions).
 */
import { and, eq, sql } from "drizzle-orm";
import { discountedAmount, getTier, type Tier } from "@/config/pricing";
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

/** How many paid orders this person has with this code. */
async function usesBy(codeId: string, userId: string, db: Db) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.orders)
    .where(and(eq(schema.orders.discountCodeId, codeId), eq(schema.orders.ownerId, userId), eq(schema.orders.status, "paid")));
  return row?.n ?? 0;
}

/** Why this code can't be used for this plan by this person right now, or null if it can. */
export async function codeProblem(code: DiscountCode | null, tier: Tier | null, userId: string, db: Db = getDb(), now = new Date()): Promise<string | null> {
  if (!code) return "We don't know that code. Check the spelling?";
  if (!code.active) return "That code isn't working anymore.";
  if (code.expiresAt && code.expiresAt.getTime() <= now.getTime()) return "That code has ended.";
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return "That code has been used up.";
  if (tier && code.plans.length > 0 && !code.plans.includes(tier.id)) {
    const names = code.plans.map((p) => getTier(p)?.name ?? p);
    return `That code works on the ${names.join(" or ")} plan${names.length > 1 ? "s" : ""}.`;
  }
  if (code.maxPerUser !== null && (await usesBy(code.id, userId, db)) >= code.maxPerUser) return "You've already used that code.";
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
