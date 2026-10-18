/**
 * Debut. A grand doorway: a gilded arch and a heavy blush velvet curtain with
 * a gold cord. Pull the cord and the curtain sweeps open on a stage: their name
 * and a gold 18, an arc of 18 candles above and a garland of 18 roses below.
 * Each candle holds a friend's note, one of the "18 treasures". Light a candle
 * to read it, and its rose blooms. Light all 18 for the finale.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, useTransform } from "motion/react";
import { material, noise, shade } from "@/themes/engine/materials";
import { particles } from "@/themes/engine/particles";
import { playSound, playTune, haptic } from "@/themes/engine/sound";
import { NoteBubble } from "@/themes/engine/ui/NoteBubble";
import { t } from "@/i18n";
import type { EngineNote, EngineObjectProps } from "@/themes/engine/define";

const COUNT = 18;
/** Candles on an arc over the stage, as % of the stage box. */
const CANDLES = Array.from({ length: COUNT }, (_, i) => {
  const a = Math.PI * (1.08 + (0.84 * i) / (COUNT - 1));
  return { x: 50 + Math.cos(a) * 43, y: 50 + Math.sin(a) * 40 };
});
/** Roses along a swag garland under the name. */
const ROSES = Array.from({ length: COUNT }, (_, i) => {
  const u = i / (COUNT - 1);
  return { x: 6 + u * 88, y: 84 + Math.sin(u * Math.PI) * 7 };
});

