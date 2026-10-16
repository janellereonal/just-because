/**
 * The hero: real example gifts in a phone, rendered by the same code
 * recipients see. Each one opens itself, then glides through every section
 * with a little label, then the next example takes over. The chips above show
 * which one is playing (with a progress fill), so people see there's more and
 * can jump to any of them. Touching the gift hands control to the visitor;
 * "Play the tour" hands it back.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { Heart, Pause, Play, RotateCcw } from "lucide-react";
import { Live3DContext } from "@/components/Theme3D";
import { FormatView } from "@/components/formats/FormatView";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import { DEMO_GIFTS, DEMO_ORDER } from "@/lib/demoGifts";
import { TactileOpening } from "@/themes/TactileOpening";
import { loadThemeFonts } from "@/themes/_shared/design";
import { LANDING } from "@/copy/strings";

const H = LANDING.hero;
/** Share of the progress fill the opening takes, before the tour. */
const OPENING_SHARE = 0.15;

export function HeroShowcase() {
  const [idx, setIdx] = useState(0);
  const [auto, setAuto] = useState(true);
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
  const [device, setDevice] = useState<PreviewDevice>("phone");
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [stopLabel, setStop] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const id = DEMO_ORDER[idx]!;
  const g = DEMO_GIFTS[id];
  const playing = auto && inView && !reduced;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Warm the next examples' fonts so switching doesn't flash.
    DEMO_ORDER.forEach((d) => loadThemeFonts(DEMO_GIFTS[d].kind));
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function show(i: number, keepPlaying = true) {
    setIdx((i + DEMO_ORDER.length) % DEMO_ORDER.length);
    setOpened(false);
    setRound((r) => r + 1);
    setProgress(0);
    setStop(null);
    setAuto(keepPlaying);
  }

  // While the opening plays by itself, the chip fills its first stretch.
  useEffect(() => {
    if (opened || !playing) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      setProgress(Math.min(OPENING_SHARE, ((now - t0) / 4500) * OPENING_SHARE));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [opened, playing, round]);

  // Once open, a guided tour: glide to each section, linger with its name,
  // then on to the next example. Any touch hands control to the visitor.
  useEffect(() => {
    const el = screenRef.current;
    setStop(null);
    if (!opened || !playing) return;
    let raf = 0;
    let timer = 0;
    let alive = true;
    if (device === "laptop") {
      // The laptop view lays the gift out wide; give it a moment, then move on.
      setProgress(1);
      timer = window.setTimeout(() => show(idx + 1), 9000);
      return () => window.clearTimeout(timer);
    }
    if (!el) return;
    el.scrollTop = 0;
    const stops = () => {
      const base = el.getBoundingClientRect().top - el.scrollTop;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const list = Array.from(el.querySelectorAll<HTMLElement>(".sb-section")).map((s) => ({
        y: Math.min(max, Math.max(0, s.getBoundingClientRect().top - base - 28)),
        label: s.querySelector("h2,h3")?.textContent?.trim() ?? "",
      }));
      return [...list, { y: max, label: "" }];
    };
    const glide = (to: number, ms: number, done: () => void) => {
      const from = el.scrollTop;
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!alive) return;
        const t = Math.min(1, (now - t0) / ms);
        el.scrollTop = from + (to - from) * (1 - Math.cos(t * Math.PI)) * 0.5;
        if (t < 1) raf = requestAnimationFrame(tick);
        else done();
      };
      raf = requestAnimationFrame(tick);
    };
    const run = (i: number) => {
      const list = stops();
      setProgress(OPENING_SHARE + (1 - OPENING_SHARE) * Math.min(1, i / Math.max(1, list.length)));
      if (i >= list.length) {
        timer = window.setTimeout(() => show(idx + 1), 1200);
        return;
      }
      const s = list[i]!;
      const dist = Math.abs(s.y - el.scrollTop);
      setStop(null);
      glide(s.y, Math.min(1500, 550 + dist * 0.7), () => {
        setStop(s.label || null);
        timer = window.setTimeout(() => run(i + 1), s.label ? 1700 : 600);
      });
    };
    timer = window.setTimeout(() => run(0), 1400);
    const stop = () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      setStop(null);
      setAuto(false);
    };
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("pointerdown", stop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("pointerdown", stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, playing, device, idx, round]);

  const closed = !opened ? (
    <div className="absolute inset-0 z-10 [container:gift/inline-size]">
      <TactileOpening
        key={`${id}-${round}`}
        kind={g.kind}
        palette={g.palette}
        recipientName={g.who}
        contributors={g.friends}
        contained
        autoplay={playing}
        onOpen={() => setOpened(true)}
        onSkip={() => setOpened(true)}
      />
    </div>
  ) : null;

  const gift = (
    <Live3DContext.Provider value={false}>
      <FormatView
        site={g.site}
        theme={g.theme}
        palette={g.palette}
        modules={g.modules}
        contributions={g.notes}
        calendarEntries={g.calendar}
      />
    </Live3DContext.Provider>
  );

  return (
    <div ref={wrapRef} className="relative flex flex-col items-center">
      {/* Little live notes around the phone, about whichever gift is playing */}
      <div aria-hidden="true" className="float-note top-36 -left-14 hidden rotate-[-4deg] xl:block" style={{ "--r": "-4deg" } as React.CSSProperties}>
        <span className="block font-semibold">{H.noteAdded(g.friends[0] ?? "A friend")}</span>
        <span className="text-ink/60">{H.noteWhen}</span>
      </div>
      <div aria-hidden="true" className="float-note -right-8 bottom-44 hidden rotate-[5deg] xl:block" style={{ "--r": "5deg", animationDelay: "1.4s" } as React.CSSProperties}>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Heart className="size-3.5 fill-accent text-accent" /> {H.noteJoined(g.friends.length)}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={H.examplesLabel}
        className="relative z-10 flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/85 p-1 shadow-[0_10px_30px_-18px_rgba(43,37,34,.5)] ring-1 ring-ink/5 backdrop-blur [scrollbar-width:none]"
      >
        {DEMO_ORDER.map((d, i) => {
          const on = i === idx;
          return (
            <button
              key={d}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => show(i, true)}
              className={`relative shrink-0 overflow-hidden rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
                on ? "bg-ink text-cream" : "text-ink/70 hover:bg-pink/50 hover:text-ink"
              }`}
            >
              {on && auto ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-white/22"
                  style={{ width: `${progress * 100}%`, transition: "width .25s linear" }}
                />
              ) : null}
              <span className="relative">{DEMO_GIFTS[d].short}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <DeviceToggle value={device} onChange={setDevice} size="sm" />
        {!reduced ? (
          <button
            type="button"
            onClick={() => setAuto((a) => !a)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/80 px-3 text-[13px] font-medium ring-1 ring-ink/8 hover:bg-white"
          >
            {auto ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
            {auto ? H.pauseTour : H.playTour}
          </button>
        ) : null}
      </div>

      {device === "laptop" ? (
        <div className="mt-5 w-full max-w-[640px] min-w-0">
          <DevicePreview device="laptop" scrollLabel={H.screenLabel(g.short)} overlay={closed}>
            <div key={id}>{gift}</div>
          </DevicePreview>
        </div>
      ) : (
        <div className="demo-phone relative mt-5 h-[600px] w-[300px] sm:h-[640px] sm:w-[320px]">
          <span className="demo-phone-notch" aria-hidden />
          <div className="absolute inset-[10px] overflow-hidden rounded-[34px]" style={{ contain: "layout paint" }}>
            <div
              ref={screenRef}
              key={id}
              className="demo-screen absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none]"
              style={{ background: g.palette.background }}
              aria-label={H.screenLabel(g.short)}
            >
              {gift}
            </div>
            <AnimatePresence>
              {stopLabel ? (
                <motion.span
                  key={stopLabel}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="pointer-events-none absolute bottom-4 left-1/2 z-[5] max-w-[90%] -translate-x-1/2 truncate rounded-full bg-ink/85 px-3 py-1.5 font-mono text-[10px] tracking-[.14em] whitespace-nowrap text-cream uppercase shadow-lg backdrop-blur"
                >
                  {stopLabel}
                </motion.span>
              ) : null}
            </AnimatePresence>
            {closed}
          </div>
        </div>
      )}

      <p className="mt-4 max-w-[34ch] text-center text-sm text-ink/60">
        <span className="font-medium text-ink/80">{g.short}.</span> {g.line}.
      </p>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <Link
          to="/example/$id"
          params={{ id }}
          className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          {H.fullGift}
        </Link>
        {opened ? (
          <button
            type="button"
            onClick={() => {
              setOpened(false);
              setRound((n) => n + 1);
              setAuto(false);
            }}
            className="inline-flex items-center gap-1 text-ink/60 hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> {H.closeAgain}
          </button>
        ) : null}
      </div>
    </div>
  );
}
