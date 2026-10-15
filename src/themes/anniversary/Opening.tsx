/**
 * ANNIVERSARY — a record on a turntable.
 * Gesture: drag the tonearm onto the record. The needle crackles, the record
 * spins up, the room warms, and the years count up in kinetic type.
 * Beats (ms after the drop): 0 crackle · 450 spin up + warm light ·
 * 900 years count (420ms each) · then the greeting · open 1500ms later.
 * Character sways to the music.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { foley, melody } from "@/lib/play";

const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** "Ten years, Liz" → 10, "Our 25th" → 25. Falls back to 3. */
function yearsFrom(...texts: string[]) {
  for (const t of texts) {
    const digits = t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (digits) return Math.min(60, Number(digits[1]));
    const word = WORDS.findIndex((w, i) => i > 0 && new RegExp(`\\b${w}\\b`, "i").test(t));
    if (word > 0) return word;
  }
  return 3;
}

const REST = 2;
const PLAY = 27;

export function AnniversaryOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const pivotRef = useRef<HTMLDivElement | null>(null);
  const arm = useMotionValue(REST);
  const spin = useMotionValue(0);
  const [dropped, setDropped] = useState(false);
  const [step, setStep] = useState(0);
  const h = useHaptics();
  const years = useMemo(() => yearsFrom(p.greeting, p.badge), [p.greeting, p.badge]);
  // Long marriages count in jumps so the moment stays short.
  const counts = useMemo(() => {
    if (years <= 6) return Array.from({ length: years }, (_, i) => i + 1);
    const out = [1, 2, 3];
    const jump = Math.ceil((years - 3) / 3);
    for (let y = 3 + jump; y < years; y += jump) out.push(y);
    out.push(years);
    return out;
  }, [years]);
  const done = step > counts.length;
  const glow = useTransform(spin, (v) => Math.min(1, v / 400));

  function drop() {
    if (dropped) return;
    setDropped(true);
    void animate(arm, PLAY, SPRING.heavy);
    foley("needle");
    h.thud();
    cast.current?.anticipate();
  }

  useEffect(() => {
    if (!dropped) return;
    let speed = 0;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      speed = Math.min(200, speed + dt * 160); // spin up like a real platter (33⅓ rpm ≈ 200°/s)
      spin.set(spin.get() + speed * dt);
      raf = requestAnimationFrame(tick);
    };
    const start = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
      melody([523, 659, 784, 659, 698, 880, 784, 0, 659, 587, 523], 0.32, "sine", 0.045);
      cast.current?.idle();
    }, p.reduced ? 0 : 450);
    const timers = [...counts, 0].map((_, i) => window.setTimeout(() => setStep(i + 1), (p.reduced ? 0 : 900) + i * (p.reduced ? 0 : 420)));
    return () => {
      window.clearTimeout(start);
      timers.forEach(window.clearTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropped]);

  useEffect(() => {
    if (!done) return;
    cast.current?.celebrate();
    const r = p.hostRef.current?.getBoundingClientRect();
    if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.3, p.iconSet, { colors: [c.champagne!, c.glow!, "#fff"], count: 22, spread: 1.6 });
    h.success();
    const t = window.setTimeout(p.onOpen, p.reduced ? 400 : 1600);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  useEffect(() => {
    p.setHint(dropped ? "" : "Drag the needle onto the record");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropped]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(drop, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  // Drag the arm around its pivot.
  const dragging = useRef(false);
  const armHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (dropped || !p.interactive || p.paused) return;
      e.stopPropagation();
      dragging.current = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      h.tick();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const r = pivotRef.current!.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      // Angle of the pointer from the pivot, measured from straight down, leftward positive.
      const deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
      arm.set(Math.max(REST - 4, Math.min(PLAY + 6, deg)));
      if (arm.get() >= PLAY - 3) {
        dragging.current = false;
        drop();
      }
    },
    onPointerUp: () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (arm.get() > (REST + PLAY) / 2) drop();
      else void animate(arm, REST, SPRING.wobbly);
    },
  };

  const label = p.greeting;
  return (
    <div className="relative flex w-full flex-col items-center">
      {/* Warm lamp light that comes up with the music */}
      <motion.div className="pointer-events-none absolute -inset-[40%]" style={{ opacity: glow, background: `radial-gradient(40% 35% at 50% 45%, ${c.glow}66, transparent 70%)` }} />

      <div className="relative z-[3] flex h-[clamp(70px,22cqi,128px)] items-end justify-center text-center" style={{ color: c.champagne }}>
        <AnimatePresence mode="popLayout">
          {step > 0 && !done ? (
            <motion.span
              key={counts[step - 1]}
              initial={{ y: 40, opacity: 0, filter: "blur(6px)", scale: 0.9 }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }}
              exit={{ y: -36, opacity: 0, filter: "blur(6px)" }}
              transition={SPRING.snappy}
              className="block text-[clamp(2.2rem,12cqi,4rem)] leading-none tracking-[-0.02em]"
              style={{ fontFamily: "var(--jb-display)" }}
            >
              {counts[step - 1]} {counts[step - 1] === 1 ? "year" : "years"}
            </motion.span>
          ) : done ? (
            <motion.div key="greeting" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={SPRING.soft}>
              <Greeting text={label} className="text-[clamp(2rem,11cqi,3.6rem)]" />
              <span className="mt-1 block text-[12px] tracking-[0.3em] uppercase opacity-70">and counting</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Layer depth={9} rotate={5} className="relative mt-5" style={{ width: "min(86cqi, 400px)", aspectRatio: "1.18" }}>
        {/* Plinth */}
        <div className="absolute inset-0 rounded-[18px]" style={{ background: `linear-gradient(160deg, #6B4430, ${c.walnut} 45%, #2E1C14)`, boxShadow: "0 40px 60px -30px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.12)" }}>
          <div className="absolute inset-0 rounded-[18px] opacity-30" style={{ backgroundImage: "repeating-linear-gradient(95deg, rgba(255,255,255,.06) 0 2px, transparent 2px 9px)" }} />
        </div>
        {/* Platter + record */}
        <div className="absolute top-[8%] left-[5%] aspect-square w-[74%]">
          <div className="absolute inset-[-3%] rounded-full" style={{ background: "radial-gradient(circle, #1a1a1a 60%, #3a3a3a 62%, #111 70%)" }} />
          <motion.div className="absolute inset-0 rounded-full" style={{ rotate: spin, background: "repeating-radial-gradient(circle at 50% 50%, #151212 0 1.6px, #221d1b 1.6px 3.2px)", boxShadow: "inset 0 0 0 2px #0c0a09" }}>
            <div className="absolute inset-[33%] grid place-items-center rounded-full text-center" style={{ background: `radial-gradient(circle, ${c.champagne} 0 60%, #D9BF8C)`, color: c.espresso }}>
              <span className="px-1 text-[clamp(7px,2.1cqi,11px)] leading-tight font-semibold tracking-[0.12em] uppercase [overflow-wrap:anywhere]" style={{ fontFamily: "var(--jb-text)" }}>
                {label}
              </span>
              <span className="absolute size-[9%] rounded-full bg-[#1b1412]" />
            </div>
          </motion.div>
          {/* A sheen that stays put while the grooves turn */}
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 210deg, transparent 0 20deg, rgba(255,255,255,.14) 40deg, transparent 70deg 200deg, rgba(255,255,255,.1) 225deg, transparent 260deg)" }} />
        </div>
        {/* Tonearm */}
        <div ref={pivotRef} className="absolute top-[10%] right-[8%] z-[3] grid size-[13%] place-items-center rounded-full" style={{ background: "radial-gradient(circle at 35% 30%, #d8d2c8, #8b847b)", boxShadow: "0 6px 10px -4px rgba(0,0,0,.6)" }}>
          <motion.div
            className="absolute top-1/2 left-1/2 origin-top touch-none"
            style={{ rotate: arm, width: "18%", height: "520%", marginLeft: "-9%", cursor: dropped ? "default" : "grab" }}
            {...armHandlers}
            role="slider"
            aria-label="Tonearm. Drag onto the record to play"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={dropped ? 1 : 0}
            tabIndex={dropped || !p.interactive ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "ArrowLeft") {
                e.preventDefault();
                drop();
              }
            }}
          >
            <span className="absolute inset-x-[30%] top-0 bottom-[14%] rounded-full" style={{ background: "linear-gradient(90deg,#9c968e,#e9e4dc,#9c968e)" }} />
            <span className="absolute bottom-0 left-1/2 h-[18%] w-[260%] -translate-x-1/2 rounded-[3px]" style={{ background: "linear-gradient(180deg,#3a3634,#1c1a19)", transform: "translateX(-50%) rotate(-18deg)" }} />
            {!dropped && p.interactive && !p.paused ? <span className="jb-pulse absolute -bottom-[14px] left-1/2 size-[30px] rounded-full" style={{ boxShadow: `0 0 0 2px ${c.champagne}` }} /> : null}
          </motion.div>
        </div>
        {/* Knobs */}
        {[0, 1].map((k) => (
          <span key={k} className="absolute bottom-[9%] size-[7%] rounded-full" style={{ right: `${10 + k * 11}%`, background: "radial-gradient(circle at 35% 30%, #efe7da, #9a8f80)" }} />
        ))}
        {/* The character sways along */}
        <motion.div
          className="absolute -bottom-[6%] -left-[4%] z-[4] origin-bottom"
          animate={dropped && !p.reduced ? { rotate: [-6, 6, -6] } : { rotate: 0 }}
          transition={dropped ? { duration: 1.8, repeat: Infinity, ease: [0.45, 0, 0.55, 1] } : SPRING.soft}
        >
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={84} live={!p.paused} showName={false} />
        </motion.div>
      </Layer>

      <div className="mt-[8cqi] h-11">
        <FallbackButton onClick={drop} color={c.champagne!} ink={c.champagne!} hidden={dropped || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const anniversaryBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.espresso,
  backgroundImage: [
    `radial-gradient(70% 60% at 50% 45%, ${c.plum}40, transparent 70%)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 50%, rgba(0,0,0,.55))",
  ].join(","),
});
