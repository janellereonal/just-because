/**
 * Guests: people who start a gift before making an account (flag guestStart).
 *
 * Better Auth's anonymous plugin gives them a real, signed session tied to a placeholder user
 * (`is_anonymous`, email at GUEST_EMAIL_DOMAIN), so every server function and privacy rule works
 * the same for them. When they sign in or sign up in the same browser, `claimGuestGifts` moves
 * everything they made to the real account, and the plugin then deletes the placeholder.
 */
import { and, count, eq } from "drizzle-orm";
import { getDb, schema } from "./db";
export { GUEST_EMAIL_DOMAIN, isGuestEmail } from "./guestEmail";

/** A guest can start this many gifts before being asked to sign in. Keeps bots from filling the database. */
export const GUEST_GIFT_LIMIT = 3;

/**
 * Moves a guest's gifts (and anything else tied to them) to the account they just signed in
 * to. Runs before the guest row is deleted, in one transaction, so nothing is ever lost:
 * if this fails, the sign-in fails and the guest keeps their gift.
 */
export async function claimGuestGifts(guestId: string, userId: string): Promise<number> {
  if (!guestId || !userId || guestId === userId) return 0;
  return getDb().transaction(async (tx) => {
    const moved = await tx
      .update(schema.giftSites)
      .set({ creatorId: userId })
      .where(eq(schema.giftSites.creatorId, guestId))
      .returning({ id: schema.giftSites.id });
    await tx.update(schema.orders).set({ ownerId: userId }).where(eq(schema.orders.ownerId, guestId));
    await tx.update(schema.conciergeRequests).set({ userId }).where(eq(schema.conciergeRequests.userId, guestId));
    await tx.update(schema.events).set({ userId }).where(eq(schema.events.userId, guestId));
    return moved.length;
  });
}

/** How many gifts this person has started (used to cap guests). */
export async function giftCount(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(schema.giftSites)
    .where(and(eq(schema.giftSites.creatorId, userId)));
  return Number(row?.n ?? 0);
}
