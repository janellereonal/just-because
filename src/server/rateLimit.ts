/**
 * Simple rate limits, in memory per server instance (enough to stop floods
 * from one person; Vercel may run a few instances, so limits are per
 * instance). Throws HttpError 429 with a friendly message.
 */
import { getRequest } from "@tanstack/react-start/server";
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

/** The visitor's IP from the platform headers ("local" in dev). */
export function clientIp(): string {
  try {
    const req = getRequest();
    return req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers.get("x-real-ip") || "local";
  } catch {
    return "local";
  }
}
