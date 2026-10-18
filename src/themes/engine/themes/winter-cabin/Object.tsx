/**
 * Winter Cabin Christmas. A wooden cabin window, frosted over, snow on the
 * sill and falling outside. Wipe the glass and a warm room appears: a fire, a
 * stocking with their name, and a tree hung with friends' notes as ornaments.
 * Tap an ornament to read it.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { material, noise, shade } from "@/themes/engine/materials";
import { particlesFrom } from "@/themes/engine/particles";
import { playSound } from "@/themes/engine/sound";
import { NoteBubble } from "@/themes/engine/ui/NoteBubble";
import { Greeting } from "@/themes/_shared/opening";
import { t } from "@/i18n";
import type { EngineNote, EngineObjectProps } from "@/themes/engine/define";

/** Where ornaments hang, as % of the tree's own box (inside the tiers). */
const SPOTS: [number, number][] = [
  [50, 27], [38, 44], [63, 42], [30, 62], [52, 60], [72, 63], [22, 82], [44, 80], [66, 82], [82, 80],
];
const BAUBLES = ["#C0392B", "#E3B04B", "#E39A3B", "#9C2742", "#F4F1EC", "#3E7C63", "#D96A3A", "#E3B04B"];

export default function WinterCabin({ slots, palette, gesture, reduced, paused, hostRef, notes, setHint, greeting, interactive }: EngineObjectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const treeRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState<EngineNote | null>(null);
  const [openIndex, setOpenIndex] = useState(0);
  const hung = useMemo(() => notes.filter((n) => n.text || n.media).slice(0, SPOTS.length), [notes]);

  // Frost: painted once, then every wipe stroke clears a soft round path.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
    ctx.scale(dpr, dpr);
    paintFrost(ctx, w, h);
    return gesture.onStroke((s) => {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.shadowBlur = 14;
      ctx.lineWidth = s.radius * 2 * w;
      ctx.beginPath();
      ctx.moveTo(s.u0 * w, s.v0 * h);
      ctx.lineTo(s.u1 * w + 0.01, s.v1 * h);
      ctx.stroke();
      ctx.restore();
    });
  }, [gesture]);

  useEffect(() => {
    if (!gesture.done) return;
    playSound("bell");
    particlesFrom("sparks", hostRef.current, treeRef.current);
    if (interactive) setHint(hung.length ? t("theme.cabin.inside") : t("theme.cabin.empty"));
  }, [gesture.done, hostRef, hung.length, interactive, setHint]);

  const wood = shade(palette.surface, -0.05);
  return (
    <div className="relative" style={{ width: "min(84cqi, 400px, calc((100cqh - 150px) * 0.8))", aspectRatio: "4 / 5" }}>
      {/* The greeting, above the window, once you can see in */}
      <div className="absolute inset-x-[-4%] bottom-[calc(100%+14px)] text-center" style={{ color: "#FFF4E2", textShadow: "0 2px 14px rgba(0,0,0,.5)" }}>
        {gesture.done ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 0.7, type: "spring", stiffness: 140, damping: 18 }}>
            <Greeting text={greeting} className="text-[clamp(1.4rem,7cqi,2.3rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
          </motion.div>
        ) : null}
      </div>
      {/* Falling snow outside, in front of the window */}
      {!reduced && !paused ? <Snow /> : null}
      {/* The frame */}
      <div className="absolute inset-0 p-[7%]" style={material("wood", { tint: wood, lift: 0.8, radius: 10 })}>
        <div className="relative size-full overflow-hidden" style={{ borderRadius: 4, boxShadow: "inset 0 2px 10px rgba(0,0,0,.5)" }}>
          {/* The room */}
          <motion.div
            className="absolute inset-0"
            animate={{ filter: gesture.done ? "brightness(1.05) saturate(1.1)" : "brightness(.82) saturate(.85)" }}
            transition={{ duration: reduced ? 0 : 1.4 }}
            style={{
              background: `radial-gradient(90% 70% at 22% 92%, #FFC27A 0%, #E0813C 22%, #8A3E22 52%, #3A1C14 82%, #24120D 100%)`,
            }}
          >
            {/* Wall planks */}
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: `repeating-linear-gradient(90deg, rgba(0,0,0,.25) 0 1px, transparent 1px 18%), ${noise(0.5, 0.18, 3, [0.1, 2.5])}` }} />
            {/* Fireplace */}
            <div className="absolute bottom-0 left-[4%] h-[34%] w-[40%]">
              <div className="absolute inset-x-0 top-0 h-[14%] rounded-[3px]" style={material("wood", { tint: "#4A2C1C", lift: 0.3, radius: 3 })} />
              <div className="absolute inset-x-[10%] top-[14%] bottom-0 rounded-t-[50%] overflow-hidden" style={{ background: "#1B0D08", boxShadow: "inset 0 6px 14px rgba(0,0,0,.7)" }}>
                <Flames still={reduced || paused} />
              </div>
              {/* Stocking with their name */}
              <div className="absolute top-[12%] left-[56%] w-[36%] origin-top" style={{ transform: "rotate(-4deg)" }}>
                <svg viewBox="0 0 40 60" className="block w-full drop-shadow-[1px_3px_2px_rgba(0,0,0,.35)]" aria-hidden>
                  <path d="M10 10h20v26c0 8 6 10 6 16 0 6-6 8-12 6l-12-4C4 52 2 44 8 40l2-2z" fill="#B3262F" />
                  <path d="M10 18h20" stroke="#8E1C24" strokeWidth="0.8" />
                  <rect x="7" y="4" width="26" height="10" rx="3" fill="#F4F1EC" />
                </svg>
                <span className="absolute inset-x-0 top-[3%] truncate px-[8%] text-center text-[clamp(7px,2.1cqi,10px)] font-semibold italic" style={{ color: "#8E1C24", fontFamily: "var(--jb-display)" }}>
                  {slots.recipientShort}
                </span>
              </div>
            </div>
            {/* A little date card on the mantel, when the gift has a date */}
            {slots.given.date ? (
              <div className="absolute bottom-[34.5%] left-[8%] px-1.5 py-0.5 text-[clamp(7px,2cqi,10px)] font-semibold" style={{ ...(material("paper", { lift: 0.2 }) as object), color: "#5A2A1C" }}>
                {slots.dateLabel}
              </div>
            ) : null}
            {/* The tree */}
            <div ref={treeRef} className="absolute right-[3%] bottom-[3%] w-[54%]" style={{ aspectRatio: "1 / 1.25" }}>
              <Tree lit={gesture.done} still={reduced || paused} green={palette.accent2} />
              {/* Ornaments: friends' notes */}
              {hung.map((n, i) => {
                const [x, y] = SPOTS[i]!;
                return (
                  <button
                    key={n.id}
                    type="button"
                    disabled={!gesture.done || !interactive}
                    onClick={() => {
                      playSound("chime");
                      setOpenIndex(i);
                      setOpen(n);
                    }}
                    aria-label={`Note from ${n.author}`}
                    className="absolute -translate-x-1/2 -translate-y-1/2 p-2 outline-none disabled:cursor-default focus-visible:[&>span]:ring-4 focus-visible:[&>span]:ring-white/80"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    <motion.span
                      className="block size-[clamp(18px,6cqi,28px)] rounded-full"
                      style={{
                        background: `radial-gradient(circle at 34% 30%, #fff 0 8%, ${BAUBLES[i % BAUBLES.length]} 30%, ${shade(BAUBLES[i % BAUBLES.length]!, -0.45)} 100%)`,
                        boxShadow: gesture.done ? `0 0 14px 2px ${BAUBLES[i % BAUBLES.length]}AA, 1px 3px 4px rgba(0,0,0,.45)` : "1px 3px 4px rgba(0,0,0,.45)",
                      }}
                      animate={gesture.done && !reduced ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
                    />
                  </button>
                );
              })}
            </div>
            {/* A garland of lights across the top of the room */}
            <Garland lit={gesture.done} still={reduced || paused} />
          </motion.div>

          {/* Frost on the inside of the glass: the thing you wipe */}
          <motion.canvas
            ref={canvasRef}
            {...(gesture.bind as object)}
            className="absolute inset-0 size-full cursor-grab outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/70"
            style={{ ...(gesture.bind.style as object), pointerEvents: gesture.done ? "none" : "auto" }}
            animate={{ opacity: gesture.done ? 0 : 1 }}
            transition={{ duration: reduced ? 0.2 : 1.2 }}
          />
          {/* Glass sheen */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(125deg, rgba(255,255,255,.18) 0%, transparent 30%, transparent 70%, rgba(255,255,255,.08) 100%)" }} />
          {/* Mullions */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[5%] -translate-x-1/2" style={material("wood", { tint: wood, lift: 0.2, radius: 1 })} />
          <div className="pointer-events-none absolute inset-x-0 top-[46%] h-[4%]" style={material("wood", { tint: wood, lift: 0.2, radius: 1 })} />
          <NoteBubble note={open} onClose={() => setOpen(null)} accent={palette.accent} title={open ? `${openIndex + 1} / ${hung.length}` : undefined} />
        </div>
      </div>
      {/* Snow on the sill */}
      <div className="pointer-events-none absolute -bottom-[2%] left-[-3%] h-[7%] w-[106%]" style={{ background: "radial-gradient(60% 120% at 30% 100%, #fff 60%, transparent 62%), radial-gradient(55% 110% at 75% 100%, #F4F8FB 60%, transparent 62%)", filter: "drop-shadow(0 -1px 1px rgba(0,0,0,.15))" }} />
    </div>
  );
}

function paintFrost(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Thicker at the edges, thinner in the middle, like real frost.
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(214,228,240,0.9)");
  g.addColorStop(1, "rgba(246,250,253,0.98)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Speckle.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.5})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, rnd() * 1.3 + 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ice ferns growing in from the edges.
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineCap = "round";
  const fern = (x: number, y: number, a: number, len: number, depth: number) => {
    if (depth <= 0 || len < 3) return;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    ctx.lineWidth = depth * 0.45;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    fern(x2, y2, a + 0.55 + (rnd() - 0.5) * 0.3, len * 0.62, depth - 1);
    fern(x2, y2, a - 0.55 + (rnd() - 0.5) * 0.3, len * 0.62, depth - 1);
    fern(x2, y2, a + (rnd() - 0.5) * 0.2, len * 0.72, depth - 1);
  };
  for (let i = 0; i < 14; i++) {
    const edge = i % 4;
    const p = rnd();
    const [x, y, a] = edge === 0 ? [p * w, 0, Math.PI / 2] : edge === 1 ? [w, p * h, Math.PI] : edge === 2 ? [p * w, h, -Math.PI / 2] : [0, p * h, 0];
    fern(x, y, a + (rnd() - 0.5) * 0.6, Math.min(w, h) * (0.12 + rnd() * 0.1), 5);
  }
}

function Tree({ lit, still, green }: { lit: boolean; still: boolean; green: string }) {
  const tiers = [
    { y: 8, w: 34 },
    { y: 26, w: 52 },
    { y: 46, w: 72 },
    { y: 66, w: 92 },
  ];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
      <rect x="45" y="88" width="10" height="12" fill="#4A2C1C" />
      {tiers.map((tier, i) => (
        <path
          key={i}
          d={`M50 ${tier.y} L${50 + tier.w / 2} ${tier.y + 24} Q50 ${tier.y + 28} ${50 - tier.w / 2} ${tier.y + 24} Z`}
          fill={shade(green, -0.08 * (3 - i))}
          stroke={shade(green, -0.35)}
          strokeWidth="0.6"
        />
      ))}
      {/* Garland lights */}
      {Array.from({ length: 16 }, (_, i) => {
        const tier = tiers[Math.floor(i / 4)]!;
        const x = 50 - tier.w / 2 + 8 + ((i % 4) * (tier.w - 16)) / 3;
        const y = tier.y + 19 + (i % 2) * 2;
        const c = ["#FFE7A3", "#FFB3A3", "#A3E3FF", "#FFF6DA"][i % 4]!;
        return (
          <circle key={i} cx={x} cy={y} r="1.3" fill={lit ? c : "#6b5a40"} style={lit && !still ? { animation: `jb-twinkle 1.8s ease-in-out ${(i % 5) * 0.3}s infinite` } : undefined} />
        );
      })}
      {/* Star */}
      <path d="M50 1l2.4 4.9 5.4.8-3.9 3.8.9 5.4L50 13.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill={lit ? "#FFD166" : "#9a8a5a"} style={lit ? { filter: "drop-shadow(0 0 4px #FFD166)" } : undefined} />
      <style>{"@keyframes jb-twinkle{0%,100%{opacity:1}50%{opacity:.35}}"}</style>
    </svg>
  );
}

function Garland({ lit, still }: { lit: boolean; still: boolean }) {
  const bulbs = Array.from({ length: 11 }, (_, i) => i);
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-x-0 top-[3%] h-[12%] w-full" aria-hidden>
      <path d="M0 4 Q12.5 14 25 6 T50 6 T75 6 T100 4" fill="none" stroke="#2F5D46" strokeWidth="1.6" />
      {bulbs.map((i) => {
        const x = 4 + i * 9.2;
        const y = 6 + Math.sin((x / 25) * Math.PI) * -0.5 + (i % 2 ? 4.5 : 2.5);
        const c = ["#FFE7A3", "#FFB3A3", "#A3E3FF", "#C9F2B8"][i % 4]!;
        return (
          <ellipse key={i} cx={x} cy={y} rx="1.4" ry="2.1" fill={lit ? c : "#5a4a38"} style={lit ? { filter: `drop-shadow(0 0 2px ${c})`, ...(still ? {} : { animation: `jb-twinkle 2.2s ease-in-out ${(i % 4) * 0.4}s infinite` }) } : undefined} />
        );
      })}
    </svg>
  );
}

