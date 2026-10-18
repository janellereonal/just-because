/**
 * STORYBOOK: a lilac cloth hardcover with a gold-foil title, a clay moon and a
 * pink ribbon, on a dreamy dusk sky with drifting clouds. Gesture: open the
 * cover (drag it to the left, or tap). It swings open on the spine and the
 * first page reads "Chapter one" with the greeting, like the book the notes are
 * read in.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen, Texture } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { live, pressable, signoff, useAutoplay, useHint, useOpenSequence } from "./kit";
import {
  Buddy,
  Clay,
  FONTS,
  Gloss,
  Sparkles,
  display,
  pastelStage,
  puffy,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const GOLD = "linear-gradient(135deg, #E9C46A, #FFF4CC 35%, #F2CF74 55%, #FFFBE6 75%, #E9C46A)";
const C = {
  cloth: "#A99CF0",
  clothDeep: "#8A7BE0",
  ink: "#3F3566",
  pink: "#F28FB0",
  pinkInk: "#C2477A",
  paper: "#FFFBF3",
  tint: "90,70,160",
};

const foil = {
  backgroundImage: GOLD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  // A hairline of shade under the foil so it reads on the lilac cloth.
  filter: "drop-shadow(0 1.5px 0 rgba(60,40,130,.55))",
} as const;

export function StorybookOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.story, FONTS.round);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0);
  const shift = useTransform(angle, [0, -170], ["-25%", "0%"]);
  const shade = useTransform(angle, [0, -100, -170], [0, 0.25, 0.08]);
  const ribbon = useTransform(angle, [0, -20], [1, 0]);
  // Closed, only the right half (the book) casts a shadow; it widens as the cover opens.
  const shadowLeft = useTransform(angle, [0, -40], ["50%", "0%"]);
  useOpenSequence(p, open, pageRef, {
    hold: 2200,
    cast,
    colors: ["#FFE58A", C.pink, "#CFC4FF", "#FFFFFF"],
  });
  useHint(p, "Open the book to start the story", open);

  function openCover() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("paper");
    h.thud();
    void animate(angle, -170, p.reduced ? { duration: 0 } : { ...SPRING.heavy, stiffness: 70 });
  }
  useAutoplay(p, [[900, openCover]]);

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      {/* The sky around the book: clouds drifting, the moon up high. */}
      <Layer
        depth={-10}
        className="pointer-events-none absolute inset-x-0 -top-[45%] -bottom-[40%]"
      >
        <Clay
          id="cloud"
          float
          reduced={p.reduced}
          shadow={C.tint}
          className="top-[6%] left-[-6%] w-[30%]"
        />
        <Clay
          id="cloud"
          float
          delay={1.3}
          reduced={p.reduced}
          shadow={C.tint}
          className="right-[-8%] bottom-[10%] w-[32%]"
        />
        <Clay
          id="moon"
          float
          delay={0.6}
          rotate={-12}
          reduced={p.reduced}
          shadow={C.tint}
          className="top-[10%] right-[8%] w-[17%]"
        />
        <Sparkles
          reduced={p.reduced}
          color="#FFF2B8"
          spots={[
            [28, 18, 14],
            [62, 10, 18],
            [86, 40, 12],
            [8, 64, 16],
            [40, 88, 14],
          ]}
        />
      </Layer>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.42" }}
      >
        <Buddy p={p} ref={cast} size={78} className="-right-[2%] -bottom-[16%]" />
        <Object3D
          pose={{ x: 16, y: -10, z: -1 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: shift, transformStyle: "preserve-3d" }}
          >
            <motion.div className="absolute inset-y-0 right-0" style={{ left: shadowLeft }}>
              <FloorShadow tint={C.tint} depth={12} radius={12} className="inset-0" />
            </motion.div>
            {/* Right page: chapter one. */}
            <div
              ref={pageRef}
              className="absolute inset-y-[2%] right-[1%] left-1/2 overflow-hidden rounded-r-[8px] px-[9%] pt-[13%]"
              style={{
                background: C.paper,
                boxShadow: `inset 14px 0 18px -14px rgba(${C.tint},.35), ${soft(C.tint, 0.5)}`,
              }}
            >
              <Texture material="paper" opacity={0.45} />
              <motion.div
                initial={false}
                animate={{ opacity: open ? 1 : 0, y: open ? 0 : 8 }}
                transition={{ duration: p.reduced ? 0 : 0.7, delay: p.reduced ? 0 : 0.9 }}
                className="relative"
              >
                <span
                  className="block text-[clamp(9px,2.6cqi,11px)] tracking-[0.24em] uppercase"
                  style={{ ...text(600), color: C.pinkInk }}
                >
                  Chapter one
                </span>
                <span
                  className="mt-2 block text-[clamp(1.15rem,5.4cqi,1.8rem)] leading-[1.06] italic"
                  style={{
                    ...display(600),
                    color: C.ink,
                    fontVariationSettings: '"SOFT" 100, "opsz" 72',
                  }}
                >
                  {p.greeting}
                </span>
                <span
                  className="mt-3 block h-[2px] w-10 rounded-full"
                  style={{ background: C.pink }}
                />
              </motion.div>
              <Clay
                id="star"
                show={open}
                delay={1.3}
                rotate={-10}
                reduced={p.reduced}
                shadow={C.tint}
                className="right-[10%] bottom-[10%] w-[24%]"
              />
            </div>
            {/* Page block edges under the cover. */}
            <div
              className="absolute inset-y-[2%] right-[0.5%] left-1/2 rounded-r-[8px]"
              style={{
                background: "repeating-linear-gradient(90deg, #EFE7F7 0 1px, #FFFAF2 1px 3px)",
                transform: "translateZ(-2px)",
              }}
            />

            {/* The cover, hinged on the spine. */}
            <motion.div
              className="absolute inset-y-0 right-0 left-1/2 cursor-pointer touch-none outline-none"
              style={{ originX: 0, rotateY: angle, transformStyle: "preserve-3d", zIndex: 3 }}
              onPan={(_, info) => {
                if (open || !live(p)) return;
                angle.set(Math.max(-170, Math.min(0, info.offset.x * 0.9)));
              }}
              onPanEnd={(_, info) => {
                if (open || !live(p)) return;
                if (info.offset.x < -70) openCover();
                else void animate(angle, 0, SPRING.snappy);
              }}
              {...pressable(openCover, !open && live(p), "Open the book")}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[4px] rounded-r-[14px]"
                style={{
                  background: `linear-gradient(160deg, #C3B9FA, ${C.cloth} 50%, ${C.clothDeep})`,
                  backfaceVisibility: "hidden",
                  boxShadow: `${puffy("70,50,150", 1.2)}, inset 12px 0 16px -10px rgba(60,40,130,.35), ${soft(C.tint, 0.9)}`,
                }}
              >
                <Texture material="linen" opacity={0.4} blend="multiply" />
                <span
                  className="absolute inset-[7%] rounded-[10px]"
                  style={{
                    border: "2px solid transparent",
                    borderImage: `${GOLD} 1`,
                    opacity: 0.9,
                  }}
                  aria-hidden
                />
                <div className="absolute inset-x-[12%] top-[15%] text-center">
                  <span
                    className="block text-[clamp(9px,2.6cqi,11px)] tracking-[0.28em] uppercase"
                    style={{ ...foil, ...text(600) }}
                  >
                    The story of
                  </span>
                  <span
                    className="mt-1.5 block truncate pb-[0.08em] text-[clamp(1.5rem,7.6cqi,2.5rem)] leading-[1.02] italic"
                    style={{
                      ...foil,
                      ...display(700),
                      fontVariationSettings: '"SOFT" 100, "opsz" 144',
                    }}
                  >
                    {p.recipient}
                  </span>
                </div>
                <Clay
                  id="moon"
                  rotate={-16}
                  reduced={p.reduced}
                  shadow="60,40,130"
                  className="bottom-[13%] left-[33%] w-[34%]"
                />
                <Clay
                  id="star"
                  rotate={12}
                  reduced={p.reduced}
                  shadow="60,40,130"
                  className="right-[16%] bottom-[40%] w-[13%]"
                />
                <Clay
                  id="star"
                  rotate={-20}
                  reduced={p.reduced}
                  shadow="60,40,130"
                  className="bottom-[16%] left-[17%] w-[10%]"
                />
                <Gloss strength={0.32} height="34%" />
                <Sheen strength={0.35} angle={120} width={26} />
                <motion.span
                  className="absolute inset-0 bg-[#2a2350]"
                  style={{ opacity: shade }}
                  aria-hidden
                />
              </div>
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[14px] px-[9%] pt-[14%]"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  background: "#FBF5FF",
                  boxShadow: `inset -14px 0 18px -14px rgba(${C.tint},.35)`,
                }}
              >
                <Texture material="paper" opacity={0.45} />
                <span
                  className="relative block text-center text-[clamp(1.6rem,7cqi,2.4rem)]"
                  style={{ color: C.pink }}
                  aria-hidden
                >
                  ❦
                </span>
                <span
                  className="relative mt-3 block text-center text-[clamp(9px,2.6cqi,11px)] tracking-[0.2em] uppercase"
                  style={{ ...text(600), color: C.pinkInk }}
                >
                  Written by
                </span>
                <span
                  className="relative mt-1 block text-center text-[clamp(12px,3.6cqi,16px)] leading-snug italic"
                  style={{ ...display(500), color: C.ink }}
                >
                  {signoff(p.contributors)}
                </span>
              </div>
            </motion.div>
            {/* Ribbon bookmark. */}
            <motion.span
              className="absolute bottom-[-10%] left-[70%] z-[4] h-[17%] w-[4.5%]"
              style={{
                background: `linear-gradient(90deg, #E5739B, ${C.pink} 50%, #E5739B)`,
                clipPath: "polygon(0 0,100% 0,100% 100%,50% 80%,0 100%)",
                opacity: ribbon,
              }}
              aria-hidden
            />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(11cqi,48px)] h-11">
        <FallbackButton
          onClick={openCover}
          color={C.clothDeep}
          ink={C.ink}
          hidden={open || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const storybookBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#D9D2FF",
    bottom: "#FFE2D6",
    glow: "#FFFFFFCC",
    blobs: [
      ["#FFD1E3CC", 14, 70, 60],
      ["#FFF1BFAA", 84, 22, 50],
    ],
  });
