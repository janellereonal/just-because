/**
 * NEW YEAR — a countdown in the night sky.
 * Gesture: press and hold to count "3, 2, 1" in huge type that gets heavier
 * the longer you hold. Let go early and it resets. At zero a rocket goes up
 * and bursts into sparks that spell the recipient's name; the character pops
 * a party popper, and smaller fireworks go off, one per friend.
 * Beats (ms after zero): 0 rocket · 750 name in sparks · 1500 popper ·
 * 2300 greeting + friends' fireworks · 4300 open.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import {
  FallbackButton,
  Layer,
  SPRING,
  useBeats,
  useHaptics,
  useHold,
} from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { TEXTURE } from "@/themes/_shared/light";
import { foley, melody } from "@/lib/play";

const HOLD_MS = 2400;

export function NewYearOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const sky = useRef<Sky | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const popperRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);
  const roofsLitRef = useRef<SVGGElement | null>(null);
  const [done, setDone] = useState(false);
  const [auto, setAuto] = useState(0);
  const h = useHaptics();
  const beat = useBeats(done, [750, 1500, 2300, 4300]);
  const hold = useHold(HOLD_MS, finish, p.interactive && !p.paused && !done);
  const progress = done ? 1 : Math.max(hold.progress, auto);
  const count = progress <= 0 ? 3 : progress < 1 / 3 ? 3 : progress < 2 / 3 ? 2 : 1;
  const within = progress <= 0 ? 0 : (progress * 3) % 1 || 1;
  const lastCount = useRef(3);
  const sparkColors = [c.gold!, "#FFF4D6", c.silver!, c.violet!];

  function finish() {
    if (done) return;
    setDone(true);
    h.thud();
    foley("fizz");
    cast.current?.anticipate();
    sky.current?.rocket(p.recipient || "You", p.reduced);
  }

  // Each new number lands with a tick and a low note.
  useEffect(() => {
    if (progress > 0 && count !== lastCount.current) {
      lastCount.current = count;
      h.tap();
      melody([count === 2 ? 392 : 440], 0.2, "triangle", 0.05);
    }
    if (progress === 0) lastCount.current = 3;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, progress === 0]);

  useEffect(() => {
    if (beat === 1) {
      foley("crack");
      h.success();
    }
    if (beat === 2) {
      cast.current?.celebrate();
      foley("crack");
      const r = popperRef.current?.getBoundingClientRect();
      if (r)
        burstSet(p.hostRef.current, r.left + r.width * 0.2, r.top, p.iconSet, {
          colors: sparkColors,
          count: 22,
          spread: 1.1,
          up: true,
          gravity: 0.8,
        });
    }
    if (beat === 3) {
      melody([523, 659, 784, 1047, 784, 1047], 0.13, "sine", 0.05);
      sky.current?.friends(p.contributors.length || 3, p.reduced);
    }
    if (beat === 4) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(done ? "" : progress > 0 ? "Keep holding…" : "Press and hold to count down");
    if (progress > 0 && !done) cast.current?.anticipate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, progress > 0]);

  // The sky: a canvas for sparks, sized to the stage.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // The name is drawn in the theme's display face, so warm it up early.
    void document.fonts?.load("700 40px 'Clash Display'").catch(() => {});
    const s = new Sky(el, sparkColors, (x, y, color, big) => {
      // Each burst lights the sky around it and catches the rooftops.
      const f = flashRef.current;
      const w = el.clientWidth || 1;
      const hgt = el.clientHeight || 1;
      if (f) {
        f.style.background = `radial-gradient(${big ? 70 : 38}% ${big ? 55 : 30}% at ${(x / w) * 100}% ${(y / hgt) * 100}%, ${color}, transparent 70%)`;
        f.animate([{ opacity: 0 }, { opacity: big ? 0.55 : 0.3, offset: 0.12 }, { opacity: 0 }], { duration: big ? 1600 : 900, easing: "cubic-bezier(.2,.7,.3,1)" });
      }
      roofsLitRef.current?.animate([{ opacity: 0 }, { opacity: big ? 0.9 : 0.5, offset: 0.12 }, { opacity: 0 }], { duration: big ? 1600 : 900, easing: "cubic-bezier(.2,.7,.3,1)" });
    });
    sky.current = s;
    return () => s.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Previews hold the button by themselves.
  const autoMv = useMotionValue(0);
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      void animate(autoMv, 1, {
        duration: HOLD_MS / 1000,
        ease: [0.4, 0, 0.6, 1],
        onUpdate: (v) => setAuto(v),
      }).then(finish);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const weight = Math.round(200 + within * 500);
  const ring = 2 * Math.PI * 46;

  return (
    <div
      className="relative flex size-full flex-col items-center justify-center"
      style={{ color: c.silver }}
    >
      {/* Stars at three distances: the far ones barely move */}
      <Stars depth={-3} count={26} lo={0.8} hi={1.4} seed={3} />
      <Stars depth={-8} count={14} lo={1.2} hi={2} seed={8} />
      <Stars depth={-14} count={6} lo={2} hi={2.8} seed={13} />
      {/* Light from the fireworks, washing over the sky */}
      <div ref={flashRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] opacity-0" />
      {/* The city below, windows on, rooftops catching each burst */}
      <Layer depth={-5} className="pointer-events-none absolute inset-x-[-8%] bottom-[-1%] z-[2] h-[19%]">
        <Skyline night={c.night!} navy={c.navy!} gold={c.gold!} violet={c.violet!} litRef={roofsLitRef} />
      </Layer>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] size-full"
      />

      {/* The countdown */}
      <div className="relative z-[4] grid h-[clamp(220px,62cqi,320px)] w-full place-items-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {!done ? (
            <motion.button
              key="count"
              type="button"
              aria-label="Press and hold to count down"
              disabled={!p.interactive || p.paused}
              {...hold.handlers}
              exit={{
                scale: 2.4,
                opacity: 0,
                filter: "blur(14px)",
                transition: { duration: 0.5, ease: [0.2, 0.7, 0.3, 1] },
              }}
              className="relative grid size-[clamp(200px,58cqi,300px)] touch-none place-items-center rounded-full outline-none select-none focus-visible:ring-4 focus-visible:ring-white/40"
              animate={{ scale: 1 + progress * 0.06 }}
              transition={SPRING.snappy}
            >
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 size-full -rotate-90"
                aria-hidden="true"
              >
                {/* An engraved ring: a dark groove with a light lip on its lower edge */}
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,.5)" strokeWidth="2.6" />
                <circle cx="50" cy="50" r="46" fill="none" stroke={`${c.silver}30`} strokeWidth="0.8" />
                <circle cx="50.35" cy="50.5" r="47.3" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="0.5" />
                <circle cx="50" cy="50" r="46" fill="none" stroke={c.gold} strokeOpacity=".16" strokeWidth="6" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - progress)} />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke={c.gold}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray={ring}
                  strokeDashoffset={ring * (1 - progress)}
                  style={{ filter: `drop-shadow(0 0 3px ${c.gold})` }}
                />
              </svg>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={{ y: 60, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: progress > 0 ? 1 : 0.55, scale: 1 }}
                  exit={{ y: -50, opacity: 0, scale: 1.3 }}
                  transition={SPRING.wobbly}
                  className="pointer-events-none block leading-none tabular-nums"
                  style={{
                    fontFamily: "var(--jb-display)",
                    fontSize: "clamp(8rem, 44cqi, 13rem)",
                    fontWeight: weight,
                    letterSpacing: "-0.04em",
                    color: progress > 0 ? "#FFF6DD" : c.silver,
                    // Cut from metal: a lit top edge, a few px of body falling to the lower right, then glow.
                    textShadow:
                      progress > 0
                        ? `-1px -1px 0 rgba(255,255,255,.5), 0.6px 1px 0 #E5C26B, 1.2px 2px 0 #C9A24A, 1.8px 3px 0 #A9832F, 2.4px 4px 0 #8C6B22, 3px 6px 10px rgba(0,0,0,.55), 0 0 ${10 + within * 30}px ${c.gold}AA`
                        : `-1px -1px 0 rgba(255,255,255,.18), 0.6px 1px 0 #8f94a3, 1.2px 2px 0 #7a7f8e, 1.8px 3px 0 #646979, 3px 6px 10px rgba(0,0,0,.6)`,
                  }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          ) : (
            <motion.div key="after" className="h-full w-full" />
          )}
        </AnimatePresence>
        {/* Reduced motion: the name is plain type instead of sparks */}
        {done && p.reduced ? (
          <span
            className="absolute text-[clamp(2.6rem,14cqi,4.5rem)] font-semibold"
            style={{ fontFamily: "var(--jb-display)", color: c.gold }}
          >
            {p.recipient}
          </span>
        ) : null}
      </div>

      <div className="relative z-[5] grid h-20 w-full place-items-center px-6 text-center">
        {beat >= 3 ? (
          <motion.div
            initial={{ y: 20, opacity: 0, letterSpacing: "0.3em" }}
            animate={{ y: 0, opacity: 1, letterSpacing: "0em" }}
            transition={SPRING.soft}
          >
            <Greeting
              text={p.greeting}
              className="text-[clamp(1.6rem,8cqi,2.4rem)] font-medium"
              style={{ color: "#FFF6DD" }}
            />
          </motion.div>
        ) : null}
      </div>

      <div className="relative z-[45] mt-2 h-11">
        <FallbackButton
          onClick={finish}
          color={c.silver!}
          ink={c.silver!}
          hidden={done || !p.interactive || p.paused}
        >
          {p.buttonText}
        </FallbackButton>
      </div>

      {/* The character, with a party popper */}
      <Layer depth={14} className="absolute right-[6%] bottom-[clamp(70px,18cqi,96px)] z-[6]">
        <div className="relative">
          <Character
            ref={cast}
            setting={p.character}
            accessory={p.accessory}
            size={88}
            live={!p.paused}
            showName={false}
          />
          {p.character.type !== "none" ? (
            <motion.div
              ref={popperRef}
              className="absolute -top-[6px] -left-[18px] origin-bottom-right"
              initial={false}
              animate={
                beat >= 2 ? { rotate: [-30, -52, -24, -34], x: [0, -4, 2, 0] } : { rotate: -30 }
              }
              transition={{ duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }}
            >
              <Popper gold={c.gold!} violet={c.violet!} />
            </motion.div>
          ) : null}
        </div>
      </Layer>
    </div>
  );
}

