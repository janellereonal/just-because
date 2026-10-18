/**
 * ZINE: a glossy pastel magazine with their name as the masthead, a cover star,
 * cover lines and a barcode, sealed with a polka-dot band and a heart sticker.
 * Gesture: rip the band (drag down across it, or tap). The band tears in two
 * and flies off, the heart pops, stickers land on the cover.
 */
import { useRef, useState } from "react";
import { motion } from "motion/react";
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
  pink: "#F2558A",
  deep: "#7A2E55",
  blush: "#FFD3E1",
  lilac: "#E6D8FF",
  butter: "#FFE58A",
  mint: "#BDEBDB",
  mintInk: "#2E6B58",
  tint: "190,70,120",
};

/** The two halves of the band, torn down the middle with matching ragged edges. */
const TEAR_LEFT =
  "polygon(0 0, 100% 0, 97% 14%, 100% 28%, 96% 42%, 100% 57%, 97% 71%, 100% 86%, 97% 100%, 0 100%)";
const TEAR_RIGHT =
  "polygon(-3% 0, 100% 0, 100% 100%, -3% 100%, 0 86%, -3% 71%, 1% 57%, -3% 42%, 0 28%, -3% 14%)";

/** A scalloped round sticker (viewBox 0 0 100 100). */
const SCALLOP = (() => {
  const n = 16;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? 44 : 50;
    d += `${i ? "L" : "M"}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`;
  }
  return d + "Z";
})();

