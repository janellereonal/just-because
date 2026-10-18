/**
 * Report a product event from the browser: to our own events table, and to PostHog
 * when it's switched on (src/lib/analytics.ts). Fire and forget: it never throws and
 * never slows anything down. Views and opens are sent once per gift per browser tab session.
 */
import { trackClientEvent } from "@/lib/api";
import { captureEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { SHARE_COPY } from "@/copy/strings";

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
  captureEvent(name, { site_id: siteId, ...props });
}

/** The gift's own link, clean: no ?utm_ tags or anything else from the address bar. */
export function giftShareUrl(slug: string, origin: string) {
  return `${origin}/g/${encodeURIComponent(slug)}`;
}

/**
 * The gift page's Share button: the phone's share sheet, or copy the link (with a
 * "Link copied" note). Always the clean /g/<slug> link. Counts as theme_shared.
 */
export function shareGift(site: { id: string; title: string; slug: string }) {
  const url = giftShareUrl(site.slug, window.location.origin);
  const copy = () => {
    trackEvent("theme_shared", site.id, { channel: "copy" });
    if (!navigator.clipboard) {
      toast.error(SHARE_COPY.copyFailed);
      return;
    }
    navigator.clipboard.writeText(url).then(
      () => toast.success(SHARE_COPY.copied),
      () => toast.error(SHARE_COPY.copyFailed),
    );
  };
  if (navigator.share) {
    trackEvent("theme_shared", site.id, { channel: "share" });
    navigator.share({ title: site.title, url }).catch((error: unknown) => {
      // Closing the share sheet is fine. Anything else (no apps to share to): copy instead.
      if (!(error instanceof DOMException && error.name === "AbortError")) copy();
    });
  } else {
    copy();
  }
}
