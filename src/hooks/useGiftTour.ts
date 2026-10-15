import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The preview tour: the opening plays, opens by itself, the gift scrolls slowly
 * to the bottom, holds, then the opening comes back and it all loops. Any touch,
 * wheel or key inside the preview hands control to the viewer.
 *
 * Use `scrollRef` on the scrolling screen and `introKey` / `autoOpenAfter` /
 * `onOpen` on the GiftIntro shown while `phase === "intro"`.
 */
export function useGiftTour({
  enabled = true,
  autoOpenAfter = 4600,
  pxPerSecond = 110,
  holdMs = 1600,
}: {
  enabled?: boolean;
  autoOpenAfter?: number;
  pxPerSecond?: number;
  holdMs?: number;
} = {}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"intro" | "gift">("intro");
  const [introKey, setIntroKey] = useState(0);
  const [autoplay, setAutoplay] = useState(enabled);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  useEffect(() => setAutoplay(enabled), [enabled]);

  const playing = autoplay && !reduced;

  // Hand control to the viewer on the first real interaction inside the screen.
  useEffect(() => {
    const el = scrollRef.current?.parentElement;
    if (!el || !playing) return;
    const stop = () => setAutoplay(false);
    const opts = { passive: true, capture: true } as const;
    el.addEventListener("wheel", stop, opts);
    el.addEventListener("touchstart", stop, opts);
    el.addEventListener("pointerdown", stop, opts);
    el.addEventListener("keydown", stop, opts);
    return () => {
      el.removeEventListener("wheel", stop, opts);
      el.removeEventListener("touchstart", stop, opts);
      el.removeEventListener("pointerdown", stop, opts);
      el.removeEventListener("keydown", stop, opts);
    };
  }, [playing, phase]);

  // The slow scroll, then the loop back to the opening.
  useEffect(() => {
    if (phase !== "gift" || !playing) return;
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    let hold = 0;
    let start = 0;
    const from = el.scrollTop;
    const begin = window.setTimeout(() => {
      const distance = Math.max(0, el.scrollHeight - el.clientHeight - from);
      const duration = Math.min(22000, Math.max(5000, (distance / pxPerSecond) * 1000));
      const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const tick = (now: number) => {
        if (!start) start = now;
        const t = Math.min(1, (now - start) / duration);
        el.scrollTop = from + distance * ease(t);
        if (t < 1) raf = requestAnimationFrame(tick);
        else
          hold = window.setTimeout(() => {
            setPhase("intro");
            setIntroKey((k) => k + 1);
          }, holdMs);
      };
      raf = requestAnimationFrame(tick);
    }, 700);
    return () => {
      window.clearTimeout(begin);
      window.clearTimeout(hold);
      cancelAnimationFrame(raf);
    };
  }, [phase, playing, pxPerSecond, holdMs]);

  // Back at the opening: reset the scroll behind it.
  useEffect(() => {
    if (phase === "intro" && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [phase, introKey]);

  const onOpen = useCallback(() => setPhase("gift"), []);
  const showOpening = useCallback(() => {
    setPhase("intro");
    setIntroKey((k) => k + 1);
  }, []);
  const showGift = useCallback(() => setPhase("gift"), []);
  const play = useCallback(() => {
    setAutoplay(true);
    setPhase("intro");
    setIntroKey((k) => k + 1);
  }, []);
  const pause = useCallback(() => setAutoplay(false), []);

  return {
    scrollRef,
    phase,
    introKey,
    playing,
    reduced,
    autoOpenAfter: playing ? autoOpenAfter : undefined,
    onOpen,
    showOpening,
    showGift,
    play,
    pause,
  };
}
