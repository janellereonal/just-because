/**
 * CHRISTMAS (and the default gift) — a wrapped present with a real ribbon.
 * Gesture: pull the ribbon's loose end. It behaves like a rope (verlet), and
 * when pulled far enough the bow unties, the bands slide off and the paper
 * falls open. Snow drifts in layers. Character wears a knit scarf.
 * Beats (ms after the bow unties): 0 bands slide · 420 lid lifts ·
 * 700 paper falls open · 1300 glow + tag · 2600 open.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { foley, melody } from "@/lib/play";

type Pt = { x: number; y: number; px: number; py: number };
const LINKS = 9;
const SEG = 13;

/** A short verlet rope: point 0 is pinned to the bow, the last follows the finger. */
function useRope(anchor: () => { x: number; y: number }) {
  const pts = useRef<Pt[]>([]);
  const [d, setD] = useState("");
  const grab = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    const a = anchor();
    pts.current = Array.from({ length: LINKS }, (_, i) => ({ x: a.x + i * 3, y: a.y + i * SEG, px: a.x + i * 3, py: a.y + i * SEG }));
    const step = () => {
      const p = pts.current;
      const a2 = anchor();
      for (let i = 0; i < p.length; i++) {
        const q = p[i]!;
        const vx = (q.x - q.px) * 0.94;
        const vy = (q.y - q.py) * 0.94;
        q.px = q.x;
        q.py = q.y;
        q.x += vx;
        q.y += vy + 0.45;
      }
      for (let k = 0; k < 6; k++) {
        p[0]!.x = a2.x;
        p[0]!.y = a2.y;
        if (grab.current) {
          p[p.length - 1]!.x = grab.current.x;
          p[p.length - 1]!.y = grab.current.y;
        }
        for (let i = 0; i < p.length - 1; i++) {
          const m = p[i]!;
          const n = p[i + 1]!;
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy) || 1;
          // Ribbons stretch a little when pulled hard.
          const target = grab.current ? SEG * 1.25 : SEG;
          const diff = (dist - target) / dist / 2;
          if (i > 0) {
            m.x += dx * diff;
            m.y += dy * diff;
          }
          n.x -= dx * diff;
          n.y -= dy * diff;
        }
      }
      // Only re-render while the rope is actually moving.
      let motion = 0;
      for (const q of p) motion += Math.abs(q.x - q.px) + Math.abs(q.y - q.py);
      if (motion > 0.05 || grab.current) setD(p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" "));
      raf.current = requestAnimationFrame(step);
    };
    setD(pts.current.map((q, i) => `${i ? "L" : "M"}${q.x} ${q.y}`).join(" "));
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const end = () => pts.current[pts.current.length - 1] ?? { x: 0, y: 0 };
  return { d, grab, end };
}