function Popper({ gold, violet }: { gold: string; violet: string }) {
  return (
    <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
      <defs>
        <clipPath id="jb-popper">
          <path d="M4 4 L30 4 L19 42 L15 42 Z" />
        </clipPath>
      </defs>
      <g clipPath="url(#jb-popper)">
        <rect width="34" height="44" fill={gold} />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x="-10"
            y={i * 10 - 2}
            width="60"
            height="4"
            fill={violet}
            transform="rotate(-18 17 22)"
          />
        ))}
      </g>
      <ellipse cx="17" cy="4" rx="13" ry="3" fill="#FFF6DD" />
    </svg>
  );
}

/* ---------- stars and the city ---------- */

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** One layer of stars, twinkling at their own pace, drifting with the tilt at their depth. */
// Memoized: the countdown re-renders every frame while it's held.
const Stars = memo(function Stars({ depth, count, lo, hi, seed }: { depth: number; count: number; lo: number; hi: number; seed: number }) {
  const stars = useMemo(() => {
    const r = seeded(seed * 977);
    return Array.from({ length: count }, () => ({ x: r() * 100, y: r() * 72, s: lo + r() * (hi - lo), d: -r() * 4, t: 2.4 + r() * 3 }));
  }, [count, seed, lo, hi]);
  return (
    <Layer depth={depth} className="pointer-events-none absolute inset-[-4%] z-[1]">
      {stars.map((st, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="jb-twinkle absolute block rounded-full"
          style={{
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            background: "#fff",
            boxShadow: st.s > 1.9 ? `0 0 ${st.s * 3}px rgba(255,255,255,.7)` : "none",
            animationDelay: `${st.d}s`,
            animationDuration: `${st.t}s`,
          }}
        />
      ))}
    </Layer>
  );
});

