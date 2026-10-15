import { useEffect, useMemo, useRef, useState } from "react";
import { Live3DContext } from "@/components/Theme3D";
import { FormatView } from "@/components/formats/FormatView";
import { FORMATS, type GiftFormat } from "@/lib/formats";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { DEMO_GIFTS } from "@/lib/demoGifts";
import { TactileOpening } from "@/themes/TactileOpening";
import { LANDING } from "@/copy/strings";

const ANA = DEMO_GIFTS.ana;

/**
 * Ana's 30th: a real gift, rendered by the same code recipients see, inside a
 * phone. It starts closed: blow out the candles (or tap them) to open it.
 * Then it gives a slow tour of every section until someone takes over.
 */
export function FormatDemo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [format, setFormat] = useState<GiftFormat>("scrapbook");
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
  const [touched, setTouched] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("phone");
  const [inView, setInView] = useState(false);
  const [stopLabel, setStop] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const site = useMemo(() => ({ ...ANA.site, format }), [format]);

  // Other sections can ask the demo to show a format: dispatchEvent(new CustomEvent("jb:demo-format", { detail: "zine" })).
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<GiftFormat>).detail;
      if (!FORMATS.some((f) => f.id === id)) return;
      setTouched(true);
      setFormat(id);
    };
    window.addEventListener("jb:demo-format", on);
    return () => window.removeEventListener("jb:demo-format", on);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), {
      threshold: 0.35,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Once open, a guided tour: glide to each section, linger, move on, then
  // back to the top and round again. Any touch hands control to the visitor.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setStop(null);
    if (device === "laptop") return;
    if (
      !opened ||
      touched ||
      !inView ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let raf = 0;
    let timer = 0;
    let alive = true;
    const stops = () => {
      const base = el.getBoundingClientRect().top - el.scrollTop;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      const list = Array.from(el.querySelectorAll<HTMLElement>(".sb-section")).map((s) => ({
        y: Math.min(max, Math.max(0, s.getBoundingClientRect().top - base - 28)),
        label: s.querySelector("h2,h3")?.textContent?.trim() ?? "",
      }));
      return [{ y: 0, label: "" }, ...list, { y: max, label: "" }];
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
      if (i >= list.length) {
        timer = window.setTimeout(() => {
          setStop(null);
          glide(0, 1800, () => (timer = window.setTimeout(() => run(1), 1400)));
        }, 1600);
        return;
      }
      const s = list[i]!;
      const dist = Math.abs(s.y - el.scrollTop);
      setStop(null);
      glide(s.y, Math.min(2200, 700 + dist * 0.9), () => {
        setStop(s.label || null);
        timer = window.setTimeout(() => run(i + 1), s.label ? 2300 : 900);
      });
    };
    timer = window.setTimeout(() => run(1), 1600);
    const stop = () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      setStop(null);
      setTouched(true);
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
  }, [format, touched, inView, device, opened]);

  const closed = !opened ? (
    <div className="absolute inset-0 z-10 [container:gift/inline-size]">
      <TactileOpening
        key={round}
        kind={ANA.kind}
        palette={ANA.palette}
        recipientName={ANA.who}
        contributors={ANA.friends}
        contained
        onOpen={() => setOpened(true)}
        onSkip={() => setOpened(true)}
      />
    </div>
  ) : null;

  const gift = (
    <Live3DContext.Provider value={false}>
      <FormatView
        site={site}
        theme={ANA.theme}
        palette={ANA.palette}
        modules={ANA.modules}
        contributions={ANA.notes}
      />
    </Live3DContext.Provider>
  );

  return (
    <div ref={wrapRef} className={`flex flex-col items-center ${className}`}>
      <div
        role="tablist"
        aria-label="Gift formats"
        className="relative z-10 flex max-w-full gap-1 overflow-x-auto rounded-full bg-white/80 p-1 shadow-[0_10px_30px_-18px_rgba(43,37,34,.5)] ring-1 ring-ink/5 backdrop-blur [scrollbar-width:none]"
      >
        {FORMATS.map((f) => (
          <button
            key={f.id}
            role="tab"
            type="button"
            aria-selected={format === f.id}
            onClick={() => {
              setTouched(true);
              setFormat(f.id);
            }}
            className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              format === f.id ? "bg-ink text-cream" : "text-ink/70 hover:bg-pink/50 hover:text-ink"
            }`}
          >
            {f.title}
          </button>
        ))}
      </div>
      <DeviceToggle
        value={device}
        onChange={(d) => {
          setTouched(true);
          setDevice(d);
        }}
        size="sm"
        className="mt-3"
      />
      {device === "laptop" ? (
        <div className="mt-5 w-full max-w-[640px] min-w-0">
          <DevicePreview
            device="laptop"
            scrollLabel="Ana's 30th, an example gift, on a laptop"
            overlay={closed}
          >
            <div key={format}>{gift}</div>
          </DevicePreview>
        </div>
      ) : (
        <div
          className={`demo-phone relative mt-5 ${compact ? "h-[560px] w-[290px]" : "h-[600px] w-[300px] sm:h-[640px] sm:w-[320px]"}`}
        >
          <span className="demo-phone-notch" aria-hidden />
          <div
            className="absolute inset-[10px] overflow-hidden rounded-[34px]"
            style={{ contain: "layout paint" }}
          >
            <div
              ref={screenRef}
              key={format}
              className="demo-screen absolute inset-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none]"
              style={{ background: ANA.palette.background }}
              aria-label={`Ana's 30th, an example gift, shown as ${FORMATS.find((f) => f.id === format)?.title}`}
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
                  className="pointer-events-none absolute bottom-4 left-1/2 z-[5] -translate-x-1/2 rounded-full bg-ink/85 px-3 py-1.5 font-mono text-[10px] tracking-[.14em] whitespace-nowrap text-cream uppercase shadow-lg backdrop-blur"
                >
                  {stopLabel}
                </motion.span>
              ) : null}
            </AnimatePresence>
            {closed}
          </div>
        </div>
      )}
      <p className="mt-4 max-w-[32ch] text-center text-sm text-ink/60">
        {opened
          ? `${FORMATS.find((f) => f.id === format)?.about} Tap around, it's a real gift.`
          : `${LANDING.hero.demoLabel} ${LANDING.hero.demoHint}.`}
      </p>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <Link
          to="/example/$id"
          params={{ id: "ana" }}
          className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
        >
          {LANDING.hero.fullGift}
        </Link>
        {opened ? (
          <button
            type="button"
            onClick={() => {
              setOpened(false);
              setRound((n) => n + 1);
            }}
            className="inline-flex items-center gap-1 text-ink/60 hover:text-ink"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" /> Close it again
          </button>
        ) : null}
      </div>
    </div>
  );
}
