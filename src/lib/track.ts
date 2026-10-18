/**
 * Report a product event from the browser (our own events table, no third-party tracker,
 * no cookies). Fire and forget: it never throws and never slows anything down.
 * Views and opens are sent once per gift per browser tab session.
 */
import { trackClientEvent } from "@/lib/api";

type ClientEvent =
  | "invite_shared"
  | "friend_page_viewed"
  | "gift_opened"
  | "make_your_own_clicked"
  | "theme_opening_started"
  | "theme_opening_completed"
  | "theme_replayed"
  | "theme_shared";

/** Sent at most once per gift per tab session. */
const ONCE = new Set<ClientEvent>(["friend_page_viewed", "gift_opened", "theme_opening_started", "theme_opening_completed"]);

export function trackEvent(name: ClientEvent, siteId: string, props?: Record<string, string | boolean>) {
  if (typeof window === "undefined") return;
  if (ONCE.has(name)) {
    const key = `jb:ev:${name}:${siteId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: send it anyway */
    }
  }
  void trackClientEvent({ data: { name, siteId, ...(props ? { props } : {}) } }).catch(() => undefined);
}

/** The gift page's Share button: the phone's share sheet, or copy the link. Counts as theme_shared. */
export function shareGift(site: { id: string; title: string }) {
  const url = window.location.href;
  if (navigator.share) {
    trackEvent("theme_shared", site.id, { channel: "share" });
    void navigator.share({ title: site.title, url }).catch(() => undefined);
  } else {
    trackEvent("theme_shared", site.id, { channel: "copy" });
    void navigator.clipboard.writeText(url).catch(() => undefined);
  }
}
