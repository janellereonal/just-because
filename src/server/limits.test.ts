/**
 * Plan caps and code limits when people do things at the same moment, against a fake PayMongo
 * and the LOCAL database. Skipped unless DATABASE_URL points at localhost.
 * Run: bun test src/server/limits
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq, inArray, like } from "drizzle-orm";
import { CODE_LIMIT_COPY } from "@/copy/strings";
import { startFakePaymongo } from "../../tools/payments/fake-paymongo";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");
const d = local ? describe : describe.skip;

let fake: ReturnType<typeof startFakePaymongo>;
let db: typeof import("./db");
let billing: typeof import("./billing");
let checkout: typeof import("./checkout");
const tag = `lim${Date.now().toString(36)}`;
const users = [1, 2, 3, 4].map((n) => ({ id: `${tag}-u${n}`, email: `${tag}${n}@example.test`, name: `Limits ${n}` }));
const user = users[0]!;
const siteIds: string[] = [];

async function newGift(status = "draft", tier: string | null = null, owner = user) {
  const [site] = await db
    .getDb()
    .insert(db.schema.giftSites)
    .values({ creatorId: owner.id, title: `${tag} gift`, slug: `${tag}-${Math.random().toString(36).slice(2, 8)}`, status, tier, ...(tier ? { publishedAt: new Date(), expiresAt: new Date(Date.now() + 60 * 86_400_000) } : {}) })
    .returning();
  siteIds.push(site!.id);
  return site!;
}

type Note = { name: string; type?: string; device?: string | null; byOwner?: boolean };

/** What submitContribution / saveOwnerNote do: check for room and save, under the gift's lock. */
function send(siteId: string, n: Note) {
  const type = n.type ?? "letters";
  const device = n.byOwner ? null : n.device === undefined ? crypto.randomUUID() : n.device;
  return billing.withRoom(siteId, async (tx, _site, room) => {
    const fits = await room({ authorName: n.name, moduleType: type, deviceId: device, byOwner: n.byOwner ?? false });
    if (!fits.ok) return fits.reason;
    await tx.insert(db.schema.contributions).values({ siteId, moduleType: type, authorName: n.name, status: n.byOwner ? "approved" : "pending", deviceId: device, byOwner: n.byOwner ?? false });
    return "ok";
  });
}

/** Adds rows directly (setting a gift up, not racing). */
async function fill(siteId: string, count: number, n: Omit<Note, "name"> & { name?: string }) {
  for (let i = 0; i < count; i++) {
    await db.getDb().insert(db.schema.contributions).values({
      siteId,
      moduleType: n.type ?? "letters",
      authorName: n.name ?? `Friend ${i}`,
      status: "pending",
      deviceId: n.device === undefined ? crypto.randomUUID() : n.device,
      byOwner: n.byOwner ?? false,
    });
  }
}

const orderOf = async (id: string) => (await db.getDb().select().from(db.schema.orders).where(eq(db.schema.orders.id, id)))[0]!;
const siteOf = async (id: string) => (await db.getDb().select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, id)))[0]!;
const codeRow = async (id: string) => (await db.getDb().select().from(db.schema.discountCodes).where(eq(db.schema.discountCodes.id, id)))[0]!;
const plan = (tier: string, code?: string) => ({ kind: "plan" as const, tier, ...(code ? { code } : {}) });

async function newCode(suffix: string, values: { type?: string; value?: number; maxUses?: number | null; maxPerUser?: number | null }) {
  const [code] = await db
    .getDb()
    .insert(db.schema.discountCodes)
    .values({ code: `${tag.toUpperCase()}${suffix}`, type: values.type ?? "percent", value: values.value ?? 20, maxUses: values.maxUses ?? null, maxPerUser: values.maxPerUser === undefined ? 1 : values.maxPerUser })
    .returning();
  return code!;
}

async function pay(orderId: string) {
  const order = await orderOf(orderId);
  fake.pay(order.providerCheckoutId!);
  await billing.reconcileOrder(order, "confirm", 0);
}