/**
 * A city skyline: two rows of buildings (the far row hazier), lit windows,
 * a few blinking on and off, and a copy of the rooftops lit in gold that the
 * fireworks flash on.
 */
const Skyline = memo(function Skyline({ night, navy, gold, violet, litRef }: { night: string; navy: string; gold: string; violet: string; litRef: React.RefObject<SVGGElement | null> }) {
  const city = useMemo(() => {
    const r = seeded(2026);
    const row = (y0: number, hMin: number, hMax: number, wMin: number, wMax: number) => {
      const out: { x: number; w: number; h: number; spire: boolean }[] = [];
      let x = -10;
      while (x < 420) {
        const w = wMin + r() * (wMax - wMin);
        out.push({ x, w, h: hMin + r() * (hMax - hMin), spire: r() > 0.86 });
        x += w + (r() > 0.7 ? 2 : 0);
      }
      return out.map((b) => ({ ...b, y: y0 - b.h }));
    };
    const back = row(120, 40, 92, 14, 30);
    const front = row(120, 18, 62, 12, 26);
    const windows: { x: number; y: number; blink: boolean; d: number }[] = [];
    for (const b of front) {
      for (let wy = b.y + 6; wy < 116; wy += 7) {
        for (let wx = b.x + 3; wx < b.x + b.w - 4; wx += 5) {
          if (r() < 0.32) windows.push({ x: wx, y: wy, blink: r() < 0.12, d: -r() * 7 });
        }
      }
    }
    return { back, front, windows };
  }, []);
  const roof = (b: { x: number; y: number; w: number; h: number; spire: boolean }) =>
    `M${b.x.toFixed(1)} 121V${b.y.toFixed(1)}h${b.w.toFixed(1)}V121z` + (b.spire ? `M${(b.x + b.w / 2 - 1).toFixed(1)} ${b.y.toFixed(1)}v-12h2v12z` : "");
  const top = (b: { x: number; y: number; w: number }) => `M${b.x.toFixed(1)} ${b.y.toFixed(1)}h${b.w.toFixed(1)}`;
  return (
    <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice" className="size-full" aria-hidden="true">
      <defs>
        <linearGradient id="jb-ny-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={navy} />
          <stop offset="1" stopColor={night} />
        </linearGradient>
        <linearGradient id="jb-ny-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={violet} stopOpacity="0" />
          <stop offset="1" stopColor={violet} stopOpacity=".28" />
        </linearGradient>
      </defs>
      <path d={city.back.map(roof).join("")} fill="url(#jb-ny-back)" opacity=".75" />
      <rect x="-20" y="40" width="440" height="80" fill="url(#jb-ny-haze)" />
      <path d={city.front.map(roof).join("")} fill={night} />
      {city.windows.map((w, i) => (
        <rect key={i} x={w.x} y={w.y} width="2.2" height="3" rx=".4" fill="#FFD98A" opacity=".8" className={w.blink ? "jb-window" : undefined} style={w.blink ? { animationDelay: `${w.d}s` } : undefined} />
      ))}
      {/* Rooftops lit by the fireworks */}
      <g ref={litRef} opacity="0">
        <path d={city.back.map(top).join("")} fill="none" stroke={gold} strokeOpacity=".55" strokeWidth="1" />
        <path d={city.front.map(top).join("")} fill="none" stroke={gold} strokeWidth="1.3" strokeLinecap="round" />
      </g>
    </svg>
  );
});

