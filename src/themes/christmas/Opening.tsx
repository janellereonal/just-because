/**
 * CHRISTMAS (and the default gift) — a wrapped present with a real ribbon.
 * The present is a real 3D box: faces in one preserve-3d space, each shaded
 * by the key light as the box turns, a lid that sits over the top, and a
 * shadow on the floor. Gesture: pull the ribbon's loose end. It behaves like
 * a rope (verlet), and when pulled far enough the bow unties, the bands slip
 * off, the lid lifts away and the four sides fall open around a warm light.
 * Beats (ms after the bow unties): 0 bands slide · 420 lid lifts ·
 * 700 sides fall open · 1300 glow + greeting · 2600 open.
 */
import { useEffect, useId, useRef, useState } from "react";
import { motion, useSpring, useTransform, type MotionValue } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { FaceLight, Object3D, Sheen, TEXTURE, Texture } from "@/themes/_shared/light";
import { foley, melody } from "@/lib/play";

type Pt = { x: number; y: number; px: number; py: number };
const LINKS = 9;
const SEG = 13;
/** The SVG over the box is 240 units square. */
const VB = 240;

/**
 * A short verlet rope: point 0 follows the bow (wherever the box has turned
 * to), the last follows the finger. It draws straight into the SVG (no React
 * render per frame).
 */
function useRope(
  anchor: () => { x: number; y: number },
  draw: (d: string, end: { x: number; y: number }, a: { x: number; y: number }) => void,
  live: boolean,
  /** Draw once and stop (a paused preview). */
  still: boolean,
) {
  const pts = useRef<Pt[]>([]);
  const grab = useRef<{ x: number; y: number } | null>(null);
  /** The anchor as of the last frame, so others don't have to measure it again. */
  const last = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    if (!live) return;
    const a = anchor();
    if (!pts.current.length) pts.current = Array.from({ length: LINKS }, (_, i) => ({ x: a.x + i * 3, y: a.y + i * SEG, px: a.x + i * 3, py: a.y + i * SEG }));
    let lastA = { x: NaN, y: NaN };
    const step = () => {
      const p = pts.current;
      const a2 = anchor();
      last.current = a2;
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
      // Only touch the DOM while something actually moves.
      let moving = Math.abs(a2.x - lastA.x) + Math.abs(a2.y - lastA.y) > 0.02;
      for (const q of p) moving ||= Math.abs(q.x - q.px) + Math.abs(q.y - q.py) > 0.05;
      if (moving || grab.current) {
        lastA = a2;
        draw(p.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" "), p[p.length - 1]!, a2);
      }
      if (still) {
        // Let the rope settle for a moment, then stop: nothing moves in a paused preview.
        settle += 1;
        if (settle > 90) return;
      }
      raf.current = requestAnimationFrame(step);
    };
    let settle = 0;
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, still]);
  const end = () => pts.current[pts.current.length - 1] ?? { x: 0, y: 0 };
  return { grab, end, last };
}

