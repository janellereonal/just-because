/**
 * ZINE: the zine's own cover, cut and pasted in the same materials as its
 * pages: photocopy paper, the masthead rules, their name in ransom letters,
 * the headline with its scribble, a sticky note and stickers, all in black ink
 * and the gift's accent. A ticker band of the friends' names is wrapped round
 * it. Gesture: rip the band (drag down across it, or tap). It tears in two and
 * flies off, the stickers slap on, and the pages take over.
 */
import { useRef, useState } from "react";
import { motion } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { Object3D } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { Ransom, Scribble } from "@/components/formats/zineBits";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";
import { themeStillUrl } from "@/components/Theme3D";

const INK = "#111111";
const YELLOW = "#FFE45C";
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SANS = '"Bricolage Grotesque", "DM Sans", system-ui, sans-serif';
/** The zine's paper, tinted with the gift's background like its pages. */
const paper = (bg: string) => `color-mix(in srgb, ${bg} 24%, #f4f1ea)`;

/** The two halves of the band, torn down the middle with matching ragged edges. */
const TEAR_LEFT =
  "polygon(0 0, 100% 0, 97% 14%, 100% 28%, 96% 42%, 100% 57%, 97% 71%, 100% 86%, 97% 100%, 0 100%)";
const TEAR_RIGHT =
  "polygon(-3% 0, 100% 0, 100% 100%, -3% 100%, 0 86%, -3% 71%, 1% 57%, -3% 42%, 0 28%, -3% 14%)";

const mono = (size: string): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  letterSpacing: ".12em",
  textTransform: "uppercase",
});

