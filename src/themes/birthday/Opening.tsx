/**
 * HAPPY BIRTHDAY — a cake with real lit candles.
 * Gesture: blow into the mic (flames lean with your breath and go out one by
 * one), or tap each candle. Smoke curls up, a confetti cannon fires from both
 * corners, the character dances in a party hat.
 * Beats (ms after the last candle): 0 smoke · 350 cannons · 900 greeting
 * lands · 2300 open.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mic } from "lucide-react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { pick } from "@/themes/_shared/iconSets";
import { foley, melody } from "@/lib/play";

const CANDLES = 5;

export function BirthdayOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const [out, setOut] = useState<boolean[]>(() => Array(CANDLES).fill(false));
  const [breath, setBreath] = useState(0);
  const [mic, setMic] = useState<"off" | "asking" | "on" | "denied">("off");
  const stopMic = useRef<(() => void) | null>(null);
  const flameRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const h = useHaptics();
  const allOut = out.every(Boolean);
  const beat = useBeats(allOut, [350, 900, 2300]);

  function blowOut(i: number) {
    setOut((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
    foley("breath");
    h.tick();
  }
  function blowAll(stagger = 140) {
    out.forEach((o, i) => !o && window.setTimeout(() => blowOut(i), i * stagger));
  }

  useEffect(() => {
    if (!allOut) return;
    stopMic.current?.();
    cast.current?.celebrate();
  }, [allOut]);

  useEffect(() => {
    if (beat === 1) {
      const r = p.hostRef.current?.getBoundingClientRect();
      if (r) {
        burstSet(p.hostRef.current, r.left + 10, r.bottom - 20, p.iconSet, { count: 26, spread: 2.2, up: true, gravity: 1.4 });
        burstSet(p.hostRef.current, r.right - 10, r.bottom - 20, p.iconSet, { count: 26, spread: 2.2, up: true, gravity: 1.4 });
      }
      foley("thunk");
      h.success();
    }
    if (beat === 2) melody([392, 392, 440, 392, 523, 494], 0.22, "triangle", 0.06);
    if (beat === 3) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    if (allOut) p.setHint("");
    else if (mic === "on") p.setHint("Blow on your phone");
    else p.setHint("Blow them out: tap each candle, or use the mic");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allOut, mic]);

  // Previews: a little gust puts them out one by one.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t1 = window.setTimeout(() => setBreath(0.8), 900);
    const t2 = window.setTimeout(() => blowAll(170), 1200);
    const t3 = window.setTimeout(() => setBreath(0), 2200);
    return () => [t1, t2, t3].forEach(window.clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  useEffect(() => () => stopMic.current?.(), []);

  async function useMic() {
    setMic("asking");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor!();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let raf = 0;
      let gust = 0;
      let last = 0;
      const tick = (now: number) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length);
        const level = Math.min(1, Math.max(0, (rms - 0.04) * 6));
        setBreath((b) => b * 0.7 + level * 0.3);
        gust = level > 0.45 ? gust + 1 : Math.max(0, gust - 2);
        // A steady breath puts out the next candle every quarter second.
        if (gust > 8 && now - last > 240) {
          last = now;
          setOut((prev) => {
            const i = prev.findIndex((o) => !o);
            if (i < 0) return prev;
            const next = [...prev];
            next[i] = true;
            foley("breath");
            return next;
          });
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stopMic.current = () => {
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close();
        setBreath(0);
        stopMic.current = null;
      };
      setMic("on");
    } catch {
      setMic("denied");
    }
  }

  const lean = Math.min(1, breath) * 26;
  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={-16} className="pointer-events-none absolute -inset-[35%]">
        <div className="size-full" style={{ background: `radial-gradient(45% 35% at 50% 52%, ${allOut ? "transparent" : "#FFD98A55"}, transparent 70%)`, transition: "background 1s" }} />
      </Layer>

      <div className="relative z-[3] h-[clamp(64px,19cqi,120px)] w-[92cqi] max-w-[460px] text-center" style={{ color: c.cobalt }}>
        <AnimatePresence>
          {beat >= 2 ? (
            <motion.div initial={{ y: 30, opacity: 0, scale: 0.8 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={SPRING.wobbly}>
              <Greeting text={p.greeting} className="text-[clamp(2.1rem,12cqi,3.8rem)]" />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <Layer depth={8} rotate={4} className="relative mt-2" style={{ width: "min(78cqi, 360px)" }}>
        {/* The character dances beside the cake */}
        <div className="absolute -right-[8%] -bottom-[6%] z-[4]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={84} live={!p.paused} showName={false} />
        </div>

        <div className="relative mx-auto" style={{ width: "78%" }}>
          {/* Candles */}
          <div className="relative z-[2] flex justify-center gap-[5%] px-[10%]" style={{ height: "clamp(70px,22cqi,110px)" }}>
            {out.map((isOut, i) => (
              <button
                key={i}
                ref={(el) => {
                  flameRefs.current[i] = el;
                }}
                type="button"
                aria-label={isOut ? `Candle ${i + 1} is out` : `Blow out candle ${i + 1}`}
                disabled={isOut || !p.interactive || p.paused}
                onClick={(e) => {
                  e.stopPropagation();
                  blowOut(i);
                }}
                className="relative flex h-full w-[10%] min-w-5 touch-manipulation items-end justify-center outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                <span
                  className="block w-[56%] rounded-t-[3px]"
                  style={{
                    height: `${52 + ((i * 7) % 3) * 6}%`,
                    background: `repeating-linear-gradient(-35deg, ${i % 2 ? c.mint : c.cobalt} 0 6px, #fff 6px 11px)`,
                    boxShadow: "inset -3px 0 0 rgba(0,0,0,.08)",
                  }}
                />
                <span className="absolute left-1/2 h-[10%] w-[2px] -translate-x-1/2 bg-[#3a2a22]" style={{ bottom: `${52 + ((i * 7) % 3) * 6}%` }} />
                <AnimatePresence>
                  {!isOut ? (
                    <motion.span
                      key="flame"
                      className="absolute left-1/2 origin-bottom"
                      style={{ bottom: `${60 + ((i * 7) % 3) * 6}%`, width: "clamp(12px,3.6cqi,18px)", height: "clamp(22px,7cqi,34px)", marginLeft: "calc(clamp(12px,3.6cqi,18px) / -2)" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, skewX: -lean + Math.sin(i) * 2, rotate: -lean * 0.4 }}
                      exit={{ scaleY: 0, scaleX: 0.4, opacity: 0, transition: { duration: 0.22 } }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                    >
                      <span className="jb-flame block size-full" style={{ animationDelay: `${-i * 0.13}s` }} />
                    </motion.span>
                  ) : (
                    <Smoke key="smoke" bottom={`${60 + ((i * 7) % 3) * 6}%`} />
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>

          {/* Cake: top tier */}
          <div className="relative z-[1] mx-auto -mt-[2px] w-[70%]" style={{ aspectRatio: "3.2" }}>
            <Tier color={c.bubblegum!} frosting="#FFF8EE" set={p.iconSet} seed={1} />
          </div>
          {/* Cake: bottom tier */}
          <div className="relative mx-auto w-full" style={{ aspectRatio: "3" }}>
            <Tier color={c.cream!} frosting={c.bubblegum!} set={p.iconSet} seed={5} dark />
          </div>
          {/* Plate */}
          <div className="relative -mt-[4%] h-[clamp(14px,4cqi,22px)] w-[118%] -translate-x-[8%] rounded-[50%]" style={{ background: "linear-gradient(180deg,#fff,#E9E2EF)", boxShadow: "0 18px 30px -16px rgba(45,75,214,.45)" }} />
        </div>
      </Layer>

      <div className="mt-[6cqi] flex h-11 items-center gap-2">
        {mic === "off" || mic === "denied" ? (
          <motion.button
            type="button"
            onClick={() => void useMic()}
            disabled={allOut || !p.interactive || p.paused}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: allOut || !p.interactive || p.paused ? 0 : 1, y: 0 }}
            transition={{ ...SPRING.soft, delay: 0.6 }}
            className="relative z-[45] inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-white/70"
            style={{ background: c.cobalt }}
          >
            <Mic className="size-4" /> {mic === "denied" ? "Mic is off. Tap the candles" : "Blow with the mic"}
          </motion.button>
        ) : null}
        <FallbackButton onClick={() => blowAll()} color={c.cobalt!} ink={c.cobalt!} hidden={allOut || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

function Tier({ color, frosting, set, seed, dark = false }: { color: string; frosting: string; set: OpeningProps["iconSet"]; seed: number; dark?: boolean }) {
  const colors = set.colors.length ? set.colors : ["#FF7EB6", "#2D4BD6", "#8DE3C6", "#FFD166"];
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[14px_14px_10px_10px]" style={{ background: color, boxShadow: `inset -14px 0 22px -14px rgba(0,0,0,.18), inset 10px 0 18px -12px rgba(255,255,255,.6)` }}>
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="absolute inset-x-0 top-0 h-[46%] w-full" aria-hidden="true">
        <path d="M0 0h100v10c-4 0-4 9-8 9s-4-6-8-6-4 11-9 11-4-8-8-8-4 6-8 6-4-10-9-10-4 7-8 7-4-9-8-9-4 12-9 12-4-9-8-9-5 5-9 5V0z" fill={frosting} />
      </svg>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="absolute h-[7%] w-[2.6%] rounded-full"
          style={{
            left: `${6 + ((i * 37 + seed * 11) % 88)}%`,
            top: `${dark ? 50 : 52 + ((i * 13) % 30)}%`,
            background: pick(colors, i + seed),
            transform: `rotate(${(i * 47) % 180}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}

function Smoke({ bottom }: { bottom: string }) {
  return (
    <span className="pointer-events-none absolute left-1/2" style={{ bottom }} aria-hidden="true">
      {[0, 1, 2].map((k) => (
        <motion.span
          key={k}
          className="absolute size-3 -translate-x-1/2 rounded-full bg-[#cfc8c2]"
          initial={{ y: 0, opacity: 0.6, scale: 0.4, x: 0 }}
          animate={{ y: -70 - k * 18, opacity: 0, scale: 2.4, x: [0, 8, -6, 4] }}
          transition={{ duration: 1.6 + k * 0.3, delay: k * 0.15, ease: [0.2, 0.7, 0.3, 1] }}
          style={{ filter: "blur(2px)" }}
        />
      ))}
    </span>
  );
}

export const birthdayBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.butter,
  backgroundImage: [
    `radial-gradient(70% 55% at 50% 60%, #FFF6D6 0%, transparent 70%)`,
    `linear-gradient(180deg, ${c.butter}, #FFE08A)`,
    "radial-gradient(130% 100% at 50% 40%, transparent 55%, rgba(120,80,0,.16))",
  ].join(","),
});
