/**
 * COMIC ISSUE: issue #1 of their own pastel comic, sealed in a collector's bag
 * with a strip of tape, on a sunny halftone stage. The hero on the cover is
 * their character (or a smiling clay star) with speed lines and a speech
 * bubble. Gesture: slide it out (drag it up, or tap). The comic rises out of
 * the bag, the bag drops away and a "Pow!" starburst lands on the cover.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import {
  Buddy,
  Clay,
  FONTS,
  Gloss,
  Sparkles,
  display,
  dotLayer,
  dots,
  hasBuddy,
  pastelStage,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const C = {
  ink: "#4A2E4F",
  line: "#3B2A4A",
  pink: "#FF8FB3",
  butter: "#FFE07A",
  sky: "#A8DBFF",
  cream: "#FFF8EA",
  tint: "200,110,90",
};

const BURST =
  "polygon(50% 0,61% 22%,85% 10%,78% 35%,100% 44%,80% 58%,93% 82%,66% 76%,58% 100%,45% 80%,22% 94%,24% 70%,0 62%,20% 47%,6% 24%,32% 28%)";

export function ComicOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.pop, FONTS.round);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [out, setOut] = useState(false);
  const rise = useMotionValue(0); // 0 in the bag, 1 out
  const y = useTransform(rise, [0, 1], ["0%", "-30%"]);
  const bagY = useTransform(rise, [0, 0.6, 1], ["0%", "6%", "60%"]);
  const bagOpacity = useTransform(rise, [0.55, 1], [1, 0]);
  useOpenSequence(p, out, coverRef, {
    hold: 1800,
    cast,
    colors: [C.pink, C.butter, C.sky, "#FFFFFF"],
  });
  useHint(p, "Slide the comic up and out of its bag", out);

  function slideOut() {
    if (out || !live(p)) return;
    setOut(true);
    foley("paper");
    h.thud();
    void animate(rise, 1, p.reduced ? { duration: 0 } : SPRING.soft);
  }
  useAutoplay(p, [[900, slideOut]]);
  const count = p.contributors.length;
  const title = Math.max(12, 30 - [...p.recipient].length * 2);

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      {/* Sun rays behind the comic. */}
      <Layer
        depth={-8}
        className="pointer-events-none absolute top-1/2 left-1/2 size-[150cqi] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "repeating-conic-gradient(from 0deg, rgba(255,255,255,.55) 0 7deg, transparent 7deg 18deg)",
            WebkitMaskImage: "radial-gradient(closest-side, #000 25%, transparent 72%)",
            maskImage: "radial-gradient(closest-side, #000 25%, transparent 72%)",
          }}
          animate={p.reduced ? {} : { rotate: 360 }}
          transition={{ duration: 90, ease: "linear", repeat: Infinity }}
          aria-hidden
        />
      </Layer>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(62cqi, 280px)", aspectRatio: "0.68", marginTop: "10%" }}
      >
        <Sparkles
          reduced={p.reduced}
          spots={[
            [-12, 20, 18],
            [110, 8, 14],
            [-8, 88, 14],
            [112, 70, 20],
          ]}
        />
        <Object3D
          pose={{ x: 10, y: -12, z: 2 }}
          strength={9}
          settle={out}
          className="absolute inset-0"
        >
          <FloorShadow tint={C.tint} strength={0.6} depth={14} radius={10} className="inset-0" />
          <motion.div
            ref={coverRef}
            className="@container absolute inset-0 cursor-pointer touch-none overflow-hidden rounded-[10px] outline-none"
            style={{
              y,
              background: C.cream,
              boxShadow: `${soft(C.tint, 1.1)}, inset 0 0 0 3px ${C.line}`,
            }}
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
              className="absolute inset-[3px] rounded-[7px]"
              style={{
                background: `${dots("rgba(255,255,255,.55)", 1.4, 9)}, linear-gradient(165deg, ${C.sky}, #D9CCFF 55%, ${C.pink})`,
              }}
              aria-hidden
            />
            {/* Speed lines behind the hero. */}
            <span
              className="absolute top-[46%] left-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "repeating-conic-gradient(from 0deg, rgba(255,255,255,.7) 0 3deg, transparent 3deg 14deg)",
                WebkitMaskImage:
                  "radial-gradient(closest-side, transparent 22%, #000 40%, transparent 75%)",
                maskImage:
                  "radial-gradient(closest-side, transparent 22%, #000 40%, transparent 75%)",
              }}
              aria-hidden
            />
            {/* Masthead. */}
            <div
              className="absolute inset-x-[3px] top-[3px] flex items-center justify-between rounded-t-[7px] px-[6%] py-[3.5%]"
              style={{ background: C.cream, borderBottom: `3px solid ${C.line}` }}
            >
              <span
                className="text-[6cqw] leading-none tracking-[0.04em]"
                style={{ ...display(400), color: "#E8578A" }}
              >
                Issue #1
              </span>
              <span
                className="rounded-full px-[3cqw] py-[0.6cqw] text-[4.2cqw]"
                style={{
                  ...text(700),
                  background: C.butter,
                  color: C.ink,
                  boxShadow: `inset 0 0 0 2px ${C.line}`,
                }}
              >
                {count ? `${count} friends` : "Special"}
              </span>
            </div>
            {/* Title. */}
            <span
              className="absolute inset-x-[5%] top-[13%] block -rotate-[4deg] truncate text-center leading-[1.05] text-white"
              style={{
                ...display(400),
                fontSize: `${title}cqw`,
                WebkitTextStroke: `2.5px ${C.line}`,
                paintOrder: "stroke fill",
                textShadow: `4px 4px 0 ${C.line}, 7px 7px 0 ${C.pink}`,
              }}
            >
              {p.recipient}
            </span>
            {/* The hero. */}
            {hasBuddy(p) ? (
              <Buddy p={p} ref={cast} size={110} className="top-[40%] left-1/2 -translate-x-1/2" />
            ) : (
              <Clay
                id="orn-star"
                float
                reduced={p.reduced}
                shadow="60,40,90"
                className="top-[42%] left-[24%] w-[50%]"
              />
            )}
            {/* Speech bubble. */}
            <span
              className="absolute top-[31%] left-[4%] z-[7] max-w-[58%] rounded-[14px] bg-white px-[3cqw] py-[2cqw] text-[4.8cqw] leading-[1.1]"
              style={{ ...text(700), color: C.ink, boxShadow: `0 0 0 2px ${C.line}` }}
            >
              {count ? `${count} friends to the rescue` : "Friends to the rescue"}
              <span
                className="absolute -bottom-[7px] left-[60%] size-3 rotate-45 bg-white"
                style={{ boxShadow: `2px 2px 0 0 ${C.line}` }}
                aria-hidden
              />
            </span>
            {/* A starburst. */}
            <motion.span
              className="absolute right-[4%] bottom-[16%] grid aspect-square w-[36%] place-items-center text-center"
              initial={false}
              animate={{ scale: out ? 1.08 : 0.86, rotate: out ? 10 : -6 }}
              transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
              style={{ background: C.line, clipPath: BURST }}
            >
              <span
                className="absolute inset-[5%]"
                style={{ background: C.butter, clipPath: BURST }}
                aria-hidden
              />
              <span
                className="relative px-[18%] text-[6cqw] leading-none"
                style={{ ...display(400), color: "#E8578A" }}
              >
                {out ? "Pow!" : "New!"}
              </span>
            </motion.span>
            <span
              className="absolute inset-x-[3px] bottom-[3px] truncate rounded-b-[7px] px-[6%] py-[3%] text-[5.4cqw]"
              style={{
                ...text(700),
                background: C.cream,
                borderTop: `3px solid ${C.line}`,
                color: C.ink,
              }}
            >
              {p.greeting}
            </span>
            <Gloss strength={0.35} height="26%" />
            <Sheen strength={0.3} angle={110} width={22} />
          </motion.div>

          {/* The bag and its tape, over the comic. */}
          <motion.div
            className="pointer-events-none absolute -inset-x-[4%] -top-[6%] -bottom-[3%] rounded-[12px]"
            style={{
              y: bagY,
              opacity: bagOpacity,
              background:
                "linear-gradient(115deg, rgba(255,255,255,.5), rgba(255,255,255,.1) 40%, rgba(255,255,255,.32) 60%, rgba(255,255,255,.08))",
              border: "1.5px solid rgba(255,255,255,.8)",
              boxShadow: "inset 0 0 0 1px rgba(200,110,90,.08)",
            }}
          >
            <span
              className="absolute inset-x-[28%] top-[2%] h-[5%] rounded-[3px]"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(255,143,179,.75) 0 6px, rgba(255,224,122,.75) 6px 12px)",
              }}
              aria-hidden
            />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={slideOut} color="#E8578A" ink={C.ink} hidden={out || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const comicBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#FFF5C9",
    bottom: "#FFDCCB",
    glow: "#FFFFFFB3",
    blobs: [
      ["#FFD0E0CC", 88, 16, 55],
      ["#CDE9FFCC", 10, 84, 60],
    ],
    pattern: dotLayer("rgba(255,140,170,.22)", 1.8),
    patternSize: "14px 14px",
  });
