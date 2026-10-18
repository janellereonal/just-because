/** Report a gift (public) and review reports (admins). */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/server/db";
import { requireAdmin } from "@/server/guards";

export const REPORT_REASONS = ["harassment", "private-info", "sexual", "hate", "spam", "other"] as const;

const recent = new Map<string, number[]>();
/** At most 5 reports per IP per hour, and one per IP per gift per day. */
function limited(ipKey: string, giftKey: string) {
  const now = Date.now();
  const hits = (recent.get(ipKey) ?? []).filter((t) => now - t < 3600_000);
  const sameGift = (recent.get(giftKey) ?? []).filter((t) => now - t < 86_400_000);
  if (hits.length >= 5 || sameGift.length >= 1) return true;
  recent.set(ipKey, [...hits, now]);
  recent.set(giftKey, [...sameGift, now]);
  return false;
}

async function hash(text: string) {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(`jb-report:${text}`).digest("hex").slice(0, 24);
}

export const reportGift = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().trim().min(1).max(120),
      reason: z.enum(REPORT_REASONS),
      details: z.string().trim().max(1000).nullable(),
      page: z.enum(["gift", "contribute"]),
    }),
  )
  .handler(async ({ data }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const ip = getRequest()?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const who = await hash(ip);
    // Pretend it worked when limited, so floods learn nothing.
    if (limited(`ip:${who}`, `gift:${who}:${data.slug}`)) return { ok: true };
    const db = getDb();
    const [site] = await db.select({ id: schema.giftSites.id }).from(schema.giftSites).where(eq(schema.giftSites.slug, data.slug));
    await db.insert(schema.giftReports).values({ siteId: site?.id ?? null, slug: data.slug, reason: data.reason, details: data.details || null, page: data.page, reporterHash: who });
    const { reportEmail, siteUrl } = await import("@/server/email");
    const admins = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.isAdmin, true));
    await Promise.all(admins.map((a) => reportEmail({ to: a.email, slug: data.slug, reason: data.reason, details: data.details || null, page: data.page, adminUrl: `${siteUrl()}/admin` })));
    return { ok: true };
  });

export const listReports = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const db = getDb();
  const rows = await db
    .select({
      id: schema.giftReports.id,
      slug: schema.giftReports.slug,
      reason: schema.giftReports.reason,
      details: schema.giftReports.details,
      page: schema.giftReports.page,
      createdAt: schema.giftReports.createdAt,
      resolvedAt: schema.giftReports.resolvedAt,
      siteId: schema.giftReports.siteId,
      disabledAt: schema.giftSites.disabledAt,
      title: schema.giftSites.title,
    })
    .from(schema.giftReports)
    .leftJoin(schema.giftSites, eq(schema.giftSites.id, schema.giftReports.siteId))
    .orderBy(desc(schema.giftReports.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), resolvedAt: r.resolvedAt?.toISOString() ?? null, disabledAt: r.disabledAt?.toISOString() ?? null }));
});

/** Pause (or un-pause) a gift. Paused gifts don't open and don't take notes. */
export const setGiftDisabled = createServerFn({ method: "POST" })
  .inputValidator(z.object({ siteId: z.string().uuid(), disabled: z.boolean(), reason: z.string().trim().max(300).nullable() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const db = getDb();
    await db
      .update(schema.giftSites)
      .set({ disabledAt: data.disabled ? new Date() : null, disabledReason: data.disabled ? data.reason : null })
      .where(eq(schema.giftSites.id, data.siteId));
    if (data.disabled) {
      await db.update(schema.giftReports).set({ resolvedAt: new Date() }).where(and(eq(schema.giftReports.siteId, data.siteId), isNull(schema.giftReports.resolvedAt)));
    }
    return { ok: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await getDb().update(schema.giftReports).set({ resolvedAt: new Date() }).where(eq(schema.giftReports.id, data.id));
    return { ok: true };
  });