export function ChristmasOpening(p: OpeningProps) {
  const c = p.design.palette;
  // Both sit on a light background now, so the words are dark.
  const ink = "#2B2522";
  const cast = useRef<CharacterHandle | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const knotRef = useRef<HTMLSpanElement | null>(null);
  const bowRef = useRef<SVGGElement | null>(null);
  const ropeRefs = useRef<(SVGPathElement | null)[]>([]);
  const endRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [untied, setUntied] = useState(false);
  const uid = useId().replace(/:/g, "");
  const h = useHaptics();
  const beat = useBeats(untied, [0, 420, 700, 1300, 2600]);
  const pullStart = useRef<{ x: number; y: number } | null>(null);
  const lastTick = useRef(0);

  /** Where the knot is, in the SVG's units: the top of the lid, wherever the box has turned. */
  function knot() {
    const k = knotRef.current?.getBoundingClientRect();
    const s = svgRef.current?.getBoundingClientRect();
    if (!k || !s || !s.width) return { x: 120, y: 52 };
    return { x: ((k.left + k.width / 2 - s.left) / s.width) * VB, y: ((k.top + k.height / 2 - s.top) / s.height) * VB };
  }
  const rope = useRope(
    () => {
      const k = knot();
      return { x: k.x + 7, y: k.y + 9 };
    },
    (d, end, a) => {
      ropeRefs.current.forEach((el) => el?.setAttribute("d", d));
      endRefs.current.forEach((el) => {
        el?.setAttribute("cx", end.x.toFixed(1));
        el?.setAttribute("cy", end.y.toFixed(1));
      });
      bowRef.current?.setAttribute("transform", `translate(${(a.x - 7 - 120).toFixed(1)} ${(a.y - 9 - 44).toFixed(1)})`);
    },
    !untied,
    p.paused,
  );

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
      if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.45, p.iconSet, { colors: [c.gold!, "#fff", c.cranberry!], count: 28, spread: 1.8, up: true });
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
      const a = rope.last.current ?? knot();
      rope.grab.current = k > 0 ? { x: a.x + 30 + k * 90, y: a.y + 90 + k * 70 } : null;
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
    return { x: ((e.clientX - r.left) / r.width) * VB, y: ((e.clientY - r.top) / r.height) * VB };
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
      const a = knot();
      const dist = Math.hypot(pt.x - a.x, pt.y - a.y);
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

  // The four sides fall outwards, one after another.
  const fall = { stiffness: 170, damping: 11, mass: 0.8 };
  const folds = [useSpring(0, fall), useSpring(0, fall), useSpring(0, fall), useSpring(0, fall)];
  useEffect(() => {
    if (p.reduced) {
      folds.forEach((f) => f.jump(paperOpen ? -62 : 0));
      return;
    }
    const timers = folds.map((f, i) => window.setTimeout(() => f.set(paperOpen ? -62 : 0), paperOpen ? i * 70 : 0));
    return () => timers.forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperOpen]);

  return (
    <div className="relative flex w-full flex-col items-center">
      <div className="relative z-[3] h-[clamp(60px,17cqi,100px)] text-center" style={{ color: ink }}>
        {glow ? (
          <motion.div initial={{ y: 26, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={SPRING.wobbly}>
            <Greeting text={p.greeting} className="text-[clamp(2rem,11cqi,3.4rem)]" />
          </motion.div>
        ) : null}
      </div>

      <Layer depth={9} className="relative mt-[min(4cqi,18px)]" style={{ width: "min(66cqi, 300px)", aspectRatio: "1", ["--s" as string]: "calc(min(66cqi, 300px) * .58)" } as React.CSSProperties}>
        <div ref={boxRef} className="absolute inset-0">
          {/* Warm light from inside, and slow rays once it's open */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[30%]"
            initial={false}
            animate={{ opacity: paperOpen ? 1 : 0, scale: glow ? 1.15 : 0.9 }}
            transition={SPRING.soft}
            style={{ background: `radial-gradient(closest-side, #FFF2C2, ${c.gold}88 40%, transparent 75%)` }}
          />
          <motion.div
            aria-hidden="true"
            className="jb-rays pointer-events-none absolute -inset-[45%] rounded-full"
            initial={false}
            animate={{ opacity: glow ? 0.55 : 0 }}
            transition={{ duration: 0.8 }}
            style={{
              background: `repeating-conic-gradient(from 0deg, #FFF2C2 0 6deg, transparent 6deg 18deg)`,
              WebkitMaskImage: "radial-gradient(closest-side, #000 20%, transparent 75%)",
              maskImage: "radial-gradient(closest-side, #000 20%, transparent 75%)",
            }}
          />

          <Object3D pose={{ x: -19, y: -27 }} strength={13} perspective={1250} className="absolute top-[34%] left-[21%] aspect-square w-[58%]">
            {/* Shadow on the floor, away from the light */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[-14%] block rounded-[16%]"
              style={{ transform: "rotateX(90deg) translateZ(calc(var(--s) / -2 - 1px)) translate(12%, -10%)", background: "rgba(0,0,0,.42)", filter: "blur(14px)" }}
            />
            {/* The floor of the box, inside */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 block overflow-hidden" style={{ transform: "rotateX(90deg) translateZ(calc(var(--s) / -2))", background: "#F2E6D3" }}>
              <Texture material="card" />
              <motion.span className="absolute inset-0 block" initial={false} animate={{ opacity: paperOpen ? 1 : 0 }} style={{ background: `radial-gradient(closest-side, #FFF6D8, ${c.gold}66 60%, transparent)` }} />
            </span>
            {/* Light standing up out of the box */}
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[-20%] block"
              initial={false}
              animate={{ opacity: paperOpen ? 0.9 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ background: "radial-gradient(closest-side, rgba(255,246,214,.95), rgba(255,226,150,.4) 50%, transparent)" }}
            />

            {/* Four sides: front, right, back, left. Each falls open around its bottom edge. */}
            {[0, 90, 180, -90].map((turn, i) => (
              <Side key={turn} turn={turn} fold={folds[i]!} pattern={pattern} ribbon={ribbon} bandsOff={bandsOff} />
            ))}

            {/* The lid sits over the top */}
            <Lid off={lidOff} pattern={pattern} ribbon={ribbon} bandsOff={bandsOff} knotRef={knotRef} reduced={p.reduced} />
          </Object3D>

          {/* Bow + the pullable ribbon end (a rope), drawn flat over the box */}
          <svg ref={svgRef} viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 z-[7] size-full overflow-visible" aria-hidden={untied}>
            <g ref={bowRef}>
              <motion.g initial={false} animate={bandsOff ? { scale: 0.2, opacity: 0, y: -40 } : { scale: 1, opacity: 1, y: 0 }} transition={SPRING.snappy} style={{ originX: "120px", originY: "44px" }}>
                <defs>
                  <linearGradient id={`bow${uid}`} x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0" stopColor="#FBE7AE" />
                    <stop offset=".45" stopColor={ribbon} />
                    <stop offset="1" stopColor="#9C7426" />
                  </linearGradient>
                  <radialGradient id={`knot${uid}`} cx=".35" cy=".3" r=".8">
                    <stop offset="0" stopColor="#FFF0C2" />
                    <stop offset=".5" stopColor="#C69A3B" />
                    <stop offset="1" stopColor="#7E5D1C" />
                  </radialGradient>
                </defs>
                <path d="M120 44c-18-30-58-30-52-6 4 14 30 12 52 6zM120 44c18-30 58-30 52-6-4 14-30 12-52 6z" fill="rgba(0,0,0,.22)" transform="translate(2.5 4)" />
                <path d="M120 44c-18-30-58-30-52-6 4 14 30 12 52 6zM120 44c18-30 58-30 52-6-4 14-30 12-52 6z" fill={`url(#bow${uid})`} />
                <path d="M78 30c6-6 18-6 26 2M162 30c-6-6-18-6-26 2" fill="none" stroke="#FFF4CF" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
                <path d="M120 44c-18-30-58-30-52-6 4 14 30 12 52 6zM120 44c18-30 58-30 52-6-4 14-30 12-52 6z" fill="none" stroke="#9C7426" strokeWidth="1.5" />
                <path d="M120 44c-6 12-16 26-26 34M120 44c6 14 10 20 12 14" stroke="#9C7426" strokeWidth="2" fill="none" />
                <circle cx="120" cy="44" r="9" fill={`url(#knot${uid})`} />
              </motion.g>
            </g>
            {!untied ? (
              <>
                <path ref={(el) => void (ropeRefs.current[0] = el)} stroke="rgba(0,0,0,.16)" strokeWidth="12" strokeLinecap="round" fill="none" transform="translate(3 5)" />
                <path ref={(el) => void (ropeRefs.current[1] = el)} stroke={ribbon} strokeWidth="9" strokeLinecap="round" fill="none" />
                <path ref={(el) => void (ropeRefs.current[2] = el)} stroke="#F4D98F" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" transform="translate(-1 -1.2)" />
                <circle
                  ref={(el) => void (endRefs.current[0] = el)}
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
                {p.interactive && !p.paused ? <circle ref={(el) => void (endRefs.current[1] = el)} r="12" fill="none" stroke="#fff" strokeWidth="2" className="jb-ring-svg" /> : null}
              </>
            ) : null}
          </svg>
        </div>
        <div className="absolute -right-[22%] bottom-[-4%] z-[8]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={86} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[min(10cqi,45px)] h-11">
        <FallbackButton onClick={untie} color={ink} ink={ink} hidden={untied || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

const HALF = "calc(var(--s) / 2)";
const NEG_HALF = "calc(var(--s) / -2)";
const BAND = (ribbon: string, dir: "90deg" | "180deg") => `linear-gradient(${dir}, #B98A2E, ${ribbon} 22%, #F4D98F 50%, ${ribbon} 78%, #B98A2E)`;

/** World normal of a side before it falls: front faces the viewer. */
function sideNormal(turn: number): [number, number, number] {
  const r = (turn * Math.PI) / 180;
  return [Math.round(Math.sin(r)), 0, Math.round(Math.cos(r))];
}

/** One side of the box: wrapping paper outside, plain card inside. */
function Side({ turn, fold, pattern, ribbon, bandsOff }: { turn: number; fold: MotionValue<number>; pattern: string; ribbon: string; bandsOff: boolean }) {
  const transform = useTransform(fold, (f) => `rotateY(${turn}deg) translateZ(${HALF}) translateY(${HALF}) rotateX(${f.toFixed(2)}deg) translateY(${NEG_HALF})`);
  return (
    <motion.div className="absolute inset-0" style={{ transform, transformStyle: "preserve-3d" }}>
      {/* Outside */}
      <span className="absolute inset-0 block overflow-hidden" style={{ background: pattern, backfaceVisibility: "hidden", boxShadow: "inset 0 -14px 24px -16px rgba(0,0,0,.35)" }}>
        <Texture material="paper" opacity={0.35} />
        {/* Ribbon: across the middle, and down the middle on the front and back */}
        <motion.span className="absolute inset-x-0 top-1/2 block h-[13%] -translate-y-1/2" style={{ background: BAND(ribbon, "180deg"), boxShadow: "0 2px 3px rgba(0,0,0,.25)" }} initial={false} animate={bandsOff ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }} transition={SPRING.snappy} />
        {turn === 0 || turn === 180 ? (
          <motion.span className="absolute inset-y-0 left-1/2 block w-[13%] -translate-x-1/2" style={{ background: BAND(ribbon, "90deg"), boxShadow: "2px 0 3px rgba(0,0,0,.2)" }} initial={false} animate={bandsOff ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }} transition={SPRING.snappy} />
        ) : null}
        <Sheen strength={0.55} angle={105} width={20} travel={45} />
        <FaceLight normal={sideNormal(turn)} max={0.6} ambient={0.32} />
      </span>
      {/* Inside */}
      <span className="absolute inset-0 block overflow-hidden" style={{ background: "#F4EBDD", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
        <Texture material="card" />
        <span className="absolute inset-0 block" style={{ background: "linear-gradient(0deg, rgba(120,80,30,.18), transparent 60%)" }} />
        <FaceLight normal={[0, -1, 0]} max={0.4} ambient={0.5} />
      </span>
    </motion.div>
  );
}

/** The lid: a shallow box a little wider than the present, sitting over its top. */
function Lid({
  off,
  pattern,
  ribbon,
  bandsOff,
  knotRef,
  reduced,
}: {
  off: boolean;
  pattern: string;
  ribbon: string;
  bandsOff: boolean;
  knotRef: React.RefObject<HTMLSpanElement | null>;
  reduced: boolean;
}) {
  // Lid height as a share of the box, and how far it overhangs.
  const lh = 0.2;
  const W = 1.08;
  const top = `translateY(calc(var(--s) * ${-0.5 - lh * 0.3}))`;
  const sideY = `translateY(calc(var(--s) * ${-0.5 + lh * 0.2}))`;
  const fade = { opacity: off ? 0 : 1, transition: { delay: off && !reduced ? 0.35 : 0, duration: 0.3 } };
  return (
    <motion.div
      className="absolute inset-0"
      style={{ transformStyle: "preserve-3d" }}
      initial={false}
      animate={off ? { y: -190, x: 46, rotateZ: 24, rotateX: -24 } : { y: 0, x: 0, rotateZ: 0, rotateX: 0 }}
      transition={SPRING.heavy}
    >
      {/* Top */}
      <motion.span
        className="absolute block overflow-hidden"
        style={{ inset: `${((1 - W) / 2) * 100}%`, transform: `${top} rotateX(90deg)`, background: pattern, boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)" }}
        initial={false}
        animate={fade}
      >
        <Texture material="paper" opacity={0.35} />
        <motion.span className="absolute inset-x-0 top-1/2 block h-[12%] -translate-y-1/2" style={{ background: BAND(ribbon, "180deg") }} initial={false} animate={bandsOff ? { scaleX: 0, opacity: 0 } : { scaleX: 1, opacity: 1 }} transition={SPRING.snappy} />
        <motion.span className="absolute inset-y-0 left-1/2 block w-[12%] -translate-x-1/2" style={{ background: BAND(ribbon, "90deg") }} initial={false} animate={bandsOff ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }} transition={SPRING.snappy} />
        {/* The knot sits in the middle: the bow and the rope follow it */}
        <span ref={knotRef} className="absolute top-1/2 left-1/2 block size-px" />
        <Sheen strength={0.7} angle={120} width={18} travel={40} />
        <FaceLight normal={[0, -1, 0]} max={0.6} ambient={0.32} />
      </motion.span>
      {/* Sides of the lid */}
      {[0, 90, 180, -90].map((turn) => (
        <motion.span
          key={turn}
          className="absolute block overflow-hidden"
          style={{
            left: `${((1 - W) / 2) * 100}%`,
            right: `${((1 - W) / 2) * 100}%`,
            top: `${50 - lh * 50}%`,
            height: `${lh * 100}%`,
            transform: `${sideY} rotateY(${turn}deg) translateZ(calc(var(--s) * ${W / 2}))`,
            background: pattern,
            backfaceVisibility: "hidden",
            boxShadow: "inset 0 -3px 4px rgba(0,0,0,.25), inset 0 2px 0 rgba(255,255,255,.18)",
          }}
          initial={false}
          animate={fade}
        >
          <motion.span className="absolute inset-y-0 left-1/2 block w-[12%] -translate-x-1/2" style={{ background: BAND(ribbon, "90deg") }} initial={false} animate={bandsOff ? { scaleY: 0, opacity: 0 } : { scaleY: 1, opacity: 1 }} transition={SPRING.snappy} />
          <FaceLight normal={sideNormal(turn)} max={0.6} ambient={0.32} />
        </motion.span>
      ))}
    </motion.div>
  );
}

/** A warm cream room with a candle glow and a faint pine edge (Oct 2026: was a dark pine green). */
export const christmasBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: "#F6F0E8",
  backgroundImage: [
    // Fairy-light glow behind, a soft lamp from the top left, then a whisper of pine at the edges.
    `radial-gradient(55% 45% at 50% 56%, ${c.gold}55, transparent 70%)`,
    `radial-gradient(50% 35% at 22% 12%, rgba(255,255,255,.75), transparent 70%)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(47,93,70,.14))",
    "linear-gradient(180deg, #FAF6F0, #F1E8DD)",
    TEXTURE.grain,
  ].join(","),
  backgroundSize: "auto, auto, auto, auto, 160px 160px",
});

export const defaultBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.snow,
  backgroundImage: [
    `radial-gradient(55% 45% at 50% 56%, ${c.gold}66, transparent 70%)`,
    `radial-gradient(50% 35% at 22% 12%, rgba(255,255,255,.7), transparent 70%)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(43,37,34,.2))",
    TEXTURE.grain,
  ].join(","),
  backgroundSize: "auto, auto, auto, 160px 160px",
});