beforeAll(async () => {
  if (!local) return;
  fake = startFakePaymongo();
  process.env["PAYMONGO_API_URL"] = fake.url;
  process.env["PAYMONGO_SECRET_KEY"] = "sk_test_fake";
  db = await import("./db");
  billing = await import("./billing");
  checkout = await import("./checkout");
  await db.getDb().insert(db.schema.user).values(users);
});

afterAll(async () => {
  if (!local) return;
  fake.stop();
  const g = db.getDb();
  const orders = await g.select({ id: db.schema.orders.id }).from(db.schema.orders).where(inArray(db.schema.orders.ownerId, users.map((u) => u.id)));
  const ids = orders.map((o) => o.id);
  if (ids.length) {
    await g.delete(db.schema.paymentLog).where(inArray(db.schema.paymentLog.orderId, ids));
    await g.delete(db.schema.orders).where(inArray(db.schema.orders.id, ids));
  }
  if (siteIds.length) await g.delete(db.schema.giftSites).where(inArray(db.schema.giftSites.id, siteIds));
  await g.delete(db.schema.user).where(inArray(db.schema.user.id, users.map((u) => u.id)));
  await g.delete(db.schema.webhookEvents).where(like(db.schema.webhookEvents.id, "%free_%"));
  await g.delete(db.schema.discountCodes).where(like(db.schema.discountCodes.code, `${tag.toUpperCase()}%`));
});

d("plan caps hold when friends send at the same moment", () => {
  test("Sweet at 9 of 10 friends, 5 new friends at once: one gets in, the rest hear it's full", async () => {
    const site = await newGift("published", "sweet");
    await fill(site.id, 9, {});
    const results = await Promise.all([1, 2, 3, 4, 5].map((i) => send(site.id, { name: `New ${i}` })));
    expect(results.filter((r) => r === "ok").length).toBe(1);
    expect(results.filter((r) => r === "contributors").length).toBe(4);
    expect((await billing.siteUsage(site.id)).contributors).toBe(10);
  });

  test("a friend who's already in can still add more when the gift is full", async () => {
    const site = await newGift("published", "sweet");
    const device = crypto.randomUUID();
    await fill(site.id, 9, {});
    await fill(site.id, 1, { name: "Ana", device });
    const results = await Promise.all([1, 2, 3].map(() => send(site.id, { name: "Ana", device })));
    expect(results).toEqual(["ok", "ok", "ok"]);
    expect((await billing.siteUsage(site.id)).contributors).toBe(10);
  });

  test("photos at 29 of 30, 4 at once: only one more fits", async () => {
    const site = await newGift("published", "sweet");
    const device = crypto.randomUUID();
    await fill(site.id, 29, { type: "photobooth", name: "Snap", device });
    const results = await Promise.all([1, 2, 3, 4].map(() => send(site.id, { name: "Snap", type: "photobooth", device })));
    expect(results.filter((r) => r === "ok").length).toBe(1);
    expect((await billing.siteUsage(site.id)).photos).toBe(30);
  });

  test("drafts have no caps and aren't held up", async () => {
    const site = await newGift();
    await fill(site.id, 12, {});
    const results = await Promise.all([1, 2, 3].map((i) => send(site.id, { name: `Draft ${i}` })));
    expect(results).toEqual(["ok", "ok", "ok"]);
  });
});