export function ChristmasOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [untied, setUntied] = useState(false);
  const h = useHaptics();
  const beat = useBeats(untied, [0, 420, 700, 1300, 2600]);
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const lastTick = useRef(0);
  // The rope lives in the box's own coordinate space (an SVG over the bow).
  const rope = useRope(() => ({ x: 132, y: 58 }));

  function untie() {
    if (untied) return;
    setUntied(true);
    rope.grab.current = null;
    foley("paper");
    window.setTimeout(() => foley("crunch"), 300);
    h.thud();
    cast.current?.celebrate();
  }

  useEffect(() => {
    if (beat === 4) {
      const r = boxRef.current?.getBoundingClientRect();
      if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.3, p.iconSet, { colors: [c.gold!, "#fff", c.cranberry!], count: 28, spread: 1.8, up: true });
      melody([659, 659, 659, 0, 659, 659, 659, 0, 659, 784, 523, 587, 659], 0.16, "sine", 0.05);
      h.success();
    }
    if (beat === 5) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(untied ? "" : "Pull the end of the ribbon");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [untied]);

  // Previews: an invisible hand tugs the ribbon.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    let raf = 0;
    const t0 = performance.now() + 700;
    const tick = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / 900));
      rope.grab.current = k > 0 ? { x: 150 + k * 90, y: 150 + k * 70 } : null;
      if (k >= 1) {
        untie();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  function toLocal(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 240, y: ((e.clientY - r.top) / r.height) * 240 };
  }
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (untied || !p.interactive || p.paused) return;
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      const pt = toLocal(e);
      pullStart.current = pt;
      rope.grab.current = pt;
      h.tick();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!pullStart.current) return;
      const pt = toLocal(e);
      rope.grab.current = pt;
      const dist = Math.hypot(pt.x - 132, pt.y - 58);
      const k = Math.floor(dist / 30);
      if (k > lastTick.current) {
        lastTick.current = k;
        h.tick();
      }
      if (dist > 190) {
        pullStart.current = null;
        untie();
      }
    },
    onPointerUp: () => {
      pullStart.current = null;
      rope.grab.current = null;
      lastTick.current = 0;
    },
  };

  const bandsOff = beat >= 1;
  const lidOff = beat >= 2;
  const paperOpen = beat >= 3;
  const glow = beat >= 4;
  const paper = c.paper!;
  const ribbon = c.gold!;
  const pattern = `radial-gradient(circle at 25% 25%, ${c.gold}AA 0 2px, transparent 2.5px) 0 0 / 18px 18px, radial-gradient(circle at 75% 75%, #ffffff55 0 1.5px, transparent 2px) 0 0 / 18px 18px, ${paper}`;

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="relative z-[3] h-[clamp(60px,17cqi,100px)] text-center" style={{ color: c.snow }}>
        {glow ? (
          <motion.div initial={{ y: 26, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={SPRING.wobbly}>
            <Greeting text={p.greeting} className="text-[clamp(2rem,11cqi,3.4rem)]" />
          </motion.div>
        ) : null}
      </div>

      <Layer depth={9} rotate={6} className="relative mt-[4cqi]" style={{ width: "min(66cqi, 300px)", aspectRatio: "1" }}>
        <div ref={boxRef} className="absolute inset-0">
          {/* Warm light inside the box */}
          <motion.div className="absolute inset-[10%] rounded-[10px]" animate={{ opacity: paperOpen ? 1 : 0, scale: glow ? 1.25 : 1 }} transition={SPRING.soft} style={{ background: `radial-gradient(circle, #FFF2C2, ${c.gold}88 45%, transparent 72%)`, filter: "blur(6px)" }} />
          {/* Paper sides fall open like petals */}
          {(["left", "right", "front"] as const).map((side, i) => (
            <motion.div
              key={side}
              className="absolute"
              style={{
                left: side === "right" ? "50%" : 0,
                right: side === "left" ? "50%" : 0,
                top: side === "front" ? "40%" : "18%",
                bottom: 0,
                background: pattern,
                transformOrigin: side === "left" ? "0% 100%" : side === "right" ? "100% 100%" : "50% 100%",
                borderRadius: 8,
                boxShadow: "inset 0 -14px 24px -16px rgba(0,0,0,.45), 0 24px 30px -22px rgba(0,0,0,.6)",
                zIndex: side === "front" ? 3 : 2,
              }}
              animate={paperOpen ? { rotate: side === "left" ? -32 : side === "right" ? 32 : 0, rotateX: side === "front" ? 74 : 0, y: side === "front" ? 18 : 6, scale: side === "front" ? 1 : 0.92 } : { rotate: 0, rotateX: 0, y: 0, scale: 1 }}
              transition={{ ...SPRING.wobbly, delay: paperOpen ? i * 0.07 : 0 }}
            />
          ))}
          {/* The lid */}
          <motion.div
            className="absolute inset-x-[-5%] top-[10%] z-[5] h-[17%] rounded-[8px]"
            style={{ background: pattern, boxShadow: "0 10px 16px -10px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.18)" }}
            animate={lidOff ? { y: -170, x: 50, rotate: 24, opacity: 0 } : { y: 0, x: 0, rotate: 0, opacity: 1 }}
            transition={{ ...SPRING.heavy, opacity: { delay: lidOff ? 0.4 : 0, duration: 0.3 } }}
          />
          {/* Ribbon bands */}
          <motion.div className="absolute top-[10%] bottom-0 left-1/2 z-[6] w-[12%] -translate-x-1/2" style={{ background: `linear-gradient(90deg, #B98A2E, ${ribbon}, #F4D98F, ${ribbon}, #B98A2E)` }} animate={bandsOff ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }} transition={SPRING.snappy} />
          <motion.div className="absolute inset-x-0 top-[52%] z-[6] h-[12%]" style={{ background: `linear-gradient(180deg, #B98A2E, ${ribbon}, #F4D98F, ${ribbon}, #B98A2E)` }} animate={bandsOff ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }} transition={SPRING.snappy} />
          {/* Bow + the pullable ribbon end (a rope) */}
          <svg ref={svgRef} viewBox="0 0 240 240" className="absolute inset-0 z-[7] size-full overflow-visible" aria-hidden={untied}>
            <motion.g animate={bandsOff ? { scale: 0.2, opacity: 0, y: -40 } : { scale: 1, opacity: 1, y: 0 }} transition={SPRING.snappy} style={{ originX: "120px", originY: "40px" }}>
              <path d="M120 44c-18-30-58-30-52-6 4 14 30 12 52 6zM120 44c18-30 58-30 52-6-4 14-30 12-52 6z" fill={ribbon} stroke="#9C7426" strokeWidth="2" />
              <path d="M120 44c-6 12-16 26-26 34M120 44c6 14 10 20 12 14" stroke="#9C7426" strokeWidth="2" fill="none" />
              <circle cx="120" cy="44" r="9" fill="#C69A3B" />
            </motion.g>
            {!untied ? (
              <>
                <path d={rope.d} stroke={ribbon} strokeWidth="9" strokeLinecap="round" fill="none" style={{ filter: "drop-shadow(0 3px 2px rgba(0,0,0,.3))" }} />
                <path d={rope.d} stroke="#F4D98F" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
                <circle
                  cx={rope.end().x}
                  cy={rope.end().y}
                  r="22"
                  fill="transparent"
                  className="cursor-grab touch-none active:cursor-grabbing"
                  {...handlers}
                  role="button"
                  aria-label="Pull the ribbon to untie it"
                  tabIndex={p.interactive && !p.paused ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      untie();
                    }
                  }}
                />
                {p.interactive && !p.paused ? <circle cx={rope.end().x} cy={rope.end().y} r="12" fill="none" stroke="#fff" strokeWidth="2" className="jb-ring-svg" /> : null}
              </>
            ) : null}
          </svg>
        </div>
        <div className="absolute -right-[22%] bottom-[-4%] z-[8]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={86} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[10cqi] h-11">
        <FallbackButton onClick={untie} color={c.snow!} ink={c.snow!} hidden={untied || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const christmasBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.pine,
  backgroundImage: [
    `radial-gradient(55% 45% at 50% 52%, ${c.gold}30, transparent 70%)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 50%, rgba(0,0,0,.45))",
    `linear-gradient(180deg, #163A2B, ${c.pine})`,
  ].join(","),
});

export const defaultBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.snow,
  backgroundImage: [
    `radial-gradient(55% 45% at 50% 52%, ${c.gold}66, transparent 70%)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(43,37,34,.18))",
  ].join(","),
});
