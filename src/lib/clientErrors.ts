/**
 * Browser errors, reported to our own server so they show up in the Vercel
 * logs. No outside service and no personal data: emails, long numbers, gift
 * links and query strings are scrubbed before anything leaves the device.
 * At most five reports per page load, each one sent once.
 */
const MAX_REPORTS = 5;
let sent = 0;
const seen = new Set<string>();

/** Removes anything that could identify a person or open a gift. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\/(g|contribute|sites|checkout)\/[\w-]+/g, "/$1/[id]")
    .replace(/((?:https?:\/\/|\/)[^\s?#)"']*)[?#][^\s)"']*/g, "$1")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]")
    .replace(/\d{6,}/g, "[n]")
    .slice(0, 1500);
}

export function reportClientError(error: unknown, where = "window") {
  if (typeof window === "undefined" || sent >= MAX_REPORTS) return;
  const e = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const message = scrub(e.message || String(error));
  const key = `${where}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  sent += 1;
  const body = JSON.stringify({
    message,
    stack: scrub((e.stack ?? "").split("\n").slice(0, 8).join("\n")),
    where,
    path: scrub(location.pathname),
    ua: navigator.userAgent.slice(0, 160),
  });
  try {
    if (navigator.sendBeacon?.(`/api/client-error`, new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* fall through */
  }
  void fetch("/api/client-error", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
}

/** Listens for uncaught errors and rejected promises. Call once, in the browser. */
export function installClientErrorReporting() {
  if (typeof window === "undefined" || (window as { __jbErrors?: boolean }).__jbErrors) return;
  (window as { __jbErrors?: boolean }).__jbErrors = true;
  window.addEventListener("error", (ev) => {
    // Resource load failures (a missing image) aren't code errors.
    if (!(ev.error instanceof Error) && !ev.message) return;
    reportClientError(ev.error ?? ev.message, "window");
  });
  window.addEventListener("unhandledrejection", (ev) => reportClientError(ev.reason, "promise"));
}
