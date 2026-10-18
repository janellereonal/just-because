/**
 * GAME NIGHT — two dice on a board.
 * Gesture: roll the dice (tap them, or flick). They tumble across the board and
 * land; a token hops along the track by the number rolled and lands on the
 * star square. Confetti from the gift's icon set.
 * Beats (ms after the roll): 0 tumbling · 1000 landed · 1200..2400 token hops ·
 * 2700 star square · 3700 open.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { Extrude, FloorShadow, Object3D, Sheen, TEXTURE_SOFT, Texture, elevation, rim } from "@/themes/_shared/light";
import { chime, foley, melody } from "@/lib/play";

/** Squares around the board's edge, clockwise from the bottom left: [col, row] on a 6x6 grid. */
const TRACK: [number, number][] = [
  [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
  [5, 4], [5, 3], [5, 2], [5, 1], [5, 0],
  [4, 0], [3, 0], [2, 0], [1, 0], [0, 0],
  [0, 1], [0, 2], [0, 3], [0, 4],
];
/** Where each face's pips sit, on a 3x3 grid (0..2). */
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};
/** The cube turn that brings each face to the top-front. */
const FACE_TURN: Record<number, [number, number]> = { 1: [0, 0], 2: [0, -90], 3: [-90, 0], 4: [90, 0], 5: [0, 90], 6: [180, 0] };

