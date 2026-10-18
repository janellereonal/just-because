/**
 * MIXTAPE: a see-through jelly-pink cassette with a rainbow label, above a
 * little mint tape deck. Gesture: push the tape into the deck (drag it down,
 * or tap), then it plays: the reels turn, the counter runs, the VU needle
 * jumps and little notes float up, like Side A starting.
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
  pastelStage,
  puffy,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const C = {
  jelly: "rgba(255,160,196,.82)",
  jellyDeep: "rgba(236,110,160,.9)",
  mint: "#B6E6D6",
  mintDeep: "#86CDB7",
  plum: "#4B3F73",
  ink: "#4B3F73",
  pink: "#F27BA3",
  butter: "#FFE38A",
  lilac: "#CDBDFF",
  tint: "120,80,170",
};

const STRIPES = ["#F7A8C4", "#FFE38A", "#A8E0CC", "#CDBDFF"];

function Reel({ spinning, reduced }: { spinning: boolean; reduced: boolean }) {
  return (
    <motion.span
      className="relative grid aspect-square w-[24%] place-items-center rounded-full"
      style={{
        background:
          "radial-gradient(circle, #FFE1EC 0 22%, #FFFFFF 23% 58%, #F7C3D6 59% 64%, #FFFFFF 65%)",
        boxShadow: "0 2px 4px rgba(120,80,170,.25)",
      }}
      animate={spinning && !reduced ? { rotate: 360 } : { rotate: 0 }}
      transition={
        spinning && !reduced ? { duration: 1.2, ease: "linear", repeat: Infinity } : { duration: 0 }
      }
      aria-hidden
    >
      {[0, 60, 120].map((r) => (
        <span
          key={r}
          className="absolute h-[30%] w-[9%] rounded-full bg-[#F27BA3]"
          style={{ rotate: `${r}deg` }}
        />
      ))}
    </motion.span>
  );
}

export function MixtapeOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [inDeck, setInDeck] = useState(false);
  const drop = useMotionValue(0);
  const y = useTransform(drop, [0, 1], ["0%", "62%"]);
  const scale = useTransform(drop, [0, 1], [1, 0.82]);
  const beat = useOpenSequence(p, inDeck, deckRef, {
    hold: 2300,
    cast,
    colors: [C.pink, C.butter, C.mint, C.lilac, "#FFFFFF"],
  });
  const playing = beat >= 1;
  useHint(p, "Push the tape into the deck to play it", inDeck);

  function play() {
    if (inDeck || !live(p)) return;
    setInDeck(true);
    foley("thunk");
    h.thud();
    void animate(drop, 1, p.reduced ? { duration: 0 } : SPRING.snappy);
  }
  useAutoplay(p, [[900, play]]);

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(84cqi, 380px)", aspectRatio: "0.95" }}
      >
        <Sparkles
          reduced={p.reduced}
          spots={[
            [-4, 6, 18],
            [104, 18, 14],
            [-6, 60, 12],
            [106, 92, 16],
          ]}
        />
        <Buddy p={p} ref={cast} size={78} className="-right-[6%] -bottom-[10%]" />
        {/* Notes float up while it plays. */}
        {playing && !p.reduced
          ? ["♪", "♫", "♪", "♥"].map((n, i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute bottom-[44%] z-[5] text-[clamp(18px,6cqi,28px)]"
                style={{ left: `${20 + i * 20}%`, color: [C.pink, C.plum, "#7FC8B0", C.pink][i] }}
                initial={{ y: 0, opacity: 0, scale: 0.6 }}
                animate={{
                  y: [-10, -90],
                  opacity: [0, 1, 0],
                  scale: [0.6, 1.1, 1],
                  x: [0, i % 2 ? 10 : -10],
                }}
                transition={{ duration: 2.2, delay: i * 0.35, repeat: Infinity, repeatDelay: 0.3 }}
                aria-hidden
              >
                {n}
              </motion.span>
            ))
          : null}
        <Object3D
          pose={{ x: 14, y: -8, z: 0 }}
          strength={8}
          settle={inDeck}
          className="absolute inset-0"
        >
          <FloorShadow
            tint={C.tint}
            depth={12}
            radius={24}
            className="inset-x-0 top-[48%] bottom-0"
          />
          {/* The deck. */}
          <div
            ref={deckRef}
            className="absolute inset-x-0 bottom-0 h-[52%] overflow-hidden rounded-[26px] px-[6%] pt-[6%]"
            style={{
              background: `linear-gradient(170deg, #CDEFE3, ${C.mint} 45%, ${C.mintDeep})`,
              boxShadow: `${puffy("40,120,100", 1.4)}, ${soft(C.tint, 0.9)}`,
            }}
          >
            <div className="relative flex h-[56%] items-center gap-[4%]">
              <div
                className="relative h-full flex-1 rounded-[14px]"
                style={{ background: "#5B4F86", boxShadow: "inset 0 3px 10px rgba(30,20,60,.5)" }}
              >
                <span
                  className="absolute inset-x-[10%] top-[18%] h-[64%] rounded-[8px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.03))",
                  }}
                  aria-hidden
                />
                <Clay
                  id="heart"
                  reduced={p.reduced}
                  shadow="30,20,60"
                  className="top-1/2 left-1/2 w-[22%] -translate-x-1/2 -translate-y-1/2 opacity-80"
                />
              </div>
              <div
                className="flex h-full w-[30%] flex-col justify-between rounded-[14px] p-[5%]"
                style={{ background: C.plum, boxShadow: "inset 0 2px 8px rgba(20,10,40,.5)" }}
              >
                <span
                  className="font-mono text-[clamp(14px,4.6cqi,20px)] tracking-[0.1em] text-[#FFB3CC]"
                  aria-label="Tape counter"
                >
                  {playing ? "001" : "000"}
                </span>
                {/* VU meter. */}
                <span
                  className="relative block h-[44%] overflow-hidden rounded-t-full"
                  style={{ background: "#FFF3D6" }}
                  aria-hidden
                >
                  <motion.span
                    className="absolute bottom-0 left-1/2 h-[86%] w-[3px] origin-bottom rounded-full"
                    style={{ background: C.pink }}
                    animate={
                      playing && !p.reduced ? { rotate: [-40, 20, -5, 30, 0, 25] } : { rotate: -40 }
                    }
                    transition={
                      playing && !p.reduced
                        ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 0.2 }
                    }
                  />
                </span>
              </div>
            </div>
            {/* Keys. */}
            <div className="relative mt-[5%] flex gap-[3%]">
              {["⏮", "▶", "⏸", "⏭"].map((k) => (
                <button
                  key={k}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={k === "▶" ? play : undefined}
                  className="grid h-[clamp(28px,8.5cqi,38px)] flex-1 place-items-center rounded-[10px] text-[clamp(11px,3.4cqi,14px)]"
                  style={{
                    background: k === "▶" ? C.pink : "#FFFFFF",
                    color: k === "▶" ? "#FFFFFF" : C.plum,
                    boxShadow:
                      k === "▶" && inDeck
                        ? "inset 0 2px 4px rgba(120,40,80,.35)"
                        : "0 3px 0 rgba(40,120,100,.35)",
                    transform: k === "▶" && inDeck ? "translateY(2px)" : undefined,
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
            <Gloss strength={0.4} height="30%" />
          </div>

          {/* The cassette. */}
          <motion.div
            className="absolute inset-x-[8%] top-0 h-[46%] cursor-pointer touch-none overflow-hidden rounded-[16px] outline-none"
            style={{
              y,
              scale,
              background: `linear-gradient(165deg, rgba(255,196,218,.9), ${C.jelly} 50%, ${C.jellyDeep})`,
              boxShadow: `${puffy("200,70,120", 1.2)}, inset 0 0 0 1.5px rgba(255,255,255,.55), ${soft(C.tint, 1)}`,
              zIndex: 3,
            }}
            onPan={(_, info) => {
              if (inDeck || !live(p)) return;
              drop.set(Math.max(0, Math.min(0.7, info.offset.y / 220)));
            }}
            onPanEnd={(_, info) => {
              if (inDeck || !live(p)) return;
              if (info.offset.y > 50) play();
              else void animate(drop, 0, SPRING.snappy);
            }}
            {...pressable(play, !inDeck && live(p), "Put the tape in and press play")}
          >
            {/* Screws. */}
            {[
              ["4%", "6%"],
              ["92%", "6%"],
              ["4%", "84%"],
              ["92%", "84%"],
            ].map(([l, t]) => (
              <span
                key={`${l}${t}`}
                className="absolute size-[4%] rounded-full"
                style={{
                  left: l,
                  top: t,
                  background: "radial-gradient(circle at 35% 30%, #fff, #F2C6D8)",
                }}
                aria-hidden
              />
            ))}
            {/* Label. */}
            <div
              className="absolute inset-x-[8%] top-[9%] h-[72%] overflow-hidden rounded-[10px] px-[5%] pt-[4%]"
              style={{ background: "#FFFBF4", boxShadow: "0 2px 4px rgba(200,70,120,.2)" }}
            >
              <div className="absolute inset-x-0 top-0 flex h-[16%]" aria-hidden>
                {STRIPES.map((s) => (
                  <span key={s} className="flex-1" style={{ background: s }} />
                ))}
              </div>
              <div className="relative mt-[9%] flex items-baseline justify-between">
                <span
                  className="text-[clamp(9px,2.6cqi,11px)] tracking-[0.14em] uppercase"
                  style={{ ...text(700), color: C.pink }}
                >
                  Side A
                </span>
                <span
                  className="text-[clamp(9px,2.6cqi,11px)]"
                  style={{ ...text(600), color: `${C.plum}AA` }}
                >
                  {p.contributors.length ? `${p.contributors.length} tracks` : "C-60"}
                </span>
              </div>
              <span
                className="relative block truncate text-[clamp(1rem,5cqi,1.6rem)] leading-tight"
                style={{ ...display(700), color: C.plum }}
              >
                {p.greeting}
              </span>
              {/* Reels window. */}
              <div
                className="absolute inset-x-[18%] bottom-[7%] flex h-[30%] items-center justify-between rounded-full px-[4%]"
                style={{
                  background: "rgba(205,189,255,.55)",
                  boxShadow: "inset 0 1px 4px rgba(75,63,115,.25)",
                }}
              >
                <Reel spinning={playing} reduced={p.reduced} />
                <span
                  className="h-[26%] flex-1 rounded-full"
                  style={{ background: "rgba(242,123,163,.4)" }}
                  aria-hidden
                />
                <Reel spinning={playing} reduced={p.reduced} />
              </div>
            </div>
            <Gloss strength={0.55} height="40%" />
            <Sheen strength={0.4} angle={115} width={24} />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(8cqi,36px)] h-11">
        <FallbackButton onClick={play} color={C.plum} ink={C.ink} hidden={inDeck || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const mixtapeBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#F1EAFF",
    bottom: "#DCCFFF",
    glow: "#FFFFFFCC",
    blobs: [
      ["#FFD3E3CC", 86, 18, 55],
      ["#D2F2E6AA", 10, 86, 55],
    ],
    pattern: dotLayer("rgba(255,255,255,.55)", 1.8),
    patternSize: "22px 22px",
  });
