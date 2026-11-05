/**
 * Live 3D scenes (Bo, the occasion objects) cost a few hundred milliseconds of main thread each
 * to build. Built during page load they hold up the first screen on phones: text fades in late
 * and taps feel stuck. So every scene waits its turn here: after the page has loaded and gone
 * quiet, one at a time. Until then each one shows its still image, which looks the same.
 */

/** Never hold a scene back longer than this after load, even on a page that never goes idle. */
const MAX_WAIT_MS = 2500;
/** A beat after load so the first screen's text and animations land before any 3D work. */
const AFTER_LOAD_MS = 700;
/** The landing intro runs about 3 seconds; never wait on it longer than this. */
const INTRO_CAP_MS = 7000;
/** Breathing room between two scenes, so their set-up doesn't merge into one long freeze. */
const GAP_MS = 120;

let settled: Promise<void> | null = null;
let queue: Promise<unknown> = Promise.resolve();

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };

/** Resolves once the page has loaded, waited a beat and had an idle moment. */
export function pageSettled(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (settled) return settled;
  settled = new Promise<void>((resolve) => {
    const afterLoad = () => {
      window.setTimeout(() => {
        const w = window as IdleWindow;
        const cap = window.setTimeout(resolve, MAX_WAIT_MS);
        if (w.requestIdleCallback)
          w.requestIdleCallback(
            () => {
              window.clearTimeout(cap);
              resolve();
            },
            { timeout: MAX_WAIT_MS },
          );
        else {
          window.clearTimeout(cap);
          resolve();
        }
      }, AFTER_LOAD_MS);
    };
    // The landing's Bo intro covers the page first: wait for it to finish (it has its own still Bo).
    const afterIntro = () => {
      if (document.documentElement.dataset["intro"] !== "play") return afterLoad();
      const cap = window.setTimeout(afterLoad, INTRO_CAP_MS);
      window.addEventListener(
        "jb:intro-done",
        () => {
          window.clearTimeout(cap);
          afterLoad();
        },
        { once: true },
      );
    };
    if (document.readyState === "complete") afterIntro();
    else window.addEventListener("load", afterIntro, { once: true });
  });
  return settled;
}

/**
 * Run `build` once the page has settled and every scene queued before it has started.
 * A scene that takes long doesn't hold the next one back for more than a second.
 */
export function whenSettled<T>(build: () => Promise<T>): Promise<T> {
  const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const turn = queue.then(() => pageSettled());
  const run = turn.then(build);
  queue = turn
    .then(() => Promise.race([run.then(() => undefined, () => undefined), delay(1000)]))
    .then(() => delay(GAP_MS));
  return run;
}
