/**
 * Payment flows against a fake PayMongo and the LOCAL database. Skipped unless
 * DATABASE_URL points at localhost, so it can never touch the real one.
 * Run: bun test src/server/billing
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray, like } from "drizzle-orm";
import { startFakePaymongo } from "../../tools/payments/fake-paymongo";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");
const d = local ? describe : describe.skip;

let fake: ReturnType<typeof startFakePaymongo>;
let db: typeof import("./db");
let billing: typeof import("./billing");
let provider: import("./payments/types").PaymentProvider;
const tag = `bt${Date.now().toString(36)}`;
const userId = `${tag}-user`;
const checkouts: string[] = [];

async function newGift(status = "draft", tier: string | null = null) {
  const [site] = await db.getDb().insert(db.schema.giftSites).values({ creatorId: userId, title: `${tag} gift`, slug: `${tag}-${Math.random().toString(36).slice(2, 8)}`, status, tier }).returning();
  return site!;
}

async function newOrder(siteId: string, opts: { kind?: string; tier?: string; amount?: number; status?: string } = {}) {
  const checkoutId = `cs_${tag}${Math.random().toString(36).slice(2, 8)}`;
  checkouts.push(checkoutId);
  const [order] = await db
    .getDb()
    .insert(db.schema.orders)
    .values({ siteId, ownerId: userId, kind: opts.kind ?? "publish", tier: opts.tier ?? "celebration", amount: opts.amount ?? 59900, status: opts.status ?? "pending", providerCheckoutId: checkoutId })
    .returning();
  fake.add(checkoutId, order!.amount, order!.id);
  return order!;
}

const siteOf = async (id: string) => (await db.getDb().select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, id)))[0]!;
const orderOf = async (id: string) => (await db.getDb().select().from(db.schema.orders).where(eq(db.schema.orders.id, id)))[0]!;

beforeAll(async () => {
  if (!local) return;
  fake = startFakePaymongo();
  process.env["PAYMONGO_API_URL"] = fake.url;
  process.env["PAYMONGO_SECRET_KEY"] = "sk_test_fake";
  db = await import("./db");
  billing = await import("./billing");
  provider = (await import("./payments")).getProvider("paymongo");
  await db.getDb().insert(db.schema.user).values({ id: userId, name: "Billing Test", email: `${tag}@example.test` });
});

afterAll(async () => {
  if (!local) return;
  fake.stop();
  const g = db.getDb();
  await g.delete(db.schema.user).where(eq(db.schema.user.id, userId));
  await g.delete(db.schema.orders).where(inArray(db.schema.orders.providerCheckoutId, checkouts));
  await g.delete(db.schema.paymentLog).where(inArray(db.schema.paymentLog.checkoutId, checkouts));
  await g.delete(db.schema.webhookEvents).where(like(db.schema.webhookEvents.id, `%${tag}%`));
});

d("paying for a gift", () => {
  test("a paid checkout publishes the gift once, however many times it's reported", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!);
    const paid = (await provider.checkPaid(order.providerCheckoutId!))!;
    expect(await billing.applyPaidEvent(paid, "paymongo", "webhook")).toContain("published");
    expect(await billing.applyPaidEvent(paid, "paymongo", "webhook")).toContain("already paid");
    expect(await billing.applyPaidEvent({ ...paid, eventId: "evt_other" }, "paymongo", "webhook")).toContain("already paid");
    const s = await siteOf(site.id);
    expect(s.status).toBe("published");
    expect(s.tier).toBe("celebration");
    expect(s.expiresAt).not.toBeNull();
    expect((await orderOf(order.id)).status).toBe("paid");
    const events = await db.getDb().select().from(db.schema.webhookEvents).where(like(db.schema.webhookEvents.id, `%${order.providerCheckoutId}%`));
    expect(events.length).toBe(1);
  });

  test("paying after cancelling (or after it timed out) still opens the gift", async () => {
    for (const status of ["failed", "expired"]) {
      const site = await newGift();
      const order = await newOrder(site.id, { status });
      fake.pay(order.providerCheckoutId!);
      expect(await billing.reconcileOrder(order, "confirm", 0)).toBe(true);
      expect((await siteOf(site.id)).status).toBe("published");
      expect((await orderOf(order.id)).status).toBe("paid");
    }
  });

  test("a payment in another currency doesn't open it (₱599 is not $599)", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!, undefined, { currency: "USD", source: { type: "card", country: "US" } });
    const paid = (await provider.checkPaid(order.providerCheckoutId!))!;
    expect(await billing.applyPaidEvent(paid, "paymongo", "webhook")).toContain("paid in USD, expected PHP");
    expect((await siteOf(site.id)).status).toBe("draft");
    expect((await orderOf(order.id)).status).toBe("pending");
  });

  test("a foreign card is recorded on the purchase event, for the admin numbers", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!, undefined, { currency: "PHP", source: { type: "card", brand: "visa", country: "US" } });
    const paid = (await provider.checkPaid(order.providerCheckoutId!))!;
    expect(await billing.applyPaidEvent(paid, "paymongo", "webhook")).toContain("published");
    const [ev] = await db.getDb().select().from(db.schema.events).where(eq(db.schema.events.siteId, site.id));
    const props = ev?.props as Record<string, unknown> | undefined;
    expect(props?.["method"]).toBe("card");
    expect(props?.["card_origin"]).toBe("foreign");
  });

  test("an underpayment doesn't open it, and doesn't block the real payment later", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!, 100);
    expect(await billing.reconcileOrder(order, "confirm", 0)).toBe(false);
    expect((await siteOf(site.id)).status).toBe("draft");
    fake.pay(order.providerCheckoutId!, order.amount);
    expect(await billing.reconcileOrder(order, "confirm", 0)).toBe(true);
    expect((await siteOf(site.id)).status).toBe("published");
  });

  test("a second payment for the same plan is flagged for a refund, not applied twice", async () => {
    const site = await newGift();
    const first = await newOrder(site.id);
    const second = await newOrder(site.id);
    fake.pay(first.providerCheckoutId!);
    fake.pay(second.providerCheckoutId!);
    await billing.reconcileOrder(first, "confirm", 0);
    const msg = await billing.applyPaidEvent((await provider.checkPaid(second.providerCheckoutId!))!, "paymongo", "webhook");
    expect(msg).toContain("Needs a refund");
    const log = await db.getDb().select().from(db.schema.paymentLog).where(eq(db.schema.paymentLog.checkoutId, second.providerCheckoutId!));
    expect(log.some((l) => l.outcome.includes("refund"))).toBe(true);
  });

  test("an extend adds time on top of the end date", async () => {
    const site = await newGift();
    const pub = await newOrder(site.id);
    fake.pay(pub.providerCheckoutId!);
    await billing.reconcileOrder(pub, "confirm", 0);
    const before = (await siteOf(site.id)).expiresAt!;
    const ext = await newOrder(site.id, { kind: "extend", amount: 14900 });
    fake.pay(ext.providerCheckoutId!);
    expect(await billing.reconcileOrder(ext, "confirm", 0)).toBe(true);
    expect((await siteOf(site.id)).expiresAt!.getTime()).toBeGreaterThan(before.getTime());
  });

  test("nothing paid yet: nothing happens", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    expect(await billing.reconcileOrder(order, "confirm", 0)).toBe(false);
    expect((await orderOf(order.id)).status).toBe("pending");
  });
});

d("deleting", () => {
  test("deleting a gift or an account keeps the payment record", async () => {
    const site = await newGift();
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!);
    await billing.reconcileOrder(order, "confirm", 0);
    await db.getDb().delete(db.schema.giftSites).where(eq(db.schema.giftSites.id, site.id));
    const kept = await orderOf(order.id);
    expect(kept.status).toBe("paid");
    expect(kept.siteId).toBeNull();
  });
});
