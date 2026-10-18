/**
 * BENTO BOARD: a lacquered bento box tied with a cord, their name on a paper band.
 * Gesture: lift the lid (drag it up, or tap). The cord slips, the lid rises and
 * slides away, and the compartments inside fill one by one, like the board.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Camera, Heart, Mail, Music2 } from "lucide-react";
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

const CELLS = [
  { icon: Mail, area: "1 / 1 / 3 / 3", label: "Letters" },
  { icon: Camera, area: "1 / 3 / 2 / 5", label: "Photos" },
  { icon: Music2, area: "2 / 3 / 3 / 4", label: "Songs" },
  { icon: Heart, area: "2 / 4 / 3 / 5", label: "Love" },
];

export function BentoOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const lift = useMotionValue(0); // 0 closed, 1 lifted away
  const lidY = useTransform(lift, [0, 0.5, 1], ["0%", "-26%", "-62%"]);
  const lidX = useTransform(lift, [0, 0.5, 1], ["0%", "2%", "38%"]);
  const lidRot = useTransform(lift, [0, 1], [0, 14]);
  const lidOpacity = useTransform(lift, [0.75, 1], [1, 0]);
  useOpenSequence(p, open, boxRef, 1900);

  function liftLid() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("thunk");
    h.thud();
    void animate(lift, 1, p.reduced ? { duration: 0 } : SPRING.soft);
  }
  useAutoplay(p, [[900, liftLid]]);

  const lacquer = `linear-gradient(160deg, ${c.primary}, color-mix(in oklab, ${c.primary} 55%, black))`;

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(80cqi, 360px)", aspectRatio: "1.3", marginTop: "8%" }}
      >
        <Object3D
          pose={{ x: 22, y: -6, z: 0 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <FloorShadow tint="30,20,15" depth={14} radius={14} className="inset-0" />
          {/* The box and its compartments. */}
          <div
            ref={boxRef}
            className="absolute inset-0 overflow-hidden rounded-[16px] p-[4%]"
            style={{
              background: lacquer,
              boxShadow: `inset 0 2px 0 rgba(255,255,255,.25), ${elevation(0.5, "30,20,15")}`,
            }}
          >
            <div
              className="grid size-full gap-[3%]"
              style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(2, 1fr)" }}
            >
              {CELLS.map((cell, i) => {
                const Icon = cell.icon;
                return (
                  <motion.div
                    key={cell.label}
                    className="relative grid place-items-center overflow-hidden rounded-[10px]"
                    style={{
                      gridArea: cell.area,
                      background: "#FFFBF3",
                      boxShadow: "inset 0 3px 8px rgba(0,0,0,.28)",
                    }}
                    initial={false}
                    animate={open ? { opacity: 1, scale: 1 } : { opacity: 0.35, scale: 0.94 }}
                    transition={
                      p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.45 + i * 0.14 }
                    }
                  >
                    <Texture material="paper" opacity={0.5} />
                    <span className="relative flex flex-col items-center gap-1">
                      <span
                        className="grid size-[clamp(26px,9cqi,40px)] place-items-center rounded-full"
                        style={{
                          background: i % 2 ? c.accent : c.primary,
                          color: i % 2 ? c.onAccent : c.onPrimary,
                        }}
                      >
                        <Icon className="size-[55%]" />
                      </span>
                      {i === 0 ? (
                        <span
                          className="mt-1 px-2 text-center text-[clamp(13px,4cqi,17px)] leading-tight text-[#2b2522]"
                          style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                        >
                          {p.greeting}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] tracking-[0.14em] text-[#2b2522]/60 uppercase"
                          style={{ fontFamily: "var(--jb-text)" }}
                        >
                          {cell.label}
                        </span>
                      )}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* The lid, with its paper band and cord. */}
          <motion.div
            className="absolute -inset-[1.5%] cursor-pointer touch-none rounded-[18px] outline-none"
            style={{
              y: lidY,
              x: lidX,
              rotate: lidRot,
              opacity: lidOpacity,
              background: lacquer,
              boxShadow: `inset 0 2px 0 rgba(255,255,255,.3), ${elevation(0.6, "30,20,15")}`,
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
            <Texture material="brushed" opacity={0.25} blend="overlay" />
            <span
              className="absolute inset-x-0 top-1/2 h-[30%] -translate-y-1/2"
              style={{
                background: "#F4ECDC",
                backgroundImage: TEXTURE.paper,
                boxShadow: "0 1px 0 rgba(0,0,0,.15), 0 -1px 0 rgba(0,0,0,.1)",
              }}
              aria-hidden
            />
            <span
              className="absolute inset-y-0 left-[22%] w-[2.2%]"
              style={{ background: c.accent, boxShadow: "1px 0 0 rgba(0,0,0,.2)" }}
              aria-hidden
            />
            <span
              className="absolute top-1/2 left-[22%] grid -translate-x-[40%] -translate-y-1/2 place-items-center"
              aria-hidden
            >
              <span
                className="size-[clamp(18px,6cqi,26px)] rotate-45 rounded-[4px]"
                style={{ background: c.accent, boxShadow: elevation(0.3) }}
              />
            </span>
            <div className="absolute inset-x-[30%] top-1/2 -translate-y-1/2 text-center">
              <span
                className="block text-[10px] tracking-[0.22em] text-[#6b5a48] uppercase"
                style={{ fontFamily: "var(--jb-text)" }}
              >
                {p.badge}
              </span>
              <span
                className="block truncate text-[clamp(1.1rem,5.2cqi,1.7rem)] leading-tight text-[#2b2522]"
                style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
              >
                {p.recipient}
              </span>
            </div>
            <Sheen strength={0.45} angle={120} width={30} />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={liftLid} color={c.accent} ink={c.accent} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const bentoBackground = (): React.CSSProperties => ({
  backgroundColor: "#E8E1D6",
  backgroundImage: [
    "radial-gradient(55% 45% at 50% 46%, #FBF7F0, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 55%, #9C8E7A55)",
    TEXTURE_SOFT.paper,
    TEXTURE.linen,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px, 200px 200px",
});
