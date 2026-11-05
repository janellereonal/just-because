/**
 * A small cache for the hot public reads (a gift's row, its sections, its approved notes, the
 * style and palette lists), kept in memory per server instance for a few seconds.
 *
 * Why: a gift that goes viral is opened by many people within seconds, and every open reads the
 * same few rows. With the cache, one instance asks the database about once per TTL per gift
 * instead of once per visitor, and visitors arriving together share one query (the promise is
 * cached, not just the result).
 *
 * Privacy stays per request: only raw database rows are cached. Who may see them (owner,
 * password, open or ended) is checked on every request, after the rows come back.
 *
 * Owner changes clear the gift's entries on the instance that made them (`forgetGift`). Other
 * instances catch up within the TTL, so a newly approved note can take up to that long to show.
 * Set READ_CACHE_TTL_MS=0 to turn caching off.
 */

import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";

type Entry = { at: number; value: Promise<unknown> };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 5000;

function ttlMs(): number {
  const raw = Number(process.env["READ_CACHE_TTL_MS"] ?? "10000");
  return Number.isFinite(raw) && raw >= 0 ? raw : 10000;
}

/** Read through the cache. `ttl` overrides the default (for global lists that rarely change). */
export function cachedRead<T>(key: string, load: () => Promise<T>, ttl = ttlMs()): Promise<T> {
  if (ttl <= 0) return load();
  const now = Date.now();
  const hit = store.get(key);
  if (hit && now - hit.at < ttl) return hit.value as Promise<T>;
  // Drizzle queries are lazy "thenables" that run again on every await. Adopting it into a real
  // Promise runs it once, and everyone waiting shares that one result.
  const value: Promise<T> = Promise.resolve().then(load);
  store.set(key, { at: now, value });
  // A failed read isn't kept: the next visitor tries the database again.
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  if (store.size > MAX_ENTRIES) {
    // Oldest first (Map keeps insertion order); drop a tenth so this doesn't run every time.
    let drop = Math.ceil(MAX_ENTRIES / 10);
    for (const k of store.keys()) {
      if (drop-- <= 0) break;
      store.delete(k);
    }
  }
  return value;
}

/** Clear everything cached about one gift (after an owner change, a payment, a delete). */
export function forgetGift(siteId: string, slug?: string | null) {
  const prefix = `gift:${siteId}:`;
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  if (slug) {
    store.delete(`slug:${slug}`);
    store.delete(`share:${slug}`);
  }
}

/** Clear exact keys (global lists, after an admin change). */
export function forgetKeys(...keys: string[]) {
  for (const k of keys) store.delete(k);
}

/** Keys, in one place so reads and clears can't drift apart. */
export const cacheKey = {
  site: (siteId: string) => `gift:${siteId}:row`,
  modules: (siteId: string) => `gift:${siteId}:modules`,
  approved: (siteId: string) => `gift:${siteId}:approved`,
  calendar: (siteId: string) => `gift:${siteId}:calendar`,
  ornaments: (siteId: string) => `gift:${siteId}:ornaments`,
  slug: (slug: string) => `slug:${slug}`,
};

/** A gift's full row, through the cache. Callers check who may see it. */
export function cachedSiteRow(siteId: string) {
  return cachedRead(cacheKey.site(siteId), async () => {
    const [row] = await getDb().select().from(schema.giftSites).where(eq(schema.giftSites.id, siteId));
    return row ?? null;
  });
}

/** For tests. */
export function clearReadCache() {
  store.clear();
}
