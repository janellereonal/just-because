/**
 * ZINE: a stapled, photocopied zine with a paper band around it, their name
 * spelled in cut-out letters. Gesture: rip the band (drag down across it, or tap).
 * The band tears in two and flies off, stickers slap onto the cover.
 */
import { useRef, useState } from "react";
import { motion } from "motion/react";
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
import { foley } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { giftColors, live, pressable, useAutoplay, useOpenSequence } from "./kit";

const CUTOUT_BG = ["#FFF", "#111", "#FFD23F", "#F2A7C3", "#9BD3E8", "#FFF"];
const CUTOUT_FG = ["#111", "#FFF", "#111", "#111", "#111", "#C2366B"];
/** The two halves of the band, torn down the middle with matching ragged edges. */
const TEAR_LEFT =
  "polygon(0 0, 100% 0, 97% 14%, 100% 28%, 96% 42%, 100% 57%, 97% 71%, 100% 86%, 97% 100%, 0 100%)";
const TEAR_RIGHT =
  "polygon(-3% 0, 100% 0, 100% 100%, -3% 100%, 0 86%, -3% 71%, 1% 57%, -3% 42%, 0 28%, -3% 14%)";

export function ZineOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [ripped, setRipped] = useState(false);
  const [pull, setPull] = useState(0);
  useOpenSequence(p, ripped, coverRef, 1700);

  function rip() {
    if (ripped || !live(p)) return;
    setRipped(true);
    foley("rip");
    h.thud();
  }
  useAutoplay(p, [[900, rip]]);
  const letters = p.recipient.toUpperCase().slice(0, 12).split("");

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(66cqi, 300px)", aspectRatio: "0.72" }}
      >
        <Object3D
          pose={{ x: 12, y: -10, z: -4 }}
          strength={9}
          settle={ripped}
          className="absolute inset-0"
        >
          <FloorShadow tint="20,20,20" depth={10} radius={2} className="inset-0" />
          {/* The cover: photocopy grain, a collage, the title. */}
          <div
            ref={coverRef}
            className="absolute inset-0 overflow-hidden rounded-[2px]"
            style={{ background: "#F3F0E8", boxShadow: elevation(0.5, "20,20,20") }}
          >
            <Texture material="paper" opacity={0.7} />
            <span
              className="absolute inset-0 opacity-[0.18]"
              style={{
                background: "radial-gradient(circle, #000 0.8px, transparent 1.2px) 0 0 / 5px 5px",
              }}
              aria-hidden
            />
            <span
              className="absolute top-[6%] left-[6%] rotate-[-3deg] px-2 py-0.5 text-[clamp(10px,3cqi,12px)] font-black tracking-[0.12em] text-white uppercase"
              style={{ background: "#111", fontFamily: "var(--jb-text)" }}
            >
              {p.badge} · vol. 1
            </span>
            <span
              className="absolute top-[18%] right-[-6%] h-[38%] w-[64%] rotate-[6deg]"
              style={{
                background: `linear-gradient(140deg, ${c.accent}, ${c.primary})`,
                filter: "contrast(1.2) grayscale(.2)",
                boxShadow: "3px 3px 0 #111",
              }}
              aria-hidden
            />
            <span
              className="absolute top-[30%] left-[8%] w-[64%] rotate-[-4deg] text-[clamp(1.5rem,8cqi,2.6rem)] leading-[0.9] font-black text-[#111] uppercase"
              style={{ fontFamily: "var(--jb-display)" }}
            >
              {p.greeting}
            </span>
            <span
              className="absolute bottom-[8%] left-[8%] text-[clamp(10px,3cqi,12px)] text-[#111]"
              style={{ fontFamily: "var(--jb-text)" }}
            >
              made by {p.contributors.length || "all of"}{" "}
              {p.contributors.length === 1 ? "friend" : "us"}, by hand
            </span>
            {/* Staples. */}
            <span
              className="absolute top-[22%] left-[3%] h-[7%] w-[1.6%] rounded-full"
              style={{ background: "linear-gradient(90deg,#999,#eee,#888)" }}
              aria-hidden
            />
            <span
              className="absolute bottom-[22%] left-[3%] h-[7%] w-[1.6%] rounded-full"
              style={{ background: "linear-gradient(90deg,#999,#eee,#888)" }}
              aria-hidden
            />
            {/* Stickers land once the band is off. */}
            {["★", "♥", "!!"].map((s, i) => (
              <motion.span
                key={s}
                className="absolute grid size-[17%] place-items-center rounded-full text-[clamp(12px,4cqi,18px)] font-black"
                style={{
                  left: `${[62, 14, 70][i]}%`,
                  top: `${[64, 70, 8][i]}%`,
                  background: [c.accent, "#FFD23F", "#9BD3E8"][i],
                  color: i === 0 ? c.onAccent : "#111",
                  boxShadow: "2px 2px 0 rgba(0,0,0,.6)",
                }}
                initial={false}
                animate={
                  ripped
                    ? { scale: 1, rotate: (seed(s) - 0.5) * 40, opacity: 1 }
                    : { scale: 1.8, rotate: 0, opacity: 0 }
                }
                transition={
                  p.reduced ? { duration: 0 } : { ...SPRING.snappy, delay: 0.3 + i * 0.16 }
                }
                aria-hidden
              >
                {s}
              </motion.span>
            ))}
          </div>

          {/* The band, in two halves that tear apart. */}
          <div
            className="absolute inset-x-[-5%] top-[42%] h-[20%] cursor-pointer touch-none outline-none"
            style={{ zIndex: 3 }}
            onPointerDown={(e) => (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
            onPointerMove={(e) => {
              if (ripped || !live(p) || !(e.buttons & 1)) return;
              const next = Math.min(1, pull + Math.abs(e.movementY) / 90);
              setPull(next);
              if (next >= 1) rip();
            }}
            {...pressable(rip, !ripped && live(p), "Rip the band off the zine")}
          >
            {[0, 1].map((half) => (
              <motion.div
                key={half}
                className="absolute inset-y-0 flex items-center overflow-hidden"
                style={{
                  left: half ? "50%" : 0,
                  right: half ? 0 : "50%",
                  background: "#E7DCC3",
                  backgroundImage: TEXTURE.kraft,
                  clipPath: half ? TEAR_RIGHT : TEAR_LEFT,
                  boxShadow: elevation(0.35, "20,20,20"),
                  justifyContent: half ? "flex-start" : "flex-end",
                }}
                initial={false}
                animate={
                  ripped
                    ? { x: half ? "70%" : "-70%", y: 40, rotate: half ? 22 : -22, opacity: 0 }
                    : {
                        x: pull * (half ? 6 : -6),
                        y: 0,
                        rotate: pull * (half ? 3 : -3),
                        opacity: 1,
                      }
                }
                transition={
                  ripped
                    ? p.reduced
                      ? { duration: 0 }
                      : { duration: 0.7, ease: [0.3, 0, 0.2, 1] }
                    : { duration: 0 }
                }
              >
                {/* The name runs across both halves; each half shows its own side of it. */}
                <span
                  className="absolute inset-y-0 flex w-[200%] items-center justify-center gap-[3px]"
                  style={{ left: half ? "-100%" : 0 }}
                >
                  {letters.map((l, i) => (
                    <span
                      key={i}
                      className="grid min-w-[1.1em] place-items-center px-[2px] text-[clamp(16px,6cqi,26px)] leading-[1.15] font-black"
                      style={{
                        background: CUTOUT_BG[i % 6],
                        color: CUTOUT_FG[i % 6],
                        rotate: `${(seed(`${l}${i}`) - 0.5) * 14}deg`,
                        fontFamily: i % 2 ? "var(--jb-display)" : "Georgia, serif",
                      }}
                    >
                      {l === " " ? " " : l}
                    </span>
                  ))}
                </span>
              </motion.div>
            ))}
          </div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={rip} color={c.accent} ink={c.accent} hidden={ripped || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const zineBackground = (): React.CSSProperties => ({
  backgroundColor: "#D9D3C7",
  backgroundImage: [
    "radial-gradient(circle, rgba(0,0,0,.08) 1px, transparent 1.4px)",
    "radial-gradient(55% 45% at 50% 45%, #F1ECE2, transparent 75%)",
    TEXTURE_SOFT.paper,
  ].join(","),
  backgroundSize: "6px 6px, auto, 260px 260px",
});
