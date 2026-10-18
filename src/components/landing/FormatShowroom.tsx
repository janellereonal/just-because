import { t } from "@/i18n";
import { isFlagOn } from "@/config/flags";
/**
 * Formats, shown by design: the same gift (Ana's 30th) in a phone, rendered
 * live in whichever format is picked. It steps through all nine on its own
 * while you look at it (a fill on the active one shows the timing); pick one
 * to stay on it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Live3DContext } from "@/components/Theme3D";
import { FormatView } from "@/components/formats/FormatView";
import { DevicePreview } from "@/components/DevicePreview";
import { FormatMini } from "@/components/FormatPicker";
import { offeredFormats, type GiftFormat } from "@/lib/formats";

const FORMATS = offeredFormats();
import { DEMO_GIFTS } from "@/lib/demoGifts";
import { LANDING_MORE } from "@/copy/strings";

const ANA = DEMO_GIFTS.ana;
const STEP_MS = 6500;
const C = LANDING_MORE.formats;

export function FormatShowroom() {
  const [format, setFormat] = useState<GiftFormat>("scrapbook");
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  // No style: this shows Ana's notes in each layout, not in her own style's body.
  const site = useMemo(() => ({ ...ANA.site, format, style: null }), [format]);
  const info = FORMATS.find((f) => f.id === format)!;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!auto || !inView || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      const i = FORMATS.findIndex((f) => f.id === format);
      setFormat(FORMATS[(i + 1) % FORMATS.length]!.id);
      setTick((n) => n + 1);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [auto, inView, format]);

  return (
    <div ref={ref} className="relative mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
      <div className="mx-auto w-full max-w-[340px]">
        <div onPointerDown={() => setAuto(false)}>
          <DevicePreview device="phone" phoneHeight="min(600px, 70svh)" scrollLabel={C.screenLabel(info.title)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={format} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
                <Live3DContext.Provider value={false}>
                  <FormatView site={site} theme={ANA.theme} palette={ANA.palette} modules={ANA.modules} contributions={ANA.notes} calendarEntries={ANA.calendar} />
                </Live3DContext.Provider>
              </motion.div>
            </AnimatePresence>
          </DevicePreview>
        </div>
        <p className="mt-4 text-center text-sm text-cream/70">{info.about}</p>
      </div>

      <div role="radiogroup" aria-label={isFlagOn("styles") ? t("picker.style.label") : C.pickLabel} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {FORMATS.map((f) => {
          const on = f.id === format;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setFormat(f.id);
                setAuto(false);
              }}
              className={`group relative overflow-hidden rounded-[22px] p-3 text-left ring-1 transition-colors ${
                on ? "bg-white/16 ring-pink/60" : "bg-white/6 ring-white/10 hover:bg-white/12"
              }`}
            >
              {on && auto && inView ? (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="jb-fill absolute inset-x-0 bottom-0 h-[3px] origin-left bg-pink"
                  style={{ animationDuration: `${STEP_MS}ms` }}
                />
              ) : null}
              <span data-format={f.id} className="fmt-swatch grid h-[92px] place-items-center overflow-hidden rounded-[14px] bg-cream/95 px-3 [&_.fmt-mini]:!h-[70px] [&_.fmt-mini]:!w-full">
                <FormatMini id={f.id} />
              </span>
              <span className="mt-3 flex items-center justify-between gap-2">
                <span className="font-display text-[17px] font-semibold">{f.title}</span>
                {f.isNew ? <span className="rounded-full bg-pink px-2 py-0.5 text-[10px] font-semibold text-ink">{C.isNew}</span> : null}
              </span>
              <span className="mt-0.5 block text-[13px] leading-snug text-cream/65">{f.copy}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
