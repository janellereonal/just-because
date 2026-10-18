/**
 * CONSTELLATION: a night sky with a handful of brighter stars.
 * Gesture: tap the glowing star, then the next, to connect them. When the last
 * line closes, the stars form a heart, it glows and their name rises under it.
 * The button (and previews) connect them all in one go.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { seed } from "@/components/formats/PieceSheet";
import { starFound } from "@/lib/nightsky/sound";
import { giftColors, live, useAutoplay, useOpenSequence } from "./kit";

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

export function ConstellationOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const skyRef = useRef<HTMLDivElement | null>(null);
  const [lit, setLit] = useState(1); // stars connected so far (the first one glows from the start)
  const done = lit > STARS.length;
  const beat = useOpenSequence(p, done, skyRef, 2000, "stars");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  function connect(index: number) {
    if (done || !live(p) || index !== lit % STARS.length) return;
    const next = lit + 1;
    setLit(next);
    starFound(index, 0.5);
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
            starFound(i - 1, 0.5);
          },
          p.reduced ? 0 : (i - lit) * 130,
        ),
      );
    }
  }
  useAutoplay(p, [[900, connectAll]]);

  const lines = STARS.map((s, i) => [s, STARS[(i + 1) % STARS.length]!] as const);
  const background = Array.from({ length: 70 }, (_, i) => ({
    x: seed(`x${i}`) * 100,
    y: seed(`y${i}`) * 100,
    r: 0.2 + seed(`r${i}`) * 0.5,
    d: seed(`d${i}`) * 3,
  }));

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={6}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1" }}
      >
        <div ref={skyRef} className="absolute inset-0">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <filter id="cst-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {background.map((s, i) => (
              <motion.circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#fff"
                animate={p.reduced ? { opacity: 0.6 } : { opacity: [0.25, 0.8, 0.25] }}
                transition={{ duration: 2.5 + s.d, repeat: Infinity, delay: s.d }}
              />
            ))}
            {/* Lines between connected stars. */}
            {lines.map(([a, b], i) => (
              <motion.line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={c.accent}
                strokeWidth={0.7}
                strokeLinecap="round"
                filter="url(#cst-glow)"
                initial={false}
                animate={{ pathLength: lit > i + 1 ? 1 : 0, opacity: lit > i + 1 ? 1 : 0 }}
                transition={{ duration: p.reduced ? 0 : 0.35 }}
              />
            ))}
            {/* The heart fills with a soft glow once it's closed. */}
            <motion.polygon
              points={STARS.map((s) => s.join(",")).join(" ")}
              fill={c.accent}
              initial={false}
              animate={{ opacity: beat >= 1 ? 0.22 : 0 }}
              transition={{ duration: p.reduced ? 0 : 0.8 }}
            />
          </svg>
          {/* The stars you tap. */}
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
                className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {isNext && !p.reduced ? (
                  <motion.span
                    className="absolute size-7 rounded-full"
                    style={{ border: `1.5px solid ${c.accent}` }}
                    animate={{ scale: [0.6, 1.4], opacity: [0.9, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
                <motion.span
                  className="block rounded-full"
                  style={{
                    background: on || isNext ? "#fff" : "#cfd6ff",
                    boxShadow: on
                      ? `0 0 12px 3px ${c.accent}, 0 0 3px #fff`
                      : "0 0 6px rgba(255,255,255,.5)",
                  }}
                  animate={{ width: on ? 9 : 6, height: on ? 9 : 6 }}
                  transition={SPRING.snappy}
                  aria-hidden
                />
              </button>
            );
          })}
          {/* Their name under the heart. */}
          <motion.div
            className="absolute inset-x-0 top-[90%] text-center"
            initial={false}
            animate={{ opacity: beat >= 1 ? 1 : 0, y: beat >= 1 ? 0 : 10 }}
            transition={{ duration: p.reduced ? 0 : 0.8 }}
          >
            <span
              className="block text-[clamp(1.3rem,6.4cqi,2.1rem)] leading-tight text-white"
              style={{
                fontFamily: "var(--jb-display)",
                fontWeight: 700,
                textShadow: `0 0 18px ${c.accent}`,
              }}
            >
              {p.greeting}
            </span>
          </motion.div>
        </div>
      </Layer>

      <div className="mt-[min(14cqi,60px)] h-11">
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

export const constellationBackground = (): React.CSSProperties => ({
  backgroundColor: "#0E1230",
  backgroundImage: [
    "radial-gradient(60% 50% at 50% 40%, #2A2F6B, transparent 75%)",
    "radial-gradient(40% 30% at 80% 85%, #4B2A6B66, transparent 70%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 55%, #05071a)",
  ].join(","),
});
