import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SAVE_COPY } from "@/copy/strings";
import { updateSite } from "@/lib/api";
import { fetchSiteById, normalizeSite, type GiftSite } from "@/lib/gift";
import { applyFlat, changedKeys, flatten, rebase, same, toPatch, type Flat } from "@/lib/siteDraft";

/**
 * The editor's autosave (how it works: src/lib/siteDraft.ts).
 *
 * - Saves only what changed, 700ms after the last edit, one save at a time.
 * - A failed save stays unsaved and is retried (2s, 5s, 10s, then every 30s, and
 *   right away when the connection comes back).
 * - Leaving the page or hiding the tab sends what's left straight away (keepalive),
 *   and in-app navigation waits for it.
 * - If the gift changed somewhere else in a way that clashes, saving stops and
 *   `state` is "conflict" until `loadLatest()`.
 */
export type SaveState = "saved" | "saving" | "retrying" | "offline" | "conflict";

const DEBOUNCE_MS = 700;
const RETRY_MS = [2000, 5000, 10000, 30000];
/** Fields a save can move on the server by itself (a style brings its own layout). */
const DERIVED = ["style", "format"];

type Outcome = "ok" | "none" | "retry" | "conflict" | "rejected";

const flatOf = (site: GiftSite): Flat => flatten(site as unknown as Record<string, unknown>);

function setFlat(map: Flat, key: string, value: unknown) {
  if (value === undefined) delete map[key];
  else map[key] = value;
}

