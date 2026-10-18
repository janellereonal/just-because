/**
 * PostHog settings, shared by the browser, the /ingest proxy and the server.
 *
 * Off unless VITE_POSTHOG_KEY is set (the project's public key, "phc_..."; it's
 * meant to be public, it isn't a secret). VITE_POSTHOG_REGION is "us" (default)
 * or "eu", matching where the PostHog project was created.
 *
 * Privacy rules (also in CLAUDE.md, "Metrics"):
 * - Events go to our own /ingest route, which forwards them to PostHog.
 * - No cookies: PostHog's id lives in localStorage.
 * - Autocapture never sends the text on the page, and recordings mask all text
 *   and typing and hide uploaded photos and videos.
 * - No recordings at all on the recipient's gift, the friends' page or checkout.
 * - Links to a gift (/g/..., /contribute/...) are cut down to "/g/:id" before
 *   anything leaves the browser, so PostHog never holds a working gift link.
 */
export const POSTHOG_KEY = ((import.meta.env["VITE_POSTHOG_KEY"] as string | undefined) ?? "").trim();
export const POSTHOG_REGION: "us" | "eu" = (import.meta.env["VITE_POSTHOG_REGION"] as string | undefined) === "eu" ? "eu" : "us";

export const analyticsEnabled = () => POSTHOG_KEY.startsWith("phc_");

/** Where PostHog receives events and serves its scripts, per region. */
export const POSTHOG_HOSTS = {
  us: { api: "https://us.i.posthog.com", assets: "https://us-assets.i.posthog.com", ui: "https://us.posthog.com" },
  eu: { api: "https://eu.i.posthog.com", assets: "https://eu-assets.i.posthog.com", ui: "https://eu.posthog.com" },
} as const;

/** Our own path PostHog's browser library talks to (src/routes/ingest.$.ts). */
export const INGEST_PATH = "/ingest";

/** Pages that are never recorded: what the recipient opens, what friends write on, and paying. */
export const NO_RECORDING = [/^\/g\//, /^\/contribute\//, /^\/checkout\//];
export const isNoRecordingPath = (path: string) => NO_RECORDING.some((r) => r.test(path));

/** Path segments that act as a key to a gift or an order. */
const PRIVATE_SEGMENT = /\/(g|contribute|sites|checkout)\/[^/?#\s"']+/g;
const KEEP_PARAMS = /^utm_/;

/**
 * Cuts private ids out of a URL, path or any string that contains them, and drops
 * query strings except utm_* (campaign tags). "https://x/g/ana-30?open=1" becomes
 * "https://x/g/:id". Safe on strings that aren't URLs.
 */
export function redactUrl(value: string): string {
  let out = value.replace(PRIVATE_SEGMENT, "/$1/:id");
  out = out.replace(/\?([^#\s"']*)/g, (_m, query: string) => {
    const kept = query.split("&").filter((p) => KEEP_PARAMS.test(p.split("=")[0] ?? ""));
    return kept.length ? `?${kept.join("&")}` : "";
  });
  return out;
}

/** Event properties that hold a URL, a path or the HTML around a click. */
const URLISH = /url|pathname|referrer|href|elements_chain/i;

/** Applies `redactUrl` to every URL-like property of an event, including $set and $set_once. */
export function redactProps<T extends Record<string, unknown>>(props: T): T {
  const out: Record<string, unknown> = { ...props };
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === "string" && URLISH.test(k)) out[k] = redactUrl(v);
    else if ((k === "$set" || k === "$set_once") && v && typeof v === "object") out[k] = redactProps(v as Record<string, unknown>);
  }
  return out as T;
}