export function GameOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [rolled, setRolled] = useState(false);
  const h = useHaptics();
  // A friendly roll: always 3 + 4, so the token lands on the star square.
  const faces: [number, number] = [3, 4];
  const steps = faces[0] + faces[1];
  const goal = 2 + steps; // the token starts on square 2
  const beat = useBeats(rolled, [1000, 1200 + steps * 170, 2700 + steps * 60, 3700 + steps * 60]);
  const [at, setAt] = useState(2);

  function roll() {
    if (rolled || !p.interactive || p.paused) return;
    setRolled(true);
    foley("thunk");
    h.thud();
    cast.current?.anticipate();
  }

  useEffect(() => {
    if (beat === 1) {
      chime("pop");
      h.tap();
      // Hop along the track, one square at a time.
      let i = 0;
      const t = window.setInterval(() => {
        i += 1;
        setAt(2 + i);
        h.tick();
        chime("boop");
        if (i >= steps) window.clearInterval(t);
      }, 170);
      return () => window.clearInterval(t);
    }
    if (beat === 2) {
      melody([523, 659, 784, 1047], 0.12, "triangle", 0.05);
      h.success();
      cast.current?.celebrate();
      const r = boardRef.current?.getBoundingClientRect();
      if (r) {
        burstSet(p.hostRef.current, r.left + r.width * 0.3, r.top + r.height * 0.35, p.iconSet, { colors: [c.cranberry!, c.butter!, c.mint!, c.sky!], count: 16, spread: 1.4, up: true, gravity: 0.7 });
        burstSet(p.hostRef.current, r.left + r.width * 0.7, r.top + r.height * 0.35, p.iconSet, { colors: [c.cranberry!, c.butter!, c.mint!, c.sky!], count: 16, spread: 1.4, up: true, gravity: 0.7 });
      }
    }
    if (beat === 4) p.onOpen();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(rolled ? "" : "Tap the dice to roll");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolled]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(roll, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const cell = (col: number, row: number) => ({ left: `${(col / 6) * 100}%`, top: `${(row / 6) * 100}%`, width: `${100 / 6}%`, height: `${100 / 6}%` });
  const square = TRACK[Math.min(at, TRACK.length - 1)]!;
  const colors = [c.cranberry!, c.butter!, c.mint!, c.sky!];

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={10} className="relative" style={{ width: "min(80cqi, 350px)", aspectRatio: "1" }}>
        <Object3D pose={{ x: 34, y: 0, z: -8 }} strength={8} settle={beat >= 3} className="absolute inset-0">
          <div className="absolute inset-0" style={{ transform: "translateZ(-14px)", transformStyle: "preserve-3d" }}>
            <FloorShadow tint="20,25,45" depth={6} radius={22} className="inset-0" />
          </div>
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            <Extrude depth={12} color={c.navy!} edge="#151E3D" radius={22} slices={5} />
          </div>
          <div ref={boardRef} className="absolute inset-0 overflow-hidden rounded-[22px]" style={{ background: c.cream, boxShadow: `${rim(0.8)}, ${elevation(0.35, "20,25,45", 0.6)}` }}>
            <Texture material="card" opacity={0.5} />
            {TRACK.map(([col, row], i) => (
              <span key={i} className="absolute p-[3px]" style={cell(col, row)}>
                <span
                  className="grid size-full place-items-center rounded-[8px] text-[clamp(10px,3.4cqi,15px)]"
                  style={{
                    background: i === goal ? c.butter : `${colors[i % colors.length]}${i % 2 ? "cc" : "99"}`,
                    boxShadow: "inset 0 -3px 0 rgba(0,0,0,.14), inset 0 1px 0 rgba(255,255,255,.5)",
                    color: c.navy,
                  }}
                >
                  {i === goal ? "★" : i === 2 ? "GO" : ""}
                </span>
              </span>
            ))}
            {/* The middle of the board: the greeting, printed on it */}
            <div className="absolute inset-[18%] flex items-start justify-center rounded-[14px] px-[8%] pt-[7%] text-center" style={{ background: c.navy, color: c.cream, boxShadow: "inset 0 2px 6px rgba(0,0,0,.35)" }}>
              <div>
                <span className="block text-[10px] tracking-[0.24em] uppercase opacity-70" style={{ fontFamily: "var(--jb-text)" }}>
                  {p.badge}
                </span>
                <Greeting text={p.greeting} className="mt-2 text-[clamp(1.2rem,6.4cqi,1.9rem)]" style={{ fontWeight: 400, letterSpacing: "0.01em", color: c.butter }} />
              </div>
            </div>
            <Sheen strength={0.35} angle={115} width={20} />
            {/* The token, hopping square to square */}
            <motion.span
              className="absolute z-[3] grid place-items-center"
              animate={{ left: cell(square[0], square[1]).left, top: cell(square[0], square[1]).top }}
              transition={{ type: "spring", stiffness: 520, damping: 26 }}
              style={{ width: `${100 / 6}%`, height: `${100 / 6}%` }}
            >
              <motion.span
                key={at}
                className="block size-[58%] rounded-full"
                initial={{ y: rolled ? -14 : 0, scale: rolled ? 1.12 : 1 }}
                animate={{ y: 0, scale: 1 }}
                transition={SPRING.snappy}
                style={{ background: `radial-gradient(circle at 34% 28%, #fff7, ${c.cranberry} 45%, #8E1D18)`, boxShadow: "0 4px 6px rgba(20,25,45,.35), inset 0 -2px 3px rgba(0,0,0,.25)" }}
              />
            </motion.span>
          </div>

          {/* The dice: real CSS cubes, lifted off the board */}
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: "translateZ(30px)" }}>
            <Die value={faces[0]} rolled={rolled} landed={beat >= 1} from={{ x: -90, y: 90 }} to={{ x: -38, y: 52 }} spin={[720, 360]} color={c.cream!} pip={c.cranberry!} onRoll={roll} label="Roll the dice" interactive={p.interactive && !rolled && !p.paused} />
            <Die value={faces[1]} rolled={rolled} landed={beat >= 1} from={{ x: 90, y: 100 }} to={{ x: 40, y: 60 }} spin={[-360, 720]} color={c.butter!} pip={c.navy!} onRoll={roll} label="Roll the dice" interactive={p.interactive && !rolled && !p.paused} />
          </div>
        </Object3D>

        <div className="absolute -right-[12%] bottom-[-10%] z-[4]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={84} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[min(10cqi,44px)] h-11">
        <FallbackButton onClick={roll} color={c.navy!} ink={c.navy!} hidden={rolled || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** A 3D die (six CSS faces) that tumbles from `from` to `to` and lands on `value`. */
function Die({
  value,
  rolled,
  landed,
  from,
  to,
  spin,
  color,
  pip,
  onRoll,
  label,
  interactive,
}: {
  value: number;
  rolled: boolean;
  landed: boolean;
  from: { x: number; y: number };
  to: { x: number; y: number };
  spin: [number, number];
  color: string;
  pip: string;
  onRoll: () => void;
  label: string;
  interactive: boolean;
}) {
  const size = "clamp(44px, 15cqi, 64px)";
  const rx = useMotionValue(-14);
  const ry = useMotionValue(20);
  // At rest they sit apart, low on the panel, so the greeting stays clear.
  const x = useMotionValue(from.x * 0.46);
  const y = useMotionValue(from.y * 0.35 + 16);
  const lift = useMotionValue(0);
  const z = useTransform(lift, (v) => v * 70);
  const shadowScale = useTransform(lift, (v) => 1 - v * 0.35);
  const shadowOpacity = useTransform(lift, (v) => 0.5 - v * 0.3);
  const target = useMemo<[number, number]>(() => FACE_TURN[value] ?? [0, 0], [value]);

  useEffect(() => {
    if (!rolled) return;
    void animate(x, to.x, { type: "spring", stiffness: 70, damping: 12 });
    void animate(y, to.y, { type: "spring", stiffness: 70, damping: 12 });
    void animate(lift, [0, 1, 0.15, 0.4, 0], { duration: 1, times: [0, 0.3, 0.6, 0.78, 1], ease: "easeOut" });
    void animate(rx, target[0] + spin[0], { type: "spring", stiffness: 40, damping: 11 });
    void animate(ry, target[1] + spin[1], { type: "spring", stiffness: 40, damping: 11 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolled]);

  const face = (n: number, transform: string) => (
    <span
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[22%] p-[14%]"
      style={{
        transform,
        background: `radial-gradient(circle at 30% 25%, #fff, ${color} 70%)`,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.06), inset -3px -4px 6px rgba(0,0,0,.12)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {Array.from({ length: 9 }, (_, i) => {
        const on = (PIPS[n] ?? []).some(([px, py]) => px + py * 3 === i);
        return <span key={i} className="m-auto block size-[70%] rounded-full" style={{ background: on ? `radial-gradient(circle at 40% 35%, ${pip}aa, ${pip})` : "transparent", boxShadow: on ? "inset 0 1px 2px rgba(0,0,0,.4)" : undefined }} />;
      })}
    </span>
  );
  const half = `calc(${size} / 2)`;

  return (
    <motion.div className="absolute top-1/2 left-1/2" style={{ x, y, width: size, height: size, marginLeft: `calc(${size} / -2)`, marginTop: `calc(${size} / -2)`, transformStyle: "preserve-3d" }}>
      <motion.span aria-hidden="true" className="absolute inset-[6%] rounded-[30%]" style={{ background: "rgba(20,25,45,.5)", filter: "blur(6px)", transform: "translateZ(-30px) translate(8px, 10px)", scale: shadowScale, opacity: shadowOpacity }} />
      <motion.button
        type="button"
        aria-label={label}
        tabIndex={interactive ? 0 : -1}
        onClick={onRoll}
        disabled={!interactive}
        whileTap={interactive ? { scale: 0.92 } : {}}
        className="absolute inset-0 cursor-pointer outline-none disabled:cursor-default"
        style={{ transformStyle: "preserve-3d", rotateX: rx, rotateY: ry, z }}
      >
        {face(1, `translateZ(${half})`)}
        {face(6, `rotateY(180deg) translateZ(${half})`)}
        {face(2, `rotateY(90deg) translateZ(${half})`)}
        {face(5, `rotateY(-90deg) translateZ(${half})`)}
        {face(3, `rotateX(90deg) translateZ(${half})`)}
        {face(4, `rotateX(-90deg) translateZ(${half})`)}
      </motion.button>
    </motion.div>
  );
}

/** A soft sage table (Oct 2026: was a dark green felt, which felt heavy next to the other styles). */
export const gameBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: "#DDEBE1",
  backgroundImage: [
    `radial-gradient(60% 50% at 50% 45%, #F1F7F2, transparent 75%)`,
    `radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(60,104,84,.16))`,
    TEXTURE_SOFT.linen,
  ].join(","),
  backgroundSize: "auto, auto, 200px 200px",
  color: c.navy,
});
