/**
 * SCRAPBOOK: a cloth album in the gift's main color, with a name label, washi
 * tape in the accent and the occasion's own picture pasted on as a polaroid,
 * on the same paper the scrapbook's pages sit on. Gesture: open the cover
 * (drag it to the left, or tap). Inside, polaroids drop onto the page at their
 * own angles, like the photobooth inside, and a sign-off writes itself in.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen, Texture } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { themeStillUrl } from "@/components/Theme3D";
import { live, pressable, signoff, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

const PAPER = "#FFFDF7";
const mix = (a: string, k: number, b = "#ffffff") => `color-mix(in oklab, ${a} ${k}%, ${b})`;
const washi = (color: string) =>
  `repeating-linear-gradient(90deg, rgba(255,255,255,.3) 0 4px, transparent 4px 9px), ${color}`;

export function ScrapbookOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const onPrimary = readableInk(primary);
  const ink = readableInk(background);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0); // cover, 0 closed, -168 open
  const shade = useTransform(angle, [0, -90, -168], [0, 0.25, 0.08]);
  // Closed, the book sits centred; as the cover opens it slides over to show the spread.
  const shift = useTransform(angle, [0, -168], ["-25%", "0%"]);
  const shadowLeft = useTransform(angle, [0, -40], ["50%", "0%"]);
  useOpenSequence(p, open, pageRef, {
    hold: 2000,
    cast,
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
  });
  useHint(p, "Open the cover to see what's inside", open);

  function openCover() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("paper");
    h.thud();
    void animate(angle, -168, p.reduced ? { duration: 0 } : SPRING.heavy);
  }
  useAutoplay(p, [[900, openCover]]);

  const names = p.contributors.length ? p.contributors : ["your friends"];
  const photos = [0, 1, 2].map((i) => ({
    r: (seed(`${p.recipient}${i}`) - 0.5) * 16,
    x: [6, 50, 26][i]!,
    y: [6, 10, 46][i]!,
    fill: [
      `linear-gradient(150deg, ${mix(accent, 45)}, ${mix(accent, 75)})`,
      `linear-gradient(150deg, ${mix(primary, 30)}, ${mix(primary, 55)})`,
      `linear-gradient(150deg, ${mix("#FFD166", 60)}, ${mix(accent, 40)})`,
    ][i]!,
    by: names[i % names.length]!,
    mark: ["♥", "✦", "☺"][i]!,
  }));

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={{ color: ink, fontFamily: "var(--jb-text)" }}
    >
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(88cqi, 400px)", aspectRatio: "1.36" }}
      >
        <Buddy p={p} ref={cast} size={76} className="-bottom-[16%] -left-[3%]" />
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
              <FloorShadow tint="43,37,34" depth={10} radius={14} className="inset-0" />
            </motion.div>
            {/* The right page: polaroids, like the photobooth inside. */}
            <div
              ref={pageRef}
              className="absolute inset-y-[1.5%] right-[0.5%] left-1/2 overflow-hidden rounded-r-[12px]"
              style={{
                background: PAPER,
                boxShadow:
                  "inset 16px 0 18px -16px rgba(43,37,34,.35), 0 18px 30px -22px rgba(43,37,34,.5)",
              }}
            >
              <Texture material="paper" opacity={0.4} />
              {photos.map((ph, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[44%] bg-white p-[3.5%] pb-[2%]"
                  style={{
                    left: `${ph.x}%`,
                    top: `${ph.y}%`,
                    boxShadow: "0 10px 18px -10px rgba(43,37,34,.5)",
                  }}
                  initial={false}
                  animate={
                    open
                      ? { opacity: 1, y: 0, rotate: ph.r, scale: 1 }
                      : { opacity: 0, y: -30, rotate: ph.r * 2, scale: 1.1 }
                  }
                  transition={
                    p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.55 + i * 0.18 }
                  }
                >
                  <div
                    className="grid aspect-square w-full place-items-center text-[clamp(16px,6cqi,26px)] text-white"
                    style={{ background: ph.fill }}
                  >
                    {ph.mark}
                  </div>
                  <span
                    className="block truncate pt-[6%] text-[clamp(8px,2.4cqi,10px)]"
                    style={{ color: primary }}
                  >
                    From {ph.by}
                  </span>
                  <span
                    className="absolute -top-[8%] left-[30%] h-[13%] w-[40%]"
                    style={{
                      background: washi(i === 1 ? primary : accent),
                      rotate: `${(i - 1) * 7}deg`,
                      opacity: 0.8,
                    }}
                    aria-hidden
                  />
                </motion.div>
              ))}
              <motion.p
                className="absolute right-[7%] bottom-[5%] left-[7%] text-right text-[clamp(12px,3.8cqi,17px)] leading-snug font-bold"
                style={{ fontFamily: "var(--jb-display)", color: primary }}
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
                className="absolute inset-0 overflow-hidden rounded-l-[5px] rounded-r-[14px]"
                style={{
                  background: `linear-gradient(160deg, ${mix(primary, 88)}, ${primary} 55%, ${mix(primary, 80, "#000")})`,
                  backfaceVisibility: "hidden",
                  boxShadow:
                    "inset 10px 0 18px -10px rgba(0,0,0,.35), 0 24px 40px -24px rgba(43,37,34,.6)",
                }}
              >
                <Texture material="linen" opacity={0.45} blend="multiply" />
                <span
                  className="absolute inset-y-0 left-0 w-[8%]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(0,0,0,.22), rgba(255,255,255,.12) 60%, transparent)",
                  }}
                  aria-hidden
                />
                <span
                  className="absolute inset-[6%_6%_6%_12%] rounded-[8px] border-2 border-dashed"
                  style={{
                    borderColor: `${onPrimary === "#FBF8F2" ? "rgba(255,255,255,.45)" : "rgba(0,0,0,.25)"}`,
                  }}
                  aria-hidden
                />
                {/* The occasion's picture, pasted on as a polaroid. */}
                <div
                  className="absolute top-[9%] right-[10%] w-[52%] rotate-[5deg] bg-white p-[3%] pb-[9%]"
                  style={{ boxShadow: "0 10px 18px -10px rgba(0,0,0,.55)" }}
                >
                  <div
                    className="aspect-square w-full overflow-hidden"
                    style={{ background: mix(background, 70) }}
                  >
                    <img
                      src={themeStillUrl(p.kind)}
                      alt=""
                      draggable={false}
                      className="size-full object-contain"
                    />
                  </div>
                  <span
                    className="absolute -top-[7%] left-[28%] h-[12%] w-[44%] -rotate-[4deg]"
                    style={{ background: washi(accent), opacity: 0.85 }}
                    aria-hidden
                  />
                </div>
                {/* The name label. */}
                <div
                  className="absolute bottom-[10%] left-[16%] w-[70%] -rotate-[3deg] rounded-[6px] px-[7%] pt-[6%] pb-[7%] text-center"
                  style={{ background: PAPER, boxShadow: "0 8px 16px -8px rgba(0,0,0,.45)" }}
                >
                  <span
                    className="block text-[clamp(9px,2.5cqi,11px)] font-semibold tracking-[0.2em] uppercase"
                    style={{ color: accent }}
                  >
                    Our scrapbook
                  </span>
                  <span
                    className="mt-1 block truncate text-[clamp(1.3rem,6.4cqi,2rem)] leading-[1.05] font-bold"
                    style={{ fontFamily: "var(--jb-display)", color: primary }}
                  >
                    {p.recipient}
                  </span>
                </div>
                <Sheen strength={0.3} angle={115} width={30} />
                <motion.span
                  className="absolute inset-0 bg-black"
                  style={{ opacity: shade }}
                  aria-hidden
                />
              </div>
              {/* The inside of the cover: the left page. */}
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[14px] px-[9%] pt-[12%]"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  background: `radial-gradient(${mix(primary, 10, "transparent")} 1px, transparent 1.4px) 0 0 / 12px 12px, ${PAPER}`,
                  boxShadow: "inset -16px 0 18px -16px rgba(43,37,34,.35)",
                }}
              >
                <Texture material="paper" opacity={0.4} />
                <span
                  className="relative inline-block -rotate-[3deg] rounded-full px-3 py-1 text-[clamp(9px,2.5cqi,11px)] font-semibold tracking-[0.16em] uppercase"
                  style={{ background: "#FFD166", color: "#2b2522" }}
                >
                  Just for you
                </span>
                <span
                  className="relative mt-3 block text-[clamp(1.25rem,6cqi,1.9rem)] leading-[1.05] font-bold"
                  style={{ fontFamily: "var(--jb-display)", color: primary }}
                >
                  {p.greeting}
                </span>
                <span
                  className="relative mt-2 block h-[6px] w-12 -rotate-[2deg] rounded-full opacity-30"
                  style={{ background: primary }}
                />
                <span
                  className="relative mt-3 block text-[clamp(11px,3.2cqi,13px)] opacity-70"
                  style={{ color: "#2b2522" }}
                >
                  {p.contributors.length
                    ? `${p.contributors.length} friends filled these pages.`
                    : "Everyone filled these pages."}
                </span>
              </div>
            </motion.div>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton onClick={openCover} color={ink} ink={ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The scrapbook's own paper: the gift's background with a whisper of dots. */
export const scrapbookBackground = (palette: Palette): React.CSSProperties => ({
  background: [
    `radial-gradient(color-mix(in oklab, ${palette.primary} 12%, transparent) 1.2px, transparent 1.6px) 0 0 / 22px 22px`,
    `radial-gradient(60% 45% at 50% 45%, rgba(255,255,255,.55), transparent 75%)`,
    palette.background,
  ].join(","),
});