export function useGiftSaver(id: string, site: GiftSite | null | undefined) {
  const queryClient = useQueryClient();
  const [draft, setDraftState] = useState<GiftSite | null>(null);
  const [state, setState] = useState<SaveState>("saved");

  const draftRef = useRef<GiftSite | null>(null);
  /** What this tab last saved, per field. */
  const sent = useRef<Flat>({});
  /** What the server last said, per field (the base a save is checked against). */
  const known = useRef<Flat>({});
  /** updated_at of the newest copy seen, so an older copy never replaces a newer one. */
  const version = useRef<string | null>(null);
  const inFlight = useRef<Promise<Outcome> | null>(null);
  /** The values being sent right now (a keepalive save may overlap one). */
  const inFlightFlat = useRef<Flat>({});
  const again = useRef(false);
  const timer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const attempts = useRef(0);
  const failing = useRef(false);
  const conflict = useRef(false);
  const lastKeepalive = useRef<string | null>(null);
  const lastPulledToast = useRef(0);

  const unsavedKeys = () => (draftRef.current ? changedKeys(flatOf(draftRef.current), sent.current) : []);

  const refresh = useCallback(() => {
    if (conflict.current) setState("conflict");
    else if (failing.current) setState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "retrying");
    else if (inFlight.current || unsavedKeys().length) setState("saving");
    else setState("saved");
  }, []);

  const show = useCallback((next: GiftSite) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  /** First copy from the server: the starting point for all three copies. */
  useEffect(() => {
    if (!site || draftRef.current) return;
    const flat = flatOf(site);
    sent.current = { ...flat };
    known.current = { ...flat };
    version.current = site.updated_at ?? null;
    show(site);
  }, [site, show]);

  /**
   * Takes a fresh copy from the server. `saved` are the fields this tab just saved;
   * `sentFlat` is what the screen held when it sent them.
   */
  const absorb = useCallback(
    (fresh: GiftSite, opts: { saved?: ReadonlySet<string>; sentFlat?: Flat; quiet?: boolean } = {}) => {
      const current = draftRef.current;
      if (!current) return;
      if (version.current && fresh.updated_at && fresh.updated_at < version.current) return;
      const server = flatOf(fresh);
      const saved = new Set(opts.saved ?? []);
      const derived = DERIVED.some((k) => saved.has(k)) || saved.has("occasion");
      if (derived) for (const k of DERIVED) saved.add(k);
      const r = rebase({ draft: flatOf(current), sent: sent.current, known: known.current, server, saved });
      // A style picks its own layout on the server: show the server's unless it was changed again since.
      if (derived && opts.sentFlat) {
        for (const k of DERIVED) {
          if (same(r.draft[k], opts.sentFlat[k])) {
            setFlat(r.draft, k, server[k]);
            setFlat(r.sent, k, server[k]);
          }
        }
      }
      sent.current = r.sent;
      known.current = r.known;
      version.current = fresh.updated_at ?? version.current;
      show(applyFlat(fresh as unknown as Record<string, unknown>, r.draft) as unknown as GiftSite);
      queryClient.setQueryData(["site", id], fresh);
      if (r.clashes.length) {
        conflict.current = true;
        if (timer.current) window.clearTimeout(timer.current);
      } else if (r.pulled.length && !opts.quiet && Date.now() - lastPulledToast.current > 10_000) {
        lastPulledToast.current = Date.now();
        toast(SAVE_COPY.pulled);
      }
    },
    [id, queryClient, show],
  );

  /** One save of everything unsaved. */
  const send = useCallback(
    async (keepalive: boolean, overlap = false): Promise<Outcome> => {
      const current = draftRef.current;
      if (!current || conflict.current) return "none";
      const flat = flatOf(current);
      const keys = changedKeys(flat, sent.current);
      if (!keys.length) return "none";
      const patch = toPatch(keys, flat);
      if ("title" in patch) patch["title"] = String(patch["title"] ?? "").trim() || "Untitled gift";
      // Blank values go as null, so every changed field has a base the server can check.
      const base = toPatch(keys, known.current);
      // A value still on its way counts as a base too (a keepalive save can overtake it).
      const alt = toPatch(keys.filter((k) => k in inFlightFlat.current), inFlightFlat.current);
      if (keepalive) {
        const sig = JSON.stringify(patch);
        if (lastKeepalive.current === sig) return "none";
        lastKeepalive.current = sig;
      }
      let status = 0;
      const doFetch = async (url: RequestInfo | URL, init?: RequestInit) => {
        const res = await fetch(url, { ...init, ...(keepalive ? { keepalive: true } : {}) });
        status = res.status;
        return res;
      };
      if (!overlap) inFlightFlat.current = flat;
      try {
        const res = await updateSite({
          data: {
            id,
            patch: patch as never,
            base: base as never,
            ...(Object.keys(alt).length ? { base_alt: alt as never } : {}),
          },
          fetch: doFetch,
        });
        for (const k of keys) setFlat(sent.current, k, flat[k]);
        failing.current = false;
        attempts.current = 0;
        if (keepalive) lastKeepalive.current = null;
        absorb(normalizeSite(res.site as Record<string, unknown>), { saved: new Set(keys), sentFlat: flat });
        void queryClient.invalidateQueries({ queryKey: ["my-sites"] });
        return "ok";
      } catch (err) {
        if (keepalive) lastKeepalive.current = null;
        const message = err instanceof Error ? err.message : "";
        if (status === 409 && message === SAVE_COPY.serverConflict) {
          conflict.current = true;
          return "conflict";
        }
        // Offline, a dropped connection, the server busy or signed out: keep it and try again.
        if (status === 0 || status >= 500 || status === 401 || status === 408 || status === 429) {
          failing.current = true;
          return "retry";
        }
        // The server said no to this change (a plan limit, a bad value): put it back and say why.
        const fresh = flatOf(draftRef.current ?? current);
        const back = { ...fresh };
        for (const k of keys) {
          if (!same(fresh[k], flat[k])) continue;
          setFlat(back, k, known.current[k]);
          setFlat(sent.current, k, known.current[k]);
        }
        show(applyFlat(draftRef.current as unknown as Record<string, unknown>, back) as unknown as GiftSite);
        toast.error(message && message.length < 160 ? message : SAVE_COPY.rejected);
        return "rejected";
      } finally {
        if (!overlap) inFlightFlat.current = {};
      }
    },
    [absorb, id, queryClient, show],
  );

  const scheduleRetry = useCallback(() => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    const delay = RETRY_MS[Math.min(attempts.current, RETRY_MS.length - 1)]!;
    attempts.current += 1;
    retryTimer.current = window.setTimeout(() => {
      retryTimer.current = null;
      void runRef.current();
    }, delay);
  }, []);

  /**
   * Saves now (or right after the save already on its way). Resolves when this round is done.
   * `keepalive`: the request survives the page closing.
   */
  const run = useCallback((keepalive = false): Promise<Outcome> => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    const p = send(keepalive).then((outcome) => {
      inFlight.current = null;
      if (outcome === "retry") scheduleRetry();
      else if (again.current || (outcome === "ok" && unsavedKeys().length)) {
        again.current = false;
        timer.current = window.setTimeout(() => void runRef.current(), 0);
      }
      refresh();
      return outcome;
    });
    inFlight.current = p;
    refresh();
    return p;
  }, [refresh, scheduleRetry, send]);
  const runRef = useRef(run);
  runRef.current = run;

  /** Changes the draft and queues a save. Same shape as React's setState updater. */
  const setDraft = useCallback(
    (update: (prev: GiftSite | null) => GiftSite | null) => {
      const next = update(draftRef.current);
      if (!next || next === draftRef.current) return;
      show(next);
      if (conflict.current || retryTimer.current) {
        refresh();
        return;
      }
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        void runRef.current();
      }, DEBOUNCE_MS);
      refresh();
    },
    [refresh, show],
  );

  /** Waits until everything is saved. False if it couldn't be (offline, refused, changed elsewhere). */
  const flush = useCallback(async (): Promise<boolean> => {
    for (let i = 0; i < 5; i++) {
      if (conflict.current) return false;
      if (inFlight.current) await inFlight.current;
      if (!unsavedKeys().length) return !conflict.current;
      if (failing.current && retryTimer.current) {
        window.clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      const outcome = await run();
      if (outcome === "retry" || outcome === "conflict") return false;
    }
    return !unsavedKeys().length;
  }, [run]);

  /** Publish or unpublish: saves what's pending first, then the new status. */
  const saveStatus = useCallback(
    async (status: "draft" | "published"): Promise<boolean> => {
      if (!(await flush())) {
        toast.error(SAVE_COPY.rejected);
        return false;
      }
      try {
        const res = await updateSite({ data: { id, patch: { status }, base: {} } });
        absorb(normalizeSite(res.site as Record<string, unknown>), { quiet: true });
        void queryClient.invalidateQueries({ queryKey: ["my-sites"] });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        toast.error(message && message.length < 160 ? message : SAVE_COPY.rejected);
        return false;
      }
    },
    [absorb, flush, id, queryClient],
  );

  /**
   * After a clash: show the newest copy. Unsaved changes in this tab are dropped (they were
   * at most the last second or two of editing, and half of a style switch is worse than none).
   */
  const loadLatest = useCallback(async () => {
    const fresh = await fetchSiteById(id);
    if (!fresh || !draftRef.current) return;
    const flat = flatOf(fresh);
    sent.current = { ...flat };
    known.current = { ...flat };
    version.current = fresh.updated_at ?? null;
    conflict.current = false;
    failing.current = false;
    attempts.current = 0;
    if (timer.current) window.clearTimeout(timer.current);
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
    timer.current = retryTimer.current = null;
    show(fresh);
    queryClient.setQueryData(["site", id], fresh);
    refresh();
  }, [id, queryClient, refresh, show]);

  // A newer copy from the server (React Query refetches when the window gets focus again).
  useEffect(() => {
    if (!site || !draftRef.current || inFlight.current) return;
    if (!site.updated_at || site.updated_at === version.current) return;
    absorb(site);
    refresh();
  }, [site, absorb, refresh]);

  // Leaving or hiding the page sends what's left right away; coming back online retries.
  useEffect(() => {
    // The page is going away: send everything left, even alongside a save already on its way.
    const onPageHide = () => {
      if (conflict.current || !unsavedKeys().length) return;
      if (inFlight.current) void send(true, true);
      else void runRef.current(true);
    };
    // The tab is hidden (switching apps on a phone): save now rather than in 700ms.
    const onVisibility = () => {
      if (document.visibilityState !== "hidden" || conflict.current || inFlight.current) return;
      if (unsavedKeys().length) void runRef.current(true);
    };
    const onOnline = () => {
      if (!failing.current) return refresh();
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      retryTimer.current = null;
      void runRef.current();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", refresh);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", refresh);
    };
  }, [refresh, send]);

  // Leaving the editor inside the app: one last save of whatever is left.
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      if (conflict.current || !unsavedKeys().length) return;
      if (inFlight.current) again.current = true;
      else void runRef.current(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Something typed here isn't on the server and can't get there by itself (offline, failing, or changed elsewhere). */
  const atRisk = useCallback(
    () => conflict.current || (unsavedKeys().length > 0 && (failing.current || (typeof navigator !== "undefined" && navigator.onLine === false))),
    [],
  );

  return { draft, setDraft, state, flush, saveStatus, loadLatest, atRisk };
}
