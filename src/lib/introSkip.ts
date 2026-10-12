/** Remembers which gifts this device chose to skip the intro on. */

const keyFor = (siteId: string) => `jb:intro-skipped:${siteId}`;

export function hasSkippedIntro(siteId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(keyFor(siteId)) === "1";
  } catch {
    return false;
  }
}

export function rememberIntroSkip(siteId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(siteId), "1");
  } catch {
    /* private browsing */
  }
}

export function clearIntroSkip(siteId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(siteId));
  } catch {
    /* ignore */
  }
}
