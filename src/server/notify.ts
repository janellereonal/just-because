import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { giftLiveEmail, newNoteEmail, siteUrl } from "./email";

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
