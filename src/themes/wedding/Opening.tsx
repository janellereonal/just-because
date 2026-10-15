/**
 * WEDDING (and BRIDAL SHOWER) — an embossed invitation in a vellum sleeve.
 * Gesture: slide the card up out of the sleeve. Pressed florals scatter, the
 * gold-foil monogram shimmers as the phone tilts. Character wears a veil.
 * Beats (ms after the card is free): 0 florals · 300 card comes forward ·
 * 1100 monogram shimmers · 2500 open.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics, useTilt } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { initialsOf } from "@/themes/_shared/iconSets";
import { foley, melody } from "@/lib/play";

export function WeddingOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);
  const [free, setFree] = useState(false);
  const h = useHaptics();
  const beat = useBeats(free, [300, 1100, 2500]);
  const tilt = useTilt();
  const foil = useTransform(tilt.x, (v) => `${50 + v * 45}% ${50 + v * 20}%`);
  const lastTick = useRef(0);

  function release() {
    if (free) return;
    setFree(true);
    const hgt = cardRef.current?.offsetHeight ?? 300;
    void animate(y, -hgt * 0.66, SPRING.heavy);
    foley("paper");
    h.thud();
    cast.current?.celebrate();
    const r = cardRef.current?.getBoundingClientRect();
    if (r) {
      burstSet(p.hostRef.current, r.left + r.width * 0.2, r.top + r.height * 0.4, p.iconSet, { colors: [c.sage!, c.gold!, "#F2C6C2"], count: 12, spread: 1.2, up: true, gravity: 0.6 });
      burstSet(p.hostRef.current, r.right - r.width * 0.2, r.top + r.height * 0.4, p.iconSet, { colors: [c.sage!, c.gold!, "#F2C6C2"], count: 12, spread: 1.2, up: true, gravity: 0.6 });
    }
  }

  useEffect(() => {
    if (beat === 1) {
      melody([784, 988, 1175, 1568], 0.14, "sine", 0.05);
      const hgt = cardRef.current?.offsetHeight ?? 300;
      void animate(y, -hgt * 0.12, SPRING.heavy);
      void animate(scale, 1.06, SPRING.soft);
    }
    if (beat === 2) h.success();
    if (beat === 3) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(free ? "" : "Slide the card up out of the sleeve");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      void animate(y, -(cardRef.current?.offsetHeight ?? 300) * 0.5, { type: "spring", stiffness: 60, damping: 14 }).then(release);
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const outFrac = (cardH: number) => Math.min(1, Math.max(0, -y.get() / cardH));
  const monogram = initialsOf(p.recipient);

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={10} rotate={7} className="relative" style={{ width: "min(70cqi, 320px)", aspectRatio: "0.72" }}>
        {/* The card */}
        <motion.div
          ref={cardRef}
          className="absolute inset-x-[6%] top-[4%] bottom-[4%] z-[2] touch-none"
          style={{ y, scale, zIndex: free && beat >= 1 ? 5 : 2 }}
          drag={!free && p.interactive && !p.paused ? "y" : false}
          dragConstraints={{ top: -400, bottom: 0 }}
          dragElastic={{ top: 0.15, bottom: 0.4 }}
          dragMomentum={false}
          onDrag={() => {
            const hgt = cardRef.current?.offsetHeight ?? 300;
            const f = outFrac(hgt);
            if (Math.floor(f * 6) > lastTick.current) {
              lastTick.current = Math.floor(f * 6);
              h.tick();
              foley("paper");
            }
          }}
          onDragEnd={() => {
            const hgt = cardRef.current?.offsetHeight ?? 300;
            if (outFrac(hgt) > 0.45) release();
            else {
              lastTick.current = 0;
              void animate(y, 0, SPRING.wobbly);
            }
          }}
          role="button"
          aria-label="Slide the invitation up out of its sleeve"
          tabIndex={free || !p.interactive ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") {
              e.preventDefault();
              release();
            }
          }}
        >
          <div
            className="relative flex size-full cursor-grab flex-col items-center justify-center rounded-[4px] px-[10%] text-center active:cursor-grabbing"
            style={{
              background: `linear-gradient(160deg, #FFFEFA, ${c.paper})`,
              color: c.ink,
              boxShadow: "0 18px 34px -18px rgba(60,55,40,.45), inset 0 0 0 1px rgba(0,0,0,.04)",
            }}
          >
            {/* Deckled, embossed border */}
            <span className="pointer-events-none absolute inset-[5%] rounded-[2px]" style={{ boxShadow: "inset 0 0 0 1px rgba(201,165,92,.55), inset 0 0 0 4px rgba(255,255,255,.7), inset 0 0 0 5px rgba(201,165,92,.25)" }} />
            <motion.span
              className="relative grid size-[clamp(64px,20cqi,96px)] place-items-center rounded-full text-[clamp(1.6rem,8cqi,2.6rem)] italic"
              style={{
                fontFamily: "var(--jb-display)",
                color: "transparent",
                backgroundImage: `linear-gradient(115deg, #A8843E 0%, #F6E3A9 30%, #C9A55C 45%, #FFF3C9 55%, #A8843E 75%, #E9CF8E 100%)`,
                backgroundSize: "250% 250%",
                backgroundPosition: foil,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                boxShadow: `inset 0 0 0 1.5px ${c.gold}88`,
              }}
              animate={beat >= 2 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {monogram}
            </motion.span>
            <span className="mt-[8%] text-[10px] tracking-[0.34em] uppercase opacity-70">{p.badge}</span>
            <Greeting text={p.greeting} className="mt-2 text-[clamp(1.6rem,8.5cqi,2.6rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
            <span className="mt-[8%] block h-px w-1/3" style={{ background: `${c.gold}99` }} />
          </div>
        </motion.div>

        {/* Vellum sleeve: frosted, slightly see-through, with a belly band */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[64%] rounded-[4px]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,.52), rgba(250,246,238,.78))",
            backdropFilter: "blur(5px) saturate(1.1)",
            WebkitBackdropFilter: "blur(5px) saturate(1.1)",
            boxShadow: "0 26px 40px -22px rgba(60,55,40,.45), inset 0 1px 0 rgba(255,255,255,.9)",
            opacity: free && beat >= 1 ? 0 : 1,
            transition: "opacity .5s ease",
          }}
        >
          <div className="absolute inset-x-0 top-[40%] h-[16%]" style={{ background: `linear-gradient(180deg, ${c.sage}, #87A07A)` }} />
          <div className="absolute top-[34%] left-1/2 grid size-[19%] -translate-x-1/2 place-items-center rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, #F4E3B5, ${c.gold})`, boxShadow: "0 4px 8px -3px rgba(0,0,0,.35)" }}>
            <span className="text-[clamp(10px,3cqi,14px)] italic" style={{ fontFamily: "var(--jb-display)", color: "#6E5422" }}>
              {monogram}
            </span>
          </div>
          <span className="absolute inset-x-0 top-0 h-[10%]" style={{ background: "linear-gradient(180deg, rgba(255,255,255,.9), transparent)" }} />
        </div>

        <div className="absolute -right-[16%] bottom-[-6%] z-[4]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={84} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[9cqi] h-11">
        <FallbackButton onClick={release} color={c.ink!} ink={c.ink!} hidden={free || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const weddingBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.ivory,
  backgroundImage: [
    `radial-gradient(60% 50% at 50% 45%, #FFFFFF, transparent 75%)`,
    `radial-gradient(120% 90% at 50% 40%, transparent 55%, ${c.sage}38)`,
    "repeating-linear-gradient(45deg, rgba(0,0,0,.012) 0 2px, transparent 2px 6px)",
  ].join(","),
});
