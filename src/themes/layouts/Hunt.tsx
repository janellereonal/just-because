/**
 * GIFT HUNT: a rolled pastel treasure map tied with a pink string, on a calm
 * aqua sea with clouds drifting over. Gesture: unroll it (drag to the right,
 * or tap). The map opens out, a dotted trail draws itself from "You are here"
 * to an X, and a clay gift box pops up on the X, like the boxes they'll unwrap
 * one by one.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Texture } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import {
  Buddy,
  Clay,
  FONTS,
  Sparkles,
  display,
  dotLayer,
  pastelStage,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const C = {
  paper: "#FFF7E6",
  edge: "#F3E2C2",
  ink: "#2F5560",
  pink: "#F27BA3",
  pinkInk: "#C2477A",
  land: "#C6EBD3",
  landDeep: "#9FD8B6",
  water: "#C7E8F7",
  lilac: "#D8CCFF",
  butter: "#FFE38A",
  tint: "50,120,130",
};

export function HuntOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const xRef = useRef<HTMLSpanElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const unroll = useMotionValue(0.03); // share of the map showing
  // Rolled up, the scroll sits in the middle; it travels left as the map opens out.
  const shift = useTransform(unroll, [0.03, 1], ["48%", "0%"]);
  const width = useTransform(unroll, (v) => `${v * 100}%`);
  const rollX = useTransform(unroll, (v) => `${v * 100}%`);
  const tie = useTransform(unroll, [0.03, 0.25], [1, 0]);
  const beat = useOpenSequence(p, open, xRef, {
    hold: 2400,
    cast,
    colors: [C.pink, C.butter, C.land, C.lilac, "#FFFFFF"],
  });
  useHint(p, "Unroll the map to start the hunt", open);

  function unrollMap() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("paper");
    h.thud();
    void animate(unroll, 1, p.reduced ? { duration: 0 } : { ...SPRING.heavy, stiffness: 80 });
  }
  useAutoplay(p, [[900, unrollMap]]);

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      {/* Clouds drifting over the sea, the sun up high. */}
      <Layer
        depth={-10}
        className="pointer-events-none absolute inset-x-0 -top-[55%] -bottom-[45%]"
      >
        <Clay
          id="sun"
          float
          reduced={p.reduced}
          shadow={C.tint}
          className="top-[8%] left-[8%] w-[18%]"
        />
        <Clay
          id="cloud"
          float
          delay={0.8}
          reduced={p.reduced}
          shadow={C.tint}
          className="top-[12%] right-[-6%] w-[30%]"
        />
        <Clay
          id="cloud"
          float
          delay={1.6}
          reduced={p.reduced}
          shadow={C.tint}
          className="bottom-[8%] left-[-8%] w-[28%]"
        />
      </Layer>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.45" }}
      >
        <Buddy p={p} ref={cast} size={78} className="-bottom-[22%] left-[2%]" />
        <Object3D
          pose={{ x: 20, y: -6, z: -2 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <motion.div className="absolute inset-0" style={{ x: shift }}>
            <motion.div className="absolute inset-y-0 left-0" style={{ width }}>
              <FloorShadow tint={C.tint} depth={8} radius={12} className="inset-0" />
            </motion.div>
            {/* The map, revealed from the left as it unrolls. */}
            <motion.div
              className="absolute inset-y-0 left-0 cursor-pointer touch-none overflow-hidden rounded-[12px] outline-none"
              style={{ width, background: C.paper, boxShadow: soft(C.tint, 0.8) }}
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
                <Texture material="paper" opacity={0.4} />
                <span
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(120% 90% at 50% 50%, transparent 60%, ${C.edge})`,
                  }}
                  aria-hidden
                />
                {/* Islands, a pond, hills and little trees. */}
                <svg viewBox="0 0 400 276" className="absolute inset-0 size-full" aria-hidden>
                  <path
                    d="M20 250c10-40 50-60 90-52s60-10 90 0 40 40 20 62-170 20-200-10z"
                    fill={C.land}
                  />
                  <path
                    d="M250 40c30-18 90-16 120 6s20 70-10 84-70 6-100-10-36-62-10-80z"
                    fill={C.land}
                  />
                  <ellipse cx="236" cy="200" rx="44" ry="20" fill={C.water} />
                  <ellipse cx="226" cy="194" rx="14" ry="4" fill="#FFFFFF" opacity=".6" />
                  <path d="M290 98c10-26 18-34 26-34s16 8 26 34z" fill={C.lilac} />
                  <path d="M318 98c8-20 14-26 20-26s12 6 20 26z" fill="#C7B9FA" />
                  {[
                    [60, 212],
                    [84, 222],
                    [130, 214],
                    [286, 62],
                    [356, 70],
                  ].map(([x, y], i) => (
                    <g key={i}>
                      <rect x={x! - 1.5} y={y! + 4} width="3" height="8" rx="1.5" fill="#C9A27A" />
                      <circle cx={x} cy={y} r="9" fill={C.landDeep} />
                      <circle cx={x! - 3} cy={y! - 3} r="3" fill="#FFFFFF" opacity=".45" />
                    </g>
                  ))}
                  {/* A compass rose. */}
                  <g transform="translate(352 232)">
                    <circle r="20" fill="#FFFFFF" opacity=".7" />
                    <path d="M0-17l5 12-5 5-5-5z" fill={C.pink} />
                    <path d="M0 17l5-12-5-5-5 5z" fill={C.butter} />
                    <path d="M-17 0l12-5 5 5-5 5zM17 0l-12-5-5 5 5 5z" fill={C.lilac} />
                  </g>
                  <motion.path
                    d="M58 236 C 110 200, 120 150, 170 140 S 260 150, 270 110 S 320 70, 336 64"
                    fill="none"
                    stroke={C.pink}
                    strokeWidth="4"
                    strokeDasharray="1 11"
                    strokeLinecap="round"
                    initial={false}
                    animate={{ pathLength: beat >= 1 || (open && p.reduced) ? 1 : 0 }}
                    transition={{
                      duration: p.reduced ? 0 : 1.1,
                      ease: [0.45, 0, 0.3, 1],
                      delay: p.reduced ? 0 : 0.5,
                    }}
                  />
                  <circle cx="58" cy="236" r="8" fill={C.pink} stroke="#FFFFFF" strokeWidth="3" />
                </svg>
                <span
                  className="absolute bottom-[3%] left-[4%] rounded-full bg-white/85 px-2 py-0.5 text-[clamp(9px,2.6cqi,11px)] tracking-[0.12em] uppercase"
                  style={{ ...text(600), color: C.pinkInk }}
                >
                  You are here
                </span>
                {/* X marks the spot, then a gift pops up. */}
                <span
                  ref={xRef}
                  className="absolute top-[16%] right-[11%] grid size-[11%] place-items-center"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="size-full" style={{ color: C.pink }}>
                    <path
                      d="M5 5l14 14M19 5L5 19"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <Clay
                    id="orn-gift"
                    show={beat >= 2}
                    reduced={p.reduced}
                    shadow={C.tint}
                    className="-top-[150%] left-1/2 w-[190%] -translate-x-1/2"
                  />
                </span>
                <div className="absolute top-[7%] left-[6%] max-w-[54%]">
                  <span
                    className="block text-[clamp(9px,2.6cqi,11px)] tracking-[0.2em] uppercase"
                    style={{ ...text(600), color: C.pinkInk }}
                  >
                    {p.badge}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(1.15rem,5.6cqi,1.9rem)] leading-[1.05]"
                    style={{ ...display(700), color: C.ink }}
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
                background: `linear-gradient(90deg, ${C.edge}, ${C.paper} 40%, #FFFFFF 55%, #EAD3A8)`,
                boxShadow: soft(C.tint, 0.7),
              }}
              aria-hidden
            >
              <motion.span
                className="absolute inset-x-[-30%] top-1/2 h-[4%] rounded-full"
                style={{ background: C.pink, opacity: tie }}
              />
            </motion.span>
            <Sparkles
              reduced={p.reduced}
              spots={[
                [6, -8, 16],
                [94, 108, 14],
              ]}
            />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton onClick={unrollMap} color={C.ink} ink={C.ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const huntBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#E3F8F8",
    bottom: "#BCE7EE",
    glow: "#FFFFFFCC",
    blobs: [
      ["#FFF1C7AA", 16, 14, 50],
      ["#D9F2E2CC", 88, 88, 55],
    ],
    pattern: dotLayer("rgba(255,255,255,.55)", 1.8),
    patternSize: "22px 22px",
  });
