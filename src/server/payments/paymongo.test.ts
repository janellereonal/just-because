/**
 * Webhook signature handling against a fake PayMongo (no network, no keys).
 * Run: bun test src/server/payments
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { paidEventBody, sign, startFakePaymongo } from "../../../tools/payments/fake-paymongo";

const SECRET = "whsk_test_secret";
let fake: ReturnType<typeof startFakePaymongo>;
let paymongo: typeof import("./paymongo");

beforeAll(async () => {
  fake = startFakePaymongo();
  process.env["PAYMONGO_API_URL"] = fake.url;
  process.env["PAYMONGO_SECRET_KEY"] = "sk_test_fake";
  process.env["PAYMONGO_WEBHOOK_SECRET"] = SECRET;
  paymongo = await import("./paymongo");
  fake.add("cs_abc123", 59900, "11111111-1111-4111-8111-111111111111");
  fake.pay("cs_abc123");
});
afterAll(() => fake.stop());

const h = (sig?: string) => new Headers(sig ? { "paymongo-signature": sig } : {});

describe("handleWebhook", () => {
  test("junk is rejected", async () => {
    expect((await paymongo.paymongo.handleWebhook("not json", h())).kind).toBe("rejected");
  });
  test("other event types are ignored", async () => {
    const body = JSON.stringify({ data: { id: "evt_1", attributes: { type: "payment.failed", data: {} } } });
    expect((await paymongo.paymongo.handleWebhook(body, h(sign(SECRET, body)))).kind).toBe("ignored");
  });
  test("a paid event without a valid checkout id is rejected", async () => {
    const body = paidEventBody("not-a-session");
    expect((await paymongo.paymongo.handleWebhook(body, h(sign(SECRET, body)))).kind).toBe("rejected");
  });
  test("unsigned is only a hint to check", async () => {
    const r = await paymongo.paymongo.handleWebhook(paidEventBody("cs_abc123"), h());
    expect(r.kind).toBe("check");
  });
  test("signed with the wrong secret is only a hint", async () => {
    const body = paidEventBody("cs_abc123");
    const r = await paymongo.paymongo.handleWebhook(body, h(sign("someone-else", body)));
    expect(r.kind === "check" && r.reason).toBe("signature didn't match our secret");
  });
  test("an old signature is only a hint (replays)", async () => {
    const body = paidEventBody("cs_abc123");
    const r = await paymongo.paymongo.handleWebhook(body, h(sign(SECRET, body, Math.floor(Date.now() / 1000) - 3600)));
    expect(r.kind === "check" && r.reason).toBe("signature too old");
  });
  test("a fresh, signed event is paid, with the amount from PayMongo, not the body", async () => {
    const body = paidEventBody("cs_abc123", "evt_good");
    const r = await paymongo.paymongo.handleWebhook(body, h(sign(SECRET, body)));
    expect(r.kind).toBe("paid");
    if (r.kind === "paid") {
      expect(r.event.eventId).toBe("evt_good");
      expect(r.event.amountPaid).toBe(59900);
      expect(r.event.orderId).toBe("11111111-1111-4111-8111-111111111111");
    }
  });
});

describe("what paid", () => {
  const card = (extra: object) => ({ amount: 59900, status: "paid", ...extra });
  test("wallets are wallets, with no card origin", () => {
    expect(paymongo.describePayment(card({ source: { type: "gcash" } }))).toEqual({ method: "gcash", cardOrigin: null });
    expect(paymongo.describePayment(card({ source: { type: "paymaya" } }))).toEqual({ method: "paymaya", cardOrigin: null });
  });
  test("the card's own country decides first", () => {
    expect(paymongo.describePayment(card({ source: { type: "card", country: "PH" } })).cardOrigin).toBe("local");
    expect(paymongo.describePayment(card({ source: { type: "card", country: "us" }, billing: { address: { country: "PH" } } })).cardOrigin).toBe("foreign");
  });
  test("then a foreign-card fee, then the billing country", () => {
    expect(paymongo.describePayment(card({ source: { id: "card_1" }, foreign_fee: 599 })).cardOrigin).toBe("foreign");
    expect(paymongo.describePayment(card({ source: { brand: "visa" }, billing: { address: { country: "PH" } } })).cardOrigin).toBe("local");
  });
  test("a card PayMongo says nothing about is unknown, and no source is other", () => {
    expect(paymongo.describePayment(card({ source: { type: "card" } }))).toEqual({ method: "card", cardOrigin: "unknown" });
    expect(paymongo.describePayment(card({}))).toEqual({ method: "other", cardOrigin: null });
  });
  test("checkPaid passes on the currency, method and card origin", async () => {
    fake.add("cs_foreign1", 59900, "22222222-2222-4222-8222-222222222222");
    fake.pay("cs_foreign1", undefined, { currency: "PHP", source: { type: "card", brand: "mastercard", country: "GB" } });
    const event = await paymongo.paymongo.checkPaid("cs_foreign1");
    expect(event?.currency).toBe("PHP");
    expect(event?.method).toBe("card");
    expect(event?.cardOrigin).toBe("foreign");
  });
  test("a payment with no currency counts as pesos", async () => {
    const event = await paymongo.paymongo.checkPaid("cs_abc123");
    expect(event?.currency).toBe("PHP");
  });
});

describe("createCheckout", () => {
  test("hosted checkout refuses anything but pesos", async () => {
    const order = {
      orderId: "33333333-3333-4333-8333-333333333333",
      siteId: "44444444-4444-4444-8444-444444444444",
      amount: 1200,
      currency: "USD" as const,
      itemName: "Celebration",
      itemDescription: "Test",
      successUrl: "http://localhost/ok",
      cancelUrl: "http://localhost/no",
    };
    await expect(paymongo.paymongo.createCheckout(order)).rejects.toThrow("only takes PHP");
  });
});
