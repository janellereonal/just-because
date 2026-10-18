/**
 * SCRATCH CARDS: the top card of the stack, drawn exactly like the cards
 * inside (same card, notches, numbering and foil in the gift's colors), with
 * two more peeking out underneath. Gesture: scratch the foil off with a finger
 * or the mouse. Once most of it is gone, the rest flakes away and the greeting
 * is underneath. The button (and previews) scratch it in a few strokes.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk, surfaceColor } from "@/lib/palettes";
import { FallbackButton, Layer, useHaptics } from "@/themes/_shared/stage";
import { Object3D } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { paintFoil } from "@/components/formats/scratchFoil";
import { live, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

const BRUSH = 26;

/** A card's foil, painted once its canvas has a size. */
function useFoil(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  index: number,
  colors: string[],
  big: boolean,
) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const r = { width: c.offsetWidth, height: c.offsetHeight };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    paintFoil(ctx, r.width, r.height, index, colors, big);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, colors.join(",")]);
}

/** One of the cards under the top one: just the card and its foil. */
function UnderCard({
  index,
  colors,
  tilt,
  shift,
}: {
  index: number;
  colors: string[];
  tilt: number;
  shift: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useFoil(ref, index, colors, false);
  return (
    <div
      className="scr-card"
      style={
        {
          "--tilt": `${tilt}deg`,
          translate: shift,
          position: "absolute",
          inset: "0 0 auto 0",
        } as React.CSSProperties
      }
      aria-hidden
    >
      <div className="scr-head">
        <span className="scr-no">&nbsp;</span>
      </div>
      <div className="scr-window">
        <canvas ref={ref} className="absolute inset-0 size-full" />
      </div>
    </div>
  );
}

export function ScratchOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const colors = [accent, primary];
  const ink = readableInk(background);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  useOpenSequence(p, done, panelRef, {
    hold: 1800,
    cast,
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
  });
  useHint(p, "Scratch the foil to see what you won", done);
  useFoil(canvasRef, 0, colors, true);

  function scratchAt(x: number, y: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = BRUSH;
    ctx.beginPath();
    const from = last.current ?? { x, y };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
    if (!started) setStarted(true);
  }

  /** Share of the foil scratched off, sampled on a coarse grid. */
  function cleared() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return 0;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let clear = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 24) {
      total++;
      if (data[i]! < 40) clear++;
    }
    return total ? clear / total : 0;
  }

  function finish() {
    if (done) return;
    setDone(true);
    foley("crunch");
    h.success();
  }

  /** The button and previews: a few quick sweeping strokes, then the rest falls away. */
  function sweep() {
    if (done || !live(p)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = { width: canvas.offsetWidth, height: canvas.offsetHeight };
    const rows = 5;
    let t = 0;
    for (let row = 0; row < rows; row++) {
      const y = ((row + 0.5) / rows) * r.height;
      for (let k = 0; k <= 10; k++) {
        const x = (row % 2 ? 1 - k / 10 : k / 10) * r.width;
        window.setTimeout(() => scratchAt(x, y + Math.sin(k) * 6), p.reduced ? 0 : t);
        t += 14;
      }
      window.setTimeout(() => (last.current = null), p.reduced ? 0 : t);
    }
    window.setTimeout(finish, p.reduced ? 0 : t + 80);
    foley("fizz");
  }
  useAutoplay(p, [[900, sweep]]);

  return (
    <div
      className="scr-root relative flex w-full flex-col items-center text-center"
      style={
        {
          "--scr-accent": accent,
          "--scr-primary": primary,
          "--scr-surface": surfaceColor(background),
          "--scr-bg": background,
          color: ink,
          fontFamily: "var(--jb-text)",
        } as React.CSSProperties
      }
    >
      <p className="scr-kicker">Lucky you, {p.recipient}</p>
      <p
        className="mt-2 text-[clamp(1rem,4cqi,1.2rem)] opacity-80"
        style={{ fontFamily: "var(--jb-display)" }}
      >
        {p.contributors.length
          ? `${p.contributors.length} cards, ${p.contributors.length} winners`
          : "Every card is a winner"}
      </p>
      <Layer
        depth={10}
        className="relative mt-[min(9cqi,40px)]"
        style={{ width: "min(80cqi, 360px)", aspectRatio: "1.12" }}
      >
        <Buddy p={p} ref={cast} size={78} className="-bottom-[16%] -left-[8%]" />
        <UnderCard index={2} colors={colors} tilt={6} shift="5% 9%" />
        <UnderCard index={1} colors={colors} tilt={-5} shift="-4% 5%" />
        <Object3D
          pose={{ x: 12, y: -6, z: -1 }}
          strength={7}
          settle={started}
          className="absolute inset-0"
        >
          <div
            className="scr-card text-left"
            style={
              {
                "--tilt": "-1deg",
                position: "absolute",
                inset: "0 0 auto 0",
              } as React.CSSProperties
            }
          >
            <div className="scr-head">
              <span className="scr-no">No. 01</span>
              <span className="scr-from">From your friends</span>
            </div>
            <div ref={panelRef} className="scr-window">
              <div className="scr-prize">
                <span>
                  <span
                    className="mb-1 block text-[11px] font-semibold tracking-[0.2em] uppercase"
                    style={{ color: accent, fontFamily: "var(--jb-text)" }}
                  >
                    You won
                  </span>
                  <span className="scr-text">{p.greeting}</span>
                </span>
              </div>
              <motion.canvas
                ref={canvasRef}
                className="scr-foil"
                style={{ cursor: "crosshair" }}
                initial={false}
                animate={done ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
                transition={p.reduced ? { duration: 0 } : { duration: 0.45 }}
                onPointerDown={(e) => {
                  if (done || !live(p)) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const r = e.currentTarget.getBoundingClientRect();
                  last.current = null;
                  scratchAt(
                    ((e.clientX - r.left) / r.width) * e.currentTarget.offsetWidth,
                    ((e.clientY - r.top) / r.height) * e.currentTarget.offsetHeight,
                  );
                  h.tick();
                }}
                onPointerMove={(e) => {
                  if (done || !live(p) || !(e.buttons & 1)) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  scratchAt(
                    ((e.clientX - r.left) / r.width) * e.currentTarget.offsetWidth,
                    ((e.clientY - r.top) / r.height) * e.currentTarget.offsetHeight,
                  );
                }}
                onPointerUp={() => {
                  last.current = null;
                  if (!done && cleared() > 0.5) finish();
                }}
                aria-label="Scratch the foil off"
                role="img"
              />
            </div>
          </div>
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton onClick={sweep} color={ink} ink={ink} hidden={done || started || !live(p)}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The scratch cards' own room: the gift's background. */
export const scratchBackground = (palette: Palette): React.CSSProperties => ({
  background: `radial-gradient(90% 60% at 50% 40%, color-mix(in oklab, ${palette.accent} 10%, ${palette.background}), ${palette.background})`,
});