export function ZineOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.bubble, FONTS.round);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [ripped, setRipped] = useState(false);
  const [pull, setPull] = useState(0);
  useOpenSequence(p, ripped, coverRef, {
    hold: 1800,
    cast,
    colors: [C.pink, C.butter, C.mint, C.lilac, "#FFFFFF"],
  });
  useHint(p, "Rip the band to open your issue", ripped);

  function rip() {
    if (ripped || !live(p)) return;
    setRipped(true);
    foley("rip");
    h.thud();
  }
  useAutoplay(p, [[900, rip]]);

  const name = p.recipient;
  // The masthead fills the cover's width whatever the name's length.
  const mast = Math.min(30, 132 / Math.max(3, [...name].length));
  const friends = p.contributors.length;
  const issueDate = new Date()
    .toLocaleDateString(undefined, { month: "short", year: "numeric" })
    .toUpperCase();
  const buddy = hasBuddy(p);

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(72cqi, 320px)", aspectRatio: "0.75" }}
      >
        <Sparkles
          reduced={p.reduced}
          color="#FF8FB5"
          spots={[
            [-8, 12, 18],
            [106, 30, 14],
            [-4, 70, 12],
            [104, 86, 20],
          ]}
        />
        <Object3D
          pose={{ x: 10, y: -12, z: -3 }}
          strength={9}
          settle={ripped}
          className="absolute inset-0"
        >
          <FloorShadow tint={C.tint} depth={12} radius={10} className="inset-0" />
          {/* The cover. */}
          <div
            ref={coverRef}
            className="@container absolute inset-0 overflow-hidden rounded-[10px]"
            style={{
              background: `linear-gradient(172deg, #FFE7EF 0%, ${C.blush} 46%, ${C.lilac} 100%)`,
              boxShadow: `${soft(C.tint, 1.1)}, inset 0 0 0 1px rgba(255,255,255,.6)`,
            }}
          >
            <span
              className="absolute inset-0"
              style={{ background: dots("rgba(255,255,255,.5)", 1.6, 16) }}
              aria-hidden
            />
            {/* The spotlight behind the cover star. */}
            <span
              className="absolute top-[24%] right-[-14%] aspect-square w-[78%] rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 45% 40%, #FFFFFF 0 30%, rgba(255,255,255,.55) 52%, rgba(255,255,255,0) 70%)",
              }}
              aria-hidden
            />
            {/* Issue line. */}
            <div
              className="absolute inset-x-[6%] top-[3.6%] flex items-center justify-between text-[3.2cqw] tracking-[0.16em]"
              style={{ ...text(600), color: C.deep }}
            >
              <span>ISSUE 01 · {issueDate}</span>
              <span>PRICELESS</span>
            </div>
            {/* Masthead. */}
            <span
              className="absolute inset-x-[4%] top-[7%] block truncate text-center leading-[1.02]"
              style={{
                ...display(400),
                fontSize: `${mast}cqw`,
                color: C.pink,
                textShadow: `0 0.05em 0 #fff, 0 0.09em 0 rgba(${C.tint},.25)`,
              }}
            >
              {name}
            </span>

            <span
              className="absolute top-[30.5%] left-[6%] text-[3.2cqw] tracking-[0.2em] uppercase"
              style={{ ...text(700), color: C.deep }}
            >
              The friends issue
            </span>
            {/* Cover star: their character, or a clay heart with a face. */}
            {buddy ? (
              <Buddy p={p} ref={cast} size={128} className="right-[4%] bottom-[24%]" />
            ) : (
              <Clay
                id="orn-heart"
                float
                reduced={p.reduced}
                shadow={C.tint}
                className="right-[5%] top-[33%] w-[50%]"
              />
            )}

            {/* Cover lines. */}
            <div className="absolute top-[37%] left-[6%] w-[46%]" style={{ color: C.deep }}>
              <span
                className="block leading-none"
                style={{ ...display(400), fontSize: "15cqw", color: C.pink }}
              >
                {friends || "All"}
              </span>
              <span className="mt-[1cqw] block text-[4.6cqw] leading-[1.05]" style={text(700)}>
                {friends === 1 ? "friend tells all" : "friends tell all"}
              </span>
              <span
                className="mt-[3cqw] block h-[2px] w-[34%] rounded-full"
                style={{ background: C.pink }}
                aria-hidden
              />
              <span className="mt-[3cqw] block text-[3.6cqw] leading-[1.2]" style={text(600)}>
                The notes you weren&apos;t meant to see yet
              </span>
              <span
                className="mt-[3cqw] inline-block rounded-full px-[3cqw] py-[0.8cqw] text-[3.2cqw]"
                style={{ ...text(700), background: "#FFFFFFB3", color: C.deep }}
              >
                Photos, songs &amp; more
              </span>
            </div>

            {/* The headline. */}
            <span
              className="absolute bottom-[5.5%] left-[6%] w-[62%] text-[8cqw] leading-[1]"
              style={{ ...text(700), color: C.deep }}
            >
              <span
                className="[box-decoration-break:clone] px-[1cqw]"
                style={{
                  background: `linear-gradient(180deg, transparent 58%, ${C.butter} 58% 92%, transparent 92%)`,
                }}
              >
                {p.greeting}
              </span>
            </span>
            {/* Barcode. */}
            <span
              className="absolute right-[5%] bottom-[5%] flex w-[20%] flex-col items-center rounded-[4px] bg-white px-[1.4cqw] pt-[1.4cqw] pb-[0.6cqw]"
              aria-hidden
            >
              <span
                className="block h-[7cqw] w-full"
                style={{
                  background:
                    "repeating-linear-gradient(90deg, #3a2233 0 1px, transparent 1px 2.5px, #3a2233 2.5px 4px, transparent 4px 5px, #3a2233 5px 5.6px, transparent 5.6px 7.4px)",
                }}
              />
              <span className="mt-[0.4cqw] block font-mono text-[2.2cqw] tracking-[0.1em] text-[#3a2233]">
                0 1 2026
              </span>
            </span>

            {/* The "special edition" sticker. */}
            <motion.span
              className="absolute top-[24%] left-[54%] grid aspect-square w-[24%] place-items-center"
              initial={false}
              animate={ripped ? { rotate: -8, scale: 1 } : { rotate: -14, scale: 0.96 }}
              transition={p.reduced ? { duration: 0 } : SPRING.wobbly}
              aria-hidden
            >
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 size-full drop-shadow-[0_3px_3px_rgba(190,70,120,.3)]"
              >
                <path d={SCALLOP} fill={C.butter} />
              </svg>
              <span
                className="relative text-center text-[3.4cqw] leading-[1]"
                style={{ ...text(700), color: C.deep }}
              >
                Special
                <br />
                edition
              </span>
            </motion.span>

            {/* Stickers land once the band is off. */}
            <Clay
              id="star"
              show={ripped}
              delay={0.35}
              rotate={-12}
              reduced={p.reduced}
              shadow={C.tint}
              className="bottom-[22%] left-[44%] w-[16%]"
            />
            <Clay
              id="heart"
              show={ripped}
              delay={0.5}
              rotate={14}
              reduced={p.reduced}
              shadow={C.tint}
              className="top-[66%] right-[3%] w-[12%]"
            />
            {/* The spine, where the pages are bound. */}
            <span
              className="absolute inset-y-0 left-0 w-[5%]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(122,46,85,.14), rgba(255,255,255,.35) 40%, transparent)",
              }}
              aria-hidden
            />
            <Gloss strength={0.45} height="30%" />
            <Sheen strength={0.45} angle={115} width={22} />
          </div>

          {/* The band, in two halves that tear apart, sealed with a heart. */}
          <div
            className="absolute inset-x-[-5%] top-[60%] h-[15%] cursor-pointer touch-none outline-none"
            style={{ zIndex: 3 }}
            onPointerDown={(e) => (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)}
            onPointerMove={(e) => {
              if (ripped || !live(p) || !(e.buttons & 1)) return;
              const next = Math.min(1, pull + Math.abs(e.movementY) / 90);
              setPull(next);
              if (next >= 1) rip();
            }}
            {...pressable(rip, !ripped && live(p), "Rip the band off the magazine")}
          >
            {[0, 1].map((half) => (
              <motion.div
                key={half}
                className="absolute inset-y-0 flex items-center overflow-hidden"
                style={{
                  left: half ? "50%" : 0,
                  right: half ? 0 : "50%",
                  background: `${dots("rgba(255,255,255,.7)", 2, 14)}, ${C.mint}`,
                  clipPath: half ? TEAR_RIGHT : TEAR_LEFT,
                  boxShadow: soft("46,107,88", 0.6),
                }}
                initial={false}
                animate={
                  ripped
                    ? { x: half ? "70%" : "-70%", y: 46, rotate: half ? 22 : -22, opacity: 0 }
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
                {/* Stitched edges. */}
                <span
                  className="absolute inset-x-0 top-[12%] border-t-2 border-dashed border-white/80"
                  aria-hidden
                />
                <span
                  className="absolute inset-x-0 bottom-[12%] border-t-2 border-dashed border-white/80"
                  aria-hidden
                />
                {/* The words run across both halves; each half shows its own side. */}
                <span
                  className="absolute inset-y-0 flex w-[200%] items-center justify-center gap-[26%] text-[clamp(11px,3.4cqi,15px)] tracking-[0.16em] uppercase"
                  style={{ left: half ? "-100%" : 0, ...text(700), color: C.mintInk }}
                >
                  <span>For you</span>
                  <span>Open me</span>
                </span>
              </motion.div>
            ))}
            {/* The heart seal on the seam. */}
            <motion.span
              className="pointer-events-none absolute top-1/2 left-1/2 block w-[17%] -translate-x-1/2 -translate-y-1/2"
              initial={false}
              animate={
                ripped
                  ? { y: -70, scale: 1.4, opacity: 0, rotate: 30 }
                  : { y: 0, scale: 1 + pull * 0.1, opacity: 1, rotate: -8 }
              }
              transition={
                p.reduced
                  ? { duration: 0 }
                  : ripped
                    ? { duration: 0.6, ease: [0.2, 0.7, 0.3, 1] }
                    : SPRING.snappy
              }
              aria-hidden
            >
              <img
                src="/clay/heart@256.webp"
                alt=""
                draggable={false}
                className="block w-full drop-shadow-[0_4px_5px_rgba(190,70,120,.35)]"
              />
            </motion.span>
          </div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={rip} color={C.pink} ink={C.deep} hidden={ripped || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const zineBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#FFEFF4",
    bottom: "#FAD3E2",
    glow: "#FFFFFFDD",
    blobs: [
      ["#E8DBFFCC", 12, 18, 60],
      ["#FFF0B8AA", 90, 84, 55],
    ],
    pattern: dotLayer("rgba(255,255,255,.6)", 2.2),
    patternSize: "26px 26px",
  });
