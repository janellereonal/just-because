import { useEffect, useMemo, useRef, useState } from "react";
import { Live3DContext } from "@/components/Theme3D";
import { FormatView } from "@/components/formats/FormatView";
import { FORMATS, type GiftFormat } from "@/lib/formats";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import { DEMO_MODULES, DEMO_NOTES, DEMO_PALETTE, DEMO_THEME, demoSite } from "@/lib/demoGift";

const CYCLE_MS = 5200;

/**
 * A real gift, rendered by the same code recipients see, inside a phone.
 * Cycles through the formats until someone picks one.
 */
export function FormatDemo({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [format, setFormat] = useState<GiftFormat>("bento");
  const [touched, setTouched] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("phone");
  const [inView, setInView] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const site = useMemo(() => demoSite(format), [format]);

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

  // Auto-advance while visible and untouched (not under reduced motion).
  useEffect(() => {
    if (touched || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      const ids: GiftFormat[] = FORMATS.map((f) => f.id).filter((id) => id !== "comic");
      setFormat((f) => ids[(ids.indexOf(f) + 1) % ids.length]!);
    }, CYCLE_MS);
    return () => window.clearTimeout(t);
  }, [format, touched, inView]);

  // A gentle auto-scroll so the phone feels alive.
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    el.scrollTop = 0;
    if (device === "laptop") return;
    if (touched || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now() + 900;
    const tick = (now: number) => {
      const t = Math.max(0, now - start) / (CYCLE_MS - 1400);
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = Math.min(
        max * 0.55,
        max * 0.55 * (1 - Math.cos(Math.min(1, t) * Math.PI)) * 0.5,
      );
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const stop = () => {
      cancelAnimationFrame(raf);
      setTouched(true);
    };
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchstart", stop, { passive: true });
    el.addEventListener("pointerdown", stop);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("pointerdown", stop);
    };
  }, [format, touched, inView, device]);

  const gift = (
    <Live3DContext.Provider value={false}>
      <FormatView site={site} theme={DEMO_THEME} palette={DEMO_PALETTE} modules={DEMO_MODULES} contributions={DEMO_NOTES} />
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
        <div className="mt-5 w-[min(640px,calc(100vw-32px))]">
          <DevicePreview device="laptop" scrollLabel="A sample gift for Maya on a laptop">
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
              style={{ background: DEMO_PALETTE.background }}
              aria-label={`A sample gift for Maya, shown as ${FORMATS.find((f) => f.id === format)?.title}`}
            >
              {gift}
            </div>
          </div>
        </div>
      )}
      <p className="mt-4 max-w-[30ch] text-center text-sm text-ink/60">
        {FORMATS.find((f) => f.id === format)?.about} Tap around, it's a real gift.
      </p>
    </div>
  );
}
