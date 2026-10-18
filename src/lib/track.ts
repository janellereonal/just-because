/**
 * Report a product event from the browser (our own events table, no third-party tracker,
 * no cookies). Fire and forget: it never throws and never slows anything down.
 * Views and opens are sent once per gift per browser tab session.
 */
import { trackClientEvent } from "@/lib/api";

type ClientEvent = "invite_shared" | "friend_page_viewed" | "gift_opened" | "make_your_own_clicked";

export function trackEvent(name: ClientEvent, siteId: string, props?: Record<string, string | boolean>) {
  if (typeof window === "undefined") return;
  if (name === "friend_page_viewed" || name === "gift_opened") {
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