/* ---------- the sky ---------- */

type Spark = {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  tx: number | null;
  ty: number | null;
  color: string;
  born: number;
  life: number;
  size: number;
  seed: number;
};

/**
 * A small particle system. Runs only while something is in the air, so an
 * idle sky costs nothing. Sparks that have a target spring towards it (that's
 * how the name forms), then let go and fall like embers.
 */
class Sky {
  private ctx: CanvasRenderingContext2D | null;
  private sparks: Spark[] = [];
  private raf = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private ro: ResizeObserver;
  private holdUntil = 0;
  private last = 0;
  private rocketAt: { x: number; y: number; t0: number; t1: number; name: string } | null = null;

  constructor(
    private el: HTMLCanvasElement,
    private colors: string[],
    private onBurst?: (x: number, y: number, color: string, big: boolean) => void,
  ) {
    this.ctx = el.getContext("2d");
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    this.resize();
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.el.clientWidth;
    this.h = this.el.clientHeight;
    this.el.width = Math.round(this.w * this.dpr);
    this.el.height = Math.round(this.h * this.dpr);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
  }

  private run() {
    if (this.raf) return;
    const loop = (now: number) => {
      this.raf = 0;
      if (this.step(now)) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  /** Points on the recipient's name, sampled from type drawn off screen. */
  private namePoints(name: string) {
    const off = document.createElement("canvas");
    const w = Math.max(200, Math.round(this.w * 0.9));
    let size = Math.min(130, this.h * 0.2);
    const ctx = off.getContext("2d");
    if (!ctx) return [];
    const face = `'Clash Display', 'Fraunces', sans-serif`;
    ctx.font = `700 ${size}px ${face}`;
    const measured = ctx.measureText(name).width;
    if (measured > w) size = Math.max(28, (size * w) / measured);
    off.width = w;
    off.height = Math.ceil(size * 1.3);
    ctx.font = `700 ${size}px ${face}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(name, w / 2, off.height / 2);
    const data = ctx.getImageData(0, 0, off.width, off.height).data;
    const pts: { x: number; y: number }[] = [];
    const gap = Math.max(3, Math.round(size / 24));
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < w; x += gap) {
        if ((data[(y * off.width + x) * 4 + 3] ?? 0) > 128)
          pts.push({ x: x + (this.w - w) / 2, y: y - off.height / 2 });
      }
    }
    // Keep it light on phones.
    const max = 650;
    if (pts.length > max) {
      const keep = max / pts.length;
      return pts.filter((_, i) => (i * keep) % 1 < keep);
    }
    return pts;
  }

  rocket(name: string, reduced: boolean) {
    if (reduced || !this.ctx) return;
    const now = performance.now();
    this.rocketAt = { x: this.w / 2, y: this.h * 0.36, t0: now, t1: now + 720, name };
    this.run();
  }

  private explodeName(name: string, cx: number, cy: number, now: number) {
    this.onBurst?.(cx, cy, this.colors[0] ?? "#E5C26B", true);
    const pts = this.namePoints(name);
    this.holdUntil = now + 2600;
    pts.forEach((pt, i) => {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      this.sparks.push({
        x: cx,
        y: cy,
        px: cx,
        py: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tx: pt.x,
        ty: cy + pt.y,
        color:
          i % 7 === 0
            ? (this.colors[2] ?? "#fff")
            : i % 5 === 0
              ? "#FFF4D6"
              : (this.colors[0] ?? "#E5C26B"),
        born: now + Math.random() * 120,
        life: 4200 + Math.random() * 800,
        size: 1.1 + Math.random() * 1.1,
        seed: Math.random() * 10,
      });
    });
    // A ring of loose sparks that don't join the name.
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const sp = 4 + Math.random() * 3;
      this.sparks.push({
        x: cx,
        y: cy,
        px: cx,
        py: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        tx: null,
        ty: null,
        color: this.colors[i % this.colors.length] ?? "#fff",
        born: now,
        life: 1400 + Math.random() * 500,
        size: 1.4,
        seed: i,
      });
    }
  }

  /** One small firework per friend (up to eight), around the edges. */
  friends(n: number, reduced: boolean) {
    if (reduced || !this.ctx) return;
    const shots = Math.min(8, Math.max(2, n));
    const now = performance.now();
    for (let k = 0; k < shots; k++) {
      const cx = this.w * (k % 2 ? 0.72 + Math.random() * 0.18 : 0.1 + Math.random() * 0.18);
      const cy = this.h * (0.1 + Math.random() * 0.25);
      const color = this.colors[(k + 1) % this.colors.length] ?? "#fff";
      const t = now + k * 260;
      window.setTimeout(() => this.onBurst?.(cx, cy, color, false), k * 260);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const sp = 1.6 + Math.random() * 1.6;
        this.sparks.push({
          x: cx,
          y: cy,
          px: cx,
          py: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          tx: null,
          ty: null,
          color,
          born: t,
          life: 1300 + Math.random() * 400,
          size: 1.2,
          seed: i,
        });
      }
    }
    this.run();
  }

  private step(now: number) {
    const ctx = this.ctx;
    if (!ctx) return false;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "lighter";

    // The rocket climbing, with a wobble and a trail.
    if (this.rocketAt) {
      const r = this.rocketAt;
      const t = Math.min(1, (now - r.t0) / (r.t1 - r.t0));
      const e = 1 - (1 - t) ** 3;
      const y = this.h * 1.02 + (r.y - this.h * 1.02) * e;
      const x = r.x + Math.sin(t * 9) * 3 * (1 - t);
      const grad = ctx.createLinearGradient(x, y, x, y + 60);
      grad.addColorStop(0, "rgba(255,244,214,.95)");
      grad.addColorStop(1, "rgba(255,244,214,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 60);
      ctx.stroke();
      if (t >= 1) {
        this.explodeName(r.name, r.x, r.y, now);
        this.rocketAt = null;
      }
    }

    // Frame-rate independent: 1 = one 60fps frame.
    const k = Math.min(3, Math.max(0.25, this.last ? (now - this.last) / 16.67 : 1));
    this.last = now;
    const letGo = now > this.holdUntil;
    let alive = !!this.rocketAt;
    for (const s of this.sparks) {
      const age = now - s.born;
      if (age < 0) {
        alive = true;
        continue;
      }
      if (age > s.life) continue;
      alive = true;
      s.px = s.x;
      s.py = s.y;
      if (s.tx != null && s.ty != null && !letGo) {
        // Spring to its place in the name.
        s.vx += (s.tx - s.x) * 0.045 * k;
        s.vy += (s.ty - s.y) * 0.045 * k;
        s.vx *= 0.82 ** k;
        s.vy *= 0.82 ** k;
      } else {
        s.vy += 0.045 * k;
        s.vx *= 0.985 ** k;
        s.vy *= 0.985 ** k;
      }
      s.x += s.vx * k;
      s.y += s.vy * k;
      const fade = 1 - Math.max(0, (age - s.life * 0.6) / (s.life * 0.4));
      const twinkle = s.tx != null && !letGo ? 0.7 + 0.3 * Math.sin(now / 90 + s.seed * 7) : 1;
      const a = Math.max(0, fade * twinkle);
      const speed = Math.abs(s.x - s.px) + Math.abs(s.y - s.py);
      if (speed > 1.2) {
        // Moving: a streak.
        ctx.globalAlpha = a;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.size;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      } else {
        // Resting in the name: a point of light with a soft halo.
        ctx.fillStyle = s.color;
        ctx.globalAlpha = a * 0.14;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (!alive) {
      this.last = 0;
      this.sparks = [];
      ctx.clearRect(0, 0, this.w, this.h);
    } else if (this.sparks.length > 2000) {
      this.sparks = this.sparks.filter((s) => now - s.born < s.life);
    }
    return alive;
  }
}

export const newYearBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.night,
  backgroundImage: [
    // A few fixed stars, then the sky deepening towards the top.
    "radial-gradient(1px 1px at 12% 18%, #fff, transparent)",
    "radial-gradient(1px 1px at 78% 12%, #fff, transparent)",
    "radial-gradient(1.5px 1.5px at 64% 30%, #ffffffcc, transparent)",
    "radial-gradient(1px 1px at 30% 40%, #ffffffaa, transparent)",
    "radial-gradient(1px 1px at 88% 46%, #ffffff99, transparent)",
    "radial-gradient(1.5px 1.5px at 22% 64%, #ffffff88, transparent)",
    `radial-gradient(70% 45% at 50% 100%, ${c.violet}40, transparent 70%)`,
    // City glow on the low clouds
    `radial-gradient(90% 22% at 50% 92%, rgba(255,190,120,.12), transparent 70%)`,
    `linear-gradient(180deg, ${c.night}, ${c.navy} 70%)`,
    TEXTURE.grain,
  ].join(","),
  backgroundSize: "auto, auto, auto, auto, auto, auto, auto, auto, auto, 160px 160px",
});
