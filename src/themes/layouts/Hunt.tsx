/**
 * GIFT HUNT: a rolled treasure map tied with string.
 * Gesture: unroll it (drag to the right, or tap). The map opens out, a dotted
 * trail draws itself from "You are here" to an X, and a little wrapped box pops
 * up on the X, like the boxes they'll unwrap one by one.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import {
  FloorShadow,
  Object3D,
  TEXTURE,
  TEXTURE_SOFT,
  Texture,
  elevation,
} from "@/themes/_shared/light";
import { material } from "@/lib/sound/material";
import { giftColors, live, pressable, useAutoplay, useOpenSequence } from "./kit";

const PARCHMENT = "#EFE0BD";

export function HuntOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const xRef = useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = useState(false);
  const unroll = useMotionValue(0.03); // share of the map showing
  // Rolled up, the scroll sits in the middle; it travels left as the map opens out.
  const shift = useTransform(unroll, [0.03, 1], ["48%", "0%"]);
  const width = useTransform(unroll, (v) => `${v * 100}%`);
  const rollX = useTransform(unroll, (v) => `${v * 100}%`);
  const tie = useTransform(unroll, [0.03, 0.25], [1, 0]);
  const beat = useOpenSequence(p, open, xRef, 2300, "hunt");

  function unrollMap() {
    if (open || !live(p)) return;
    setOpen(true);
    material("tape", { strength: 0.5 });
    material("unroll", { strength: 1.2 });
    h.thud();
    void animate(unroll, 1, p.reduced ? { duration: 0 } : { ...SPRING.heavy, stiffness: 80 });
  }
  useAutoplay(p, [[900, unrollMap]]);

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.45" }}
      >
        <Object3D
          pose={{ x: 20, y: -6, z: -2 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <motion.div className="absolute inset-0" style={{ x: shift }}>
            <motion.div className="absolute inset-y-0 left-0" style={{ width }}>
              <FloorShadow tint="70,50,20" depth={8} radius={4} className="inset-0" />
            </motion.div>
            {/* The map, revealed from the left as it unrolls. */}
            <motion.div
              className="absolute inset-y-0 left-0 cursor-pointer touch-none overflow-hidden rounded-[4px] outline-none"
              style={{ width, background: PARCHMENT, boxShadow: elevation(0.4, "70,50,20") }}
              onPan={(_, info) => {
                if (open || !live(p)) return;
                unroll.set(Math.max(0.03, Math.min(0.7, 0.03 + info.offset.x / 400)));
              }}
              onPanEnd={(_, info) => {
                if (open || !live(p)) return;
                if (info.offset.x > 60) unrollMap();
                else void animate(unroll, 0.03, SPRING.snappy);
              }}
              {...pressable(unrollMap, !open && live(p), "Unroll the map")}
            >
              <div className="absolute inset-y-0 left-0" style={{ width: "min(88cqi, 400px)" }}>
                <Texture material="kraft" opacity={0.45} blend="multiply" />
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(120,80,30,.35))",
                  }}
                  aria-hidden
                />
                {/* Hills, a lake and a forest, drawn in ink. */}
                <svg viewBox="0 0 400 276" className="absolute inset-0 size-full" aria-hidden>
                  <g
                    fill="none"
                    stroke="#7a5a32"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    opacity=".7"
                  >
                    <path d="M40 210l20-26 20 26M70 210l18-22 18 22" />
                    <path d="M300 70l14-20 14 20M322 70l12-16 12 16M310 86l14-18 14 18" />
                    <ellipse cx="250" cy="200" rx="40" ry="18" fill="#9cc3c8" fillOpacity=".35" />
                    <path d="M150 60c10-6 22-6 32 0M160 70c8-4 16-4 24 0" />
                  </g>
                  <motion.path
                    d="M58 236 C 110 200, 120 150, 170 140 S 260 150, 270 110 S 320 70, 336 64"
                    fill="none"
                    stroke={c.accent}
                    strokeWidth="3"
                    strokeDasharray="2 9"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ pathLength: beat >= 1 || (open && p.reduced) ? 1 : 0 }}
                    transition={{
                      duration: p.reduced ? 0 : 1.1,
                      ease: [0.45, 0, 0.3, 1],
                      delay: p.reduced ? 0 : 0.5,
                    }}
                  />
                  <circle cx="58" cy="236" r="6" fill={c.primary} />
                </svg>
                <span
                  className="absolute bottom-[6%] left-[6%] text-[10px] tracking-[0.16em] text-[#5b4223] uppercase"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  You are here
                </span>
                {/* X marks the spot, then a box pops up. */}
                <span
                  ref={xRef}
                  className="absolute top-[16%] right-[11%] grid size-[11%] place-items-center"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="size-full" style={{ color: "#B23A2E" }}>
                    <path
                      d="M5 5l14 14M19 5L5 19"
                      stroke="currentColor"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <motion.span
                    className="absolute -top-[95%] size-[95%] rounded-[3px]"
                    style={{ background: c.primary, boxShadow: elevation(0.4) }}
                    initial={false}
                    animate={
                      beat >= 2 ? { scale: 1, y: 0, opacity: 1 } : { scale: 0.3, y: 10, opacity: 0 }
                    }
                    transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
                  >
                    <span
                      className="absolute inset-y-0 left-1/2 w-[18%] -translate-x-1/2"
                      style={{ background: c.accent }}
                    />
                    <span
                      className="absolute inset-x-0 top-1/2 h-[18%] -translate-y-1/2"
                      style={{ background: c.accent }}
                    />
                  </motion.span>
                </span>
                <div className="absolute top-[7%] left-[7%] max-w-[52%]">
                  <span
                    className="block text-[10px] tracking-[0.2em] text-[#5b4223] uppercase"
                    style={{ fontFamily: "var(--jb-text)" }}
                  >
                    {p.badge}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(1.1rem,5.4cqi,1.8rem)] leading-[1.05] text-[#3b2a16]"
                    style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                  >
                    {p.greeting}
                  </span>
                </div>
              </div>
            </motion.div>
            {/* The roll, travelling to the right edge as the map opens. */}
            <motion.span
              className="absolute inset-y-[-3%] w-[7%] rounded-full"
              style={{
                left: rollX,
                x: "-50%",
                background: `linear-gradient(90deg, #c9b07e, ${PARCHMENT} 40%, #f7ecd2 55%, #b99c66)`,
                boxShadow: elevation(0.45, "70,50,20"),
              }}
              aria-hidden
            >
              <motion.span
                className="absolute inset-x-[-25%] top-1/2 h-[3%]"
                style={{ background: "#7a2f22", opacity: tie }}
              />
            </motion.span>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={unrollMap} color="#ffffff" ink="#ffffff" hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const huntBackground = (): React.CSSProperties => ({
  backgroundColor: "#4E6B5A",
  backgroundImage: [
    "radial-gradient(55% 45% at 50% 46%, #7A9884, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 50%, #22322988)",
    TEXTURE_SOFT.paper,
    TEXTURE.felt,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px, 200px 200px",
});
