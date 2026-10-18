/**
 * CONSTELLATION: the same night the stars page shows: a deep sky with a hint
 * of the gift's color, the Milky Way, a mountain ridge, and a handful of
 * bright stars. Gesture: tap the glowing star, then the next, to connect them
 * with the same warm golden lines. When the last line closes the stars make a
 * heart and the sky takes over. The button (and previews) connect them all.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { FallbackButton, Layer, useHaptics } from "@/themes/_shared/stage";
import { melody } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { live, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

/** A heart, drawn star to star (viewBox 0 0 100 100). */
const STARS: [number, number][] = [
  [50, 34],
  [66, 22],
  [82, 30],
  [84, 48],
  [68, 66],
  [50, 82],
  [32, 66],
  [16, 48],
  [18, 30],
  [34, 22],
];
const LINE = "rgba(255,234,188,.92)";

export function ConstellationOpening(p: OpeningProps) {
  const h = useHaptics();
  const accent = p.palette.accent;
  const skyRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [lit, setLit] = useState(1); // stars connected so far (the first one glows from the start)
  const done = lit > STARS.length;
  const beat = useOpenSequence(p, done, skyRef, {
    hold: 2100,
    cast,
    colors: ["#FFE39A", "#FFFFFF", accent],
  });
  useHint(p, "Tap the glowing star, then the next one", done);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  function connect(index: number) {
    if (done || !live(p) || index !== lit % STARS.length) return;
    const next = lit + 1;
    setLit(next);
    melody([523 + index * 40], 0.12, "sine", 0.04);
    if (next > STARS.length) h.success();
    else h.tick();
  }

  function connectAll() {
    if (done || !live(p)) return;
    for (let i = lit; i <= STARS.length; i++) {
      timers.current.push(
        window.setTimeout(
          () => {
            setLit(i + 1);
            melody([523 + i * 40], 0.1, "sine", 0.035);
          },
          p.reduced ? 0 : (i - lit) * 130,
        ),
      );
    }
  }
  useAutoplay(p, [[900, connectAll]]);

  const lines = STARS.map((s, i) => [s, STARS[(i + 1) % STARS.length]!] as const);
  const dust = Array.from({ length: 90 }, (_, i) => ({
    x: seed(`x${i}`) * 100,
    y: seed(`y${i}`) * 100,
    r: 0.15 + seed(`r${i}`) * 0.45,
    d: seed(`d${i}`) * 3,
  }));

  return (
    <div
      className="relative flex w-full flex-col items-center text-center"
      style={{ color: "#F4F0FF", fontFamily: "var(--jb-text)" }}
    >
      <p className="cst-kicker">Look up, {p.recipient}</p>
      <p
        className="cst-title max-w-[90cqi]"
        style={{ fontFamily: "var(--jb-display)", fontSize: "clamp(1.7rem, 8cqi, 2.8rem)" }}
      >
        {p.greeting}
      </p>
      <Layer
        depth={6}
        className="relative mt-[min(4cqi,18px)]"
        style={{ width: "min(86cqi, 400px)", aspectRatio: "1" }}
      >
        <Buddy p={p} ref={cast} size={70} className="-bottom-[14%] -left-[4%]" />
        <div ref={skyRef} className="absolute inset-0">
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 size-full overflow-visible"
            aria-hidden
          >
            <defs>
              <filter id="cst-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {dust.map((s, i) => (
              <motion.circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#fff"
                animate={p.reduced ? { opacity: 0.6 } : { opacity: [0.2, 0.9, 0.2] }}
                transition={{ duration: 2.5 + s.d, repeat: Infinity, delay: s.d }}
              />
            ))}
            {/* The heart glows softly once it's closed. */}
            <motion.polygon
              points={STARS.map((s) => s.join(",")).join(" ")}
              style={{ fill: accent }}
              initial={false}
              animate={{ opacity: beat >= 1 ? 0.16 : 0 }}
              transition={{ duration: p.reduced ? 0 : 0.8 }}
            />
            {lines.map(([a, b], i) => (
              <motion.line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={LINE}
                strokeWidth={0.55}
                strokeLinecap="round"
                filter="url(#cst-glow)"
                initial={false}
                animate={{ pathLength: lit > i + 1 ? 1 : 0, opacity: lit > i + 1 ? 1 : 0 }}
                transition={{ duration: p.reduced ? 0 : 0.35 }}
              />
            ))}
          </svg>
          {/* The stars you tap, drawn like the stars page's. */}
          {STARS.map(([x, y], i) => {
            const isNext = !done && i === lit % STARS.length;
            const on = lit > i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => connect(i)}
                disabled={!live(p) || done || !isNext}
                aria-label={
                  isNext ? `Star ${i + 1} of ${STARS.length}: tap to connect it` : `Star ${i + 1}`
                }
                className={`cst-star ${on ? "is-lit" : ""}`}
                style={
                  { left: `${x}%`, top: `${y}%`, "--cst-accent": accent } as React.CSSProperties
                }
              >
                {isNext && !p.reduced ? (
                  <motion.span
                    className="absolute size-8 rounded-full"
                    style={{ border: "1.5px solid rgba(255,236,190,.8)" }}
                    animate={{ scale: [0.6, 1.5], opacity: [0.9, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
                <span className="cst-glow" aria-hidden />
                <span className="cst-core" aria-hidden>
                  ✦
                </span>
              </button>
            );
          })}
        </div>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton
          onClick={connectAll}
          color="#ffffff"
          ink="#ffffff"
          hidden={done || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The stars page's night: a hint of the gift's main color, the Milky Way, and a ridge on the horizon. */
export const constellationBackground = (palette: Palette): React.CSSProperties => {
  const ridge = `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60' preserveAspectRatio='none'><path d='M0 60V38l22-6 18 8 26-16 20 10 30-22 24 14 18-6 28 18 22-12 26 6 30-20 24 16 20-8 26 12 22-10 24 8V60z' fill='#05060f'/></svg>",
  )}") bottom / 100% 14% no-repeat`;
  return {
    background: [
      ridge,
      // The Milky Way: a soft band of light across the sky.
      "linear-gradient(118deg, transparent 30%, rgba(210,200,255,.07) 42%, rgba(255,240,220,.11) 50%, rgba(210,200,255,.07) 58%, transparent 70%)",
      `radial-gradient(120% 80% at 50% 10%, color-mix(in oklab, ${palette.primary} 22%, #0a0b1e), #03040b 75%)`,
    ].join(","),
  };
};
