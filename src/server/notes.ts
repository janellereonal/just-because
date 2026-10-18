import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { notifyNewNote } from "./notify";

type FriendEdit = Partial<
  Pick<typeof schema.contributions.$inferInsert, "textContent" | "externalLink" | "mediaUrl" | "visibility" | "data">
>;

/**
 * Saves a friend's edit to their own note. The organiser's call stands: a hidden
 * note stays hidden, an approved note stays in the gift, and a waiting note keeps
 * waiting. When an approved note changes, the organiser gets the new-note email
 * saying so (same limit of one per 30 minutes per gift), so they can take another look.
 */
export async function saveFriendEdit(id: string, edit: FriendEdit) {
  const c = schema.contributions;
  const [row] = await getDb()
    .update(c)
    .set(edit)
    .where(eq(c.id, id))
    .returning({ siteId: c.siteId, status: c.status, authorName: c.authorName });
  if (row?.status === "approved") {
    await notifyNewNote(row.siteId, row.authorName, { edited: true }).catch((e) => console.error("[notify]", e));
  }
  return row ?? null;
}
