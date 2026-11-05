import { describe, expect, test } from "bun:test";

// Uses the database, so only against a local one (never a real DATABASE_URL).
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");

describe.skipIf(!local)("shared rate limit (Postgres)", () => {
  test("counts across calls and refuses past the max", async () => {
    const { sharedRateLimit } = await import("./rateLimit");
    const key = `test:${crypto.randomUUID()}`;
    for (let i = 0; i < 3; i++) await sharedRateLimit(key, 3, 60_000, "slow down");
    await expect(sharedRateLimit(key, 3, 60_000, "slow down")).rejects.toThrow("slow down");
  });

  test("the window is shared even when the in-memory brake is fresh (another instance)", async () => {
    const { sharedRateLimit } = await import("./rateLimit");
    const { getDb } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const key = `test:${crypto.randomUUID()}`;
    // Pretend another instance already used 5 of 5.
    await getDb().execute(sql`insert into rate_limits (key, window_start, count) values (${key}, now(), 5)`);
    await expect(sharedRateLimit(key, 5, 60_000, "busy")).rejects.toThrow("busy");
  });

  test("an old window starts again", async () => {
    const { sharedRateLimit } = await import("./rateLimit");
    const { getDb } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const key = `test:${crypto.randomUUID()}`;
    await getDb().execute(sql`insert into rate_limits (key, window_start, count) values (${key}, now() - interval '2 minutes', 99)`);
    await sharedRateLimit(key, 5, 60_000, "busy");
    const rows = await getDb().execute(sql`select count from rate_limits where key = ${key}`);
    expect(Number((rows as unknown as Array<{ count: number }>)[0]?.count)).toBe(1);
  });
});
