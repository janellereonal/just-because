/**
 * Starting checkouts against a fake PayMongo and the LOCAL database: never two open checkouts
 * for one gift, never a checkout for a paused gift. Skipped unless DATABASE_URL points at
 * localhost, so it can never touch the real one.
 * Run: bun test src/server/checkout
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, inArray, like } from "drizzle-orm";
import { startFakePaymongo } from "../../tools/payments/fake-paymongo";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");
const d = local ? describe : describe.skip;

let fake: ReturnType<typeof startFakePaymongo>;
let db: typeof import("./db");
let billing: typeof import("./billing");
let checkout: typeof import("./checkout");
const tag = `ck${Date.now().toString(36)}`;
const user = { id: `${tag}-user`, email: `${tag}@example.test`, name: "Checkout Test" };
const siteIds: string[] = [];

async function newGift(status = "draft", tier: string | null = null) {
  const [site] = await db
    .getDb()
    .insert(db.schema.giftSites)
    .values({ creatorId: user.id, title: `${tag} gift`, slug: `${tag}-${Math.random().toString(36).slice(2, 8)}`, status, tier, ...(tier ? { publishedAt: new Date(), expiresAt: new Date(Date.now() + 60 * 86_400_000) } : {}) })
    .returning();
  siteIds.push(site!.id);
  return site!;
}

const siteOf = async (id: string) => (await db.getDb().select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, id)))[0]!;
const orderOf = async (id: string) => (await db.getDb().select().from(db.schema.orders).where(eq(db.schema.orders.id, id)))[0]!;
const ordersFor = (siteId: string) => db.getDb().select().from(db.schema.orders).where(eq(db.schema.orders.siteId, siteId));
const plan = (tier: string, extra: { code?: string; expect?: "publish" | "upgrade" } = {}) => ({ kind: "plan" as const, tier, ...extra });

beforeAll(async () => {
  if (!local) return;
  fake = startFakePaymongo();
  process.env["PAYMONGO_API_URL"] = fake.url;
  process.env["PAYMONGO_SECRET_KEY"] = "sk_test_fake";
  db = await import("./db");
  billing = await import("./billing");
  checkout = await import("./checkout");
  await db.getDb().insert(db.schema.user).values({ id: user.id, name: user.name, email: user.email });
});

afterAll(async () => {
  if (!local) return;
  fake.stop();
  const g = db.getDb();
  const orders = siteIds.length ? await g.select({ id: db.schema.orders.id }).from(db.schema.orders).where(inArray(db.schema.orders.siteId, siteIds)) : [];
  const ids = orders.map((o) => o.id);
  if (ids.length) {
    await g.delete(db.schema.paymentLog).where(inArray(db.schema.paymentLog.orderId, ids));
    await g.delete(db.schema.orders).where(inArray(db.schema.orders.id, ids));
  }
  await g.delete(db.schema.user).where(eq(db.schema.user.id, user.id));
  await g.delete(db.schema.webhookEvents).where(like(db.schema.webhookEvents.id, "%free_%"));
  await g.delete(db.schema.discountCodes).where(like(db.schema.discountCodes.code, `${tag.toUpperCase()}%`));
});

/** Pays a checkout at the fake and lets the confirm page notice. */
async function pay(orderId: string) {
  const order = await orderOf(orderId);
  fake.pay(order.providerCheckoutId!);
  await billing.reconcileOrder(order, "confirm", 0);
}

