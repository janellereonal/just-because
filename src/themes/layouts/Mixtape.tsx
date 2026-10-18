/**
 * MIXTAPE: a cassette with a handwritten label, above a little tape deck.
 * Gesture: push the tape into the deck (drag it down, or tap), then it plays:
 * the reels turn, the counter runs and the VU needle jumps, like Side A starting.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import {
  FloorShadow,
  Object3D,
  Sheen,
  TEXTURE,
  TEXTURE_SOFT,
  Texture,
  elevation,
} from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { giftColors, live, pressable, useAutoplay, useOpenSequence } from "./kit";

function Reel({ spinning, reduced }: { spinning: boolean; reduced: boolean }) {
  return (
    <motion.span
      className="relative grid aspect-square w-[22%] place-items-center rounded-full"
      style={{ background: "radial-gradient(circle, #f4efe6 0 26%, #3a2f2a 27% 60%, #f4efe6 61%)" }}
      animate={spinning && !reduced ? { rotate: 360 } : { rotate: 0 }}
      transition={
        spinning && !reduced ? { duration: 1.2, ease: "linear", repeat: Infinity } : { duration: 0 }
      }
      aria-hidden
    >
      {[0, 60, 120].map((r) => (
        <span
          key={r}
          className="absolute h-[34%] w-[8%] rounded-[2px] bg-[#f4efe6]"
          style={{ rotate: `${r}deg` }}
        />
      ))}
    </motion.span>
  );
}

export function MixtapeOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const deckRef = useRef<HTMLDivElement | null>(null);
  const [inDeck, setInDeck] = useState(false);
  const drop = useMotionValue(0);
  const y = useTransform(drop, [0, 1], ["0%", "62%"]);
  const scale = useTransform(drop, [0, 1], [1, 0.82]);
  const beat = useOpenSequence(p, inDeck, deckRef, 2200);
  const playing = beat >= 1;

  function play() {
    if (inDeck || !live(p)) return;
    setInDeck(true);
    foley("thunk");
    h.thud();
    void animate(drop, 1, p.reduced ? { duration: 0 } : SPRING.snappy);
  }
  useAutoplay(p, [[900, play]]);

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(84cqi, 380px)", aspectRatio: "0.95" }}
      >
        <Object3D
          pose={{ x: 14, y: -8, z: 0 }}
          strength={8}
          settle={inDeck}
          className="absolute inset-0"
        >
          {/* The deck. */}
          <div
            ref={deckRef}
            className="absolute inset-x-0 bottom-0 h-[52%] overflow-hidden rounded-[18px] px-[6%] pt-[6%]"
            style={{
              background: "linear-gradient(180deg, #E9E3D8, #C9C1B3)",
              boxShadow: elevation(0.55, "30,25,20"),
            }}
          >
            <Texture material="brushed" opacity={0.35} blend="multiply" />
            <div className="relative flex h-[56%] items-center gap-[4%]">
              <div
                className="relative h-full flex-1 rounded-[10px]"
                style={{ background: "#1d1a19", boxShadow: "inset 0 3px 10px rgba(0,0,0,.6)" }}
              >
                <span
                  className="absolute inset-x-[10%] top-[18%] h-[64%] rounded-[6px]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.02))",
                  }}
                  aria-hidden
                />
              </div>
              <div
                className="flex h-full w-[30%] flex-col justify-between rounded-[10px] p-[5%]"
                style={{ background: "#2a2522", boxShadow: "inset 0 2px 8px rgba(0,0,0,.6)" }}
              >
                <span
                  className="font-mono text-[clamp(14px,4.6cqi,20px)] tracking-[0.1em] text-[#F2C14E]"
                  aria-label="Tape counter"
                >
                  {playing ? "001" : "000"}
                </span>
                {/* VU meter. */}
                <span
                  className="relative block h-[44%] overflow-hidden rounded-t-full"
                  style={{ background: "#F7EBD0" }}
                  aria-hidden
                >
                  <motion.span
                    className="absolute bottom-0 left-1/2 h-[86%] w-[3px] origin-bottom rounded-full bg-[#B23A2E]"
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
                  className="grid h-[clamp(26px,8cqi,36px)] flex-1 place-items-center rounded-[6px] text-[clamp(11px,3.4cqi,14px)]"
                  style={{
                    background: k === "▶" ? c.accent : "#F4EFE6",
                    color: k === "▶" ? c.onAccent : "#3a2f2a",
                    boxShadow:
                      k === "▶" && inDeck
                        ? "inset 0 2px 4px rgba(0,0,0,.35)"
                        : "0 3px 0 rgba(0,0,0,.25)",
                    transform: k === "▶" && inDeck ? "translateY(2px)" : undefined,
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <FloorShadow
            tint="30,25,20"
            depth={12}
            radius={18}
            className="inset-x-0 bottom-0 top-[48%]"
          />

          {/* The cassette. */}
          <motion.div
            className="absolute inset-x-[8%] top-0 h-[46%] cursor-pointer touch-none rounded-[12px] outline-none"
            style={{
              y,
              scale,
              background: "linear-gradient(170deg, #2e2a33, #18161b)",
              boxShadow: elevation(0.6, "20,15,25"),
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
            <Texture material="grain" opacity={0.25} blend="overlay" />
            {/* Label. */}
            <div
              className="absolute inset-x-[6%] top-[8%] h-[62%] overflow-hidden rounded-[6px] px-[5%] pt-[4%]"
              style={{
                background: "#FBF5E6",
                backgroundImage: `linear-gradient(180deg, transparent 0 28%, ${c.accent} 28% 34%, transparent 34%), ${TEXTURE.paper}`,
              }}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className="text-[clamp(9px,2.6cqi,11px)] font-bold tracking-[0.14em] text-[#3a2f2a] uppercase"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  Side A
                </span>
                <span
                  className="text-[clamp(9px,2.6cqi,11px)] text-[#3a2f2a]/70"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  {p.contributors.length ? `${p.contributors.length} tracks` : "C-60"}
                </span>
              </div>
              <span
                className="mt-[6%] block truncate text-[clamp(1rem,5cqi,1.6rem)] leading-tight text-[#2b2522]"
                style={{ fontFamily: "var(--jb-display)", fontWeight: 700, rotate: "-1.5deg" }}
              >
                {p.greeting}
              </span>
              {/* Reels window. */}
              <div
                className="absolute inset-x-[16%] bottom-[8%] flex h-[34%] items-center justify-between rounded-full px-[4%]"
                style={{ background: "#2a2522" }}
              >
                <Reel spinning={playing} reduced={p.reduced} />
                <span
                  className="h-[30%] flex-1 rounded-[2px]"
                  style={{ background: "rgba(120,80,50,.6)" }}
                  aria-hidden
                />
                <Reel spinning={playing} reduced={p.reduced} />
              </div>
            </div>
            {[18, 82].map((x) => (
              <span
                key={x}
                className="absolute bottom-[10%] size-[5%] rounded-full bg-[#0f0d10]"
                style={{ left: `${x}%` }}
                aria-hidden
              />
            ))}
            <Sheen strength={0.3} angle={115} width={24} />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(7cqi,32px)] h-11">
        <FallbackButton onClick={play} color="#ffffff" ink="#ffffff" hidden={inDeck || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const mixtapeBackground = (): React.CSSProperties => ({
  backgroundColor: "#3B3047",
  backgroundImage: [
    "radial-gradient(55% 45% at 50% 42%, #6B5A7E, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 50%, #1a1420aa)",
    TEXTURE_SOFT.paper,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px",
});
