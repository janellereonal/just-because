/**
 * Unique-violation detection. The last test needs a LOCAL database (skipped otherwise).
 * Run: bun test src/server/db
 */
import { describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { isUniqueViolation } from "./errors";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");

describe("isUniqueViolation", () => {
  test("finds the code directly or inside Drizzle's wrapper", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("Failed query", { cause: { code: "23505" } }))).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });

  (local ? test : test.skip)("two gifts taking the same link name at once: the loser gets a unique violation", async () => {
    const db = await import("./index");
    const g = db.getDb();
    const tag = `uv${Date.now().toString(36)}`;
    await g.insert(db.schema.user).values({ id: `${tag}-u`, name: "T", email: `${tag}@example.test` });
    const rows = await g
      .insert(db.schema.giftSites)
      .values([
        { creatorId: `${tag}-u`, title: "one", slug: `${tag}-1` },
        { creatorId: `${tag}-u`, title: "two", slug: `${tag}-2` },
      ])
      .returning({ id: db.schema.giftSites.id });
    const { eq } = await import("drizzle-orm");
    const results = await Promise.allSettled(
      rows.map((r) => g.update(db.schema.giftSites).set({ slug: `${tag}-same` }).where(eq(db.schema.giftSites.id, r.id))),
    );
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(failed.length).toBe(1);
    expect(isUniqueViolation(failed[0]!.reason)).toBe(true);
    await g.delete(db.schema.giftSites).where(inArray(db.schema.giftSites.id, rows.map((r) => r.id)));
    await g.delete(db.schema.user).where(eq(db.schema.user.id, `${tag}-u`));
  });
});
