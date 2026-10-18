/**
 * COMIC ISSUE: issue #1, sealed in a collector's bag with a strip of tape.
 * Gesture: slide it out (drag it up, or tap). The comic rises out of the bag,
 * the bag drops away, and a "POW" starburst lands on the cover.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen, TEXTURE_SOFT, elevation } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { giftColors, live, pressable, useAutoplay, useOpenSequence } from "./kit";

export function ComicOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [out, setOut] = useState(false);
  const rise = useMotionValue(0); // 0 in the bag, 1 out
  const y = useTransform(rise, [0, 1], ["0%", "-34%"]);
  const bagY = useTransform(rise, [0, 0.6, 1], ["0%", "6%", "60%"]);
  const bagOpacity = useTransform(rise, [0.55, 1], [1, 0]);
  useOpenSequence(p, out, coverRef, 1700);

  function slideOut() {
    if (out || !live(p)) return;
    setOut(true);
    foley("paper");
    h.thud();
    void animate(rise, 1, p.reduced ? { duration: 0 } : SPRING.soft);
  }
  useAutoplay(p, [[900, slideOut]]);
  const count = p.contributors.length;

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(62cqi, 280px)", aspectRatio: "0.68", marginTop: "12%" }}
      >
        <Object3D
          pose={{ x: 10, y: -12, z: 2 }}
          strength={9}
          settle={out}
          className="absolute inset-0"
        >
          <FloorShadow tint="20,20,40" depth={14} radius={6} className="inset-0" />
          <motion.div
            ref={coverRef}
            className="absolute inset-0 cursor-pointer touch-none overflow-hidden rounded-[4px] outline-none"
            style={{ y, background: "#FFF6E0", boxShadow: elevation(0.6, "20,20,40") }}
            onPan={(_, info) => {
              if (out || !live(p)) return;
              rise.set(Math.max(0, Math.min(1, -info.offset.y / 220)));
            }}
            onPanEnd={(_, info) => {
              if (out || !live(p)) return;
              if (info.offset.y < -60) slideOut();
              else void animate(rise, 0, SPRING.snappy);
            }}
            {...pressable(slideOut, !out && live(p), "Slide the comic out of its bag")}
          >
            {/* Halftone sky. */}
            <span
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle, ${c.accent}55 1.2px, transparent 1.6px) 0 0 / 9px 9px, linear-gradient(160deg, ${c.primary}, ${c.accent})`,
              }}
              aria-hidden
            />
            {/* Masthead. */}
            <div
              className="absolute inset-x-0 top-0 flex items-center justify-between px-[6%] py-[4%]"
              style={{ background: "#FFF6E0", borderBottom: "3px solid #1b1b1f" }}
            >
              <span
                className="text-[clamp(10px,3cqi,12px)] font-black tracking-[0.08em] text-[#1b1b1f] uppercase"
                style={{ fontFamily: "var(--jb-text)" }}
              >
                Issue #1
              </span>
              <span
                className="rounded-[3px] border-2 border-[#1b1b1f] px-1.5 text-[clamp(9px,2.6cqi,11px)] font-black text-[#1b1b1f]"
                style={{ fontFamily: "var(--jb-text)" }}
              >
                {count ? `${count} friends` : "Special"}
              </span>
            </div>
            {/* Title. */}
            <span
              className="absolute inset-x-[5%] top-[16%] block -rotate-[4deg] text-center leading-[0.86] font-black text-white uppercase"
              style={{
                fontFamily: "var(--jb-display)",
                fontSize: `clamp(2rem, ${Math.max(9, 16 - p.recipient.length)}cqi, 3.6rem)`,
                WebkitTextStroke: "2px #1b1b1f",
                textShadow: "4px 4px 0 #1b1b1f",
              }}
            >
              {p.recipient}
            </span>
            {/* A starburst with the occasion. */}
            <motion.span
              className="absolute right-[6%] bottom-[18%] grid aspect-square w-[44%] place-items-center text-center"
              initial={false}
              animate={{ scale: out ? 1 : 0.85, rotate: out ? 8 : -6 }}
              transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
              style={{
                background: "#FFD23F",
                clipPath:
                  "polygon(50% 0,61% 22%,85% 10%,78% 35%,100% 44%,80% 58%,93% 82%,66% 76%,58% 100%,45% 80%,22% 94%,24% 70%,0 62%,20% 47%,6% 24%,32% 28%)",
              }}
            >
              <span
                className="px-[16%] text-[clamp(10px,3.2cqi,13px)] leading-tight font-black text-[#1b1b1f] uppercase"
                style={{ fontFamily: "var(--jb-text)" }}
              >
                {out ? "Pow!" : p.badge}
              </span>
            </motion.span>
            <span
              className="absolute inset-x-0 bottom-0 px-[6%] py-[3.5%] text-[clamp(10px,2.8cqi,12px)] font-bold text-[#1b1b1f]"
              style={{
                background: "#FFF6E0",
                borderTop: "3px solid #1b1b1f",
                fontFamily: "var(--jb-text)",
              }}
            >
              {p.greeting}
            </span>
            <Sheen strength={0.25} angle={110} width={22} />
          </motion.div>

          {/* The bag and its tape, over the comic. */}
          <motion.div
            className="pointer-events-none absolute -inset-x-[4%] -top-[6%] -bottom-[3%] rounded-[6px]"
            style={{
              y: bagY,
              opacity: bagOpacity,
              background:
                "linear-gradient(115deg, rgba(255,255,255,.34), rgba(255,255,255,.06) 40%, rgba(255,255,255,.22) 60%, rgba(255,255,255,.05))",
              border: "1px solid rgba(255,255,255,.5)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.04)",
            }}
          >
            <span
              className="absolute inset-x-[30%] top-[2%] h-[5%] rounded-[2px]"
              style={{ background: "rgba(255,240,180,.55)" }}
              aria-hidden
            />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={slideOut} color="#ffffff" ink="#ffffff" hidden={out || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const comicBackground = (): React.CSSProperties => ({
  backgroundColor: "#1E2440",
  backgroundImage: [
    "radial-gradient(circle, rgba(255,255,255,.07) 1.3px, transparent 1.8px)",
    "radial-gradient(55% 45% at 50% 45%, #3A4680, transparent 75%)",
    TEXTURE_SOFT.paper,
  ].join(","),
  backgroundSize: "12px 12px, auto, 260px 260px",
});