d("the owner's own notes", () => {
  test("don't take a friend's slot", async () => {
    const site = await newGift("published", "sweet");
    await fill(site.id, 2, { byOwner: true, name: "Owner", device: null });
    expect((await billing.siteUsage(site.id)).contributors).toBe(0);
    await fill(site.id, 9, {});
    // 10 real friends fit on Sweet, whatever the owner wrote.
    expect(await send(site.id, { name: "Tenth friend" })).toBe("ok");
    expect(await send(site.id, { name: "Eleventh friend" })).toBe("contributors");
    // The owner can still add notes to a full gift.
    expect(await send(site.id, { name: "Owner", byOwner: true })).toBe("ok");
    const fit = billing.tierBlocker((await import("@/config/pricing")).getTier("sweet")!, await billing.siteUsage(site.id), "scrapbook");
    expect(fit).toBeNull();
  });

  test("a friend with the owner's name is still a new friend", async () => {
    const site = await newGift("published", "sweet");
    await fill(site.id, 1, { byOwner: true, name: "Mia", device: null });
    await fill(site.id, 10, {});
    expect(await send(site.id, { name: "Mia", device: null })).toBe("contributors");
  });

  test("their photos still count towards the photo cap", async () => {
    const site = await newGift("published", "sweet");
    await fill(site.id, 30, { type: "photobooth", byOwner: true, name: "Owner", device: null });
    expect(await send(site.id, { name: "Owner", type: "photobooth", byOwner: true })).toBe("photos");
  });
});

d("code limits hold when checkouts start at the same moment", () => {
  test("one per person: three gifts at once, only one checkout gets the code", async () => {
    const code = await newCode("ONE", { maxPerUser: 1 });
    const gifts = await Promise.all([1, 2, 3].map(() => newGift()));
    const results = await Promise.allSettled(gifts.map((g) => checkout.openCheckout(user, g.id, plan("sweet", code.code))));
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(1);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toMatchObject({ status: 400, message: CODE_LIMIT_COPY.yoursElsewhere });
    }
    const ok = (results.find((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ orderId: string }>).value;
    await pay(ok.orderId);
    expect((await codeRow(code.id)).usedCount).toBe(1);
    // Once paid, it's plainly used.
    const another = await newGift();
    await expect(checkout.openCheckout(user, another.id, plan("sweet", code.code))).rejects.toThrow("already used");
  });

  test("starting again on the same gift reuses the checkout instead of saying the code is taken", async () => {
    const code = await newCode("SAME", { maxPerUser: 1 });
    const site = await newGift();
    const [a, b] = await Promise.all([1, 2].map(() => checkout.openCheckout(user, site.id, plan("sweet", code.code))));
    expect(a!.orderId).toBe(b!.orderId);
    // Switching plan on the same gift closes the old checkout and keeps the code.
    const keepsake = await checkout.openCheckout(user, site.id, plan("keepsake", code.code));
    expect(keepsake.orderId).not.toBe(a!.orderId);
    expect((await orderOf(a!.orderId)).status).toBe("expired");
  });

  test("a cancelled checkout gives the use back", async () => {
    const code = await newCode("BACK", { maxPerUser: 1 });
    const [g1, g2] = [await newGift(), await newGift()];
    const first = await checkout.openCheckout(user, g1.id, plan("sweet", code.code));
    await expect(checkout.openCheckout(user, g2.id, plan("sweet", code.code))).rejects.toThrow(CODE_LIMIT_COPY.yoursElsewhere);
    await checkout.cancelCheckout(await orderOf(first.orderId));
    const second = await checkout.openCheckout(user, g2.id, plan("sweet", code.code));
    expect(second.orderId).toBeTruthy();
  });

  test("an unpaid checkout from over a day ago doesn't hold the code", async () => {
    const code = await newCode("STALE", { maxPerUser: 1 });
    const [g1, g2] = [await newGift(), await newGift()];
    const first = await checkout.openCheckout(user, g1.id, plan("sweet", code.code));
    await db.getDb().update(db.schema.orders).set({ createdAt: new Date(Date.now() - 25 * 3_600_000) }).where(eq(db.schema.orders.id, first.orderId));
    expect((await checkout.openCheckout(user, g2.id, plan("sweet", code.code))).orderId).toBeTruthy();
  });

  test("the last uses of a limited code: four people at once, only two get it", async () => {
    const code = await newCode("TWO", { maxUses: 2, maxPerUser: null });
    const gifts = await Promise.all(users.map((u) => newGift("draft", null, u)));
    const results = await Promise.allSettled(users.map((u, i) => checkout.openCheckout(u, gifts[i]!.id, plan("sweet", code.code))));
    const ok = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ orderId: string }>[];
    expect(ok.length).toBe(2);
    for (const r of results.filter((r) => r.status === "rejected")) {
      expect((r as PromiseRejectedResult).reason).toMatchObject({ status: 400, message: CODE_LIMIT_COPY.allHeld });
    }
    for (const o of ok) await pay(o.value.orderId);
    expect((await codeRow(code.id)).usedCount).toBe(2);
    const late = await newGift("draft", null, users[3]!);
    await expect(checkout.openCheckout(users[3]!, late.id, plan("sweet", code.code))).rejects.toThrow("used up");
  });

  test("the plan picker preview says the same", async () => {
    const code = await newCode("PREV", { maxPerUser: 1 });
    const [g1, g2] = [await newGift(), await newGift()];
    await checkout.openCheckout(user, g1.id, plan("sweet", code.code));
    const row = await codeRow(code.id);
    const { codeProblem } = await import("./discounts");
    expect(await codeProblem(row, null, user.id, undefined, { siteId: g1.id })).toBeNull();
    expect(await codeProblem(row, null, user.id, undefined, { siteId: g2.id })).toBe(CODE_LIMIT_COPY.yoursElsewhere);
  });

  test("many checkouts at once on one gift don't lock each other out of the database", async () => {
    // Each request reads through its own transaction while it waits its turn, so 8 at once (more
    // than the pool's 5 connections) all finish.
    const site = await newGift();
    const code = await newCode("POOL", { maxPerUser: null });
    const all = await Promise.all(Array.from({ length: 8 }, () => checkout.openCheckout(user, site.id, plan("sweet", code.code))));
    expect(new Set(all.map((o) => o.orderId)).size).toBe(1);
  }, 15_000);
});

