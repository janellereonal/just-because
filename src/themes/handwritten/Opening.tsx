/**
 * HANDWRITTEN — a note folded in four, written in ink.
 * Gesture: unfold it. The first tap (or drag down) opens the bottom half, the
 * second (or drag sideways) opens the right half. Inside, the greeting writes
 * itself line by line and a little heart is doodled at the end.
 * Beats (ms after it is fully open): 0 writing starts · 1500 heart doodle ·
 * 2400 success · 3300 open.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { FloorShadow, LightShaft, Object3D, Sheen, TEXTURE, TEXTURE_SOFT, Texture, elevation, rim } from "@/themes/_shared/light";
import { foley, melody } from "@/lib/play";

const LINE = 26; // ruled line height, px

export function HandwrittenOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  // 0 = fully folded, 1 = bottom half open, 2 = open
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const foldB = useMotionValue(180); // bottom half, folded up over the top half
  const foldA = useMotionValue(-180); // right half, folded over the left half
  const shiftX = useMotionValue(25); // % of the sheet: keeps the folded quarter centred
  const shiftY = useMotionValue(25);
  const tx = useTransform(shiftX, (v) => `${v}%`);
  const ty = useTransform(shiftY, (v) => `${v}%`);
  // The shadow only covers the part of the sheet that's showing.
  const shadowW = useTransform(shiftX, (v) => `${100 - v * 2}%`);
  const shadowH = useTransform(shiftY, (v) => `${100 - v * 2}%`);
  const h = useHaptics();
  const open = step === 2;
  const beat = useBeats(open, [0, 1500, 2400, 3300]);

  function next() {
    if (!p.interactive || p.paused) return;
    if (step === 0) {
      setStep(1);
      void animate(foldB, 0, SPRING.heavy);
      void animate(shiftY, 0, SPRING.heavy);
      foley("paper");
      h.tap();
      cast.current?.anticipate();
    } else if (step === 1) {
      setStep(2);
      void animate(foldA, 0, SPRING.heavy);
      void animate(shiftX, 0, SPRING.heavy);
      foley("paper");
      h.thud();
      cast.current?.celebrate();
    }
  }

  useEffect(() => {
    if (beat === 2) {
      melody([659, 784, 988], 0.16, "sine", 0.05);
      const r = sheetRef.current?.getBoundingClientRect();
      if (r) burstSet(p.hostRef.current, r.left + r.width * 0.78, r.top + r.height * 0.8, p.iconSet, { colors: [c.rose!, c.ink!, c.kraft!], count: 14, spread: 1.1, up: true, gravity: 0.5 });
    }
    if (beat === 3) h.success();
    if (beat === 4) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(step === 0 ? "Tap the note to unfold it" : step === 1 ? "Once more" : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Previews unfold it on their own.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t1 = window.setTimeout(next, 900);
    const t2 = window.setTimeout(next, 1700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const names = p.contributors.slice(0, 3);
  const signoff = names.length ? `${names.join(", ")}${p.contributors.length > 3 ? " and everyone" : ""}` : "everyone who loves you";
  const paper = c.paper!;
  const ruled = `repeating-linear-gradient(180deg, transparent 0 ${LINE - 1}px, ${c.ink}1f ${LINE - 1}px ${LINE}px)`;
  const margin = `linear-gradient(90deg, transparent 0 13%, ${c.rose}55 13% calc(13% + 1px), transparent calc(13% + 1px))`;

  /** The inside of the note, drawn once at full size; each quarter shows its own part of it. */
  const inside = (
    <div className="absolute inset-0 px-[17%] pt-[16%] pb-[10%] text-left" style={{ color: c.ink, backgroundColor: paper, backgroundImage: `${margin}, ${ruled}`, backgroundPosition: `0 0, 0 ${LINE * 1.6}px` }}>
      <Texture material="paper" opacity={0.5} />
      <Written show={beat >= 1} delay={0} className="text-[12px] tracking-[0.18em] uppercase opacity-70" style={{ fontFamily: "var(--jb-text)" }}>
        {p.badge}
      </Written>
      <Written show={beat >= 1} delay={0.35} className="mt-3 text-[clamp(1.7rem,8.5cqi,2.5rem)] leading-[1.05]" style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}>
        {p.greeting}
      </Written>
      <Written show={beat >= 1} delay={1.05} className="mt-4 text-[clamp(15px,4.2cqi,18px)] leading-[1.45]" style={{ fontFamily: "var(--jb-text)" }}>
        Love, {signoff}
      </Written>
      <svg viewBox="0 0 60 50" className="mt-2 block h-[clamp(28px,9cqi,40px)] w-auto overflow-visible" aria-hidden="true">
        <motion.path
          d="M30 44C14 33 5 25 6 15 7 7 17 4 24 10c3 2 5 5 6 7 1-2 3-5 6-7 7-6 17-3 18 5 1 10-8 18-24 29"
          fill="none"
          stroke={c.rose}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: beat >= 2 ? 1 : 0, opacity: beat >= 2 ? 1 : 0 }}
          transition={{ pathLength: { duration: 0.9, ease: [0.45, 0, 0.3, 1] }, opacity: { duration: 0.1 } }}
        />
      </svg>
    </div>
  );

  /** One quarter: the front shows its slice of the inside, the back is plain paper (or the address). */
  const quarter = (qx: 0 | 1, qy: 0 | 1, back?: React.ReactNode, backFlip: "x" | "y" = "y") => (
    <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
      <div className="absolute inset-0 overflow-hidden" style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
        <div className="absolute" style={{ width: "200%", height: "200%", left: `${-qx * 100}%`, top: `${-qy * 100}%` }}>
          {inside}
        </div>
        <Crease side={qx === 0 ? "right" : "left"} />
        <Crease side={qy === 0 ? "bottom" : "top"} />
      </div>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: backFlip === "x" ? "rotateX(180deg)" : "rotateY(180deg)", background: `linear-gradient(160deg, #FFFDF6, ${paper})` }}
      >
        <Texture material="paper" opacity={0.55} />
        {back}
      </div>
    </div>
  );

  const address = (
    <div className="absolute inset-0 grid place-items-center px-[12%] text-center" style={{ color: c.ink }}>
      <span>
        <span className="block text-[11px] tracking-[0.2em] uppercase opacity-60" style={{ fontFamily: "var(--jb-text)" }}>
          For
        </span>
        <span className="mt-1 block text-[clamp(1.4rem,7cqi,2.1rem)] leading-none" style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}>
          {p.recipient || "you"}
        </span>
        <svg viewBox="0 0 120 12" className="mx-auto mt-2 block w-[70%]" aria-hidden="true">
          <path d="M2 8c20-6 40 4 60-1s36-5 56 0" fill="none" stroke={c.rose} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={-12} className="pointer-events-none absolute -inset-[40%]">
        <LightShaft strength={0.6} motes={7} angle={22} />
      </Layer>
      <Layer depth={10} className="relative" style={{ width: "min(78cqi, 340px)", aspectRatio: "0.8" }}>
        <Object3D pose={{ x: 14, y: -6, z: -2 }} strength={10} settle={open && beat >= 1} className="absolute inset-0">
          <motion.div className="absolute inset-0" style={{ x: tx, y: ty, transformStyle: "preserve-3d" }}>
            <div className="absolute inset-0" style={{ transform: "translateZ(-20px)", transformStyle: "preserve-3d" }}>
              <motion.div className="absolute" style={{ left: 0, top: 0, width: shadowW, height: shadowH }}>
                <FloorShadow tint="60,50,35" depth={5} radius={4} className="inset-0" />
              </motion.div>
            </div>
            <div
              ref={sheetRef}
              role="button"
              tabIndex={open || !p.interactive ? -1 : 0}
              aria-label={step === 0 ? "Unfold the note" : "Unfold it the rest of the way"}
              className="absolute inset-0 cursor-pointer touch-none outline-none"
              style={{ transformStyle: "preserve-3d", filter: "none" }}
              onClick={next}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  next();
                }
              }}
            >
              {/* Top half: top-left stays, top-right folds over it. */}
              <div className="absolute inset-x-0 top-0 h-1/2" style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-y-0 left-0 w-1/2" style={{ transformStyle: "preserve-3d", boxShadow: open ? undefined : rim(0.5) }}>
                  {quarter(0, 0)}
                </div>
                <motion.div className="absolute inset-y-0 right-0 w-1/2" style={{ transformStyle: "preserve-3d", originX: 0, rotateY: foldA, z: 0.6 }}>
                  {quarter(1, 0)}
                </motion.div>
              </div>
              {/* Bottom half: folds up over the top half; inside it, its right quarter folds over its left. */}
              <motion.div className="absolute inset-x-0 bottom-0 h-1/2" style={{ transformStyle: "preserve-3d", originY: 0, rotateX: foldB, z: 1.2 }}>
                <div className="absolute inset-y-0 left-0 w-1/2" style={{ transformStyle: "preserve-3d" }}>
                  {quarter(0, 1, address, "x")}
                </div>
                <motion.div className="absolute inset-y-0 right-0 w-1/2" style={{ transformStyle: "preserve-3d", originX: 0, rotateY: foldA, z: 0.6 }}>
                  {quarter(1, 1)}
                </motion.div>
              </motion.div>
              <motion.div className="pointer-events-none absolute top-0 left-0" style={{ width: shadowW, height: shadowH, boxShadow: elevation(open ? 0.55 : 0.3, "60,50,35", 0.7) }}>
                <Sheen strength={0.45} angle={120} width={24} />
              </motion.div>
            </div>
          </motion.div>
        </Object3D>

        <div className="absolute -right-[14%] bottom-[-8%] z-[4]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={80} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton onClick={next} color={c.ink!} ink={c.ink!} hidden={open || !p.interactive || p.paused}>
          {step === 0 ? p.buttonText : "Open it all the way"}
        </FallbackButton>
      </div>
    </div>
  );
}

