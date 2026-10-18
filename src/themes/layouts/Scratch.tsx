/**
 * SCRATCH CARDS: a pastel lucky ticket with stamp-cut edges and a holographic
 * foil panel. Gesture: scratch the foil off with a finger or the mouse. Once
 * most of it is gone, the rest flakes away, the greeting underneath is
 * revealed and little clay hearts pop up. The button (and previews) scratch it
 * in a few sweeping strokes.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, useHaptics } from "@/themes/_shared/stage";
import { FloorShadow, Object3D, Sheen } from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { live, useAutoplay, useHint, useOpenSequence } from "./kit";
import {
  Buddy,
  Clay,
  FONTS,
  Gloss,
  Sparkles,
  display,
  dotLayer,
  dots,
  pastelStage,
  text,
  useStyleFonts,
} from "./cute";

const BRUSH = 24;
const C = {
  ink: "#4A3A6B",
  pink: "#F27BA3",
  pinkInk: "#C2477A",
  mint: "#A8E0CC",
  lilac: "#D8CCFF",
  butter: "#FFE38A",
  tint: "60,130,110",
};

/** Stamp-cut edges: little half circles bitten out of the left and right sides. */
const STAMP =
  "radial-gradient(circle 6px at 0 50%, transparent 97%, #000 100%) left / 51% 16px repeat-y, radial-gradient(circle 6px at 100% 50%, transparent 97%, #000 100%) right / 51% 16px repeat-y";

