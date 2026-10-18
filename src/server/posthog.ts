/**
 * Sends our server events (gift_created, note_added, plan_purchased...) to PostHog too,
 * so funnels can run from "visited" to "paid". Our own events table stays the source of
 * truth; this is a copy. Off unless VITE_POSTHOG_KEY is set. Never throws, gives up
 * after 1.5s, and never sends note content (only the labels from EVENT_PROPS).
 */
import { POSTHOG_HOSTS, POSTHOG_KEY, POSTHOG_REGION, analyticsEnabled } from "@/config/analytics";

export async function captureServerEvent(
  name: string,
  opts: { userId?: string | null; siteId?: string | null; props?: Record<string, unknown> },
): Promise<void> {
  if (!analyticsEnabled()) return;
  // Organisers are the same person as in the browser (identified by user id). Events with no
  // organiser (a friend's note, a payment webhook) hang off the gift and create no profile.
  const distinctId = opts.userId ?? (opts.siteId ? `gift:${opts.siteId}` : "server");
  try {
    await fetch(`${POSTHOG_HOSTS[POSTHOG_REGION].api}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: name,
        distinct_id: distinctId,
        properties: {
          ...opts.props,
          ...(opts.siteId ? { site_id: opts.siteId } : {}),
          source: "server",
          $process_person_profile: !!opts.userId,
        },
      }),
      signal: AbortSignal.timeout(1500),
    });
  } catch (error) {
    console.warn("[posthog] couldn't send", name, error instanceof Error ? error.message : error);
  }
}