/** Text that writes itself in: revealed left to right like a pen moving across the line. */
function Written({ show, delay, className, style, children }: { show: boolean; delay: number; className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  return (
    <motion.span
      className={`block ${className ?? ""}`}
      style={style as object}
      initial={false}
      animate={{ clipPath: show ? "inset(-10% -4% -10% 0%)" : "inset(-10% 100% -10% 0%)", opacity: show ? 1 : 0 }}
      transition={{ clipPath: { duration: 0.9, delay, ease: [0.4, 0, 0.25, 1] }, opacity: { duration: 0.15, delay } }}
    >
      {children}
    </motion.span>
  );
}

/** A soft fold line along one edge of a quarter. */
function Crease({ side }: { side: "left" | "right" | "top" | "bottom" }) {
  const vertical = side === "left" || side === "right";
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{
        [side]: 0,
        ...(vertical ? { top: 0, bottom: 0, width: 10 } : { left: 0, right: 0, height: 10 }),
        background: `linear-gradient(${{ left: "90deg", right: "270deg", top: "180deg", bottom: "0deg" }[side]}, rgba(70,55,30,.12), transparent)`,
      }}
    />
  );
}

export const handwrittenBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.linen,
  backgroundImage: [
    `radial-gradient(60% 50% at 48% 42%, #FFFDF6, transparent 75%)`,
    `radial-gradient(120% 90% at 50% 40%, transparent 55%, ${c.kraft}55)`,
    TEXTURE_SOFT.paper,
    TEXTURE.card,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px, 180px 180px",
});
