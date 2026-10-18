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
  await g.delete(db.schema.orders).where(like(db.schema.orders.discountCode, `${tag.toUpperCase()}%`));
  await g.delete(db.schema.discountCodes).where(like(db.schema.discountCodes.code, `${tag.toUpperCase()}%`));
});

async function newCode(suffix: string, values: Partial<typeof import("./db").schema.discountCodes.$inferInsert> = {}) {
  const [row] = await db
    .getDb()
    .insert(db.schema.discountCodes)
    .values({ code: `${tag.toUpperCase()}${suffix}`, type: "percent", value: 20, ...values })
    .returning();
  return row!;
}
const codeOf = async (id: string) => (await db.getDb().select().from(db.schema.discountCodes).where(eq(db.schema.discountCodes.id, id)))[0]!;

d("discount codes", () => {
  test("a percent code lowers the quote, ignores case, and counts once only when paid", async () => {
    const code = await newCode("PCT", { maxUses: 5 });
    const site = await newGift();
    const q = await billing.quote(site, "sweet", { code: code.code.toLowerCase(), userId });
    expect(q.amount).toBe(23900);
    expect(q.discount?.off).toBe(6000);
    // Checkout started but not paid: no use counted.
    const order = await newOrder(site.id, { tier: "sweet", amount: q.amount });
    await db.getDb().update(db.schema.orders).set({ discountCodeId: code.id, discountCode: code.code, discountAmount: q.discount!.off }).where(eq(db.schema.orders.id, order.id));
    expect((await codeOf(code.id)).usedCount).toBe(0);
    fake.pay(order.providerCheckoutId!);
    const paid = (await provider.checkPaid(order.providerCheckoutId!))!;
    await billing.applyPaidEvent(paid, "paymongo", "webhook");
    await billing.applyPaidEvent(paid, "paymongo", "confirm");
    await billing.applyPaidEvent({ ...paid, eventId: "evt_again" }, "paymongo", "webhook");
    expect((await codeOf(code.id)).usedCount).toBe(1);
    // Max one per person by default.
    const other = await newGift();
    await expect(billing.quote(other, "sweet", { code: code.code, userId })).rejects.toThrow("already used");
  });

  test("codes that are off, ended, used up or for another plan are refused", async () => {
    const site = await newGift();
    const off = await newCode("OFF", { active: false });
    const ended = await newCode("END", { expiresAt: new Date(Date.now() - 1000) });
    const used = await newCode("USED", { maxUses: 1, usedCount: 1 });
    const sweetOnly = await newCode("SWT", { type: "free", value: 0, plans: ["sweet"] });
    await expect(billing.quote(site, "sweet", { code: off.code, userId })).rejects.toThrow("isn't working");
    await expect(billing.quote(site, "sweet", { code: ended.code, userId })).rejects.toThrow("ended");
    await expect(billing.quote(site, "sweet", { code: used.code, userId })).rejects.toThrow("used up");
    await expect(billing.quote(site, "keepsake", { code: sweetOnly.code, userId })).rejects.toThrow("Sweet plan");
    await expect(billing.quote(site, "sweet", { code: "NOPE-NOT-A-CODE", userId })).rejects.toThrow("don't know");
    expect((await billing.quote(site, "sweet", { code: sweetOnly.code, userId })).amount).toBe(0);
  });

  test("a free code opens the gift without a payment, and its last use can't be taken twice", async () => {
    const code = await newCode("FREE", { type: "free", value: 0, maxUses: 1, maxPerUser: null });
    const open = async () => {
      const site = await newGift();
      const id = crypto.randomUUID();
      const checkoutId = `free_${id}`;
      checkouts.push(checkoutId);
      await db.getDb().insert(db.schema.orders).values({ id, siteId: site.id, ownerId: userId, kind: "publish", tier: "sweet", amount: 0, provider: "free", providerCheckoutId: checkoutId, discountCodeId: code.id, discountCode: code.code, discountAmount: 29900 });
      await billing.applyPaidEvent({ eventId: checkoutId, eventType: "free_code", checkoutId, orderId: id, paymentId: null, amountPaid: 0 }, "free", "confirm");
      return { site: await siteOf(site.id), order: await orderOf(id) };
    };
    const [a, b] = await Promise.all([open(), open()]);
    const winners = [a, b].filter((r) => r.order.status === "paid");
    expect(winners.length).toBe(1);
    expect(winners[0]!.site.status).toBe("published");
    expect(winners[0]!.site.tier).toBe("sweet");
    const loser = [a, b].find((r) => r.order.status !== "paid")!;
    expect(loser.order.status).toBe("failed");
    expect(loser.site.status).toBe("draft");
    expect((await codeOf(code.id)).usedCount).toBe(1);
  });
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
    // Not reported as a plain "paid": the order says it's owed back, with the whole amount.
    expect((await orderOf(second.id)).status).toBe("refund_pending");
    expect((await billing.refundsDue([second.id])).get(second.id)).toBe(second.amount);
    // Reported again (webhook retry, confirm page): nothing more happens, still one refund line.
    await billing.applyPaidEvent({ ...(await provider.checkPaid(second.providerCheckoutId!))!, eventId: "evt_retry" }, "paymongo", "webhook");
    expect(await billing.reconcileOrder(await orderOf(second.id), "confirm", 0)).toBe(true);
    expect((await billing.refundsDue([second.id])).get(second.id)).toBe(second.amount);
    expect((await siteOf(site.id)).tier).toBe("celebration");
  });

  test("two first-plan checkouts paid: the higher plan wins as an upgrade, the extra is flagged", async () => {
    // Sweet in one tab, Keepsake in the other, both paid (Sweet first).
    const site = await newGift();
    const sweet = await newOrder(site.id, { tier: "sweet", amount: 29900 });
    const keepsake = await newOrder(site.id, { tier: "keepsake", amount: 99900 });
    fake.pay(sweet.providerCheckoutId!);
    fake.pay(keepsake.providerCheckoutId!);
    await billing.reconcileOrder(sweet, "confirm", 0);
    const sweetEnd = (await siteOf(site.id)).expiresAt!;
    const msg = await billing.applyPaidEvent((await provider.checkPaid(keepsake.providerCheckoutId!))!, "paymongo", "webhook");
    expect(msg).toContain("upgraded");
    const s = await siteOf(site.id);
    expect(s.tier).toBe("keepsake");
    // Keepsake runs 36 months, Sweet 3: 33 more months on top of Sweet's end date.
    const months = (s.expiresAt!.getUTCFullYear() - sweetEnd.getUTCFullYear()) * 12 + s.expiresAt!.getUTCMonth() - sweetEnd.getUTCMonth();
    expect(months).toBe(33);
    expect((await orderOf(keepsake.id)).status).toBe("paid");
    // ₱999 + ₱299 paid for a ₱999 plan: ₱299 goes back.
    expect((await billing.refundsDue([keepsake.id])).get(keepsake.id)).toBe(29900);
  });

  test("two first-plan checkouts paid the other way round: the lower one is refunded in full", async () => {
    const site = await newGift();
    const keepsake = await newOrder(site.id, { tier: "keepsake", amount: 99900 });
    const sweet = await newOrder(site.id, { tier: "sweet", amount: 29900 });
    fake.pay(keepsake.providerCheckoutId!);
    fake.pay(sweet.providerCheckoutId!);
    await billing.reconcileOrder(keepsake, "confirm", 0);
    await billing.reconcileOrder(sweet, "confirm", 0);
    expect((await siteOf(site.id)).tier).toBe("keepsake");
    expect((await orderOf(sweet.id)).status).toBe("refund_pending");
    expect((await billing.refundsDue([sweet.id])).get(sweet.id)).toBe(29900);
  });

  test("two upgrade tabs to the same plan: the second is refunded in full", async () => {
    const site = await newGift("published", "sweet");
    const a = await newOrder(site.id, { kind: "upgrade", tier: "celebration", amount: 30000 });
    const b = await newOrder(site.id, { kind: "upgrade", tier: "celebration", amount: 30000 });
    await db.getDb().update(db.schema.orders).set({ fromTier: "sweet" }).where(inArray(db.schema.orders.id, [a.id, b.id]));
    fake.pay(a.providerCheckoutId!);
    fake.pay(b.providerCheckoutId!);
    await billing.reconcileOrder(a, "confirm", 0);
    await billing.reconcileOrder(b, "confirm", 0);
    expect((await siteOf(site.id)).tier).toBe("celebration");
    expect((await orderOf(a.id)).status).toBe("paid");
    expect((await orderOf(b.id)).status).toBe("refund_pending");
    expect((await billing.refundsDue([a.id, b.id])).get(b.id)).toBe(30000);
    expect((await billing.refundsDue([a.id])).get(a.id)).toBeUndefined();
  });

  test("a stale upgrade is applied from the plan the gift is really on, and the overpayment flagged", async () => {
    // Sweet gift. Tab A: upgrade to Keepsake (₱700). Tab B: upgrade to Celebration (₱300). Pay B, then A.
    const site = await newGift("published", "sweet");
    const a = await newOrder(site.id, { kind: "upgrade", tier: "keepsake", amount: 70000 });
    const b = await newOrder(site.id, { kind: "upgrade", tier: "celebration", amount: 30000 });
    await db.getDb().update(db.schema.orders).set({ fromTier: "sweet" }).where(inArray(db.schema.orders.id, [a.id, b.id]));
    fake.pay(b.providerCheckoutId!);
    fake.pay(a.providerCheckoutId!);
    await billing.reconcileOrder(b, "confirm", 0);
    expect((await siteOf(site.id)).tier).toBe("celebration");
    const msg = await billing.applyPaidEvent((await provider.checkPaid(a.providerCheckoutId!))!, "paymongo", "webhook");
    expect(msg).toContain("from celebration");
    expect((await siteOf(site.id)).tier).toBe("keepsake");
    expect((await orderOf(a.id)).status).toBe("paid");
    // ₱1,000 paid for a ₱700 upgrade: ₱300 goes back.
    expect((await billing.refundsDue([a.id])).get(a.id)).toBe(30000);
    expect((await billing.refundsDue([b.id])).get(b.id)).toBeUndefined();
  });

  test("a paid gift that has been paused still gets what was paid for, and stays paused", async () => {
    const site = await newGift();
    await db.getDb().update(db.schema.giftSites).set({ disabledAt: new Date() }).where(eq(db.schema.giftSites.id, site.id));
    const order = await newOrder(site.id);
    fake.pay(order.providerCheckoutId!);
    const msg = await billing.applyPaidEvent((await provider.checkPaid(order.providerCheckoutId!))!, "paymongo", "webhook");
    expect(msg).toContain("paused");
    const s = await siteOf(site.id);
    expect(s.tier).toBe("celebration");
    expect(s.disabledAt).not.toBeNull();
  });

  test("a paused gift can't be quoted for any plan or an extension", async () => {
    const draft = await newGift();
    const paidGift = await newGift("published", "sweet");
    await db.getDb().update(db.schema.giftSites).set({ disabledAt: new Date() }).where(inArray(db.schema.giftSites.id, [draft.id, paidGift.id]));
    await expect(billing.quote(await siteOf(draft.id), "keepsake", { userId })).rejects.toThrow("paused");
    await expect(billing.quote(await siteOf(paidGift.id), "keepsake", { userId })).rejects.toThrow("paused");
    expect(() => billing.quoteExtend({ ...paidGift, disabledAt: new Date() })).toThrow("paused");
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
