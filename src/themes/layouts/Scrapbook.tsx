/**
 * SCRAPBOOK: a cloth-bound album with a kraft name tag and washi tape.
 * Gesture: open the cover (drag it to the left, or tap). Inside, three photos
 * drop onto the first page at their own angles and a line writes itself in.
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
import { seed } from "@/components/formats/PieceSheet";
import { material } from "@/lib/sound/material";
import { giftColors, live, pressable, signoff, soundAt, useAutoplay, useOpenSequence } from "./kit";

export function ScrapbookOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0); // cover, 0 closed, -168 open
  const shade = useTransform(angle, [0, -90, -168], [0, 0.35, 0.12]);
  // Closed, the book sits centred; as the cover opens it slides over to show the spread.
  const shift = useTransform(angle, [0, -168], ["-25%", "0%"]);
  const leftPage = useTransform(angle, [0, -40], [0, 1]);
  const shadowLeft = useTransform(leftPage, [0, 1], ["50%", "0%"]);
  useOpenSequence(p, open, pageRef, 1900, "scrapbook");

  function openCover() {
    if (open || !live(p)) return;
    setOpen(true);
    material("pageTurn", { strength: 1.2 });
    soundAt(p, [
      [420, () => material("coverThump", { pan: -0.4 })],
      [600, () => material("slap", { pan: -0.3, strength: 0.7 })],
      [780, () => material("slap", { pan: 0.25, strength: 0.6 })],
      [960, () => material("slap", { pan: 0, strength: 0.65 })],
      [1150, () => material("scribble", { strength: 0.8 })],
    ]);
    h.thud();
    void animate(angle, -168, p.reduced ? { duration: 0 } : SPRING.heavy);
  }
  useAutoplay(p, [[900, openCover]]);

  const photos = [0, 1, 2].map((i) => ({
    r: (seed(`${p.recipient}${i}`) - 0.5) * 16,
    x: [8, 46, 24][i]!,
    y: [12, 20, 50][i]!,
  }));

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(84cqi, 380px)", aspectRatio: "1.36" }}
      >
        <Object3D
          pose={{ x: 18, y: -8, z: -1 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          <motion.div
            className="absolute inset-0"
            style={{ x: shift, transformStyle: "preserve-3d" }}
          >
            <motion.div className="absolute inset-y-0 right-0" style={{ left: shadowLeft }}>
              <FloorShadow tint="60,40,25" depth={10} radius={10} className="inset-0" />
            </motion.div>
            {/* The open spread: left page behind the cover, right page with photos. */}
            <div
              ref={pageRef}
              className="absolute inset-y-0 right-0 left-1/2 overflow-hidden rounded-r-[10px]"
              style={{ background: "#FFFBF2", boxShadow: elevation(0.35, "60,40,25") }}
            >
              <Texture material="paper" opacity={0.6} />
              {photos.map((ph, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[46%] bg-white p-[4%] pb-[12%] shadow-md"
                  style={{ left: `${ph.x}%`, top: `${ph.y}%` }}
                  initial={false}
                  animate={
                    open
                      ? { opacity: 1, y: 0, rotate: ph.r, scale: 1 }
                      : { opacity: 0, y: -30, rotate: ph.r * 2, scale: 1.08 }
                  }
                  transition={
                    p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.55 + i * 0.18 }
                  }
                >
                  <div
                    className="aspect-square w-full"
                    style={{
                      background: `linear-gradient(${140 + i * 40}deg, ${c.accent}, ${c.primary})`,
                      opacity: 0.85 - i * 0.12,
                    }}
                  />
                  <span
                    className="absolute -top-[10%] left-[30%] h-[18%] w-[40%] rotate-[-4deg]"
                    style={{ background: `${c.accent}99` }}
                    aria-hidden
                  />
                </motion.div>
              ))}
              <motion.p
                className="absolute right-[8%] bottom-[7%] left-[8%] text-right text-[clamp(13px,3.8cqi,17px)]"
                style={{ fontFamily: "var(--jb-display)", color: "#3a2f28" }}
                initial={false}
                animate={{ clipPath: open ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
                transition={{ duration: p.reduced ? 0 : 0.9, delay: p.reduced ? 0 : 1.1 }}
              >
                Love, {signoff(p.contributors, 2)}
              </motion.p>
            </div>

            {/* The cover, hinged on the spine. */}
            <motion.div
              className="absolute inset-y-0 right-0 left-1/2 cursor-pointer touch-none outline-none"
              style={{ originX: 0, rotateY: angle, transformStyle: "preserve-3d", zIndex: 3 }}
              onPan={(_, info) => {
                if (open || !live(p)) return;
                angle.set(Math.max(-168, Math.min(0, info.offset.x * 0.9)));
              }}
              onPanEnd={(_, info) => {
                if (open || !live(p)) return;
                if (info.offset.x < -70) openCover();
                else void animate(angle, 0, SPRING.snappy);
              }}
              {...pressable(openCover, !open && live(p), "Open the scrapbook")}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-r-[12px]"
                style={{
                  background: c.primary,
                  backfaceVisibility: "hidden",
                  boxShadow: `inset 10px 0 18px -10px rgba(0,0,0,.35), ${elevation(0.5, "40,25,15")}`,
                }}
              >
                <Texture material="linen" opacity={0.55} blend="multiply" />
                <span
                  className="absolute top-[-4%] left-[14%] h-[22%] w-[18%] rotate-[8deg]"
                  style={{ background: `${c.accent}cc`, backgroundImage: TEXTURE.paper }}
                  aria-hidden
                />
                <div
                  className="absolute top-1/2 left-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 rotate-[-2deg] rounded-[6px] px-[8%] py-[9%] text-center"
                  style={{
                    background: "#E9D9BC",
                    backgroundImage: TEXTURE.kraft,
                    boxShadow: elevation(0.3, "60,40,25"),
                  }}
                >
                  <span
                    className="absolute top-[10%] left-1/2 size-[9px] -translate-x-1/2 rounded-full"
                    style={{ background: "#fff", boxShadow: "inset 0 1px 2px rgba(0,0,0,.35)" }}
                    aria-hidden
                  />
                  <span
                    className="mt-2 block text-[10px] tracking-[0.2em] text-[#5b4a3a] uppercase"
                    style={{ fontFamily: "var(--jb-text)" }}
                  >
                    Our scrapbook
                  </span>
                  <span
                    className="mt-1 block text-[clamp(1.3rem,6.4cqi,2rem)] leading-none text-[#3a2f28]"
                    style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                  >
                    {p.recipient}
                  </span>
                </div>
                <Sheen strength={0.35} angle={115} width={30} />
                <motion.span
                  className="absolute inset-0 bg-black"
                  style={{ opacity: shade }}
                  aria-hidden
                />
              </div>
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[12px] px-[9%] pt-[12%]"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  background: "#F6EFE2",
                }}
              >
                <Texture material="paper" opacity={0.5} />
                <span
                  className="relative block text-[10px] tracking-[0.2em] text-[#7a6552] uppercase"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  {p.badge}
                </span>
                <span
                  className="relative mt-2 block text-[clamp(1.2rem,5.6cqi,1.8rem)] leading-[1.05] text-[#3a2f28]"
                  style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                >
                  {p.greeting}
                </span>
                <span
                  className="absolute right-[10%] bottom-[12%] left-[9%] h-[34%] rotate-[-3deg] rounded-[4px] border-2 border-dashed"
                  style={{ borderColor: `${c.accent}88` }}
                  aria-hidden
                />
                <span
                  className="absolute bottom-[26%] left-[20%] rotate-[-3deg] text-[11px] text-[#7a6552]"
                  style={{ fontFamily: "var(--jb-text)" }}
                >
                  {p.contributors.length
                    ? `${p.contributors.length} friends inside`
                    : "Everyone's inside"}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={openCover} color="#ffffff" ink="#FFF6EA" hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const scrapbookBackground = (): React.CSSProperties => ({
  backgroundColor: "#E6D9C3",
  backgroundImage: [
    "radial-gradient(55% 45% at 50% 42%, #FFF8EC, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 55%, #A88A6466)",
    TEXTURE_SOFT.paper,
    TEXTURE.linen,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px, 200px 200px",
});
