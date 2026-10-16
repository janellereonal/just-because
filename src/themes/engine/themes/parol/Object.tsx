/**
 * Parol Christmas. A capiz parol hangs in the night: a five-point star of
 * shell panels on a bamboo frame, a rosette in the middle with their initials,
 * and two long streamers. Each panel holds a friend's note; tap one and it
 * lights up. When the whole star is lit it glows and a soft bell rings.
 *
 * Simbang Gabi mode: nine panels, one per night from 16 to 24 December, each
 * opening at the viewer's local midnight. The tenth panel and the rosette
 * light on Christmas Eve with the last one.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { particles } from "@/themes/engine/particles";
import { playSound, haptic } from "@/themes/engine/sound";
import { NoteBubble } from "@/themes/engine/ui/NoteBubble";
import { Greeting } from "@/themes/_shared/opening";
import { notesByNight, simbangNight, SIMBANG_NIGHTS } from "@/themes/engine/simbang";
import { t } from "@/i18n";
import type { EngineNote, EngineObjectProps } from "@/themes/engine/define";

const C = { x: 100, y: 96 };
const R_OUT = 82;
const R_IN = 35;
const PANELS = 10;
const LIT = ["#FFF4D6", "#FFD9A0", "#FFC9C2", "#FFE89A", "#DDF0FF"];

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
};
const TIPS = Array.from({ length: 5 }, (_, k) => pt(-90 + 72 * k, R_OUT));
const INNER = Array.from({ length: 5 }, (_, k) => pt(-90 + 72 * k + 36, R_IN));
/** Ten triangles around the centre, clockwise from the top point's left half. */
const TRIS = Array.from({ length: PANELS }, (_, i) => {
  const k = Math.floor(i / 2);
  const a = i % 2 === 0 ? INNER[(k + 4) % 5]! : TIPS[k]!;
  const b = i % 2 === 0 ? TIPS[k]! : INNER[k]!;
  return `M${C.x} ${C.y} L${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} Z`;
});
const OUTLINE = TIPS.flatMap((tip, k) => [tip, INNER[k]!]).map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";

