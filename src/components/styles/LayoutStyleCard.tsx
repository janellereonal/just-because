/**
 * Gallery cards for layout styles (Scrapbook, Mixtape, Constellation...). Their own
 * openings come later, so the card shows the real thing they're about: a finished
 * sample gift (Ana's 30th) read in that layout. Hover, or scroll to it on a phone,
 * and it scrolls slowly; tap for the full sample.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { FormatView } from "@/components/formats/FormatView";
import { DEMO_GIFTS } from "@/lib/demoGifts";
import { SPRING } from "@/themes/_shared/stage";
import { t } from "@/i18n";
import { styleCopy, styleTitle, type StyleInfo } from "@/lib/styles";

const ANA = DEMO_GIFTS.ana;
const STAGE_W = 390;
const STAGE_H = 600;

function useAnaAs(style: StyleInfo) {
  return useMemo(() => ({ ...ANA.site, format: style.body, style: style.id }), [style]);
}

export function LayoutStyleCard({
  style,
  index,
  tag,
  onOpen,
  onUse,
}: {
  style: StyleInfo;
  index: number;
  tag?: string | undefined;
  onOpen: () => void;
  onUse: () => void;
}) {
  const site = useAnaAs(style);
  const frame = useRef<HTMLDivElement | null>(null);
  const ref = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(0.8);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / STAGE_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Phones: the card that's mostly on screen scrolls by itself.
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: none)").matches) return;
    const io = new IntersectionObserver(([e]) => setLive(!!e && e.intersectionRatio > 0.7), { threshold: [0, 0.7, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const title = styleTitle(style.id);
  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ ...SPRING.soft, delay: Math.min(index, 8) * 0.06 }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setLive(true)}
      onPointerLeave={() => setLive(false)}
      onFocus={() => setLive(true)}
      onBlur={() => setLive(false)}
      className="group card-paper flex cursor-pointer flex-col overflow-hidden p-2.5"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={t("gallery.useAria", { style: title })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div ref={frame} className="relative overflow-hidden rounded-[22px]" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}`, contain: "layout paint", background: ANA.palette.background }}>
        <div
          aria-hidden
          inert
          className="pointer-events-none absolute top-0 left-0 origin-top-left [container:gift/inline-size]"
          style={{ width: STAGE_W, transform: `scale(${scale})` }}
        >
          <div
            style={{
              transform: live ? "translateY(-38%)" : "translateY(0)",
              transition: live ? "transform 9s cubic-bezier(.45,0,.55,1)" : "transform 1.2s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <FormatView site={site} theme={ANA.theme} palette={ANA.palette} modules={ANA.modules} contributions={ANA.notes} calendarEntries={ANA.calendar} />
          </div>
        </div>
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-ink uppercase backdrop-blur-sm transition-opacity group-hover:opacity-0">
          {t("gallery.layoutLine", { style: title })}
        </span>
      </div>
      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <h3 className="flex flex-wrap items-center gap-x-2 font-display text-[1.6rem] leading-tight">
          {title}
          {tag ? <span className="fmt-rec font-sans">{tag}</span> : null}
        </h3>
        <p className="mt-0.5 text-sm text-muted">{styleCopy(style.id)}</p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUse();
          }}
          className="squish mt-4 min-h-11 rounded-full bg-accent px-4 text-sm font-medium text-cream hover:bg-accent/90"
        >
          {t("gallery.use")}
        </button>
      </div>
    </motion.article>
  );
}

/** Full screen: the sample gift in this layout, to scroll through and try. */
export function LayoutStyleModal({ style, onClose, onUse }: { style: StyleInfo | null; onClose: () => void; onUse: (s: StyleInfo) => void }) {
  useEffect(() => {
    if (!style) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [style, onClose]);
  return (
    <AnimatePresence>
      {style ? (
        <LayoutModalBody key={style.id} style={style} onClose={onClose} onUse={onUse} />
      ) : null}
    </AnimatePresence>
  );
}

function LayoutModalBody({ style, onClose, onUse }: { style: StyleInfo; onClose: () => void; onUse: (s: StyleInfo) => void }) {
  const site = useAnaAs(style);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={styleTitle(style.id)}
      className="fixed inset-0 z-[80] overflow-x-hidden overflow-y-auto overscroll-contain [container:gift/inline-size]"
      style={{ background: ANA.palette.background }}
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={SPRING.soft}
    >
      <div className="pb-28">
        <FormatView site={site} theme={ANA.theme} palette={ANA.palette} modules={ANA.modules} contributions={ANA.notes} calendarEntries={ANA.calendar} />
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="fixed top-3 left-3 z-[90] grid size-10 place-items-center rounded-full bg-white/85 text-ink shadow">
        <X className="size-4" aria-hidden="true" />
      </button>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-4 pb-5">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-1.5 rounded-full bg-white/90 p-1.5 shadow-[0_18px_40px_-16px_rgba(43,37,34,.45)] ring-1 ring-ink/5 backdrop-blur-md">
          <span className="min-w-0 truncate px-3 text-[13px] font-medium text-ink/75">{styleTitle(style.id)}</span>
          <button type="button" onClick={() => onUse(style)} className="squish min-h-11 flex-1 rounded-full bg-accent px-4 text-[15px] font-medium whitespace-nowrap text-cream">
            {t("gallery.use")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