d("one open checkout per gift", () => {
  test("clicking again (or a second tab) for the same plan gets the same checkout", async () => {
    const site = await newGift();
    const a = await checkout.openCheckout(user, site.id, plan("sweet"));
    const b = await checkout.openCheckout(user, site.id, plan("sweet"));
    expect(b.orderId).toBe(a.orderId);
    expect(b.checkoutUrl).toBe(a.checkoutUrl);
    // Three at once still make one order.
    const many = await Promise.all([1, 2, 3].map(() => checkout.openCheckout(user, site.id, plan("sweet"))));
    expect(new Set(many.map((m) => m.orderId))).toEqual(new Set([a.orderId]));
    expect((await ordersFor(site.id)).length).toBe(1);
  });

  test("a checkout for another plan closes the older one, so it can't be paid as well", async () => {
    const site = await newGift();
    const sweet = await checkout.openCheckout(user, site.id, plan("sweet"));
    const keepsake = await checkout.openCheckout(user, site.id, plan("keepsake"));
    expect(keepsake.orderId).not.toBe(sweet.orderId);
    const old = await orderOf(sweet.orderId);
    expect(old.status).toBe("expired");
    expect(fake.sessions.get(old.providerCheckoutId!)!.expired).toBe(true);
    expect(() => fake.pay(old.providerCheckoutId!)).toThrow("expired");
    await pay(keepsake.orderId);
    const s = await siteOf(site.id);
    expect(s.tier).toBe("keepsake");
    expect((await ordersFor(site.id)).filter((o) => o.status === "paid").length).toBe(1);
  });

  test("two upgrade tabs for different plans: only the newest can be paid", async () => {
    const site = await newGift("published", "sweet");
    const toKeepsake = await checkout.openCheckout(user, site.id, plan("keepsake", { expect: "upgrade" }));
    const toCelebration = await checkout.openCheckout(user, site.id, plan("celebration", { expect: "upgrade" }));
    expect((await orderOf(toCelebration.orderId)).amount).toBe(30000);
    const old = await orderOf(toKeepsake.orderId);
    expect(() => fake.pay(old.providerCheckoutId!)).toThrow("expired");
    await pay(toCelebration.orderId);
    expect((await siteOf(site.id)).tier).toBe("celebration");
  });

  test("an older checkout that was just paid in another tab stops the new one", async () => {
    const site = await newGift();
    const sweet = await checkout.openCheckout(user, site.id, plan("sweet"));
    // Paid at PayMongo, but no webhook or confirm page has told us yet.
    fake.pay((await orderOf(sweet.orderId)).providerCheckoutId!);
    await expect(checkout.openCheckout(user, site.id, plan("keepsake"))).rejects.toMatchObject({ status: 409 });
    expect((await siteOf(site.id)).tier).toBe("sweet");
    expect((await orderOf(sweet.orderId)).status).toBe("paid");
    expect((await ordersFor(site.id)).filter((o) => o.status === "pending").length).toBe(0);
  });

  test("a same-plan checkout older than 30 minutes isn't handed out again", async () => {
    const site = await newGift();
    const first = await checkout.openCheckout(user, site.id, plan("sweet"));
    await db.getDb().update(db.schema.orders).set({ createdAt: new Date(Date.now() - 31 * 60_000) }).where(eq(db.schema.orders.id, first.orderId));
    const second = await checkout.openCheckout(user, site.id, plan("sweet"));
    expect(second.orderId).not.toBe(first.orderId);
    expect((await orderOf(first.orderId)).status).toBe("expired");
  });

  test("a plan picker showing first-plan prices can't start a checkout once the gift is paid", async () => {
    const site = await newGift();
    const sweet = await checkout.openCheckout(user, site.id, plan("sweet", { expect: "publish" }));
    await pay(sweet.orderId);
    // The other tab still shows full prices; the server would only charge the difference.
    await expect(checkout.openCheckout(user, site.id, plan("keepsake", { expect: "publish" }))).rejects.toMatchObject({ status: 409 });
    await expect(checkout.openCheckout(user, site.id, plan("sweet", { expect: "publish" }))).rejects.toThrow("already on Sweet");
    expect((await ordersFor(site.id)).length).toBe(1);
  });

  test("cancelling closes the checkout at PayMongo too", async () => {
    const site = await newGift();
    const started = await checkout.openCheckout(user, site.id, plan("sweet"));
    await checkout.cancelCheckout(await orderOf(started.orderId));
    const order = await orderOf(started.orderId);
    expect(order.status).toBe("failed");
    expect(fake.sessions.get(order.providerCheckoutId!)!.expired).toBe(true);
    // Trying again makes a fresh checkout.
    const again = await checkout.openCheckout(user, site.id, plan("sweet"));
    expect(again.orderId).not.toBe(started.orderId);
  });
});

d("paused gifts", () => {
  test("a paused gift can't start any checkout", async () => {
    const draft = await newGift();
    const live = await newGift("published", "sweet");
    await db.getDb().update(db.schema.giftSites).set({ disabledAt: new Date() }).where(inArray(db.schema.giftSites.id, [draft.id, live.id]));
    await expect(checkout.openCheckout(user, draft.id, plan("keepsake"))).rejects.toMatchObject({ status: 403 });
    await expect(checkout.openCheckout(user, live.id, plan("keepsake"))).rejects.toMatchObject({ status: 403 });
    await expect(checkout.openCheckout(user, live.id, { kind: "extend" })).rejects.toMatchObject({ status: 403 });
    expect((await ordersFor(draft.id)).length + (await ordersFor(live.id)).length).toBe(0);
  });
});

d("free codes", () => {
  test("a free code sent twice at once opens the gift once and is used once", async () => {
    const [code] = await db
      .getDb()
      .insert(db.schema.discountCodes)
      .values({ code: `${tag.toUpperCase()}FREE`, type: "free", value: 0, maxUses: 10, maxPerUser: null })
      .returning();
    const site = await newGift();
    const results = await Promise.allSettled([1, 2].map(() => checkout.openCheckout(user, site.id, plan("sweet", { code: code!.code, expect: "publish" }))));
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok.length).toBeGreaterThanOrEqual(1);
    // Whoever got through got the same order.
    expect(new Set(ok.map((r) => (r as PromiseFulfilledResult<{ orderId: string }>).value.orderId)).size).toBe(1);
    const orders = await ordersFor(site.id);
    expect(orders.length).toBe(1);
    expect(orders[0]!.status).toBe("paid");
    expect((await siteOf(site.id)).tier).toBe("sweet");
    const [after] = await db.getDb().select().from(db.schema.discountCodes).where(eq(db.schema.discountCodes.id, code!.id));
    expect(after!.usedCount).toBe(1);
  });
});

d("when an old checkout can't be closed", () => {
  test("the new checkout still opens, and if both get paid the extra is flagged for a refund", async () => {
    const site = await newGift();
    const sweet = await checkout.openCheckout(user, site.id, plan("sweet"));
    const sweetCheckout = (await orderOf(sweet.orderId)).providerCheckoutId!;
    // PayMongo refuses to expire it (a payment is under way on it).
    fake.sessions.get(sweetCheckout)!.busy = true;
    const keepsake = await checkout.openCheckout(user, site.id, plan("keepsake"));
    const log = await db.getDb().select().from(db.schema.paymentLog).where(eq(db.schema.paymentLog.orderId, sweet.orderId));
    expect(log.some((l) => l.event === "expire failed")).toBe(true);
    await pay(sweet.orderId);
    await pay(keepsake.orderId);
    expect((await siteOf(site.id)).tier).toBe("keepsake");
    expect((await billing.refundsDue([keepsake.orderId])).get(keepsake.orderId)).toBe(29900);
  });
});