export function ZineOpening(p: OpeningProps) {
  const h = useHaptics();
  const accent = p.palette.accent;
  const coverRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [ripped, setRipped] = useState(false);
  const [pull, setPull] = useState(0);
  useOpenSequence(p, ripped, coverRef, {
    hold: 1800,
    cast,
    colors: [accent, YELLOW, INK, "#FFFFFF"],
  });
  useHint(p, "Rip the band to open your zine", ripped);

  function rip() {
    if (ripped || !live(p)) return;
    setRipped(true);
    foley("rip");
    h.thud();
  }
  useAutoplay(p, [[900, rip]]);

  const friends = p.contributors.length;
  const names = (p.contributors.length ? p.contributors : ["Your", "people"]).map((n) =>
    n.toUpperCase(),
  );
  const issueDate = new Date()
    .toLocaleDateString(undefined, { month: "short", year: "numeric" })
    .toUpperCase();
  const name = p.recipient.toUpperCase();
  const ransomSize = Math.min(19, 80 / Math.max(3, [...name].length));

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{ fontFamily: SANS, color: INK }}
    >
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(76cqi, 330px)", aspectRatio: "0.72" }}
      >
        <Buddy p={p} ref={cast} size={80} className="-bottom-[10%] -left-[10%]" />
        <Object3D
          pose={{ x: 8, y: -10, z: -3 }}
          strength={8}
          settle={ripped}
          className="absolute inset-0"
        >
          {/* The cover: a photocopied page, pasted down with a hard shadow like the cut-outs inside. */}
          <div
            ref={coverRef}
            className="@container absolute inset-0 overflow-hidden px-[7%] pt-[6%]"
            style={{
              backgroundColor: "#FFFDF8",
              backgroundImage:
                "radial-gradient(rgba(0,0,0,.07) 1px, transparent 1.2px), radial-gradient(rgba(0,0,0,.04) 1px, transparent 1.2px)",
              backgroundSize: "7px 7px, 13px 13px",
              backgroundPosition: "0 0, 3px 5px",
              border: `3px solid ${INK}`,
              boxShadow: `8px 8px 0 ${INK}`,
            }}
          >
            {/* Masthead. */}
            <div
              style={{ borderTop: `5px solid ${INK}`, borderBottom: `2px solid ${INK}` }}
              className="pt-[2.5cqw] pb-[4cqw]"
            >
              <div className="flex items-center justify-between" style={mono("2.9cqw")}>
                <span>Issue 01 · {issueDate}</span>
                <span>Priceless</span>
              </div>
              <div className="mt-[4cqw] leading-none" style={{ fontSize: `${ransomSize}cqw` }}>
                <Ransom text={name} accent={accent} />
              </div>
            </div>

            <p
              className="mt-[4cqw] text-[8.4cqw] leading-[1] font-extrabold tracking-[-0.02em]"
              style={{
                fontFamily: "var(--jb-display, inherit)",
                fontVariationSettings: '"wdth" 85',
              }}
            >
              {p.greeting}
            </p>
            <Scribble color={accent} />

            {/* A box like the countdown inside, and a sticky note taped on. */}
            <div className="mt-[5cqw] flex items-start gap-[4cqw]">
              <div
                className="shrink-0 px-[3.4cqw] py-[2.6cqw]"
                style={{
                  border: `3px solid ${INK}`,
                  background: "#fff",
                  boxShadow: `5px 5px 0 ${INK}`,
                }}
              >
                <span className="block" style={mono("2.6cqw")}>
                  Made by
                </span>
                <span className="block text-[15cqw] leading-[0.9] font-extrabold">
                  {friends || "all"}
                </span>
                <span className="block" style={mono("2.6cqw")}>
                  {friends === 1 ? "Friend" : "Friends"}
                </span>
              </div>
              <div
                className="relative mt-[2cqw] -rotate-[3deg] px-[3.4cqw] pt-[4cqw] pb-[3cqw] text-[4.4cqw] leading-[1.15]"
                style={{
                  background: "#FFF6B8",
                  border: `2px solid ${INK}`,
                  boxShadow: `4px 4px 0 ${INK}`,
                  fontFamily: "var(--jb-display, inherit)",
                }}
              >
                <span
                  className="absolute -top-[10px] left-1/2 h-[18px] w-[56%] -translate-x-1/2 rotate-[2deg]"
                  style={{
                    background: "rgba(255,228,92,.8)",
                    boxShadow: "0 1px 2px rgba(0,0,0,.15)",
                  }}
                  aria-hidden
                />
                Cut, pasted and slightly unhinged.
              </div>
            </div>

            {/* A photocopied photo, taped in, over a block of the accent. */}
            <span
              className="absolute bottom-[13%] left-[6%] block h-[17cqw] w-[30cqw] -rotate-[4deg]"
              style={{
                border: `2px solid ${INK}`,
                background: `radial-gradient(${INK} 1.1px, transparent 1.5px) 0 0 / 5px 5px, ${accent}`,
                boxShadow: `4px 4px 0 ${INK}`,
              }}
              aria-hidden
            />
            <span
              className="absolute right-[7%] bottom-[9%] block w-[46cqw] rotate-[3deg] bg-white p-[2cqw] pb-[6cqw]"
              style={{ border: `2px solid ${INK}`, boxShadow: `5px 5px 0 ${INK}` }}
              aria-hidden
            >
              <span
                className="block aspect-[4/3] w-full overflow-hidden"
                style={{ background: "#eee" }}
              >
                <img
                  src={themeStillUrl(p.kind)}
                  alt=""
                  draggable={false}
                  className="size-full object-cover"
                  style={{
                    filter: "grayscale(1) contrast(1.35) brightness(1.05)",
                    mixBlendMode: "multiply",
                  }}
                />
              </span>
              <span
                className="absolute -top-[9px] left-1/2 h-[16px] w-[50%] -translate-x-1/2 -rotate-[3deg]"
                style={{
                  background: "rgba(255,228,92,.8)",
                  boxShadow: "0 1px 2px rgba(0,0,0,.15)",
                }}
              />
              <span className="absolute bottom-[1.4cqw] left-[2.4cqw]" style={mono("2.4cqw")}>
                Vol. 1 · No. 1
              </span>
            </span>
            {/* Barcode. */}
            <span
              className="absolute bottom-[4%] left-[7%] block h-[6cqw] w-[20cqw]"
              style={{
                background: `repeating-linear-gradient(90deg, ${INK} 0 1px, transparent 1px 2.5px, ${INK} 2.5px 4px, transparent 4px 5px, ${INK} 5px 5.6px, transparent 5.6px 7.4px)`,
              }}
              aria-hidden
            />

            {/* Stickers slap on once the band is off. */}
            {[
              { t: "WOW", bg: YELLOW, x: 66, y: 22 },
              { t: "♥", bg: accent, x: 76, y: 60 },
              { t: "★", bg: "#fff", x: 30, y: 63 },
            ].map((s, i) => (
              <motion.span
                key={s.t}
                className="absolute grid aspect-square w-[17%] place-items-center rounded-full text-[5cqw] font-extrabold"
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  background: s.bg,
                  color: s.bg === accent ? readableInk(accent) : INK,
                  border: `2px solid ${INK}`,
                }}
                initial={false}
                animate={
                  ripped
                    ? { scale: 1, rotate: (seed(s.t) - 0.5) * 36, opacity: 1 }
                    : { scale: 1.8, rotate: 0, opacity: 0 }
                }
                transition={
                  p.reduced ? { duration: 0 } : { ...SPRING.snappy, delay: 0.3 + i * 0.16 }
                }
                aria-hidden
              >
                {s.t}
              </motion.span>
            ))}
          </div>

          {/* Tape holding the cover down on the desk. */}
          <span
            className="pointer-events-none absolute -top-[2%] -left-[5%] z-[2] h-[5%] w-[24%] -rotate-[32deg]"
            style={{ background: "rgba(255,228,92,.75)", boxShadow: "0 1px 2px rgba(0,0,0,.15)" }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -right-[6%] -bottom-[1%] z-[2] h-[5%] w-[24%] -rotate-[30deg]"
            style={{ background: "rgba(255,255,255,.7)", boxShadow: "0 1px 2px rgba(0,0,0,.15)" }}
            aria-hidden
          />

          {/* The band: the ticker of names from inside, in two halves that tear apart. */}
          <div
            className="absolute inset-x-[-6%] top-[54%] h-[11%] cursor-pointer touch-none outline-none"
            style={{ zIndex: 3, rotate: "-4deg" }}
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
                  background: accent,
                  borderBlock: `3px solid ${INK}`,
                  clipPath: half ? TEAR_RIGHT : TEAR_LEFT,
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
                {/* One long strip of names; each half shows its own side of it. */}
                <span
                  className="absolute inset-y-0 w-[200%] overflow-hidden"
                  style={{ left: half ? "-100%" : 0 }}
                >
                  <span
                    className={`flex h-full w-max items-center whitespace-nowrap ${p.reduced || p.paused ? "" : "[animation:zine-marquee_22s_linear_infinite]"}`}
                    style={{
                      color: readableInk(accent),
                      fontWeight: 800,
                      fontSize: "clamp(14px,4.6cqi,20px)",
                      letterSpacing: ".02em",
                    }}
                  >
                    {[0, 1].map((rep) => (
                      <span key={rep} className="flex">
                        {[...names, ...names].map((n, i) => (
                          <span key={i} className="pr-[1.2em]">
                            {n} <b style={{ color: INK }}>✶</b>
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                </span>
              </motion.div>
            ))}
          </div>
        </Object3D>
      </Layer>

      <div className="mt-[min(11cqi,48px)] h-11">
        <FallbackButton onClick={rip} color={INK} ink={INK} hidden={ripped || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The desk: the zine's own photocopy paper and dots, a shade deeper at the edges. */
export const zineBackground = (palette: Palette): React.CSSProperties => ({
  background: [
    "radial-gradient(rgba(0,0,0,.07) 1px, transparent 1.2px) 0 0 / 7px 7px",
    "radial-gradient(rgba(0,0,0,.04) 1px, transparent 1.2px) 3px 5px / 13px 13px",
    "radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,.12))",
    paper(palette.background),
  ].join(","),
});
