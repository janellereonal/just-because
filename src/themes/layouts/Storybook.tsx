/**
 * STORYBOOK: a cloth hardcover with a gold-foil title and a ribbon bookmark.
 * Gesture: open the cover (drag it to the left, or tap). It swings open on the
 * spine and the first page reads "Chapter one" with the greeting, like the book
 * the notes are read in.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import {
  FloorShadow,
  LightShaft,
  Object3D,
  Sheen,
  TEXTURE_SOFT,
  TEXTURE,
  Texture,
  elevation,
} from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { giftColors, live, pressable, signoff, useAutoplay, useOpenSequence } from "./kit";

const GOLD = "linear-gradient(135deg, #8C6A2B, #F3D98B 35%, #B8913E 55%, #FBE7A6 75%, #8C6A2B)";

export function StorybookOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0);
  const shift = useTransform(angle, [0, -170], ["-25%", "0%"]);
  const shade = useTransform(angle, [0, -100, -170], [0, 0.4, 0.15]);
  const ribbon = useTransform(angle, [0, -20], [1, 0]);
  useOpenSequence(p, open, pageRef, 2100);

  function openCover() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("paper");
    h.thud();
    void animate(angle, -170, p.reduced ? { duration: 0 } : { ...SPRING.heavy, stiffness: 70 });
  }
  useAutoplay(p, [[900, openCover]]);

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={-12} className="pointer-events-none absolute -inset-[40%]">
        <LightShaft strength={0.5} motes={6} angle={24} />
      </Layer>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.42" }}
      >
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
            <FloorShadow tint="40,30,20" depth={12} radius={8} className="inset-0" />
            {/* Right page: chapter one. */}
            <div
              ref={pageRef}
              className="absolute inset-y-[2%] right-[1%] left-1/2 overflow-hidden rounded-r-[6px] px-[9%] pt-[14%]"
              style={{
                background: "#FFFBF1",
                boxShadow: `inset 14px 0 18px -14px rgba(60,40,20,.35), ${elevation(0.25, "40,30,20")}`,
              }}
            >
              <Texture material="paper" opacity={0.55} />
              <motion.div
                initial={false}
                animate={{ opacity: open ? 1 : 0, y: open ? 0 : 8 }}
                transition={{ duration: p.reduced ? 0 : 0.7, delay: p.reduced ? 0 : 0.9 }}
                className="relative"
              >
                <span
                  className="block text-[10px] tracking-[0.24em] uppercase"
                  style={{ color: c.accent, fontFamily: "var(--jb-text)" }}
                >
                  Chapter one
                </span>
                <span
                  className="mt-2 block text-[clamp(1.15rem,5.2cqi,1.7rem)] leading-[1.08] text-[#2f261f]"
                  style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                >
                  {p.greeting}
                </span>
                <span className="mt-3 block h-px w-10" style={{ background: c.accent }} />
              </motion.div>
            </div>
            {/* Page block edges under the cover. */}
            <div
              className="absolute inset-y-[2%] right-[0.5%] left-1/2 rounded-r-[6px]"
              style={{
                background: "repeating-linear-gradient(90deg, #efe6d3 0 1px, #fffaf0 1px 3px)",
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
                className="absolute inset-0 overflow-hidden rounded-r-[10px] rounded-l-[3px]"
                style={{
                  background: c.primary,
                  backfaceVisibility: "hidden",
                  boxShadow: `inset 12px 0 16px -10px rgba(0,0,0,.45), ${elevation(0.55, "30,20,10")}`,
                }}
              >
                <Texture material="linen" opacity={0.6} blend="multiply" />
                <span
                  className="absolute inset-[7%] rounded-[6px]"
                  style={{
                    border: "2px solid transparent",
                    borderImage: `${GOLD} 1`,
                    opacity: 0.85,
                  }}
                  aria-hidden
                />
                <div className="absolute inset-x-[12%] top-[22%] text-center">
                  <span
                    className="block text-[10px] tracking-[0.28em] uppercase"
                    style={{
                      backgroundImage: GOLD,
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      fontFamily: "var(--jb-text)",
                    }}
                  >
                    The story of
                  </span>
                  <span
                    className="mt-2 block text-[clamp(1.5rem,7.4cqi,2.4rem)] leading-[1] font-bold"
                    style={{
                      backgroundImage: GOLD,
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                      fontFamily: "var(--jb-display)",
                    }}
                  >
                    {p.recipient}
                  </span>
                  <span
                    className="mx-auto mt-3 block text-[clamp(1.2rem,5cqi,1.6rem)]"
                    style={{
                      backgroundImage: GOLD,
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                    }}
                    aria-hidden
                  >
                    ✦
                  </span>
                </div>
                <Sheen strength={0.3} angle={120} width={26} />
                <motion.span
                  className="absolute inset-0 bg-black"
                  style={{ opacity: shade }}
                  aria-hidden
                />
              </div>
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[10px] px-[9%] pt-[14%]"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  background: "#FBF5E8",
                  boxShadow: "inset -14px 0 18px -14px rgba(60,40,20,.35)",
                }}
              >
                <Texture material="paper" opacity={0.55} />
                <span
                  className="relative block text-center text-[clamp(1.6rem,7cqi,2.4rem)]"
                  style={{ color: c.accent }}
                  aria-hidden
                >
                  ❦
                </span>
                <span
                  className="relative mt-3 block text-center text-[11px] tracking-[0.18em] text-[#6b5844] uppercase"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  Written by
                </span>
                <span
                  className="relative mt-1 block text-center text-[clamp(12px,3.4cqi,15px)] leading-snug text-[#3c3026]"
                  style={{ fontFamily: "var(--jb-display)" }}
                >
                  {signoff(p.contributors)}
                </span>
              </div>
            </motion.div>
            {/* Ribbon bookmark. */}
            <motion.span
              className="absolute bottom-[-9%] left-[68%] z-[4] h-[16%] w-[4%]"
              style={{
                background: c.accent,
                clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)",
                opacity: ribbon,
              }}
              aria-hidden
            />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={openCover} color="#ffffff" ink="#ffffff" hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const storybookBackground = (): React.CSSProperties => ({
  backgroundColor: "#2B2430",
  backgroundImage: [
    "radial-gradient(50% 42% at 50% 44%, #5A4A5E, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 50%, #120E14aa)",
    TEXTURE_SOFT.paper,
    TEXTURE.felt,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px, 200px 200px",
});