export function ScratchOpening(p: OpeningProps) {
  const h = useHaptics();
  const fonts = useStyleFonts(FONTS.round);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  useOpenSequence(p, done, panelRef, {
    hold: 1800,
    cast,
    colors: [C.pink, C.butter, C.mint, C.lilac, "#FFFFFF"],
  });
  useHint(p, "Scratch the shiny foil to see what you won", done);

  // Paint the holographic foil once the canvas has its size.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, "#F9C6DA");
    g.addColorStop(0.3, "#DCCFFF");
    g.addColorStop(0.55, "#C4EEDF");
    g.addColorStop(0.8, "#FFEFB8");
    g.addColorStop(1, "#F9C6DA");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    // Shimmer bands and sparkle speckles so it reads as foil.
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#FFFFFF";
    for (let k = -1; k < 5; k++) {
      ctx.beginPath();
      const x = (k / 4) * r.width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + r.width * 0.12, 0);
      ctx.lineTo(x - r.width * 0.1, r.height);
      ctx.lineTo(x - r.width * 0.2, r.height);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.6})`;
      const s = Math.random() < 0.1 ? 2 : 1;
      ctx.fillRect(Math.random() * r.width, Math.random() * r.height, s, s);
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(194,71,122,.45)";
    ctx.shadowOffsetY = 1.5;
    ctx.font = `700 ${Math.max(13, r.width * 0.07)}px Fredoka, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("♥  SCRATCH ME  ♥", r.width / 2, r.height / 2);
  }, []);

  function scratchAt(x: number, y: number) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.globalCompositeOperation = "destination-out";
    ctx.shadowColor = "transparent";
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
    const step = 4 * 24;
    for (let i = 3; i < data.length; i += step) {
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
    const r = canvas.getBoundingClientRect();
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
    <div className="relative flex w-full flex-col items-center" style={fonts}>
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(86cqi, 390px)", aspectRatio: "1.55" }}
      >
        <Sparkles
          reduced={p.reduced}
          spots={[
            [2, -12, 18],
            [98, -4, 14],
            [104, 96, 18],
            [-4, 100, 12],
          ]}
        />
        <Buddy p={p} ref={cast} size={78} className="-bottom-[26%] -left-[2%]" />
        <Object3D
          pose={{ x: 18, y: -6, z: -2 }}
          strength={8}
          settle={started}
          className="absolute inset-0"
        >
          <FloorShadow tint={C.tint} depth={10} radius={18} className="inset-0" />
          <div
            className="absolute inset-0 overflow-hidden rounded-[18px] px-[7%] pt-[5%]"
            style={{
              background: `${dots("rgba(255,255,255,.45)", 1.5, 14)}, linear-gradient(135deg, #EADFFF, #FFD6E4 60%, #FFE9C9)`,
              WebkitMask: STAMP,
              mask: STAMP,
            }}
          >
            <div className="relative flex items-center justify-between" style={{ color: C.ink }}>
              <span
                className="text-[clamp(10px,3cqi,12px)] tracking-[0.18em] uppercase"
                style={text(700)}
              >
                {p.badge}
              </span>
              <span className="font-mono text-[clamp(10px,3cqi,12px)] opacity-70">
                No. {String(p.recipient.length * 137 + 1000).slice(0, 4)}
              </span>
            </div>
            {/* What's under the foil. */}
            <div
              ref={panelRef}
              className="relative mt-[4%] h-[64%] overflow-hidden rounded-[14px]"
              style={{ background: "#FFFDF7", boxShadow: "inset 0 2px 6px rgba(120,80,150,.2)" }}
            >
              <div className="absolute inset-0 grid place-items-center px-[6%] text-center">
                <span>
                  <span
                    className="block text-[clamp(9px,2.8cqi,11px)] tracking-[0.2em] uppercase"
                    style={{ ...text(700), color: C.pinkInk }}
                  >
                    You won
                  </span>
                  <span
                    className="mt-1 block text-[clamp(1.2rem,6cqi,2rem)] leading-[1.05]"
                    style={{ ...display(700), color: C.ink }}
                  >
                    {p.greeting}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(11px,3.2cqi,13px)]"
                    style={{ ...text(500), color: `${C.ink}B3` }}
                  >
                    {p.contributors.length
                      ? `and ${p.contributors.length} notes from your people`
                      : "and notes from your people"}
                  </span>
                </span>
              </div>
              <Clay
                id="heart"
                show={done}
                delay={0.3}
                rotate={-14}
                reduced={p.reduced}
                className="top-[8%] left-[5%] w-[13%]"
              />
              <Clay
                id="star"
                show={done}
                delay={0.45}
                rotate={12}
                reduced={p.reduced}
                className="right-[5%] bottom-[8%] w-[13%]"
              />
              <motion.canvas
                ref={canvasRef}
                className="absolute inset-0 size-full cursor-crosshair touch-none"
                initial={false}
                animate={done ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
                transition={p.reduced ? { duration: 0 } : { duration: 0.45 }}
                onPointerDown={(e) => {
                  if (done || !live(p)) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const r = e.currentTarget.getBoundingClientRect();
                  last.current = null;
                  scratchAt(e.clientX - r.left, e.clientY - r.top);
                  h.tick();
                }}
                onPointerMove={(e) => {
                  if (done || !live(p) || !(e.buttons & 1)) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  scratchAt(e.clientX - r.left, e.clientY - r.top);
                }}
                onPointerUp={() => {
                  last.current = null;
                  if (!done && cleared() > 0.5) finish();
                }}
                aria-label="Scratch the foil off"
                role="img"
              />
            </div>
            <div className="relative mt-[3%] flex justify-center gap-[3%]" aria-hidden>
              {[C.pink, C.butter, C.mint, C.lilac].map((c) => (
                <span
                  key={c}
                  className="size-[clamp(6px,2cqi,9px)] rounded-full"
                  style={{ background: c }}
                />
              ))}
            </div>
            <Gloss strength={0.4} height="30%" />
            <Sheen strength={0.35} angle={120} width={26} />
          </div>
          {/* The scratcher: a clay star that wiggles until you start. */}
          {done ? null : (
            <motion.span
              className="pointer-events-none absolute -right-[4%] -bottom-[10%] block w-[17%]"
              animate={p.reduced ? {} : { rotate: [0, -16, 0], x: [0, -8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              aria-hidden
            >
              <img
                src="/clay/orn-star@256.webp"
                alt=""
                draggable={false}
                className="block w-full drop-shadow-[0_5px_6px_rgba(60,130,110,.35)]"
              />
            </motion.span>
          )}
        </Object3D>
      </Layer>

      <div className="mt-[min(12cqi,52px)] h-11">
        <FallbackButton
          onClick={sweep}
          color={C.ink}
          ink={C.ink}
          hidden={done || started || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const scratchBackground = (): React.CSSProperties =>
  pastelStage({
    top: "#E6F8F1",
    bottom: "#C8EEDF",
    glow: "#FFFFFFD0",
    blobs: [
      ["#FFF0BFAA", 86, 14, 55],
      ["#FFDDE8CC", 10, 86, 60],
    ],
    pattern: dotLayer("rgba(255,255,255,.6)", 1.8),
    patternSize: "22px 22px",
  });
