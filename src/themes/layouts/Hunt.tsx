/**
 * GIFT HUNT: a rolled treasure map, drawn in the gift's own colors, on the
 * hunt's soft mesh. Gesture: unroll it (drag to the right, or tap). The map
 * opens out, a dotted trail draws itself from "You are here" to an X, and one
 * of the hunt's own wrapped boxes (same paper, ribbon and bow as the boxes
 * inside) pops up on the X.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { meshGradient } from "@/lib/giftPieces";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Texture } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

const mix = (a: string, k: number, b = "#ffffff") => `color-mix(in oklab, ${a} ${k}%, ${b})`;

export function HuntOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const ink = readableInk(background);
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
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
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

  const paper = mix(background, 55);
  const land = mix(primary, 14);
  const landDeep = mix(primary, 30);
  const water = mix(accent, 20);

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{ color: ink, fontFamily: "var(--jb-text)" }}
    >
      <p className="text-[11px] font-semibold tracking-[0.22em] uppercase opacity-70">
        A gift hunt for {p.recipient}
      </p>
      <p
        className="mt-2 max-w-[90cqi] text-center text-[clamp(1.6rem,8cqi,2.6rem)] leading-[1.05] font-bold"
        style={{ fontFamily: "var(--jb-display)" }}
      >
        {p.greeting}
      </p>
      <Layer
        depth={10}
        className="relative mt-[min(10cqi,44px)]"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.45" }}
      >
        <Buddy p={p} ref={cast} size={76} className="-bottom-[22%] left-[2%]" />
        <Object3D
          pose={{ x: 20, y: -6, z: -2 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <motion.div className="absolute inset-0" style={{ x: shift }}>
            <motion.div className="absolute inset-y-0 left-0" style={{ width }}>
              <FloorShadow tint="43,37,34" depth={8} radius={14} className="inset-0" />
            </motion.div>
            {/* The map, revealed from the left as it unrolls. */}
            <motion.div
              className="absolute inset-y-0 left-0 cursor-pointer touch-none overflow-hidden rounded-[14px] outline-none"
              style={{
                width,
                background: paper,
                boxShadow: "0 18px 34px -22px rgba(43,37,34,.55)",
              }}
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
                <Texture material="paper" opacity={0.45} />
                {/* Islands, a pond, hills and little trees, in the gift's colors. */}
                <svg viewBox="0 0 400 276" className="absolute inset-0 size-full" aria-hidden>
                  <path
                    d="M14 254c10-44 52-64 94-56s62-10 94 0 42 42 22 64-178 22-210-8z"
                    style={{ fill: land }}
                  />
                  <path
                    d="M246 40c32-20 94-18 124 6s22 72-10 86-72 6-104-10-38-64-10-82z"
                    style={{ fill: land }}
                  />
                  <ellipse cx="238" cy="206" rx="44" ry="20" style={{ fill: water }} />
                  <ellipse cx="228" cy="200" rx="14" ry="4" fill="#fff" opacity=".6" />
                  <path d="M286 102c10-26 18-34 26-34s16 8 26 34z" style={{ fill: landDeep }} />
                  <path
                    d="M314 102c8-20 14-26 20-26s12 6 20 26z"
                    style={{ fill: mix(primary, 42) }}
                  />
                  {[
                    [54, 218],
                    [80, 228],
                    [128, 220],
                    [282, 64],
                    [356, 72],
                  ].map(([x, y], i) => (
                    <g key={i}>
                      <rect
                        x={x! - 1.5}
                        y={y! + 4}
                        width="3"
                        height="8"
                        rx="1.5"
                        style={{ fill: mix(primary, 45, "#8a6a4a") }}
                      />
                      <circle cx={x} cy={y} r="9" style={{ fill: landDeep }} />
                    </g>
                  ))}
                  {/* A compass rose. */}
                  <g transform="translate(354 234)">
                    <circle r="19" fill="#fff" opacity=".75" />
                    <path d="M0-16l5 11-5 5-5-5z" style={{ fill: accent }} />
                    <path d="M0 16l5-11-5-5-5 5z" style={{ fill: primary }} />
                  </g>
                  <motion.path
                    d="M54 238 C 110 200, 120 160, 170 152 S 260 160, 280 128 S 318 104, 334 98"
                    fill="none"
                    style={{ stroke: accent }}
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
                  <circle
                    cx="54"
                    cy="238"
                    r="8"
                    style={{ fill: primary }}
                    stroke="#fff"
                    strokeWidth="3"
                  />
                </svg>
                <span
                  className="absolute bottom-[3%] left-[4%] rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase"
                  style={{ color: primary }}
                >
                  You are here
                </span>
                {/* X marks the spot, then one of the hunt's boxes pops up. */}
                <span
                  ref={xRef}
                  className="absolute top-[30%] right-[12%] grid size-[11%] place-items-center"
                  aria-hidden
                >
                  <svg viewBox="0 0 24 24" className="size-full" style={{ color: accent }}>
                    <path
                      d="M5 5l14 14M19 5L5 19"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <motion.span
                    className="hunt-box absolute -top-[150%] left-1/2 w-[220%]"
                    style={
                      {
                        "--tint": "#FBD3DC",
                        "--ribbon": primary,
                        "--tilt": "-4deg",
                        x: "-50%",
                        animation: "none",
                        cursor: "default",
                      } as object
                    }
                    initial={false}
                    animate={
                      beat >= 2 ? { scale: 1, y: 0, opacity: 1 } : { scale: 0.3, y: 14, opacity: 0 }
                    }
                    transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
                  >
                    <span className="hunt-lid" style={{ top: -8, height: 14, borderRadius: 5 }}>
                      <span className="hunt-bow" style={{ top: -11, width: 26, height: 14 }} />
                    </span>
                    <span className="hunt-body" />
                  </motion.span>
                </span>
              </div>
            </motion.div>
            {/* The roll, travelling to the right edge as the map opens. */}
            <motion.span
              className="absolute inset-y-[-3%] w-[7%] rounded-full"
              style={{
                left: rollX,
                x: "-50%",
                background: `linear-gradient(90deg, ${mix(background, 40, "#c9b8a0")}, ${paper} 40%, #fff 55%, ${mix(background, 50, "#bba78c")})`,
                boxShadow: "0 12px 22px -12px rgba(43,37,34,.55)",
              }}
              aria-hidden
            >
              <motion.span
                className="absolute inset-x-[-30%] top-1/2 h-[4%] rounded-full"
                style={{ background: accent, opacity: tie }}
              />
            </motion.span>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(14cqi,60px)] h-11">
        <FallbackButton onClick={unrollMap} color={ink} ink={ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The hunt's own background: the gift's colors, softly meshed. */
export const huntBackground = (palette: Palette): React.CSSProperties => ({
  background: meshGradient(palette.primary, palette.accent, palette.background),
});
