/**
 * Guests' gifts move to their account on sign-in. LOCAL database only (skipped otherwise).
 * Run: bun test src/server/guests
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");
const d = local ? describe : describe.skip;

let db: typeof import("./db");
let guests: typeof import("./guests");
const tag = `gt${Date.now().toString(36)}`;
const guestId = `${tag}-guest`;
const userId = `${tag}-user`;

beforeAll(async () => {
  if (!local) return;
  db = await import("./db");
  guests = await import("./guests");
  await db.getDb().insert(db.schema.user).values([
    { id: guestId, name: "Guest", email: `temp-${tag}@${guests.GUEST_EMAIL_DOMAIN}`, isAnonymous: true },
    { id: userId, name: "Real", email: `${tag}@example.test` },
  ]);
});

afterAll(async () => {
  if (!local) return;
  await db.getDb().delete(db.schema.user).where(inArray(db.schema.user.id, [guestId, userId]));
});

d("guests", () => {
  test("a guest's gifts and orders move to the account they sign in to", async () => {
    const g = db.getDb();
    const [site] = await g.insert(db.schema.giftSites).values({ creatorId: guestId, title: `${tag} gift`, slug: `${tag}-a` }).returning();
    const [order] = await g.insert(db.schema.orders).values({ siteId: site!.id, ownerId: guestId, tier: "sweet", amount: 29900 }).returning();
    expect(await guests.giftCount(guestId)).toBe(1);
    expect(await guests.claimGuestGifts(guestId, userId)).toBe(1);
    const [after] = await g.select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, site!.id));
    expect(after!.creatorId).toBe(userId);
    const [o] = await g.select().from(db.schema.orders).where(eq(db.schema.orders.id, order!.id));
    expect(o!.ownerId).toBe(userId);
    // Deleting the guest row afterwards (what the plugin does) leaves the gift alone.
    await g.delete(db.schema.user).where(eq(db.schema.user.id, guestId));
    const [still] = await g.select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, site!.id));
    expect(still).toBeTruthy();
    await g.delete(db.schema.orders).where(eq(db.schema.orders.id, order!.id));
    await g.delete(db.schema.giftSites).where(eq(db.schema.giftSites.id, site!.id));
  });

  test("guest addresses are never mailed", () => {
    expect(guests.isGuestEmail(`temp-1@${guests.GUEST_EMAIL_DOMAIN}`)).toBe(true);
    expect(guests.isGuestEmail("ana@example.com")).toBe(false);
    expect(guests.claimGuestGifts("same", "same")).resolves.toBe(0);
  });
});