d("when the money lands, code limits are checked again", () => {
  test("two paid checkouts with a one-per-person code (started before these checks): both gifts open, the second is flagged", async () => {
    const code = await newCode("LATE", { maxPerUser: 1 });
    const [g1, g2] = [await newGift(), await newGift()];
    const a = await checkout.openCheckout(user, g1.id, plan("sweet", code.code));
    // The second checkout as an old server would have let it start.
    const b = await checkout.openCheckout(user, g2.id, plan("sweet"));
    await db.getDb().update(db.schema.orders).set({ discountCodeId: code.id, discountCode: code.code, discountAmount: 6000 }).where(eq(db.schema.orders.id, b.orderId));
    await pay(a.orderId);
    await pay(b.orderId);
    expect((await siteOf(g1.id)).tier).toBe("sweet");
    expect((await siteOf(g2.id)).tier).toBe("sweet");
    expect((await orderOf(b.orderId)).status).toBe("paid");
    expect((await codeRow(code.id)).usedCount).toBe(2);
    const log = await db.getDb().select().from(db.schema.paymentLog).where(and(eq(db.schema.paymentLog.event, billing.CODE_REVIEW_EVENT), inArray(db.schema.paymentLog.orderId, [a.orderId, b.orderId])));
    expect(log.length).toBe(1);
    expect(log[0]!.orderId).toBe(b.orderId);
    expect(log[0]!.outcome).toContain("already used");
  });

  test("a code within its limits isn't flagged", async () => {
    const code = await newCode("FINE", { maxPerUser: 1, maxUses: 5 });
    const g = await newGift();
    const a = await checkout.openCheckout(user, g.id, plan("sweet", code.code));
    await pay(a.orderId);
    const log = await db.getDb().select().from(db.schema.paymentLog).where(and(eq(db.schema.paymentLog.event, billing.CODE_REVIEW_EVENT), eq(db.schema.paymentLog.orderId, a.orderId)));
    expect(log.length).toBe(0);
  });
});
