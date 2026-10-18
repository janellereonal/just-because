/**
 * SCRAPBOOK: a mint cloth album with stitched edges, a scalloped name label,
 * washi tape and clay stickers. Gesture: open the cover (drag it to the left,
 * or tap). Inside, three polaroids drop onto the page at their own angles and
 * a little sign-off writes itself in.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen, Texture } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { seed } from "@/components/formats/PieceSheet";
import { live, pressable, signoff, useAutoplay, useHint, useOpenSequence } from "./kit";
import {
  Buddy,
  Clay,
  FONTS,
  Gloss,
  Sparkles,
  type ClayId,
  display,
  dotLayer,
  dots,
  pastelStage,
  puffy,
  soft,
  text,
  useStyleFonts,
} from "./cute";

const C = {
  cover: "#9FD8C4",
  coverDeep: "#6FB9A2",
  ink: "#4B3A33",
  pink: "#F4A6BC",
  pinkInk: "#C24F78",
  butter: "#FFE38F",
  lilac: "#D9CCFF",
  paper: "#FFFCF5",
  tint: "120,90,70",
};

const WASHI = (color: string) =>
  `repeating-linear-gradient(90deg, rgba(255,255,255,.35) 0 4px, transparent 4px 9px), ${color}`;

const PHOTOS: { clay: ClayId; bg: string; x: number; y: number }[] = [
  { clay: "camera", bg: "linear-gradient(160deg, #FFE1EA, #F7B9CB)", x: 8, y: 9 },
  { clay: "cake", bg: "linear-gradient(160deg, #FFF4C9, #FFE08A)", x: 48, y: 16 },
  { clay: "balloon", bg: "linear-gradient(160deg, #ECE4FF, #CFC0FF)", x: 22, y: 45 },
];

export function ScrapbookOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0); // cover, 0 closed, -168 open
  const shade = useTransform(angle, [0, -90, -168], [0, 0.22, 0.06]);
  // Closed, the book sits centred; as the cover opens it slides over to show the spread.
  const shift = useTransform(angle, [0, -168], ["-25%", "0%"]);
  const leftPage = useTransform(angle, [0, -40], [0, 1]);
  const shadowLeft = useTransform(leftPage, [0, 1], ["50%", "0%"]);
  useOpenSequence(p, open, pageRef, {
    hold: 2000,
    cast,
    colors: [C.cover, C.pink, C.butter, C.lilac, "#FFFFFF"],
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

  const photos = PHOTOS.map((ph, i) => ({ ...ph, r: (seed(`${p.recipient}${i}`) - 0.5) * 18 }));

  return (
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(86cqi, 390px)", aspectRatio: "1.36" }}
      >
        <Sparkles
          reduced={p.reduced}
          color="#FFFFFF"
          spots={[
            [4, -10, 18],
            [96, -6, 14],
            [100, 98, 16],
            [10, 104, 12],
          ]}
        />
        <Buddy p={p} ref={cast} size={78} className="-bottom-[14%] -left-[4%]" />
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
              <FloorShadow tint={C.tint} depth={10} radius={14} className="inset-0" />
            </motion.div>
            {/* The right page: polaroids and the sign-off. */}
            <div
              ref={pageRef}
              className="absolute inset-y-[1.5%] right-[0.5%] left-1/2 overflow-hidden rounded-r-[14px]"
              style={{
                background: `${dots("rgba(244,166,188,.28)", 1.2, 14)}, ${C.paper}`,
                boxShadow: `inset 16px 0 18px -16px rgba(${C.tint},.4), ${soft(C.tint, 0.6)}`,
              }}
            >
              <Texture material="paper" opacity={0.35} />
              {photos.map((ph, i) => (
                <motion.div
                  key={i}
                  className="absolute w-[44%] rounded-[3px] bg-white p-[3.5%] pb-[11%]"
                  style={{ left: `${ph.x}%`, top: `${ph.y}%`, boxShadow: soft(C.tint, 0.45) }}
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
                    className="relative aspect-square w-full overflow-hidden rounded-[2px]"
                    style={{ background: ph.bg }}
                  >
                    <img
                      src={`/clay/${ph.clay}@256.webp`}
                      alt=""
                      draggable={false}
                      className="absolute top-1/2 left-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2"
                    />
                    <Gloss strength={0.4} height="35%" />
                  </div>
                  <span
                    className="absolute -top-[9%] left-[28%] h-[16%] w-[44%]"
                    style={{
                      background: WASHI([C.pink, C.butter, C.lilac][i]!),
                      rotate: `${(i - 1) * 6}deg`,
                      opacity: 0.92,
                    }}
                    aria-hidden
                  />
                </motion.div>
              ))}
              <motion.p
                className="absolute right-[7%] bottom-[6%] left-[7%] text-right text-[clamp(12px,3.6cqi,16px)] leading-snug"
                style={{ ...text(600), color: C.pinkInk }}
                initial={false}
                animate={{ clipPath: open ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
                transition={{ duration: p.reduced ? 0 : 0.9, delay: p.reduced ? 0 : 1.1 }}
              >
                Love, {signoff(p.contributors, 2)} ♥
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
                className="absolute inset-0 overflow-hidden rounded-l-[6px] rounded-r-[16px]"
                style={{
                  background: `linear-gradient(160deg, #B5E4D3, ${C.cover} 55%, ${C.coverDeep})`,
                  backfaceVisibility: "hidden",
                  boxShadow: `${puffy("40,110,90", 1.2)}, ${soft(C.tint, 0.9)}`,
                }}
              >
                <Texture material="linen" opacity={0.35} blend="multiply" />
                {/* The spine and the stitching. */}
                <span
                  className="absolute inset-y-0 left-0 w-[9%]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(40,110,90,.3), rgba(255,255,255,.2) 60%, transparent)",
                  }}
                  aria-hidden
                />
                <span
                  className="absolute inset-[6%_6%_6%_12%] rounded-[10px] border-2 border-dashed border-white/70"
                  aria-hidden
                />
                {/* The label. */}
                <div
                  className="absolute top-1/2 left-[56%] w-[66%] -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] rounded-[14px] px-[7%] pt-[8%] pb-[9%] text-center"
                  style={{ background: C.paper, boxShadow: soft("40,110,90", 0.55) }}
                >
                  <span
                    className="absolute inset-[5%] rounded-[10px] border-[1.5px] border-dashed"
                    style={{ borderColor: C.pink }}
                    aria-hidden
                  />
                  <span
                    className="relative block text-[clamp(9px,2.6cqi,11px)] tracking-[0.22em] uppercase"
                    style={{ ...text(600), color: C.pinkInk }}
                  >
                    Our scrapbook
                  </span>
                  <span
                    className="relative mt-1 block truncate text-[clamp(1.4rem,7cqi,2.2rem)] leading-[1.05]"
                    style={{ ...display(700), color: C.ink }}
                  >
                    {p.recipient}
                  </span>
                  {/* Washi tape holding the label down. */}
                  <span
                    className="absolute -top-[14%] -left-[8%] h-[24%] w-[36%] rotate-[-28deg]"
                    style={{ background: WASHI(C.pink), opacity: 0.92 }}
                    aria-hidden
                  />
                  <span
                    className="absolute -right-[8%] -bottom-[12%] h-[24%] w-[36%] rotate-[-24deg]"
                    style={{ background: WASHI(C.butter), opacity: 0.92 }}
                    aria-hidden
                  />
                </div>
                <Clay
                  id="star"
                  rotate={-14}
                  reduced={p.reduced}
                  shadow="40,110,90"
                  className="top-[9%] right-[8%] w-[20%]"
                />
                <Clay
                  id="heart"
                  rotate={10}
                  reduced={p.reduced}
                  shadow="40,110,90"
                  className="bottom-[8%] left-[16%] w-[19%]"
                />
                <Gloss strength={0.35} height="36%" />
                <Sheen strength={0.35} angle={115} width={30} />
                <motion.span
                  className="absolute inset-0 bg-[#2b2522]"
                  style={{ opacity: shade }}
                  aria-hidden
                />
              </div>
              {/* The inside of the cover: the left page. */}
              <div
                className="absolute inset-0 overflow-hidden rounded-l-[16px] px-[9%] pt-[11%]"
                style={{
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  background: `${dots("rgba(159,216,196,.4)", 1.2, 14)}, #FFF8F1`,
                  boxShadow: `inset -16px 0 18px -16px rgba(${C.tint},.4)`,
                }}
              >
                <Texture material="paper" opacity={0.35} />
                <span
                  className="relative block text-[clamp(9px,2.6cqi,11px)] tracking-[0.22em] uppercase"
                  style={{ ...text(600), color: C.pinkInk }}
                >
                  {p.badge}
                </span>
                <span
                  className="relative mt-2 block text-[clamp(1.25rem,6cqi,1.9rem)] leading-[1.05]"
                  style={{ ...display(700), color: C.ink }}
                >
                  {p.greeting}
                </span>
                <span
                  className="relative mt-3 inline-block rounded-full px-3 py-1 text-[clamp(10px,3cqi,12px)]"
                  style={{ ...text(600), background: "#FFE4EC", color: C.pinkInk }}
                >
                  {p.contributors.length
                    ? `${p.contributors.length} friends inside`
                    : "Everyone's inside"}
                </span>
                <Clay
                  id="letter"
                  rotate={-8}
                  reduced={p.reduced}
                  className="right-[12%] bottom-[10%] w-[34%]"
                />
              </div>
            </motion.div>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(11cqi,48px)] h-11">
        <FallbackButton onClick={openCover} color={C.pinkInk} ink={C.ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const scrapbookBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#FFF1E6",
    bottom: "#FCDCCB",
    glow: "#FFFFFFE6",
    blobs: [
      ["#D7F2E6CC", 86, 14, 55],
      ["#FFE6EECC", 10, 88, 60],
    ],
    pattern: dotLayer("rgba(255,255,255,.7)", 2),
    patternSize: "24px 24px",
  });
