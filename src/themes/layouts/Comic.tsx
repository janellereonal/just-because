/**
 * COMIC ISSUE: the comic's own cover (the same ComicCover the issue opens
 * on), sealed in a collector's bag with a backing board and a strip of tape.
 * Gesture: slide it out (drag it up, or tap). It rises out of the bag, the bag
 * drops away, and the issue takes over on that same cover.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { Object3D } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { comicSettingDefaults } from "@/lib/comic";
import { ComicCover } from "@/components/ComicCover";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";

export function ComicOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [out, setOut] = useState(false);
  const rise = useMotionValue(0); // 0 in the bag, 1 out
  const y = useTransform(rise, [0, 1], ["0%", "-8%"]);
  const scale = useTransform(rise, [0, 1], [0.94, 1]);
  const bagY = useTransform(rise, [0, 0.5, 1], ["0%", "10%", "70%"]);
  const bagOpacity = useTransform(rise, [0.5, 1], [1, 0]);
  useOpenSequence(p, out, coverRef, {
    hold: 1800,
    colors: [accent, primary, "#FFE45C", "#FFFFFF"],
  });
  useHint(p, "Slide the comic up and out of its bag", out);

  function slideOut() {
    if (out || !live(p)) return;
    setOut(true);
    foley("paper");
    h.thud();
    void animate(rise, 1, p.reduced ? { duration: 0 } : SPRING.soft);
  }
  useAutoplay(p, [[900, slideOut]]);

  const words = comicSettingDefaults(p.recipient, p.kind);
  const issueNo = ([...p.recipient].reduce((a, c) => a + c.charCodeAt(0), 0) % 90) + 1;
  const month = new Date()
    .toLocaleDateString(undefined, { month: "short", year: "numeric" })
    .toUpperCase();

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(74cqi, 330px, calc((100svh - 230px) * 0.6))", aspectRatio: "0.6" }}
      >
        <Object3D
          pose={{ x: 8, y: -10, z: 1 }}
          strength={8}
          settle={out}
          className="absolute inset-0"
        >
          {/* The comic, the same cover the issue opens on. */}
          <motion.div
            ref={coverRef}
            className="cx-root absolute inset-0 cursor-pointer touch-none outline-none"
            style={{
              y,
              scale,
              ...({
                "--cx-accent": accent,
                "--cx-main": primary,
                "--cx-paper": background,
                "--cx-on-accent": readableInk(accent),
                height: "100%",
                minHeight: 0,
                background: "transparent",
                overflow: "visible",
              } as object),
            }}
            onPan={(_, info) => {
              if (out || !live(p)) return;
              rise.set(Math.max(0, Math.min(1, -info.offset.y / 220)));
            }}
            onPanEnd={(_, info) => {
              if (out || !live(p)) return;
              if (info.offset.y < -60) slideOut();
              else void animate(rise, 0, SPRING.snappy);
            }}
            {...pressable(slideOut, !out && live(p), "Slide the comic out of its bag")}
          >
            <ComicCover
              title={words.cover_title}
              subtitle={words.cover_subtitle}
              issueNo={issueNo}
              month={month}
              character={p.character}
              friends={p.contributors.length}
              letters={0}
              photos={0}
              reduce={p.reduced}
              animateIn={false}
              style={{ width: "100%", height: "100%", flex: "none", maxHeight: "none" }}
            />
          </motion.div>

          {/* The bag: clear plastic over a backing board, a flap and a strip of tape. */}
          <motion.div
            className="pointer-events-none absolute -inset-x-[5%] -top-[7%] -bottom-[3%] rounded-[8px]"
            style={{
              y: bagY,
              opacity: bagOpacity,
              background:
                "linear-gradient(115deg, rgba(255,255,255,.42), rgba(255,255,255,.06) 38%, rgba(255,255,255,.26) 58%, rgba(255,255,255,.05))",
              border: "1.5px solid rgba(255,255,255,.65)",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,.05), 0 20px 40px -24px rgba(0,0,0,.6)",
            }}
          >
            <span
              className="absolute inset-x-0 top-0 h-[6%] rounded-t-[8px]"
              style={{
                background: "rgba(255,255,255,.28)",
                borderBottom: "1px solid rgba(255,255,255,.6)",
              }}
              aria-hidden
            />
            <span
              className="absolute inset-x-[30%] top-[3.2%] h-[4%] rounded-[2px]"
              style={{ background: "rgba(255,244,190,.7)", boxShadow: "0 1px 2px rgba(0,0,0,.15)" }}
              aria-hidden
            />
            <span
              className="absolute right-[6%] bottom-[5%] rotate-[-8deg] rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase"
              style={{
                background: "#FFE45C",
                color: "#1d1a22",
                border: "2px solid #1d1a22",
                fontFamily: '"Comic Neue", system-ui, sans-serif',
              }}
              aria-hidden
            >
              Mint condition
            </span>
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(8cqi,34px)] h-11">
        <FallbackButton onClick={slideOut} color="#FFFDF7" ink="#FFFDF7" hidden={out || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The comic's own room: the gift's main color, deepened, with the halftone. */
export const comicBackground = (palette: Palette): React.CSSProperties => ({
  background: [
    "radial-gradient(rgba(255,255,255,.08) 1.3px, transparent 1.8px) 0 0 / 12px 12px",
    `radial-gradient(70% 55% at 50% 45%, color-mix(in oklab, ${palette.primary} 92%, #fff), transparent 75%)`,
    `color-mix(in oklab, ${palette.primary} 78%, #000)`,
  ].join(","),
});
