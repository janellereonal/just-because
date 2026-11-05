/**
 * Simple rate limits, in memory per server instance (enough to stop floods
 * from one person; Vercel may run a few instances, so limits are per
 * instance). Throws HttpError 429 with a friendly message.
 */
import { getRequest } from "@tanstack/react-start/server";
import { sql } from "drizzle-orm";
import { HttpError } from "@/server/guards";

const hits = new Map<string, number[]>();
let sweep = 0;

export function rateLimit(key: string, max: number, windowMs: number, message: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) throw new HttpError(429, message);
  list.push(now);
  hits.set(key, list);
  if (++sweep % 500 === 0) for (const [k, v] of hits) if (!v.some((t) => now - t < 3600_000)) hits.delete(k);
}

/**
 * Like `rateLimit`, but counted in Postgres (table rate_limits), so every server instance shares
 * one count. Use it where a limit matters across instances: password guesses and note floods.
 * The in-memory limit runs first as a cheap brake. If the database can't answer, it lets the
 * request through (the in-memory limit still applies) rather than blocking real people.
 */
export async function sharedRateLimit(key: string, max: number, windowMs: number, message: string) {
  rateLimit(key, max, windowMs, message);
  let count = 0;
  try {
    const { getDb } = await import("@/server/db");
    const secs = Math.max(1, Math.ceil(windowMs / 1000));
    const rows = await getDb().execute(sql`
      insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
      on conflict (key) do update set
        count = case when rate_limits.window_start <= now() - make_interval(secs => ${secs}) then 1 else rate_limits.count + 1 end,
        window_start = case when rate_limits.window_start <= now() - make_interval(secs => ${secs}) then now() else rate_limits.window_start end
      returning count`);
    count = Number((rows as unknown as Array<{ count: number }>)[0]?.count ?? 0);
  } catch (error) {
    console.warn("[rateLimit] shared count unavailable, using this instance's only", error);
    return;
  }
  if (count > max) throw new HttpError(429, message);
}

/** Old windows, for the daily job. */
export async function sweepSharedRateLimits() {
  const { getDb } = await import("@/server/db");
  await getDb().execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
}

/** The visitor's IP from the platform headers ("local" in dev). */
export function clientIp(): string {
  try {
    const req = getRequest();
    return req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers.get("x-real-ip") || "local";
  } catch {
    return "local";
  }
}
