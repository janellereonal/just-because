/**
 * PostHog in the browser. Does nothing unless VITE_POSTHOG_KEY is set, and loads
 * the library only after the page has rendered, so it never slows the first paint.
 * Settings and privacy rules: src/config/analytics.ts.
 */
import type { PostHog } from "posthog-js";
import {
  INGEST_PATH,
  POSTHOG_HOSTS,
  POSTHOG_KEY,
  POSTHOG_REGION,
  analyticsEnabled,
  isNoRecordingPath,
  redactProps,
} from "@/config/analytics";

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
/** Calls made before the library finished loading, replayed once it has. */
const queue: ((ph: PostHog) => void)[] = [];

/** Photos, videos and drawings people uploaded never appear in recordings. */
const BLOCKED_MEDIA = 'img[src*="blob.vercel-storage.com"], img[src^="blob:"], img[src*="dev-uploads"], video, audio, canvas[data-private], [data-private]';

function run(fn: (ph: PostHog) => void) {
  if (client) fn(client);
  else if (analyticsEnabled()) queue.push(fn);
}

/** Starts PostHog once. Safe to call on every page; a no-op without a key or on the server. */
export function initAnalytics(): Promise<PostHog | null> {
  if (typeof window === "undefined" || !analyticsEnabled()) return Promise.resolve(null);
  if (loading) return loading;
  loading = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_KEY, {
        api_host: INGEST_PATH,
        ui_host: POSTHOG_HOSTS[POSTHOG_REGION].ui,
        defaults: "2025-05-24",
        // Profiles only for signed-in organisers; friends and recipients stay anonymous.
        person_profiles: "identified_only",
        // No cookies.
        persistence: "localStorage",
        respect_dnt: true,
        // Clicks are counted, but never the words on the page (notes, names).
        mask_all_text: true,
        capture_pageview: "history_change",
        disable_surveys: true,
        // Landing straight on a gift, the friends' page or checkout: no recording for this visit.
        disable_session_recording: isNoRecordingPath(window.location.pathname),
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: "*",
          blockSelector: BLOCKED_MEDIA,
        },
        before_send: (event) => {
          if (!event) return null;
          event.properties = redactProps(event.properties ?? {});
          if (event.$set) event.$set = redactProps(event.$set);
          if (event.$set_once) event.$set_once = redactProps(event.$set_once);
          return event;
        },
      });
      client = posthog;
      syncRecording(window.location.pathname);
      for (const fn of queue.splice(0)) fn(posthog);
      return posthog;
    })
    .catch((error: unknown) => {
      console.warn("[analytics] PostHog didn't load", error);
      return null;
    });
  return loading;
}

/**
 * Recording pauses on the gift, the friends' page and checkout. It resumes on other
 * pages only if we paused it, so it never starts when recordings are off in PostHog.
 */
let pausedByUs = false;
export function syncRecording(path: string) {
  run((ph) => {
    if (isNoRecordingPath(path)) {
      if (ph.sessionRecordingStarted()) {
        ph.stopSessionRecording();
        pausedByUs = true;
      }
    } else if (pausedByUs) {
      pausedByUs = false;
      ph.startSessionRecording();
    }
  });
}

/** A product event, alongside our own events table. Props are labels only, never note content. */
export function captureEvent(name: string, props: Record<string, string | boolean | number> = {}) {
  run((ph) => ph.capture(name, props));
}

/**
 * Links events to a signed-in organiser by our internal user id only (no name or
 * email). Null after sign-out starts a fresh anonymous visitor.
 */
let identified: string | null = null;
export function identifyOrganiser(userId: string | null) {
  if (userId === identified) return;
  const was = identified;
  identified = userId;
  run((ph) => {
    if (userId) ph.identify(userId);
    else if (was) ph.reset();
  });
}
