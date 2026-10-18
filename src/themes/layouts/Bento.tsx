/**
 * BENTO BOARD: a kawaii pink lunchbox with a sleepy little face on the lid, a
 * mint band with a heart button and a name sticker, on a picnic cloth.
 * Gesture: lift the lid (drag it up, or tap). The band slips, the lid rises and
 * slides away, and the compartments inside fill one by one with clay treats,
 * like the board.
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
  type ClayId,
  display,
  gingham,
  pastelStage,
  puffy,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const C = {
  lid: "#FFC2D1",
  lidDeep: "#F59BB4",
  band: "#A8E0CC",
  ink: "#5A3443",
  tray: "#FFFAF2",
  tint: "200,90,120",
};

const CELLS: { clay: ClayId; area: string; label: string; bg: string }[] = [
  { clay: "letter", area: "1 / 1 / 3 / 3", label: "Letters", bg: "#FFF4D6" },
  { clay: "camera", area: "1 / 3 / 2 / 5", label: "Photos", bg: "#E3F5EE" },
  { clay: "cake", area: "2 / 3 / 3 / 4", label: "Treats", bg: "#EFE8FF" },
  { clay: "heart", area: "2 / 4 / 3 / 5", label: "Love", bg: "#FFE6EC" },
];

export function BentoOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const lift = useMotionValue(0); // 0 closed, 1 lifted away
  const lidY = useTransform(lift, [0, 0.5, 1], ["0%", "-26%", "-62%"]);
  const lidX = useTransform(lift, [0, 0.5, 1], ["0%", "2%", "38%"]);
  const lidRot = useTransform(lift, [0, 1], [0, 14]);
  const lidOpacity = useTransform(lift, [0.75, 1], [1, 0]);
  useOpenSequence(p, open, boxRef, {
    hold: 2000,
    cast,
    colors: [C.lid, C.band, "#FFE58A", "#D9CCFF", "#FFFFFF"],
  });
  useHint(p, "Lift the lid to see what's inside", open);

  function liftLid() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("thunk");
    h.thud();
    void animate(lift, 1, p.reduced ? { duration: 0 } : SPRING.soft);
  }
  useAutoplay(p, [[900, liftLid]]);

  const shell = `linear-gradient(165deg, #FFD3DE, ${C.lid} 45%, ${C.lidDeep})`;

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(80cqi, 360px)", aspectRatio: "1.3", marginTop: "8%" }}
      >
        <Sparkles
          reduced={p.reduced}
          spots={[
            [-6, -8, 18],
            [104, 4, 14],
            [102, 104, 16],
            [-4, 96, 12],
          ]}
        />
        <Buddy p={p} ref={cast} size={80} className="-right-[6%] -bottom-[18%]" />
        <Object3D
          pose={{ x: 22, y: -6, z: 0 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <FloorShadow tint={C.tint} depth={14} radius={26} className="inset-0" />
          {/* The box and its compartments. */}
          <div
            ref={boxRef}
            className="absolute inset-0 overflow-hidden rounded-[26px] p-[4%]"
            style={{ background: shell, boxShadow: `${puffy(C.tint, 1.4)}, ${soft(C.tint, 1)}` }}
          >
            <div
              className="grid size-full gap-[3%] rounded-[16px] p-[3%]"
              style={{
                background: C.tray,
                gridTemplateColumns: "repeat(4, 1fr)",
                gridTemplateRows: "repeat(2, 1fr)",
                boxShadow: "inset 0 3px 8px rgba(200,90,120,.25)",
              }}
            >
              {CELLS.map((cell, i) => (
                <motion.div
                  key={cell.label}
                  className="relative grid place-items-center overflow-hidden rounded-[12px]"
                  style={{
                    gridArea: cell.area,
                    background: cell.bg,
                    boxShadow: "inset 0 2px 6px rgba(150,80,100,.16)",
                  }}
                  initial={false}
                  animate={open ? { opacity: 1, scale: 1 } : { opacity: 0.4, scale: 0.94 }}
                  transition={
                    p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.45 + i * 0.14 }
                  }
                >
                  <span className="relative flex flex-col items-center">
                    <motion.img
                      src={`/clay/${cell.clay}@256.webp`}
                      alt=""
                      draggable={false}
                      className="block"
                      style={{
                        width: i === 0 ? "clamp(40px,14cqi,64px)" : "clamp(30px,10cqi,46px)",
                        filter: "drop-shadow(0 4px 4px rgba(150,80,100,.25))",
                      }}
                      initial={false}
                      animate={open ? { scale: 1, rotate: 0 } : { scale: 0.4, rotate: -20 }}
                      transition={
                        p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.6 + i * 0.14 }
                      }
                    />
                    {i === 0 ? (
                      <span
                        className="mt-1 px-2 text-center text-[clamp(13px,4.2cqi,18px)] leading-tight"
                        style={{ ...display(700), color: C.ink }}
                      >
                        {p.greeting}
                      </span>
                    ) : (
                      <span
                        className="mt-0.5 text-[clamp(9px,2.6cqi,11px)] tracking-[0.12em] uppercase"
                        style={{ ...text(600), color: `${C.ink}AA` }}
                      >
                        {cell.label}
                      </span>
                    )}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* The lid: a sleepy face, the band, the name sticker. */}
          <motion.div
            className="absolute -inset-[1.5%] cursor-pointer touch-none overflow-hidden rounded-[28px] outline-none"
            style={{
              y: lidY,
              x: lidX,
              rotate: lidRot,
              opacity: lidOpacity,
              background: shell,
              boxShadow: `${puffy(C.tint, 1.6)}, ${soft(C.tint, 1.1)}`,
              zIndex: 3,
            }}
            onPan={(_, info) => {
              if (open || !live(p)) return;
              lift.set(Math.max(0, Math.min(0.6, -info.offset.y / 260)));
            }}
            onPanEnd={(_, info) => {
              if (open || !live(p)) return;
              if (info.offset.y < -50) liftLid();
              else void animate(lift, 0, SPRING.snappy);
            }}
            {...pressable(liftLid, !open && live(p), "Lift the lid")}
          >
            {/* The face. */}
            <span
              className="absolute top-[30%] left-[40%] flex w-[34%] -translate-x-1/2 items-center justify-between"
              aria-hidden
            >
              <motion.span
                className="block size-[clamp(9px,3cqi,13px)] rounded-full bg-[#4A2E3A]"
                animate={p.reduced ? {} : { scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
              />
              <span className="mt-[6%] block h-[clamp(5px,1.6cqi,7px)] w-[clamp(12px,4cqi,18px)] rounded-b-full border-2 border-t-0 border-[#4A2E3A]" />
              <motion.span
                className="block size-[clamp(9px,3cqi,13px)] rounded-full bg-[#4A2E3A]"
                animate={p.reduced ? {} : { scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: 3.6, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
              />
            </span>
            <span
              className="absolute top-[40%] left-[19%] h-[7%] w-[11%] rounded-full bg-[#FF8FAE] opacity-70 blur-[1px]"
              aria-hidden
            />
            <span
              className="absolute top-[40%] left-[51%] h-[7%] w-[11%] rounded-full bg-[#FF8FAE] opacity-70 blur-[1px]"
              aria-hidden
            />
            {/* The band, with a heart button. */}
            <span
              className="absolute inset-y-0 right-[16%] w-[11%]"
              style={{
                background: `repeating-linear-gradient(0deg, rgba(255,255,255,.25) 0 3px, transparent 3px 8px), ${C.band}`,
                boxShadow:
                  "inset 2px 0 0 rgba(255,255,255,.5), inset -2px 0 0 rgba(40,110,90,.2), 3px 0 6px rgba(200,90,120,.2)",
              }}
              aria-hidden
            />
            <Clay
              id="heart"
              reduced={p.reduced}
              shadow={C.tint}
              className="top-[44%] right-[14.5%] w-[14%]"
            />
            {/* Name sticker. */}
            <span
              className="absolute bottom-[12%] left-[10%] max-w-[54%] -rotate-[3deg] truncate rounded-full bg-white px-[4%] py-[2%] text-[clamp(12px,4cqi,17px)]"
              style={{ ...display(700), color: C.ink, boxShadow: soft(C.tint, 0.4) }}
            >
              {p.recipient}&apos;s bento
            </span>
            <Gloss strength={0.5} height="38%" />
            <Sheen strength={0.4} angle={120} width={30} />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton onClick={liftLid} color={C.lidDeep} ink={C.ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const bentoBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#FFF2F5",
    bottom: "#FFE0E8",
    glow: "#FFFFFFD9",
    blobs: [
      ["#DDF4EACC", 10, 14, 55],
      ["#FFF1C2AA", 90, 86, 55],
    ],
    pattern: gingham("rgba(255,170,190,.16)", 18),
  });
