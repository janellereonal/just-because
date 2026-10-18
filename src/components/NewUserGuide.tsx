import { isFlagOn } from "@/config/flags";
import { t } from "@/i18n";
/**
 * A short guide before a new organiser's first gift (flag newUserGuide): four steps, one at a
 * time, from theme to sending. Shown once on /create to people with no gifts yet, and any time
 * from the "How does this work?" link.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import Bo, { type BoPose } from "@/components/Bo";
import { StepVisual } from "@/components/landing/StepVisual";
import { GUIDE_COPY as C } from "@/copy/strings";

const SEEN_KEY = "jb:guide-seen:v1";
const POSES: BoPose[] = ["hello", "delivery", "idle", "published"];

/** Has this browser already seen (or skipped) the guide? */
export function guideSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // no storage: don't keep showing it
  }
}

export function markGuideSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* fine */
  }
}

export function NewUserGuide({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion();
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  // With styles on, the first step talks about styles instead of themes.
  const steps = isFlagOn("styles") ? C.steps.map((s, i) => (i === 0 ? { ...s, title: t("guide.style.title"), body: t("guide.style.body") } : s)) : C.steps;
  const step = steps[at]!;
  const last = at === steps.length - 1;

  const go = (to: number) => {
    setDir(to > at ? 1 : -1);
    setAt(Math.max(0, Math.min(steps.length - 1, to)));
  };
  const close = () => {
    markGuideSeen();
    onClose();
  };

  // Keys always act on the current step.
  const keys = useRef({ go, close, at });
  keys.current = { go, close, at };
  useEffect(() => {
    nextRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      const k = keys.current;
      if (e.key === "Escape") k.close();
      if (e.key === "ArrowRight") k.go(k.at + 1);
      if (e.key === "ArrowLeft") k.go(k.at - 1);
    };
    window.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[95] grid place-items-end bg-ink/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={close}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={C.label}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-t-[30px] bg-paper text-ink shadow-2xl sm:rounded-[30px]"
        initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">{C.kicker}</p>
            <h2 className="mt-1 font-display text-2xl leading-tight font-semibold text-balance">{C.title}</h2>
          </div>
          <button type="button" onClick={close} aria-label={C.close} className="grid size-10 shrink-0 place-items-center rounded-full bg-cream hover:bg-pink/50">
            <X className="size-4" />
          </button>
        </div>

        <div className="relative mt-5 min-h-[310px] px-6">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={at}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              aria-live="polite"
            >
              <div className="card-paper relative p-5">
                <div className="min-h-[104px]">
                  <StepVisual n={step.n} />
                </div>
              </div>
              <div className="mt-5 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs tracking-[0.16em] text-accent">{C.stepOf(at + 1, steps.length)}</p>
                  <h3 className="mt-1 font-display text-xl leading-tight font-semibold">{step.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{step.body}</p>
                </div>
                {at !== 3 ? (
                  <div className="hidden shrink-0 flex-col items-center sm:flex" aria-hidden>
                    <span className="mb-1 max-w-[120px] rounded-2xl bg-cream px-3 py-1.5 text-center text-xs leading-snug">{step.bo}</span>
                    <Bo pose={POSES[at] ?? "idle"} size={64} />
                  </div>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line px-6 py-4">
          <div className="flex items-center gap-1.5" role="tablist" aria-label={C.label}>
            {steps.map((s, i) => (
              <button
                key={s.n}
                type="button"
                role="tab"
                aria-selected={i === at}
                aria-label={C.stepOf(i + 1, steps.length)}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === at ? "w-6 bg-accent" : "w-2 bg-ink/20 hover:bg-ink/35"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {at > 0 ? (
              <button type="button" onClick={() => go(at - 1)} className="min-h-11 rounded-full px-4 text-sm font-medium text-ink/70 hover:bg-cream">
                {C.back}
              </button>
            ) : (
              <button type="button" onClick={close} className="min-h-11 rounded-full px-4 text-sm font-medium text-ink/70 hover:bg-cream">
                {C.skip}
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={() => (last ? close() : go(at + 1))}
              className="squish min-h-11 rounded-full bg-accent px-6 text-sm font-semibold text-cream hover:bg-accent/90"
            >
              {last ? C.start : C.next}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