function Flames({ still }: { still: boolean }) {
  return (
    <svg viewBox="0 0 60 40" preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-0 h-[80%] w-full" aria-hidden>
      <defs>
        <radialGradient id="cab-fire" cx="50%" cy="90%" r="70%">
          <stop offset="0" stopColor="#FFF2B8" />
          <stop offset=".45" stopColor="#FFB347" />
          <stop offset="1" stopColor="#D9481E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="30" cy="38" rx="26" ry="10" fill="url(#cab-fire)" opacity=".7" />
      {[18, 30, 42].map((x, i) => (
        <path
          key={x}
          d={`M${x} 38 C${x - 8} 28 ${x - 2} 20 ${x} ${10 + i * 3} C${x + 3} 20 ${x + 8} 28 ${x} 38 Z`}
          fill="url(#cab-fire)"
          style={still ? undefined : { transformOrigin: `${x}px 38px`, animation: `jb-flame ${0.9 + i * 0.2}s ease-in-out infinite alternate` }}
        />
      ))}
      <rect x="10" y="35" width="40" height="4" rx="2" fill="#3A1C10" />
      <style>{"@keyframes jb-flame{from{transform:scaleY(1) skewX(0)}to{transform:scaleY(1.15) skewX(4deg)}}"}</style>
    </svg>
  );
}

function Snow() {
  const flakes = useMemo(
    () => Array.from({ length: 22 }, (_, i) => ({ left: (i * 37) % 100, size: 2 + ((i * 7) % 4), dur: 6 + ((i * 13) % 6), delay: -((i * 11) % 9) })),
    [],
  );
  return (
    <div className="pointer-events-none absolute -inset-x-[10%] -top-[8%] -bottom-[4%] z-[5] overflow-hidden">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute top-0 rounded-full bg-white"
          style={{ left: `${f.left}%`, width: f.size, height: f.size, opacity: 0.85, animation: `jb-snow ${f.dur}s linear ${f.delay}s infinite` }}
        />
      ))}
      <style>{"@keyframes jb-snow{from{transform:translate3d(0,-10px,0)}to{transform:translate3d(18px,560px,0)}}"}</style>
    </div>
  );
}
