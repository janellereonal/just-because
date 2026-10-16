import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { expiryReminderEmail, giftLiveEmail, newNoteEmail, receiptEmail, siteUrl } from "./email";
import { formatPeso, getTier } from "@/config/pricing";

const THROTTLE_MINUTES = 30;

function recipientOf(customText: unknown, title: string) {
  const name = (customText as { recipient_name?: string } | null)?.recipient_name?.trim();
  return name || title;
}

/** Emails the creator that a friend added something, at most once per 30 minutes per gift. */
export async function notifyNewNote(siteId: string, authorName: string) {
  const db = getDb();
  const g = schema.giftSites;
  // Claim the slot atomically so two quick submissions don't both send.
  const [site] = await db
    .update(g)
    .set({ lastNotifiedAt: new Date() })
    .where(
      and(
        eq(g.id, siteId),
        or(isNull(g.lastNotifiedAt), lt(g.lastNotifiedAt, sql`now() - make_interval(mins => ${THROTTLE_MINUTES})`)),
      ),
    )
    .returning({ id: g.id, title: g.title, customText: g.customText, creatorId: g.creatorId });
  if (!site) return;
  const [creator] = await db
    .select({ email: schema.user.email, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, site.creatorId));
  if (!creator) return;
  const [{ pending } = { pending: 1 }] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(schema.contributions)
    .where(and(eq(schema.contributions.siteId, siteId), eq(schema.contributions.status, "pending")));
  await newNoteEmail({
    to: creator.email,
    creatorName: creator.name,
    recipient: recipientOf(site.customText, site.title),
    authorName,
    pendingCount: pending,
    editorUrl: `${siteUrl()}/sites/${site.id}`,
  });
}

/** Sends the creator their final link the moment a gift goes from draft to published. */
export async function notifyGiftLive(siteId: string) {
  const db = getDb();
  const [site] = await db
    .select({ id: schema.giftSites.id, slug: schema.giftSites.slug, title: schema.giftSites.title, customText: schema.giftSites.customText, creatorId: schema.giftSites.creatorId })
    .from(schema.giftSites)
    .where(eq(schema.giftSites.id, siteId));
  if (!site) return;
  const [creator] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, site.creatorId));
  if (!creator) return;
  await giftLiveEmail({
    to: creator.email,
    recipient: recipientOf(site.customText, site.title),
    liveUrl: `${siteUrl()}/g/${site.slug}`,
    editorUrl: `${siteUrl()}/sites/${site.id}`,
  });
}

const day = (d: Date) => new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Manila" }).format(d);

/** The receipt for a paid order (once: called only when the order is first applied). */
export async function notifyPaid(orderId: string) {
  const db = getDb();
  const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
  if (!order?.siteId || !order.ownerId) return;
  const [site] = await db
    .select({ id: schema.giftSites.id, slug: schema.giftSites.slug, title: schema.giftSites.title, customText: schema.giftSites.customText, expiresAt: schema.giftSites.expiresAt })
    .from(schema.giftSites)
    .where(eq(schema.giftSites.id, order.siteId));
  const [owner] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, order.ownerId));
  if (!site || !owner) return;
  await receiptEmail({
    to: owner.email,
    kind: order.kind as "publish" | "upgrade" | "extend",
    recipient: recipientOf(site.customText, site.title),
    planName: getTier(order.tier)?.name ?? order.tier,
    amount: formatPeso(order.amount),
    orderId: order.id,
    paidOn: day(order.updatedAt),
    openUntil: site.expiresAt ? day(site.expiresAt) : null,
    liveUrl: `${siteUrl()}/g/${site.slug}`,
    editorUrl: `${siteUrl()}/sites/${site.id}`,
  });
}

/**
 * Emails organisers whose plan ends in the next 14 days, once per end date
 * (extending clears the mark). Claims each row before sending, so two runs
 * never both send. Returns how many were sent.
 */
export async function sendExpiryReminders(limit = 200): Promise<number> {
  const db = getDb();
  const g = schema.giftSites;
  const due = await db
    .update(g)
    .set({ expiryRemindedAt: new Date() })
    .where(
      and(
        isNull(g.expiryRemindedAt),
        sql`${g.expiresAt} is not null`,
        sql`${g.expiresAt} > now()`,
        sql`${g.expiresAt} <= now() + interval '14 days'`,
        eq(g.status, "published"),
        sql`${g.id} in (select ${g.id} from ${g} where ${g.expiryRemindedAt} is null and ${g.expiresAt} > now() and ${g.expiresAt} <= now() + interval '14 days' limit ${limit})`,
      ),
    )
    .returning({ id: g.id, slug: g.slug, title: g.title, customText: g.customText, creatorId: g.creatorId, expiresAt: g.expiresAt });
  let sent = 0;
  for (const site of due) {
    const [owner] = await db.select({ email: schema.user.email }).from(schema.user).where(eq(schema.user.id, site.creatorId));
    if (!owner || !site.expiresAt) continue;
    await expiryReminderEmail({
      to: owner.email,
      recipient: recipientOf(site.customText, site.title),
      endsOn: day(site.expiresAt),
      editorUrl: `${siteUrl()}/sites/${site.id}`,
      liveUrl: `${siteUrl()}/g/${site.slug}`,
    });
    sent += 1;
  }
  return sent;
}
