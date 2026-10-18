/**
 * One way to count notes, used by the editor's top bar, the Notes badge, Wrap it up and My gifts.
 *  - In the gift: approved notes from friends plus the organiser's own (those are approved when added).
 *  - Waiting: friends' notes the organiser hasn't looked at yet.
 *  - Hidden: notes the organiser took out.
 * The friend page counts people instead (see `friendsIn`).
 */
export type NoteCounts = { inGift: number; waiting: number; hidden: number };

type Countable = { status: string; by_owner?: boolean | undefined; author_name?: string | null | undefined };

export function countNotes(rows: readonly Countable[]): NoteCounts {
  const out: NoteCounts = { inGift: 0, waiting: 0, hidden: 0 };
  for (const r of rows) {
    if (r.status === "approved") out.inGift += 1;
    else if (r.status === "pending") out.waiting += 1;
    else if (r.status === "hidden") out.hidden += 1;
  }
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 notes in the gift". */
export const inGiftLabel = (n: number) => `${plural(n, "note", "notes")} in the gift`;
/** "2 waiting". */
export const waitingLabel = (n: number) => `${n} waiting`;
/** "1 hidden". */
export const hiddenLabel = (n: number) => `${n} hidden`;

/** Short summary for chips and cards: "3 in the gift · 2 waiting". */
export function noteSummary(c: NoteCounts): string {
  const parts = [c.inGift === 0 && c.waiting === 0 ? "No notes yet" : `${c.inGift} in the gift`];
  if (c.waiting > 0) parts.push(waitingLabel(c.waiting));
  return parts.join(" · ");
}

/** How many different friends have added something. The organiser isn't a friend here. */
export function friendsIn(rows: readonly Countable[]): number {
  return new Set(rows.filter((r) => !r.by_owner).map((r) => (r.author_name ?? "").trim().toLowerCase()).filter(Boolean)).size;
}
