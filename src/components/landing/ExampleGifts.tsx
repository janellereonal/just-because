/**
 * Four example gifts, each playing its opening on a loop (only the one you're
 * looking at plays). Tap one to open the whole thing.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { DEMO_GIFTS, DEMO_ORDER, type DemoId } from "@/lib/demoGifts";
import { TactileOpening } from "@/themes/TactileOpening";
import { loadThemeFonts, themeFontVars } from "@/themes/_shared/design";
import { SPRING } from "@/themes/_shared/stage";
import { claimPreview, releasePreview, useIsPlaying } from "@/components/ThemeLivePreview";
import { LANDING } from "@/copy/strings";

const W = 390;
const H = 620;

function ExampleCard({ id, i }: { id: DemoId; i: number }) {
  const g = DEMO_GIFTS[id];
  const key = `example-${id}`;
  const playing = useIsPlaying(key);
  const [loop, setLoop] = useState(0);
  const [scale, setScale] = useState(0.6);
  const frame = useRef<HTMLDivElement | null>(null);
  useEffect(() => loadThemeFonts(g.kind), [g.kind]);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    const io = window.matchMedia("(hover: none)").matches
      ? new IntersectionObserver(
          ([e]) => (e && e.intersectionRatio > 0.75 ? claimPreview(key) : releasePreview(key)),
          { threshold: [0, 0.75] },
        )
      : null;
    io?.observe(el);
    return () => {
      ro.disconnect();
      io?.disconnect();
    };
  }, [key]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...SPRING.soft, delay: i * 0.07 }}
    >
      <Link
        to="/example/$id"
        params={{ id }}
        onPointerEnter={(e) => e.pointerType === "mouse" && claimPreview(key)}
        onPointerLeave={() => releasePreview(key)}
        onFocus={() => claimPreview(key)}
        className="group block w-[78vw] max-w-[300px] shrink-0 snap-start rounded-[28px] bg-cream p-2.5 ring-1 ring-ink/6 transition-transform hover:-translate-y-1 sm:w-auto sm:max-w-none"
      >
        <div
          ref={frame}
          className="relative overflow-hidden rounded-[22px]"
          style={{ aspectRatio: `${W} / ${H}`, contain: "layout paint" }}
        >
          <div
            className="pointer-events-none absolute top-0 left-0 origin-top-left [container:gift/inline-size]"
            style={{ width: W, height: H, transform: `scale(${scale})` }}
          >
            <TactileOpening
              key={`${loop}-${playing}`}
              kind={g.kind}
              palette={g.palette}
              recipientName={g.who}
              contributors={g.friends}
              contained
              interactive={false}
              paused={!playing}
              autoplay={playing}
              onOpen={() => window.setTimeout(() => setLoop((n) => n + 1), 600)}
            />
          </div>
        </div>
        <div className="px-2 pt-3 pb-2" style={themeFontVars(g.kind)}>
          <p className="font-mono text-[10px] tracking-[0.16em] text-accent uppercase">
            {g.occasion}
          </p>
          <h3
            className="mt-1 text-[1.4rem] leading-tight"
            style={{ fontFamily: "var(--jb-display)" }}
          >
            {g.who}
          </h3>
          <p className="mt-0.5 text-sm text-ink/65">{g.line}</p>
          <p className="mt-3 text-sm font-semibold text-accent">{LANDING.examples.open} →</p>
        </div>
      </Link>
    </motion.div>
  );
}

export function ExampleGifts() {
  return (
    <div className="-mx-3 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {DEMO_ORDER.map((id, i) => (
        <ExampleCard key={id} id={id} i={i} />
      ))}
    </div>
  );
}
