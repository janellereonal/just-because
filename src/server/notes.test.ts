/**
 * A friend editing their own note never undoes the organiser's call. LOCAL database only
 * (skipped otherwise). Run: bun test src/server/notes
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env["DATABASE_URL"] ?? "");
const d = local ? describe : describe.skip;

let db: typeof import("./db");
let notes: typeof import("./notes");
const tag = `nt${Date.now().toString(36)}`;
const userId = `${tag}-user`;

beforeAll(async () => {
  if (!local) return;
  db = await import("./db");
  notes = await import("./notes");
  await db.getDb().insert(db.schema.user).values({ id: userId, name: "Organiser", email: `${tag}@example.test` });
});

afterAll(async () => {
  if (!local) return;
  await db.getDb().delete(db.schema.giftSites).where(eq(db.schema.giftSites.creatorId, userId));
  await db.getDb().delete(db.schema.user).where(eq(db.schema.user.id, userId));
});

async function giftWithNote(status: "pending" | "approved" | "hidden") {
  const g = db.getDb();
  const [site] = await g
    .insert(db.schema.giftSites)
    .values({ creatorId: userId, title: `${tag} gift`, slug: `${tag}-${Math.random().toString(36).slice(2, 8)}` })
    .returning();
  const [note] = await g
    .insert(db.schema.contributions)
    .values({ siteId: site!.id, moduleType: "letters", authorName: "Mia", textContent: "first", status })
    .returning();
  return { siteId: site!.id, noteId: note!.id };
}

async function state(siteId: string, noteId: string) {
  const g = db.getDb();
  const [note] = await g.select().from(db.schema.contributions).where(eq(db.schema.contributions.id, noteId));
  const [site] = await g.select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, siteId));
  return { status: note!.status, text: note!.textContent, notified: !!site!.lastNotifiedAt };
}

d("a friend edits their own note", () => {
  test("approved stays approved, and the organiser hears about it", async () => {
    const { siteId, noteId } = await giftWithNote("approved");
    await notes.saveFriendEdit(noteId, { textContent: "second" });
    expect(await state(siteId, noteId)).toEqual({ status: "approved", text: "second", notified: true });
  });

  test("the alert keeps the 30-minute limit", async () => {
    const { siteId, noteId } = await giftWithNote("approved");
    const earlier = new Date(Date.now() - 5 * 60_000);
    await db.getDb().update(db.schema.giftSites).set({ lastNotifiedAt: earlier }).where(eq(db.schema.giftSites.id, siteId));
    await notes.saveFriendEdit(noteId, { textContent: "again" });
    const [site] = await db.getDb().select().from(db.schema.giftSites).where(eq(db.schema.giftSites.id, siteId));
    expect(site!.lastNotifiedAt!.getTime()).toBe(earlier.getTime());
  });

  test("hidden stays hidden, quietly", async () => {
    const { siteId, noteId } = await giftWithNote("hidden");
    await notes.saveFriendEdit(noteId, { textContent: "let me back in" });
    expect(await state(siteId, noteId)).toEqual({ status: "hidden", text: "let me back in", notified: false });
  });

  test("waiting stays waiting", async () => {
    const { siteId, noteId } = await giftWithNote("pending");
    await notes.saveFriendEdit(noteId, { textContent: "typo fixed" });
    expect(await state(siteId, noteId)).toEqual({ status: "pending", text: "typo fixed", notified: false });
  });
});