export default function Debut({ slots, palette, gesture, reduced, paused, hostRef, notes, setHint, interactive }: EngineObjectProps) {
  const [lit, setLit] = useState<Set<number>>(() => new Set());
  const [reading, setReading] = useState<{ note: EngineNote; i: number } | null>(null);
  const treasures = useMemo(() => notes.filter((n) => n.text || n.media).slice(0, COUNT), [notes]);
  const finale = lit.size >= COUNT;

  // Curtains part as the cord is pulled, then sweep open.
  const p = gesture.progress;
  const left = useTransform(p, (v) => `${-v * 18}%`);
  const right = useTransform(p, (v) => `${v * 18}%`);
  const cordLen = useTransform(p, (v) => `${60 + v * 46}%`);
  const tasselTop = useTransform(p, (v) => `${58 + v * 46}%`);

  useEffect(() => {
    if (!gesture.done) return;
    playSound("ribbon-pull");
    if (interactive) setHint(t("theme.debut.light"));
  }, [gesture.done, interactive, setHint]);

  useEffect(() => {
    if (!finale) return;
    playTune([523, 659, 784, 1046, 1318], 0.15);
    haptic.success();
    const r = hostRef.current?.getBoundingClientRect();
    if (r) {
      particles("petals", hostRef.current, { x: r.left + r.width / 2, y: r.top + r.height * 0.3 });
      particles("sparks", hostRef.current, { x: r.left + r.width / 2, y: r.top + r.height * 0.45 }, { colors: ["#F6E3A9", "#D9B46A", "#FFF6DA"] });
    }
    if (interactive) setHint(t("theme.parcel.inside"));
  }, [finale, hostRef, interactive, setHint]);

  function light(i: number) {
    if (!gesture.done || !interactive) return;
    if (!lit.has(i)) {
      setLit((s) => new Set(s).add(i));
      playSound("chime");
      haptic.tap();
    }
    const n = treasures[i];
    if (n) setReading({ note: n, i });
  }

  function lightAll() {
    const order = Array.from({ length: COUNT }, (_, i) => i).filter((i) => !lit.has(i));
    if (reduced) return setLit(new Set(Array.from({ length: COUNT }, (_, i) => i)));
    order.forEach((i, k) => window.setTimeout(() => setLit((s) => new Set(s).add(i)), k * 90));
  }

  const velvet = palette.surface;
  return (
    <div className="relative" style={{ width: "min(88cqi, 420px, calc((100cqh - 64px) * 0.82))", aspectRatio: "1 / 1.22" }}>
      {/* The arch */}
      <div className="absolute inset-0 overflow-hidden" style={{ ...(material("metal", { tint: palette.accent, lift: 0.8, radius: 0 }) as object), borderRadius: "50% 50% 6px 6px / 34% 34% 6px 6px", padding: "4%" }}>
        {/* The stage behind the curtain */}
        <div className="relative size-full overflow-hidden" style={{ borderRadius: "50% 50% 3px 3px / 32% 32% 3px 3px", background: `radial-gradient(70% 55% at 50% 42%, #FFF6EA 0%, #F3DCCB 45%, ${shade(velvet, -0.35)} 100%)` }}>
          <div className="absolute inset-0 opacity-60" style={{ backgroundImage: noise(0.8, 0.08) }} />
          {/* Candles */}
          {CANDLES.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={!gesture.done || !interactive}
              onClick={() => light(i)}
              aria-label={`${t("theme.debut.candle", { n: i + 1 })}${treasures[i] ? `, note from ${treasures[i]!.author}` : ""}`}
              className="absolute w-[7%] -translate-x-1/2 -translate-y-full outline-none disabled:cursor-default focus-visible:ring-2 focus-visible:ring-white"
              style={{ left: `${c.x}%`, top: `${c.y + 9}%`, height: "13%" }}
            >
              <Candle lit={lit.has(i)} still={reduced || paused} />
            </button>
          ))}
          {/* The name and the 18 */}
          <div className="absolute inset-x-[10%] top-[36%] text-center" style={{ color: "#4A2A30" }}>
            <motion.p
              className="text-[clamp(2.6rem,15cqi,4.6rem)] leading-none font-semibold [font-variant-numeric:lining-nums]"
              style={{ fontFamily: "var(--jb-display)", color: "transparent", backgroundImage: `linear-gradient(115deg, #A8843E, #F6E3A9 40%, #C9A55C 55%, #FFF3C9 65%, #A8843E)`, WebkitBackgroundClip: "text", backgroundClip: "text" }}
              animate={finale && !reduced ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 1.2 }}
            >
              18
            </motion.p>
            <p className="mt-1 line-clamp-2 text-[clamp(1.2rem,6.4cqi,2rem)] leading-tight italic [overflow-wrap:anywhere]" style={{ fontFamily: "var(--jb-display)" }}>
              {slots.recipient}
            </p>
            <p className="mt-1 text-[clamp(8px,2.4cqi,11px)] font-semibold tracking-[0.3em] uppercase opacity-60">
              {t("theme.debut.treasures")}
              {slots.dateLabel ? ` · ${slots.dateLabel}` : ""}
            </p>
          </div>
          {/* Rose garland */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
            <path d="M2 82 Q50 100 98 82" fill="none" stroke="#6E8B5A" strokeWidth="0.8" />
          </svg>
          {ROSES.map((r, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute w-[6.4%] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${r.x}%`, top: `${r.y}%` }}
              initial={false}
              animate={{ scale: lit.has(i) ? 1 : 0.55, opacity: lit.has(i) ? 1 : 0.55 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 12 }}
              aria-hidden
            >
              <Rose open={lit.has(i)} />
            </motion.span>
          ))}
          {/* Light all 18 */}
          {gesture.done && !finale && interactive ? (
            <button type="button" onClick={lightAll} className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-xs font-semibold shadow-md" style={{ background: "#4A2A30", color: "#FBF3EA" }}>
              {t("theme.debut.lightAll")}
            </button>
          ) : null}
        </div>

        {/* The curtain */}
        {[0, 1].map((side) => (
          <motion.div
            key={side}
            className="pointer-events-none absolute top-[4%] bottom-[4%] w-[50%]"
            style={{
              [side ? "right" : "left"]: "4%",
              x: side ? right : left,
              borderRadius: side ? "0 50% 0 0 / 0 34% 0 0" : "50% 0 0 0 / 34% 0 0 0",
              backgroundColor: velvet,
              backgroundImage: `repeating-linear-gradient(90deg, ${shade(velvet, -0.28)} 0%, ${shade(velvet, 0.12)} 4%, ${shade(velvet, -0.12)} 8.5%), ${noise(1.1, 0.12)}`,
              boxShadow: side ? "inset 12px 0 18px rgba(0,0,0,.35)" : "inset -12px 0 18px rgba(0,0,0,.35)",
              transformOrigin: side ? "100% 0%" : "0% 0%",
            } as never}
            animate={gesture.done ? (reduced ? { opacity: 0 } : { scaleX: 0.16, x: side ? "6%" : "-6%" }) : {}}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          />
        ))}
        {/* Swag and gold fringe across the top */}
        <div className="pointer-events-none absolute inset-x-[4%] top-[4%] h-[9%]" style={{ borderRadius: "50% 50% 0 0 / 100% 100% 0 0", background: `linear-gradient(180deg, ${shade(velvet, -0.2)}, ${velvet})`, borderBottom: `3px dotted ${palette.accent}` }} />
      </div>

      {/* The cord: what you pull */}
      {!gesture.done ? (
        <div {...gesture.bind} className="absolute top-[22%] right-[-2%] z-[5] h-[52%] w-[16%] cursor-grab outline-none focus-visible:ring-4 focus-visible:ring-white/70" style={{ ...(gesture.bind.style as object) }}>
          <motion.div className="absolute top-0 left-1/2 w-[3px] -translate-x-1/2" style={{ height: cordLen, background: `repeating-linear-gradient(180deg, ${palette.accent} 0 4px, ${shade(palette.accent, -0.3)} 4px 7px)` }} />
          <motion.div className="absolute left-1/2 w-[46%] -translate-x-1/2" style={{ top: tasselTop }}>
            <svg viewBox="0 0 30 52" className="block w-full drop-shadow-[2px_4px_3px_rgba(0,0,0,.35)]" aria-hidden>
              <ellipse cx="15" cy="8" rx="7" ry="7" fill={palette.accent} />
              <path d="M8 12 Q15 18 22 12 L25 46 Q15 52 5 46 Z" fill={shade(palette.accent, -0.1)} />
              {[8, 11, 14, 17, 20, 23].map((x) => (
                <path key={x} d={`M${x} 16 L${x - 1 + (x - 15) * 0.15} 48`} stroke={shade(palette.accent, -0.35)} strokeWidth="0.8" />
              ))}
            </svg>
          </motion.div>
        </div>
      ) : null}
      <NoteBubble note={reading?.note ?? null} onClose={() => setReading(null)} accent="#B8707A" ink="#4A2A30" title={reading ? t("theme.debut.candle", { n: reading.i + 1 }) : undefined} />
    </div>
  );
}

function Candle({ lit, still }: { lit: boolean; still: boolean }) {
  return (
    <svg viewBox="0 0 20 60" className="block size-full overflow-visible" aria-hidden>
      {lit ? (
        <g style={still ? undefined : { transformOrigin: "10px 18px", animation: "jb-debut-flame 1.1s ease-in-out infinite alternate" }}>
          <ellipse cx="10" cy="12" rx="9" ry="12" fill="rgba(255,214,140,.35)" />
          <path d="M10 2 C14 9 14 15 10 18 C6 15 6 9 10 2 Z" fill="#FFD27A" />
          <path d="M10 8 C12 12 12 15 10 17 C8 15 8 12 10 8 Z" fill="#FFF6DA" />
        </g>
      ) : null}
      <path d="M10 18 L10 22" stroke="#3A2A20" strokeWidth="0.8" />
      <rect x="6" y="22" width="8" height="34" rx="2" fill="#FBF3EA" stroke="#E2CDB8" strokeWidth="0.6" />
      <rect x="4" y="54" width="12" height="4" rx="1.5" fill="#D9B46A" />
      <style>{"@keyframes jb-debut-flame{from{transform:scale(1,1)}to{transform:scale(.92,1.1)}}"}</style>
    </svg>
  );
}

function Rose({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 30 30" className="block w-full" aria-hidden>
      <path d="M7 20 Q4 26 10 27" fill="none" stroke="#6E8B5A" strokeWidth="1.4" />
      <path d="M15 24 Q9 27 6 22" fill="#7E9A66" />
      <circle cx="15" cy="14" r="9.5" fill={open ? "#C94F6A" : "#9C5A68"} />
      <path d="M15 6 C21 7 23 12 21 16 C19 20 13 20 11 17 C9 14 12 10 15 11" fill="none" stroke={open ? "#8E2A43" : "#6E3A46"} strokeWidth="1.3" />
      <path d="M9 12 C8 17 12 21 17 21" fill="none" stroke={open ? "#8E2A43" : "#6E3A46"} strokeWidth="1" />
    </svg>
  );
}
