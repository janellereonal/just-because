/**
 * Live mini demos for the newer sections, same look as the first six bento
 * tiles: open-when envelopes, a locked capsule, an awards vote, a quiz
 * question, a memory map drawing its route, a coupon you tear, a video
 * clip and a doodle pad you can scribble on.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Lock, Pause, Play } from "lucide-react";
import { SPRING } from "@/themes/_shared/stage";
import { describeWait, formatMomentWithYear } from "@/lib/time";

const card = "bg-white shadow-[0_12px_24px_-16px_rgba(43,37,34,.5)] ring-1 ring-ink/5";

/* Three sealed envelopes. Tap one and the letter slides out. */
export function OpenWhenDemo() {
  const notes = [
    { when: "you miss home", text: "Call Mom. Then call me. In that order." },
    { when: "it's a bad day", text: "Remember the tram in the rain? We still laughed." },
    { when: "you turn 31", text: "See, it wasn't scary at all." },
  ];
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="relative flex h-[160px] w-full max-w-[300px] items-end justify-center gap-2">
      {notes.map((n, i) => {
        const on = open === i;
        return (
          <motion.button
            key={n.when}
            type="button"
            onClick={() => setOpen(on ? null : i)}
            aria-expanded={on}
            aria-label={`Open when ${n.when}`}
            className="relative h-[66px] w-[88px] shrink-0"
            animate={{ y: on ? -2 : 0, rotate: on ? 0 : (i - 1) * 4 }}
            whileHover={{ y: -4 }}
            transition={SPRING.snappy}
          >
            <AnimatePresence>
              {on ? (
                <motion.span
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: -78, opacity: 1 }}
                  exit={{ y: 0, opacity: 0 }}
                  transition={SPRING.soft}
                  className={`absolute top-1 left-1/2 z-0 w-[150px] -ml-[75px] rounded-md p-2.5 text-left text-[11px] leading-snug ${card}`}
                >
                  {n.text}
                </motion.span>
              ) : null}
            </AnimatePresence>
            <span className="absolute inset-0 z-[1] rounded-md bg-[#F3E2CF] ring-1 ring-ink/10" />
            <motion.span
              className="absolute inset-x-0 top-0 z-[2] h-[38px] origin-top"
              animate={{ rotateX: on ? 180 : 0 }}
              transition={SPRING.soft}
              style={{ clipPath: "polygon(0 0,100% 0,50% 100%)", background: "#E8CDB1", transformStyle: "preserve-3d" }}
            />
            <span className="absolute top-[28px] left-1/2 z-[3] size-4 -ml-2 rounded-full bg-[#B5623E] shadow-sm" style={{ opacity: on ? 0 : 1 }} />
            <span className="absolute inset-x-1 bottom-1.5 z-[3] truncate text-center font-mono text-[8.5px] tracking-wide text-ink/65 uppercase">
              {n.when}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* A locked box that opens a year from today at 7pm. Tapping it just rattles. */
export function CapsuleDemo() {
  const [target] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear() + 1, d.getMonth(), d.getDate(), 19, 0).getTime();
  });
  const [now, setNow] = useState(() => Date.now());
  const [shake, setShake] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const wait = describeWait(target, now);
  return (
    <div className="flex flex-col items-center">
      <motion.button
        type="button"
        onClick={() => setShake((n) => n + 1)}
        aria-label="Locked until next year"
        key={shake}
        animate={shake ? { rotate: [0, -6, 6, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="relative h-[92px] w-[120px]"
      >
        <span className="absolute inset-x-0 bottom-0 h-[64px] rounded-b-xl bg-[linear-gradient(180deg,#3A4A6B,#243087)] shadow-[0_16px_24px_-14px_rgba(36,48,135,.7)]" />
        <span className="absolute inset-x-[-4px] top-[18px] h-[16px] rounded-md bg-[#2B3A7A] ring-1 ring-white/10" />
        <span className="absolute inset-x-0 bottom-[22px] h-[3px] bg-[#E2B95B]/70" />
        <span className="absolute bottom-[12px] left-1/2 grid size-8 -ml-4 place-items-center rounded-full bg-[#E2B95B] text-[#243087] shadow">
          <Lock className="size-4" aria-hidden="true" />
        </span>
        <span className="absolute top-0 left-1/2 -ml-[30px] w-[60px] -rotate-6 rounded-sm bg-[#FFF4DE] px-1 py-0.5 font-mono text-[8px] tracking-wide text-[#243087] uppercase shadow">
          From Sofia
        </span>
      </motion.button>
      <p className="mt-3 font-mono text-[11px] tracking-[.1em] text-ink/70 tabular-nums uppercase" suppressHydrationWarning>
        Opens {wait}
      </p>
      <p className="mt-1 text-[11px] text-ink/55" suppressHydrationWarning>
        {formatMomentWithYear(target, now)}
      </p>
    </div>
  );
}

/* A little vote race. The winner gets the rosette. */
export function AwardsDemo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const rows = [
    { name: "Ana", votes: 7 },
    { name: "Mateo", votes: 4 },
    { name: "Chen", votes: 2 },
  ];
  return (
    <div ref={ref} className={`w-full max-w-[260px] rounded-2xl p-3.5 ${card}`}>
      <p className="font-mono text-[9.5px] tracking-[.14em] text-ink/55 uppercase">Most likely to cry at the toast</p>
      <div className="mt-2.5 space-y-2">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-11 shrink-0 font-semibold">{r.name}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-ink/6">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: i === 0 ? "#E8577E" : "#2B252233" }}
                initial={{ width: 0 }}
                animate={{ width: seen ? `${(r.votes / 7) * 100}%` : 0 }}
                transition={{ ...SPRING.soft, delay: 0.2 + i * 0.12 }}
              />
            </div>
            <span className="w-4 text-right text-ink/55 tabular-nums">{r.votes}</span>
            {i === 0 ? (
              <motion.svg
                width="22"
                height="26"
                viewBox="0 0 22 26"
                initial={{ scale: 0, rotate: -40 }}
                animate={seen ? { scale: 1, rotate: 0 } : {}}
                transition={{ ...SPRING.wobbly, delay: 1 }}
                aria-hidden="true"
              >
                <path d="M6 14 3 25l5-3 2 4 2-11zM16 14l3 11-5-3-2 4-2-11z" fill="#B5623E" />
                <circle cx="11" cy="9" r="8.5" fill="#E8577E" />
                <circle cx="11" cy="9" r="5.5" fill="#FFD166" />
              </motion.svg>
            ) : (
              <span className="w-[22px]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* One question, three answers. Pick one. */
export function QuizDemo() {
  const options = ["Lisbon", "Kyoto", "Mexico City"];
  const right = 0;
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className={`w-full max-w-[260px] rounded-2xl p-3.5 ${card}`}>
      <p className="text-[13px] leading-snug font-semibold">Where did Ana get lost for six hours with no phone?</p>
      <div className="mt-2.5 grid gap-1.5">
        {options.map((o, i) => {
          const state = picked === null ? "idle" : i === right ? "right" : picked === i ? "wrong" : "idle";
          return (
            <motion.button
              key={o}
              type="button"
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              animate={state === "wrong" ? { x: [0, -6, 6, -3, 0] } : state === "right" ? { scale: [1, 1.04, 1] } : {}}
              transition={{ duration: 0.4 }}
              className={`rounded-lg px-3 py-1.5 text-left text-[12px] ring-1 transition-colors ${
                state === "right"
                  ? "bg-[#7AD3B0]/30 ring-[#2F8F6B]/50"
                  : state === "wrong"
                    ? "bg-[#E8577E]/15 ring-[#E8577E]/50"
                    : "bg-cream/60 ring-ink/10 hover:bg-cream"
              }`}
            >
              {o}
              {state === "right" ? <span className="float-right text-[#2F8F6B]">Mateo knew</span> : null}
            </motion.button>
          );
        })}
      </div>
      {picked !== null ? (
        <button type="button" onClick={() => setPicked(null)} className="mt-2 text-[11px] text-ink/55 underline underline-offset-2">
          Try again
        </button>
      ) : null}
    </div>
  );
}

/* A route draws itself between pins when you scroll to it. */
export function MapDemo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const pins = [
    { x: 30, y: 92, name: "Lisbon" },
    { x: 118, y: 40, name: "First flat" },
    { x: 214, y: 82, name: "Rinjani" },
  ];
  const d = "M30 92 C 60 30, 90 30, 118 40 S 190 120, 214 82";
  return (
    <div ref={ref} className="relative w-full max-w-[260px] overflow-hidden rounded-2xl bg-[#DCEBF2] ring-1 ring-ink/5">
      <svg viewBox="0 0 250 130" className="block w-full" aria-hidden="true">
        <path d="M-10 70 Q 30 40 70 60 T 140 64 Q 170 30 210 46 T 260 40 V140 H-10Z" fill="#F4EEE3" />
        <path d="M150 140 Q 170 100 200 104 T 260 96 V140Z" fill="#E7DCC8" />
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={(i * 47) % 250} cy={6 + ((i * 29) % 40)} r=".9" fill="#2B2522" opacity=".12" />
        ))}
        <motion.path
          d={d}
          fill="none"
          stroke="#B5623E"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="1 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: seen ? 1 : 0 }}
          transition={{ duration: 1.8, ease: [0.45, 0, 0.2, 1] }}
        />
        {pins.map((p, i) => (
          <motion.g
            key={p.name}
            initial={{ scale: 0, opacity: 0 }}
            animate={seen ? { scale: 1, opacity: 1 } : {}}
            transition={{ ...SPRING.wobbly, delay: 0.2 + i * 0.6 }}
            style={{ originX: `${p.x}px`, originY: `${p.y}px` }}
          >
            <path d={`M${p.x} ${p.y}c-6-7-9-11-9-15a9 9 0 0 1 18 0c0 4-3 8-9 15z`} fill="#E8577E" stroke="#fff" strokeWidth="1.5" />
            <circle cx={p.x} cy={p.y - 15} r="3" fill="#fff" />
            <rect x={p.x - 26} y={p.y + 3} width="52" height="13" rx="6.5" fill="#fff" opacity=".92" />
            <text x={p.x} y={p.y + 12.5} textAnchor="middle" fontSize="7.5" fontFamily="DM Sans, sans-serif" fill="#2B2522">
              {p.name}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/* A coupon with a stub you can tear off (and stick back on). */
export function CouponDemo() {
  const [torn, setTorn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setTorn((t) => !t)}
      aria-pressed={torn}
      aria-label={torn ? "Coupon redeemed. Tap to reset." : "Tear the coupon to redeem it"}
      className="relative flex h-[92px] w-full max-w-[268px] text-left"
    >
      <span className="relative flex flex-1 flex-col justify-center rounded-l-xl bg-[#FFF4DE] px-4 ring-1 ring-[#E8577E]/30">
        <span className="font-mono text-[9px] tracking-[.16em] text-[#E8577E] uppercase">Good for one</span>
        <span className="font-display text-[19px] leading-tight font-semibold">Dinner, my treat</span>
        <span className="text-[10.5px] text-ink/55">From Mateo. No expiry.</span>
        {torn ? (
          <motion.span
            initial={{ scale: 2, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            transition={SPRING.snappy}
            className="absolute top-3 right-2 rounded-md border-2 border-[#E8577E] px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-widest text-[#E8577E] uppercase"
          >
            Redeemed
          </motion.span>
        ) : null}
      </span>
      <motion.span
        className="relative grid w-[64px] place-items-center rounded-r-xl border-l-2 border-dashed border-[#E8577E]/50 bg-[#FBE3D3] ring-1 ring-[#E8577E]/30"
        animate={torn ? { rotate: 24, x: 22, y: 26, opacity: 0.85 } : { rotate: 0, x: 0, y: 0, opacity: 1 }}
        transition={SPRING.wobbly}
        style={{ transformOrigin: "0% 100%" }}
      >
        <span className="font-mono text-[9px] tracking-[.12em] text-ink/60 uppercase [writing-mode:vertical-rl]">
          {torn ? "Enjoy" : "Tear here"}
        </span>
      </motion.span>
    </button>
  );
}

/* A real clip from Sam's gift, muted, playing on loop while in view. */
export function VideoDemo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const seen = useInView(ref, { amount: 0.5 });
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (seen && !reduce) void v.play().catch(() => {});
    else v.pause();
  }, [seen, reduce]);
  return (
    <div className={`relative w-full max-w-[240px] -rotate-2 rounded-xl p-2 pb-7 ${card}`}>
      <video
        ref={ref}
        src="/demo/video-sam.mp4#t=1.6"
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="aspect-video w-full rounded-md bg-ink/80 object-cover"
      />
      <button
        type="button"
        onClick={() => {
          const v = ref.current;
          if (!v) return;
          if (v.paused) void v.play().catch(() => {});
          else v.pause();
        }}
        aria-label={playing ? "Pause clip" : "Play clip"}
        className="absolute bottom-1.5 left-2 grid size-5 place-items-center rounded-full bg-ink text-cream"
      >
        {playing ? <Pause className="size-2.5" aria-hidden="true" /> : <Play className="ml-px size-2.5" aria-hidden="true" />}
      </button>
      <span className="absolute right-2 bottom-1.5 text-[10.5px] text-ink/60">From Jordan, 0:12</span>
    </div>
  );
}

/* A doodle pad. A heart draws itself, then it's your turn. */
export function DoodleDemo() {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const [lines, setLines] = useState<string[]>([]);
  const drawing = useRef(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const point = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return `${(((e.clientX - r.left) / r.width) * 240).toFixed(1)} ${(((e.clientY - r.top) / r.height) * 140).toFixed(1)}`;
  };
  return (
    <div ref={ref} className={`relative w-full max-w-[260px] overflow-hidden rounded-2xl ${card}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 240 140"
        className="block w-full touch-none cursor-crosshair"
        style={{ backgroundImage: "radial-gradient(#2B25221a 1px, transparent 1px)", backgroundSize: "12px 12px" }}
        onPointerDown={(e) => {
          drawing.current = true;
          (e.target as Element).setPointerCapture?.(e.pointerId);
          setLines((l) => [...l.slice(-12), `M${point(e)}`]);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          setLines((l) => {
            const c = l.slice();
            c[c.length - 1] += ` L${point(e)}`;
            return c;
          });
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerLeave={() => (drawing.current = false)}
        aria-label="A little doodle pad. Draw with your finger or mouse."
        role="img"
      >
        <motion.path
          d="M120 112 C 70 82, 52 52, 72 36 C 92 22, 112 34, 120 50 C 128 34, 148 22, 168 36 C 188 52, 170 82, 120 112 Z"
          fill="none"
          stroke="#E8577E"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: seen ? 1 : 0 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
        />
        <motion.text
          x="196"
          y="124"
          fontSize="13"
          fontFamily="DM Sans, sans-serif"
          fill="#2B2522"
          fillOpacity=".55"
          initial={{ opacity: 0 }}
          animate={{ opacity: seen ? 1 : 0 }}
          transition={{ delay: 1.6 }}
        >
          Aisha
        </motion.text>
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#243087" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {lines.length ? (
        <button type="button" onClick={() => setLines([])} className="absolute top-2 right-2 rounded-full bg-cream px-2 py-0.5 text-[10.5px] text-ink/65 ring-1 ring-ink/10">
          Clear
        </button>
      ) : (
        <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-cream/90 px-2 py-0.5 text-[10.5px] text-ink/60">Your turn, draw</span>
      )}
    </div>
  );
}
