/**
 * CONSTELLATION: a dreamy pastel night, a clay moon and soft clouds, and a
 * handful of brighter butter-yellow stars. Gesture: tap the glowing star, then
 * the next, to connect them. When the last line closes, the stars form a
 * heart, it fills with a pink glow and their name rises under it. The button
 * (and previews) connect them all in one go.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { melody } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { live, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy, Clay, FONTS, display, pastelStage, useStyleFonts } from "./cute";

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

const C = { star: "#FFE89A", glow: "#FFB8D4", line: "#FFD6E6", ink: "#FFF3FA", tint: "40,30,90" };

/** A soft, rounded five-point star (viewBox 0 0 24 24). */
const STAR_PATH =
  "M12 2.6c.5 0 .9.3 1.1.7l2.2 4.6 5 .7c1 .1 1.4 1.4.7 2.1l-3.6 3.5.9 5c.2 1-.9 1.7-1.8 1.2L12 18l-4.5 2.4c-.9.5-2-.2-1.8-1.2l.9-5-3.6-3.5c-.7-.7-.3-2 .7-2.1l5-.7 2.2-4.6c.2-.4.6-.7 1.1-.7z";

export function ConstellationOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const skyRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [lit, setLit] = useState(1); // stars connected so far (the first one glows from the start)
  const done = lit > STARS.length;
  const beat = useOpenSequence(p, done, skyRef, {
    hold: 2100,
    cast,
    colors: [C.star, C.glow, "#D8CCFF", "#FFFFFF"],
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
  const background = Array.from({ length: 70 }, (_, i) => ({
    x: seed(`x${i}`) * 100,
    y: seed(`y${i}`) * 100,
    r: 0.2 + seed(`r${i}`) * 0.5,
    d: seed(`d${i}`) * 3,
  }));

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      {/* The moon and the clouds, a little behind the sky. */}
      <Layer
        depth={-10}
        className="pointer-events-none absolute inset-x-0 -top-[50%] -bottom-[50%]"
      >
        <Clay
          id="moon"
          float
          rotate={-14}
          reduced={p.reduced}
          shadow={C.tint}
          className="top-[10%] right-[8%] w-[19%]"
        />
        <Clay
          id="cloud"
          float
          delay={0.9}
          reduced={p.reduced}
          shadow={C.tint}
          className="bottom-[10%] left-[-6%] w-[32%]"
        />
        <Clay
          id="cloud"
          float
          delay={1.7}
          reduced={p.reduced}
          shadow={C.tint}
          className="right-[-8%] bottom-[16%] w-[26%]"
        />
      </Layer>
      <Layer
        depth={6}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1" }}
      >
        <Buddy p={p} ref={cast} size={74} className="-bottom-[16%] -left-[2%]" />
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
              <radialGradient id="cst-fill" cx=".5" cy=".55" r=".6">
                <stop offset="0" stopColor="#FFD6E6" />
                <stop offset="1" stopColor="#FF9EC4" />
              </radialGradient>
            </defs>
            {background.map((s, i) => (
              <motion.circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={s.r}
                fill="#fff"
                animate={p.reduced ? { opacity: 0.6 } : { opacity: [0.25, 0.85, 0.25] }}
                transition={{ duration: 2.5 + s.d, repeat: Infinity, delay: s.d }}
              />
            ))}
            {/* The heart fills with a soft glow once it's closed. */}
            <motion.polygon
              points={STARS.map((s) => s.join(",")).join(" ")}
              fill="url(#cst-fill)"
              initial={false}
              animate={{ opacity: beat >= 1 ? 0.42 : 0 }}
              transition={{ duration: p.reduced ? 0 : 0.8 }}
            />
            {/* Lines between connected stars. */}
            {lines.map(([a, b], i) => (
              <motion.line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={C.line}
                strokeWidth={0.9}
                strokeLinecap="round"
                filter="url(#cst-glow)"
                initial={false}
                animate={{ pathLength: lit > i + 1 ? 1 : 0, opacity: lit > i + 1 ? 1 : 0 }}
                transition={{ duration: p.reduced ? 0 : 0.35 }}
              />
            ))}
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
                    className="absolute size-8 rounded-full"
                    style={{ border: `2px solid ${C.glow}` }}
                    animate={{ scale: [0.6, 1.4], opacity: [0.9, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity }}
                    aria-hidden
                  />
                ) : null}
                <motion.svg
                  viewBox="0 0 24 24"
                  className="block"
                  style={{
                    filter: on
                      ? `drop-shadow(0 0 6px ${C.glow}) drop-shadow(0 0 2px #fff)`
                      : "drop-shadow(0 0 4px rgba(255,255,255,.5))",
                  }}
                  animate={{
                    width: on ? 22 : isNext ? 18 : 13,
                    height: on ? 22 : isNext ? 18 : 13,
                    rotate: on ? 0 : -12,
                  }}
                  transition={SPRING.wobbly}
                  aria-hidden
                >
                  <path d={STAR_PATH} fill={on || isNext ? C.star : "#E6E0FF"} />
                  <path
                    d={STAR_PATH}
                    fill="#fff"
                    opacity=".35"
                    transform="translate(3 2.4) scale(.6)"
                  />
                </motion.svg>
              </button>
            );
          })}
          {/* Their name under the heart. */}
          <motion.div
            className="absolute inset-x-0 top-[90%] text-center"
            initial={false}
            animate={{
              opacity: beat >= 1 ? 1 : 0,
              y: beat >= 1 ? 0 : 10,
              scale: beat >= 1 ? 1 : 0.9,
            }}
            transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
          >
            <span
              className="block text-[clamp(1.4rem,7cqi,2.3rem)] leading-tight"
              style={{
                ...display(700),
                color: C.ink,
                textShadow: `0 0 18px ${C.glow}, 0 2px 0 rgba(40,30,90,.3)`,
              }}
            >
              {p.greeting}
            </span>
          </motion.div>
        </div>
      </Layer>

      <div className="mt-[min(16cqi,68px)] h-11">
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

export const constellationBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#2F2D6B",
    bottom: "#A27CC4",
    glow: "#7E72D255",
    blobs: [
      ["#FFB8D488", 50, 104, 90],
      ["#8FB4FF55", 14, 20, 60],
    ],
  });