export default function Parol({ slots, palette, gesture, reduced, paused, hostRef, notes, setHint, greeting, interactive, options }: EngineObjectProps) {
  const simbang = !!options.simbang;
  const now = useMemo(() => (options.now ? new Date(options.now) : new Date()), [options.now]);
  const night = simbang ? simbangNight(now, options.year ?? now.getFullYear()) : SIMBANG_NIGHTS;
  const byNight = useMemo(() => notesByNight(notes.filter((n) => n.text || n.media)), [notes]);
  const plain = useMemo(() => notes.filter((n) => n.text || n.media).slice(0, PANELS), [notes]);
  /** Which panels can be lit right now. */
  const open = (i: number) => (simbang ? (i < SIMBANG_NIGHTS ? i < night : night >= SIMBANG_NIGHTS) : true);
  const lightable = Array.from({ length: PANELS }, (_, i) => i).filter(open);
  const [lit, setLit] = useState<Set<number>>(() => new Set());
  const [reading, setReading] = useState<{ note: EngineNote; title: string } | null>(null);
  const all = lightable.length > 0 && lightable.every((i) => lit.has(i));
  const full = all && lightable.length === PANELS;

  const noteFor = (i: number): { note: EngineNote; title: string } | null => {
    if (simbang) {
      const group = i < SIMBANG_NIGHTS ? byNight[i] ?? [] : [];
      const n = group[0];
      return n ? { note: n, title: `${t("theme.parol.night", { n: i + 1 })}${group.length > 1 ? ` · 1 / ${group.length}` : ""}` } : null;
    }
    const n = plain[i];
    return n ? { note: n, title: `${i + 1} / ${PANELS}` } : null;
  };

  function light(i: number) {
    if (!open(i) || !interactive) return;
    const next = new Set(lit).add(i);
    if (!lit.has(i)) {
      playSound("glass-wipe");
      haptic.tap();
      setLit(next);
    }
    const n = noteFor(i);
    if (n) setReading(n);
    const share = lightable.filter((x) => next.has(x)).length / Math.max(1, lightable.length);
    if (share >= 1) gesture.complete();
    else gesture.setProgress(share * 0.99);
  }

  // The plain button (or the last panel) lights everything that can be lit.
  useEffect(() => {
    if (!gesture.done) return;
    setLit(new Set(lightable));
    if (lightable.length === PANELS) {
      playSound("bell");
      particles("sparks", hostRef.current, center(hostRef.current), { colors: ["#FFF4D6", "#E8B04B", "#FFD9A0"] });
    }
    if (interactive) setHint(simbang ? simbangLine(night) : t("theme.parcel.inside"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture.done]);

  // Before 16 December nothing can be lit yet, so say when it starts. (After the stage sets its own hint.)
  useEffect(() => {
    if (!simbang || !interactive || gesture.done || night > 0) return;
    const id = window.setTimeout(() => setHint(t("theme.parol.before")), 0);
    return () => window.clearTimeout(id);
  }, [simbang, night, interactive, gesture.done, setHint]);

  const glow = full ? 1 : lit.size / PANELS;
  return (
    <div className="relative" style={{ width: "min(80cqi, 380px, calc((100cqh - 64px) * 0.71))", aspectRatio: "200 / 280" }}>
      <svg viewBox="0 0 200 280" className="absolute inset-0 size-full overflow-visible" role="group" aria-label={t("gesture.pop.label")}>
        <defs>
          <radialGradient id="parol-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFE4A8" stopOpacity="0.9" />
            <stop offset="0.45" stopColor="#E8B04B" stopOpacity="0.35" />
            <stop offset="1" stopColor="#E8B04B" stopOpacity="0" />
          </radialGradient>
          {LIT.map((c, i) => (
            <radialGradient key={c} id={`parol-lit-${i}`} cx="50%" cy="50%" r="75%" fx="40%" fy="40%">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.5" stopColor={c} />
              <stop offset="1" stopColor={c} stopOpacity="0.85" />
            </radialGradient>
          ))}
          {/* Capiz: overlapping shell squares, the texture of the panels */}
          <pattern id="parol-capiz" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
            <rect x="0.6" y="0.6" width="7.8" height="7.8" rx="2.4" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="0.6" />
            <path d="M1.5 6 Q4.5 3 7.5 5.5" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="0.5" />
          </pattern>
        </defs>
        {/* Hanging string */}
        <path d={`M100 -40 L100 ${TIPS[0]!.y}`} stroke="#8A7A5A" strokeWidth="1" />
        {/* Glow behind */}
        <motion.circle cx={C.x} cy={C.y} r="150" fill="url(#parol-glow)" animate={{ opacity: glow }} transition={{ duration: reduced ? 0 : 0.9 }} />
        {/* Streamers: flat capiz tails with a fringe, swaying */}
        {[TIPS[2]!, TIPS[3]!].map((tip, si) => {
          const dir = si ? 1 : -1;
          const end = { x: tip.x + dir * 4, y: tip.y + 64 };
          const path = `M${tip.x} ${tip.y} C${tip.x + dir * 12} ${tip.y + 22} ${tip.x - dir * 8} ${tip.y + 42} ${end.x} ${end.y}`;
          const tail = glow > 0.5 ? "#FFD9A0" : "#3A4470";
          return (
            <motion.g
              key={si}
              style={{ transformOrigin: `${tip.x}px ${tip.y}px` }}
              animate={reduced || paused ? {} : { rotate: si ? [2, -2, 2] : [-2, 2, -2] }}
              transition={{ duration: 5 + si, repeat: Infinity, ease: "easeInOut" }}
            >
              <path d={path} fill="none" stroke={tail} strokeWidth="5" strokeLinecap="butt" />
              <path d={path} fill="none" stroke="url(#parol-capiz)" strokeWidth="5" />
              {[-3, -1.5, 0, 1.5, 3].map((dx) => (
                <path key={dx} d={`M${end.x + dx} ${end.y} l${dx * 0.5} 9`} stroke={si ? palette.accent2 : palette.accent} strokeWidth="1.1" strokeLinecap="round" />
              ))}
            </motion.g>
          );
        })}
        {/* The panels */}
        {TRIS.map((d, i) => {
          const on = lit.has(i) || (full && gesture.done);
          const can = open(i) && interactive && !paused;
          return (
            <g key={i}>
              <path
                d={d}
                role="button"
                tabIndex={can ? 0 : -1}
                aria-label={`${simbang ? t("theme.parol.night", { n: Math.min(i + 1, SIMBANG_NIGHTS) }) : `${i + 1} / ${PANELS}`}${noteFor(i) ? `, note from ${noteFor(i)!.note.author}` : ""}${open(i) ? "" : " (not yet)"}`}
                onClick={() => light(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    light(i);
                  }
                }}
                fill={on ? `url(#parol-lit-${i % LIT.length})` : open(i) ? "#2E3864" : "#1C2342"}
                className="cursor-pointer outline-none transition-[fill] duration-500 focus-visible:[stroke:#fff] focus-visible:[stroke-width:2]"
                style={{ cursor: can ? "pointer" : "default", filter: on ? "drop-shadow(0 0 6px rgba(255,220,150,.7))" : undefined }}
              />
              <path d={d} fill="url(#parol-capiz)" pointerEvents="none" />
              {/* Locked nights show a small moon */}
              {!open(i) && simbang && i < SIMBANG_NIGHTS ? <text {...centroid(i)} fontSize="7" textAnchor="middle" fill="#6E79A8" pointerEvents="none">☾</text> : null}
            </g>
          );
        })}
        {/* Bamboo frame */}
        <path d={OUTLINE} fill="none" stroke="#C9A55C" strokeWidth="3" strokeLinejoin="round" />
        {TIPS.map((p, k) => (
          <path key={k} d={`M${C.x} ${C.y} L${p.x} ${p.y} M${C.x} ${C.y} L${INNER[k]!.x} ${INNER[k]!.y}`} stroke="#B8944C" strokeWidth="1.1" opacity="0.8" pointerEvents="none" />
        ))}
        {/* Rosette with their initials */}
        <circle cx={C.x} cy={C.y} r="22" fill={full ? "url(#parol-lit-0)" : "#26305A"} stroke="#C9A55C" strokeWidth="2.4" pointerEvents="none" />
        {Array.from({ length: 8 }, (_, k) => {
          const p = pt(k * 45, 15);
          return <circle key={k} cx={p.x} cy={p.y} r="5.5" fill="none" stroke={full ? "#E8B04B" : "#46518A"} strokeWidth="1" pointerEvents="none" />;
        })}
        <text x={C.x} y={C.y + 5} textAnchor="middle" fontSize={slots.monogram.length > 2 ? 11 : 15} fill={full ? "#8A5A1A" : "#C9D2F2"} style={{ fontFamily: "var(--jb-display)" }} pointerEvents="none">
          {slots.monogram || "★"}
        </text>
      </svg>

      {/* Under the star: the greeting, and Simbang Gabi's night count */}
      <div className="absolute inset-x-[-8%] bottom-0 text-center" style={{ color: palette.ink }}>
        {simbang ? (
          <p className="mb-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase opacity-75">{night >= SIMBANG_NIGHTS ? t("theme.parol.allLit") : night === 0 ? t("theme.parol.before") : t("theme.parol.night", { n: night })}</p>
        ) : null}
        {all || gesture.done ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : 0.5 }}>
            <Greeting text={greeting} className="text-[clamp(1.25rem,6.2cqi,2rem)]" />
          </motion.div>
        ) : null}
      </div>
      <NoteBubble note={reading?.note ?? null} onClose={() => setReading(null)} accent={palette.accent2} title={reading?.title} />
    </div>
  );
}

function centroid(i: number) {
  const k = Math.floor(i / 2);
  const a = i % 2 === 0 ? INNER[(k + 4) % 5]! : TIPS[k]!;
  const b = i % 2 === 0 ? TIPS[k]! : INNER[k]!;
  return { x: (C.x + a.x + b.x) / 3, y: (C.y + a.y + b.y) / 3 + 2 };
}

function center(el: HTMLElement | null) {
  const r = el?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.4 } : { x: 0, y: 0 };
}

function simbangLine(night: number) {
  if (night >= SIMBANG_NIGHTS) return t("theme.parol.allLit");
  if (night === 0) return t("theme.parol.before");
  return t("theme.parol.next");
}
