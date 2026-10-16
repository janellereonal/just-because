import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionPreview } from "@/components/SectionPreview";
import { MODULES, type ModuleType } from "@/lib/gift";
import { SECTIONS_PAGE } from "@/copy/strings";
import { SPRING } from "@/themes/_shared/stage";

export const Route = createFileRoute("/sections")({
  head: () => ({
    meta: [
      { title: "Sections | Just Because" },
      { name: "description", content: SECTIONS_PAGE.meta },
      { property: "og:title", content: "Sections | Just Because" },
      { property: "og:description", content: SECTIONS_PAGE.meta },
    ],
  }),
  component: SectionsPage,
});

type Group = "all" | "words" | "pictures" | "sound" | "play" | "keepsakes" | "holidays";
const GROUP_OF: Record<ModuleType, Exclude<Group, "all">> = {
  letters: "words",
  wordcloud: "words",
  superlatives: "play",
  quiz: "play",
  coupons: "play",
  doodle: "play",
  photobooth: "pictures",
  video: "pictures",
  map: "pictures",
  songs: "sound",
  voice: "sound",
  openwhen: "keepsakes",
  capsule: "keepsakes",
  countdown: "keepsakes",
  calendar: "holidays",
  tree: "holidays",
};

/** Mounts its children only once they scroll near the screen. */
function WhenSeen({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && (setSeen(true), io.disconnect()), { rootMargin: "240px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div ref={ref} className={className}>
      {seen ? children : <div className="size-full animate-pulse rounded-[22px] bg-cream" />}
    </div>
  );
}

function SectionsPage() {
  const reduce = useReducedMotion();
  const [group, setGroup] = useState<Group>("all");
  const [open, setOpen] = useState<ModuleType | null>(null);
  const list = MODULES.filter((m) => group === "all" || GROUP_OF[m.type] === group);
  const openMod = open ? MODULES.find((m) => m.type === open) : null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 pt-8 pb-24 sm:px-5">
        <div className="max-w-2xl">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">{SECTIONS_PAGE.kicker(MODULES.length)}</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] font-semibold tracking-tight text-balance">{SECTIONS_PAGE.title}</h1>
          <p className="mt-3 text-ink/70">{SECTIONS_PAGE.body}</p>
        </div>

        <LayoutGroup>
          <div role="tablist" aria-label={SECTIONS_PAGE.filter} className="-mx-1 mt-7 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {(Object.keys(SECTIONS_PAGE.groups) as Group[]).map((g) => {
              const n = g === "all" ? MODULES.length : MODULES.filter((m) => GROUP_OF[m.type] === g).length;
              return (
                <button
                  key={g}
                  role="tab"
                  type="button"
                  aria-selected={group === g}
                  onClick={() => setGroup(g)}
                  className="relative isolate shrink-0 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-ink/12 transition-colors"
                  style={{ color: group === g ? "#FBF8F2" : undefined }}
                >
                  {group === g ? <motion.span layoutId="sec-chip" className="absolute inset-0 -z-[1] rounded-full bg-ink" transition={SPRING.snappy} /> : null}
                  {SECTIONS_PAGE.groups[g]} <span className="opacity-60">{n}</span>
                </button>
              );
            })}
          </div>

          <motion.div layout className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((m, i) => (
                <motion.article
                  key={m.type}
                  layout
                  initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                  transition={{ ...SPRING.soft, delay: Math.min(i, 8) * 0.04 }}
                  className="card-paper group flex flex-col overflow-hidden p-2.5"
                >
                  <button type="button" onClick={() => setOpen(m.type)} className="relative block h-[300px] overflow-hidden rounded-[22px] text-left" aria-label={SECTIONS_PAGE.openPreview(m.label)}>
                    <WhenSeen className="pointer-events-none size-full">
                      <div className="origin-top scale-[0.86]" style={{ width: "116.3%", marginLeft: "-8.15%" }}>
                        <SectionPreview type={m.type} theme={null} />
                      </div>
                    </WhenSeen>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-paper to-transparent" />
                    <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow-sm transition-transform group-hover:-translate-y-0.5">{SECTIONS_PAGE.tryIt}</span>
                  </button>
                  <div className="px-2 pt-3 pb-1">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{SECTIONS_PAGE.groups[GROUP_OF[m.type]]}</p>
                    <h2 className="mt-0.5 font-display text-xl font-semibold">{m.label}</h2>
                    <p className="mt-0.5 text-sm text-muted">{m.blurb}</p>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>

        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="max-w-md text-ink/70">{SECTIONS_PAGE.closing}</p>
          <Link to="/create" className="squish inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-cream hover:bg-accent/90">
            {SECTIONS_PAGE.cta}
          </Link>
        </div>
      </main>
      <SiteFooter />

      <AnimatePresence>
        {openMod ? (
          <motion.div className="fixed inset-0 z-[80] grid place-items-center bg-ink/50 p-3 backdrop-blur-sm sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={openMod.label}
              className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[30px] bg-paper shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{openMod.label}</h2>
                  <p className="text-sm text-muted">{openMod.blurb}</p>
                </div>
                <button type="button" onClick={() => setOpen(null)} aria-label={SECTIONS_PAGE.close} className="grid size-10 shrink-0 place-items-center rounded-full bg-cream hover:bg-glass">
                  <X className="size-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-5">
                <SectionPreview type={openMod.type} theme={null} />
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                <p className="text-xs text-muted">{SECTIONS_PAGE.live}</p>
                <Link to="/create" className="squish inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-cream">
                  {SECTIONS_PAGE.cta}
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
