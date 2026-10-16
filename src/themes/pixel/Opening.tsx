/**
 * PIXEL — a little handheld console.
 * Gesture: press START (or A). The screen loads in chunky blocks, says the
 * greeting in pixel type, a pixel heart beats and coins pop out of the screen.
 * Beats (ms after the press): 0 loading · 1100 greeting · 1700 heart and coins ·
 * 2500 success · 3400 open.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { Extrude, FloorShadow, Object3D, Sheen, Texture, elevation, rim } from "@/themes/_shared/light";
import { chime, melody } from "@/lib/play";

const HEART = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
const BLOCKS = 10;

export function PixelOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const screenRef = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);
  const [pressed, setPressed] = useState<"start" | "a" | null>(null);
  const [loaded, setLoaded] = useState(0);
  const h = useHaptics();
  const beat = useBeats(started, [0, 1100, 1700, 2500, 3400]);

  function start(which: "start" | "a" = "start") {
    if (started || !p.interactive || p.paused) return;
    setPressed(which);
    window.setTimeout(() => setPressed(null), 160);
    setStarted(true);
    chime("boop");
    h.tap();
    cast.current?.anticipate();
  }

  useEffect(() => {
    if (beat === 1) {
      // Load in chunky steps, one block at a time.
      let n = 0;
      const t = window.setInterval(() => {
        n += 1;
        setLoaded(n);
        if (n % 2 === 0) h.tick();
        if (n >= BLOCKS) window.clearInterval(t);
      }, 95);
      return () => window.clearInterval(t);
    }
    if (beat === 2) melody([523, 659, 784, 1047, 1319], 0.09, "square", 0.035);
    if (beat === 3) {
      cast.current?.celebrate();
      const r = screenRef.current?.getBoundingClientRect();
      if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.45, p.iconSet, { colors: [c.butter!, c.bubblegum!, c.mint!, c.violet!], count: 22, spread: 1.5, up: true, gravity: 0.8 });
    }
    if (beat === 4) h.success();
    if (beat === 5) p.onOpen();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(started ? "" : "Press START");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => start("start"), 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const screenBg = "#0F1A2E";
  const glow = c.mint!;
  const press = (which: "start" | "a" | "b") => ({
    onClick: () => start(which === "b" ? "a" : which),
    disabled: started || !p.interactive || p.paused,
  });

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={10} className="relative" style={{ width: "min(66cqi, 290px)", aspectRatio: "0.64" }}>
        <Object3D pose={{ x: 10, y: -14, z: 3 }} strength={10} settle={beat >= 2} className="absolute inset-0">
          <div className="absolute inset-0" style={{ transform: "translateZ(-26px)", transformStyle: "preserve-3d" }}>
            <FloorShadow tint="10,8,30" depth={6} radius={34} className="inset-0" />
          </div>
          <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            <Extrude depth={16} color={c.violet!} edge="#4B35B8" radius={34} slices={6} />
          </div>
          {/* The console body */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[34px] rounded-br-[64px]"
            style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${c.violet} 70%, #fff), ${c.violet} 45%, color-mix(in srgb, ${c.violet} 82%, #000))`, boxShadow: `${rim(1)}, ${elevation(0.45, "10,8,30", 0.8)}` }}
          >
            <Texture material="card" opacity={0.35} />
            <Sheen strength={0.55} angle={118} width={22} />
            {/* Screen bezel */}
            <div className="absolute inset-x-[9%] top-[7%] h-[47%] rounded-[16px] rounded-br-[34px] p-[7%]" style={{ background: "#2B2540", boxShadow: "inset 0 2px 4px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.25)" }}>
              <span className="absolute top-[5%] left-[7%] flex items-center gap-1 text-[7px] tracking-[0.12em] text-white/50" style={{ fontFamily: "var(--jb-display)" }}>
                <span className="block size-1.5 rounded-full" style={{ background: started ? c.bubblegum : "#4a4460", boxShadow: started ? `0 0 6px ${c.bubblegum}` : undefined }} />
                POWER
              </span>
              {/* The screen itself */}
              <div ref={screenRef} className="relative mt-[6%] grid size-full place-items-center overflow-hidden rounded-[6px]" style={{ background: screenBg, boxShadow: `inset 0 0 18px ${glow}33` }}>
                <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "repeating-linear-gradient(180deg, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)" }} />
                {beat < 2 ? (
                  <div className="text-center" style={{ fontFamily: "var(--jb-display)", color: glow }}>
                    {beat === 0 ? (
                      <motion.span className="block text-[clamp(9px,3.2cqi,13px)]" animate={p.paused || p.reduced ? {} : { opacity: [1, 1, 0, 0] }} transition={{ duration: 1, repeat: Infinity, times: [0, 0.55, 0.56, 1] }}>
                        PRESS START
                      </motion.span>
                    ) : (
                      <>
                        <span className="block text-[clamp(8px,2.6cqi,11px)]">LOADING</span>
                        <span className="mx-auto mt-2 flex w-[78%] gap-[3px] p-[3px]" style={{ boxShadow: `0 0 0 2px ${glow}` }}>
                          {Array.from({ length: BLOCKS }, (_, i) => (
                            <span key={i} className="block h-[10px] flex-1" style={{ background: i < loaded ? glow : "transparent" }} />
                          ))}
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="px-[6%] text-center">
                    <motion.span
                      className="block text-[clamp(7px,2.4cqi,10px)] tracking-[0.08em]"
                      style={{ fontFamily: "var(--jb-display)", color: c.butter }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING.snappy}
                    >
                      PLAYER 1
                    </motion.span>
                    <motion.span
                      className="mt-2 block text-[clamp(11px,4.4cqi,17px)] leading-[1.35] [overflow-wrap:anywhere]"
                      style={{ fontFamily: "var(--jb-display)", color: "#fff", textShadow: `2px 2px 0 ${c.violet}` }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...SPRING.snappy, delay: 0.1 }}
                    >
                      {p.greeting.toUpperCase()}
                    </motion.span>
                    <motion.span className="mx-auto mt-3 grid w-[clamp(34px,11cqi,46px)] grid-cols-7" animate={beat >= 3 && !p.reduced ? { scale: [1, 1.18, 1] } : {}} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 0.25 }}>
                      {HEART.flatMap((row, y) => [...row].map((ch, x) => <span key={`${x}-${y}`} className="block aspect-square" style={{ background: ch === "X" ? c.bubblegum : "transparent" }} />))}
                    </motion.span>
                  </div>
                )}
              </div>
            </div>
            <span className="absolute top-[57.5%] left-[10%] text-[9px] tracking-[0.18em] text-white/70" style={{ fontFamily: "var(--jb-display)" }}>
              JUST BECAUSE
            </span>
            {/* D-pad */}
            <div className="absolute top-[66%] left-[11%] size-[26%]" aria-hidden="true">
              <span className="absolute inset-x-0 top-1/3 h-1/3 rounded-[4px]" style={{ background: "#2B2540", boxShadow: "0 3px 0 #1A1530, inset 0 1px 0 rgba(255,255,255,.15)" }} />
              <span className="absolute inset-y-0 left-1/3 w-1/3 rounded-[4px]" style={{ background: "#2B2540", boxShadow: "0 3px 0 #1A1530, inset 0 1px 0 rgba(255,255,255,.15)" }} />
            </div>
            {/* A and B */}
            <div className="absolute top-[64%] right-[9%] flex rotate-[-24deg] gap-[10%]" style={{ width: "34%" }}>
              {(["b", "a"] as const).map((k) => (
                <motion.button
                  key={k}
                  type="button"
                  aria-label={k === "a" ? "Press A" : "Press B"}
                  {...press(k)}
                  tabIndex={-1}
                  animate={{ y: pressed === "a" && k === "a" ? 3 : 0 }}
                  transition={SPRING.snappy}
                  className="grid aspect-square flex-1 place-items-center rounded-full text-[9px] font-bold text-white/80 disabled:cursor-default"
                  style={{ background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${c.bubblegum} 60%, #fff), ${c.bubblegum} 55%, color-mix(in srgb, ${c.bubblegum} 70%, #000))`, boxShadow: pressed === "a" && k === "a" ? "0 1px 0 rgba(0,0,0,.35)" : "0 4px 0 rgba(60,20,50,.45), inset 0 1px 0 rgba(255,255,255,.4)", fontFamily: "var(--jb-display)" }}
                >
                  {k.toUpperCase()}
                </motion.button>
              ))}
            </div>
            {/* SELECT and START */}
            <div className="absolute bottom-[8%] left-1/2 flex -translate-x-1/2 gap-[14px]">
              {(["select", "start"] as const).map((k) => (
                <span key={k} className="flex flex-col items-center gap-1">
                  <motion.button
                    type="button"
                    aria-label={k === "start" ? "Press start" : "Select"}
                    onClick={() => k === "start" && start("start")}
                    disabled={k !== "start" || started || !p.interactive || p.paused}
                    tabIndex={k === "start" && !started && p.interactive ? 0 : -1}
                    animate={{ y: pressed === "start" && k === "start" ? 2 : 0 }}
                    transition={SPRING.snappy}
                    className="block h-[9px] w-[34px] rotate-[-24deg] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default"
                    style={{ background: "#2B2540", boxShadow: "0 2px 0 #1A1530, inset 0 1px 0 rgba(255,255,255,.18)" }}
                  />
                  <span className="text-[7px] tracking-[0.12em] text-white/60" style={{ fontFamily: "var(--jb-display)" }}>
                    {k.toUpperCase()}
                  </span>
                </span>
              ))}
            </div>
            {/* Speaker grille */}
            <div className="absolute right-[9%] bottom-[7%] flex rotate-[-24deg] gap-[4px]" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="block h-[26px] w-[4px] rounded-full" style={{ background: "rgba(20,10,50,.35)", boxShadow: "1px 1px 0 rgba(255,255,255,.18)" }} />
              ))}
            </div>
          </div>
        </Object3D>

        <div className="absolute -right-[20%] bottom-[-6%] z-[4]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={78} live={!p.paused} showName={false} />
        </div>
      </Layer>

      <div className="mt-[min(8cqi,36px)] h-11">
        <FallbackButton onClick={() => start("start")} color={c.snow!} ink={c.snow!} hidden={started || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

export const pixelBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.night,
  backgroundImage: [
    `radial-gradient(55% 45% at 50% 42%, color-mix(in srgb, ${c.violet} 45%, transparent), transparent 75%)`,
    `linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px)`,
    `linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)`,
  ].join(","),
  backgroundSize: "auto, 24px 24px, 24px 24px",
});
