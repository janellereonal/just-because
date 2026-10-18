/**
 * BENTO BOARD: the board itself as a bento box. The lid is the board's hero
 * tile (the gift's accent into its main color, the glow, the occasion's 3D
 * piece, their name); under it the tray holds the board's own tiles. Gesture:
 * lift the lid (drag it up, or tap). It rises and slides away, the tiles pop in
 * one by one, and the board carries on from there.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Camera, Mail, Music2 } from "lucide-react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk, surfaceColor } from "@/lib/palettes";
import { meshGradient } from "@/lib/giftPieces";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { Object3D, Sheen } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { themeStillUrl } from "@/components/Theme3D";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: ".18em",
  textTransform: "uppercase",
  opacity: 0.6,
};

export function BentoOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const ink = readableInk(background);
  // The words sit over the deeper end of the gradient.
  const onHero = readableInk(primary);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const lift = useMotionValue(0); // 0 closed, 1 lifted away
  const lidY = useTransform(lift, [0, 0.5, 1], ["0%", "-22%", "-70%"]);
  const lidX = useTransform(lift, [0, 0.5, 1], ["0%", "2%", "36%"]);
  const lidRot = useTransform(lift, [0, 1], [0, 12]);
  const lidOpacity = useTransform(lift, [0.75, 1], [1, 0]);
  useOpenSequence(p, open, boxRef, {
    hold: 2000,
    cast,
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
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

  const friends = p.contributors.length;
  const tiles = [
    {
      key: "made",
      area: "1 / 1 / 2 / 2",
      body: (
        <>
          <div style={label}>Made by</div>
          <span
            className="mt-auto block text-[clamp(2.4rem,11cqi,3.4rem)] leading-none font-semibold tracking-tight"
            style={{ color: accent, fontFamily: "var(--jb-display)" }}
          >
            {friends || "All"}
          </span>
          <span className="text-[12px] opacity-70">{friends === 1 ? "friend" : "friends"}</span>
        </>
      ),
    },
    ...[
      { key: "letters", icon: Mail, word: "Letters", area: "1 / 2 / 2 / 3" },
      { key: "photos", icon: Camera, word: "Photos", area: "2 / 1 / 3 / 2" },
      { key: "songs", icon: Music2, word: "Songs", area: "2 / 2 / 3 / 3" },
    ].map(({ key, icon: Icon, word, area }) => ({
      key,
      area,
      body: (
        <>
          <div
            className="grid size-9 place-items-center rounded-[12px]"
            style={{ background: `${accent}22`, color: accent }}
          >
            <Icon className="size-[18px]" />
          </div>
          <span
            className="mt-auto text-[15px] font-semibold"
            style={{ fontFamily: "var(--jb-display)" }}
          >
            {word}
          </span>
          <span style={label}>In this gift</span>
        </>
      ),
    })),
  ];

  return (
    <div
      className="relative flex w-full flex-col items-center"
      style={
        {
          color: ink,
          fontFamily: "var(--jb-text)",
          "--tile": surfaceColor(background),
          "--accent": accent,
          "--ink": ink,
        } as React.CSSProperties
      }
    >
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(84cqi, 380px)", aspectRatio: "0.95", marginTop: "6%" }}
      >
        <Buddy p={p} ref={cast} size={78} className="-right-[6%] -bottom-[14%]" />
        <Object3D
          pose={{ x: 18, y: -6, z: 0 }}
          strength={8}
          settle={open}
          className="absolute inset-0"
        >
          {/* The tray, holding the board's tiles. */}
          <div
            ref={boxRef}
            className="absolute inset-0 grid gap-[3%] rounded-[30px] p-[4%]"
            style={{
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gridTemplateRows: "repeat(2, minmax(0, 1fr))",
              background: `color-mix(in oklab, ${background} 70%, ${primary} 12%)`,
              boxShadow: `inset 0 3px 10px rgba(43,37,34,.18), 0 30px 50px -30px rgba(43,37,34,.55)`,
            }}
          >
            {tiles.map((t, i) => (
              <motion.div
                key={t.key}
                className="bento-tile"
                style={{ gridArea: t.area, padding: 14, borderRadius: 20, animation: "none" }}
                initial={false}
                animate={
                  open ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.35, scale: 0.94, y: 6 }
                }
                transition={
                  p.reduced ? { duration: 0 } : { ...SPRING.wobbly, delay: 0.45 + i * 0.12 }
                }
              >
                {t.body}
              </motion.div>
            ))}
          </div>

          {/* The lid: the board's hero tile. */}
          <motion.div
            className="absolute -inset-[1.5%] cursor-pointer touch-none overflow-hidden rounded-[32px] p-[7%] outline-none"
            style={{
              y: lidY,
              x: lidX,
              rotate: lidRot,
              opacity: lidOpacity,
              background: `linear-gradient(145deg, ${accent}, ${primary})`,
              color: onHero,
              boxShadow: "0 1px 0 rgba(255,255,255,.35) inset, 0 30px 50px -26px rgba(43,37,34,.6)",
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
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
            <span className="bento-orb" aria-hidden />
            <img
              src={themeStillUrl(p.kind)}
              alt=""
              draggable={false}
              className="pointer-events-none absolute top-[4%] right-[2%] h-[52%] w-[74%] object-contain"
              aria-hidden
            />
            <p className="relative text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80">
              A gift for {p.recipient}
            </p>
            <p
              className="relative mt-2 text-[clamp(1.9rem,9cqi,2.9rem)] leading-[0.95] font-semibold tracking-tight [overflow-wrap:anywhere]"
              style={{ fontFamily: "var(--jb-display)" }}
            >
              {p.greeting}
            </p>
            <p className="relative mt-3 text-[13px] opacity-85">
              {friends
                ? `${friends} friends packed this for you.`
                : "Packed with love, just for you."}
            </p>
            <Sheen strength={0.35} angle={120} width={30} />
          </motion.div>
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton onClick={liftLid} color={ink} ink={ink} hidden={open || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The board's own background: the gift's colors, softly meshed. */
export const bentoBackground = (palette: Palette): React.CSSProperties => ({
  background: meshGradient(palette.primary, palette.accent, palette.background),
});
