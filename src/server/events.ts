/**
 * Product events, kept in our own Postgres (no cookies, no IP). Server-side events are
 * also copied to PostHog when it's switched on (src/server/posthog.ts).
 * Never stores note content: only the event name, the gift, the signed-in user and a few
 * short labels (a section type, a share channel, a plan id).
 *
 * `track()` never throws, so a failed write can't break the thing being tracked.
 */
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/server/db";
import { captureServerEvent } from "@/server/posthog";

export const EVENT_NAMES = [
  "gift_created",
  "invite_shared",
  "friend_page_viewed",
  "note_added",
  "gift_wrapped",
  "plan_purchased",
  "gift_opened",
  "make_your_own_clicked",
  "theme_opening_started",
  "theme_opening_completed",
  "theme_replayed",
  "theme_shared",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Events the browser may report. The rest are written by the server where they happen. */
export const CLIENT_EVENTS = [
  "invite_shared",
  "friend_page_viewed",
  "gift_opened",
  "make_your_own_clicked",
  "theme_opening_started",
  "theme_opening_completed",
  "theme_replayed",
  "theme_shared",
] as const;
export type ClientEvent = (typeof CLIENT_EVENTS)[number];

/** The only labels each event may carry, and their allowed values. */
export const EVENT_PROPS: Record<EventName, Record<string, readonly string[] | "bool">> = {
  gift_created: { solo: "bool" },
  invite_shared: { channel: ["copy", "whatsapp", "messenger", "share", "dashboard"] },
  friend_page_viewed: {},
  note_added: { type: [] as string[], by_owner: "bool" },
  gift_wrapped: { tier: [] as string[] },
  plan_purchased: {
    plan: [] as string[],
    kind: ["publish", "upgrade", "extend"],
    method: ["card", "gcash", "paymaya", "qrph", "other"],
    /** Cards only: issued in the Philippines or not. Tells us when a second payment provider is worth it. */
    card_origin: ["local", "foreign", "unknown"],
  },
  gift_opened: {},
  make_your_own_clicked: { source: ["gift_footer", "ended_page", "friend_page"] },
  theme_opening_started: {},
  theme_opening_completed: {},
  theme_replayed: {},
  theme_shared: { channel: ["share", "copy"] },
};

/** Keep only known labels; free-form values (an empty list) are cut to 40 safe characters. */
export function cleanProps(name: EventName, raw: Record<string, unknown> | undefined): Record<string, string | boolean> {
  const allowed = EVENT_PROPS[name];
  const out: Record<string, string | boolean> = {};
  for (const [k, rule] of Object.entries(allowed)) {
    const v = raw?.[k];
    if (rule === "bool") {
      if (typeof v === "boolean") out[k] = v;
    } else if (typeof v === "string") {
      if (rule.length === 0) {
        const t = v.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
        if (t) out[k] = t;
      } else if (rule.includes(v)) out[k] = v;
    }
  }
  return out;
}

/** The visitor's country from Vercel's header ("PH"), or nothing. Never the IP itself. */
async function visitorRegion(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const raw = getRequest()?.headers.get("x-vercel-ip-country") ?? "";
    return /^[A-Z]{2}$/.test(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Theme, format and region for an event about a gift, so the admin page can compare themes. */
async function giftContext(siteId: string | null | undefined, withRegion: boolean): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const region = withRegion ? await visitorRegion() : null;
  if (region) out["region"] = region;
  if (!siteId) return out;
  const [site] = await getDb()
    .select({ themeId: schema.giftSites.themeId, format: schema.giftSites.format })
    .from(schema.giftSites)
    .where(eq(schema.giftSites.id, siteId));
  if (site?.themeId) out["theme"] = site.themeId;
  if (site?.format) out["format"] = site.format.replace(/[^a-z0-9_-]/gi, "").slice(0, 20);
  return out;
}

export async function track(
  name: EventName,
  opts: { siteId?: string | null; userId?: string | null; props?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    // Every event about a gift also gets its theme, format and the visitor's country. Payments arrive
    // from PayMongo's servers, so they carry no region (the organiser's comes from gift_created).
    const props = { ...cleanProps(name, opts.props), ...(await giftContext(opts.siteId, name !== "plan_purchased")) };
    await getDb()
      .insert(schema.events)
      .values({ name, siteId: opts.siteId ?? null, userId: opts.userId ?? null, props });
    // Browser events already reach PostHog from the browser; only copy the server's own.
    if (!(CLIENT_EVENTS as readonly string[]).includes(name)) {
      await captureServerEvent(name, { userId: opts.userId ?? null, siteId: opts.siteId ?? null, props });
    }
  } catch (error) {
    console.error("[events] couldn't record", name, error instanceof Error ? error.message : error);
  }
}
