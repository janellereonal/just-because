/**
 * SCRATCH CARDS: a lottery-style ticket with a silver foil panel.
 * Gesture: scratch the foil off with a finger or the mouse. Once most of it is
 * gone, the rest flakes away and the greeting underneath is revealed. The
 * button (and previews) scratch it in a few sweeping strokes.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { FallbackButton, Layer, useHaptics } from "@/themes/_shared/stage";
import {
  FloorShadow,
  Object3D,
  Sheen,
  TEXTURE_SOFT,
  Texture,
  elevation,
} from "@/themes/_shared/light";
import { foley } from "@/lib/play";
import { giftColors, live, useAutoplay, useOpenSequence } from "./kit";

const BRUSH = 22;

export function ScratchOpening(p: OpeningProps) {
  const c = giftColors(p);
  const h = useHaptics();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  useOpenSequence(p, done, panelRef, 1600);

  // Paint the foil once the canvas has its size.
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
    g.addColorStop(0, "#9da3ab");
    g.addColorStop(0.35, "#e9edf1");
    g.addColorStop(0.55, "#aeb4bb");
    g.addColorStop(0.8, "#f2f4f6");
    g.addColorStop(1, "#9aa0a7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    // Fine speckle so it reads as foil, and the "scratch here" print.
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.35})`;
      ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1);
    }
    ctx.fillStyle = "rgba(60,64,72,.55)";
    ctx.font = `700 ${Math.max(12, r.width * 0.06)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH HERE", r.width / 2, r.height / 2);
  }, []);

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
    <div className="relative flex w-full flex-col items-center">
      <Layer
        depth={10}
        className="relative"
        style={{ width: "min(84cqi, 380px)", aspectRatio: "1.6" }}
      >
        <Object3D
          pose={{ x: 18, y: -6, z: -2 }}
          strength={8}
          settle={started}
          className="absolute inset-0"
        >
          <FloorShadow tint="40,30,30" depth={10} radius={14} className="inset-0" />
          <div
            className="absolute inset-0 overflow-hidden rounded-[14px] p-[5%]"
            style={{
              background: `linear-gradient(135deg, ${c.primary}, ${c.accent})`,
              boxShadow: elevation(0.5, "40,30,30"),
            }}
          >
            <Texture material="card" opacity={0.3} blend="overlay" />
            {/* Ticket edge perforations. */}
            <span
              className="absolute inset-y-0 left-0 w-[3%]"
              style={{
                background:
                  "radial-gradient(circle at 0 50%, rgba(0,0,0,.25) 0 3px, transparent 3.5px) 0 0 / 100% 12px",
              }}
              aria-hidden
            />
            <div
              className="relative flex items-center justify-between"
              style={{ color: c.onPrimary }}
            >
              <span
                className="text-[clamp(10px,3cqi,12px)] font-bold tracking-[0.18em] uppercase"
                style={{ fontFamily: "var(--jb-text)" }}
              >
                {p.badge}
              </span>
              <span className="font-mono text-[clamp(10px,3cqi,12px)] opacity-80">
                No. {String(p.recipient.length * 137 + 1000).slice(0, 4)}
              </span>
            </div>
            {/* What's under the foil. */}
            <div
              ref={panelRef}
              className="relative mt-[4%] h-[66%] overflow-hidden rounded-[10px]"
              style={{ background: "#FFFDF7" }}
            >
              <div className="absolute inset-0 grid place-items-center px-[6%] text-center">
                <span>
                  <span
                    className="block text-[10px] tracking-[0.2em] text-[#6b5a48] uppercase"
                    style={{ fontFamily: "var(--jb-text)" }}
                  >
                    You won
                  </span>
                  <span
                    className="mt-1 block text-[clamp(1.1rem,5.4cqi,1.8rem)] leading-[1.05] text-[#2b2522]"
                    style={{ fontFamily: "var(--jb-display)", fontWeight: 700 }}
                  >
                    {p.greeting}
                  </span>
                  <span
                    className="mt-1 block text-[clamp(11px,3.2cqi,13px)] text-[#6b5a48]"
                    style={{ fontFamily: "var(--jb-text)" }}
                  >
                    {p.contributors.length
                      ? `and ${p.contributors.length} notes from your people`
                      : "and notes from your people"}
                  </span>
                </span>
              </div>
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
            <Sheen strength={0.3} angle={120} width={26} />
          </div>
          {done ? null : (
            <motion.span
              className="pointer-events-none absolute -right-[3%] -bottom-[6%] grid size-[clamp(30px,10cqi,44px)] place-items-center rounded-full text-[clamp(12px,3.6cqi,16px)] font-black text-[#7a5a1a]"
              style={{
                background: "radial-gradient(circle at 35% 30%, #FFF1B8, #E2B13C 55%, #A87A1E)",
                boxShadow: "inset 0 0 0 3px rgba(255,255,255,.35), 0 4px 10px rgba(0,0,0,.3)",
              }}
              animate={p.reduced ? {} : { rotate: [0, -14, 0], x: [0, -6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              aria-hidden
            >
              ♥
            </motion.span>
          )}
        </Object3D>
      </Layer>

      <div className="mt-[min(9cqi,40px)] h-11">
        <FallbackButton
          onClick={sweep}
          color="#ffffff"
          ink="#ffffff"
          hidden={done || started || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const scratchBackground = (): React.CSSProperties => ({
  backgroundColor: "#2E5E58",
  backgroundImage: [
    "radial-gradient(55% 45% at 50% 45%, #4F8C82, transparent 75%)",
    "radial-gradient(120% 90% at 50% 40%, transparent 50%, #12302caa)",
    TEXTURE_SOFT.paper,
  ].join(","),
  backgroundSize: "auto, auto, 260px 260px",
});
