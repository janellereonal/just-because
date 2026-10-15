/**
 * VALENTINE'S — a wax-sealed envelope on linen.
 * Gesture: press and hold the seal. It cracks (crunch + haptic), the flap
 * lifts in 3D, a letter slides up and unfolds to the greeting.
 * Beats (ms after the crack): 0 crack · 260 flap lifts · 820 letter rises ·
 * 1450 letter unfolds · 2300 hearts · 2900 open.
 * Character peeks from behind the envelope and blushes.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics, useHold } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { chime, foley, melody } from "@/lib/play";

export function ValentineOpening(p: OpeningProps) {
  const { palette: c } = p.design;
  const cast = useRef<CharacterHandle | null>(null);
  const sealRef = useRef<HTMLDivElement | null>(null);
  const [cracked, setCracked] = useState(false);
  const h = useHaptics();
  const beat = useBeats(cracked, [260, 820, 1450, 2300, 2900]);

  function crack() {
    if (cracked) return;
    setCracked(true);
    foley("crack");
    window.setTimeout(() => foley("crunch"), 60);
    h.thud();
    cast.current?.celebrate();
    const r = sealRef.current?.getBoundingClientRect();
    if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height / 2, p.iconSet, { colors: [c.gold!, c.rose!, "#fff"], count: 14, spread: 0.7 });
  }
  const hold = useHold(1100, crack, p.interactive && !p.paused && !cracked);

  useEffect(() => {
    if (beat === 1) foley("paper");
    if (beat === 2) chime("whoosh");
    if (beat === 3) melody([659, 784, 988, 1319], 0.16);
    if (beat === 4) {
      const r = p.hostRef.current?.getBoundingClientRect();
      if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.42, p.iconSet, { colors: [c.rose!, c.gold!, "#F7B2C4"], count: 30, spread: 1.8, up: true });
      h.success();
    }
    if (beat === 5) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  // Hints follow the moment.
  useEffect(() => {
    p.setHint(cracked ? "" : hold.progress > 0 ? "Keep holding…" : "Press and hold the seal");
    if (hold.progress > 0) cast.current?.anticipate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cracked, hold.progress > 0]);

  // Previews: hold the seal by themselves.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(crack, 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const flapOpen = beat >= 1;
  const rise = beat >= 2;
  const unfold = beat >= 3;
  const ring = 2 * Math.PI * 46;

  return (
    <div className="relative flex w-full flex-col items-center">
      <Layer depth={-14} className="pointer-events-none absolute -inset-[30%]">
        <div
          className="size-full"
          style={{
            background: `radial-gradient(60% 50% at 50% 45%, ${c.rose}22, transparent 70%)`,
          }}
        />
      </Layer>

      <Layer depth={10} rotate={6} className="relative" style={{ width: "min(84cqi, 380px)", aspectRatio: "1.42" }}>
        <div className="absolute inset-0" style={{ perspective: 900 }}>
        {/* The character peeks over the top edge, behind the envelope. */}
        <motion.div
          className="absolute right-[8%]"
          style={{ bottom: "86%", zIndex: cracked ? 3 : 0 }}
          initial={{ y: 70 }}
          animate={{ y: p.paused ? 4 : cracked ? 0 : [64, 2, 2, 64] }}
          transition={cracked || p.paused ? SPRING.wobbly : { duration: 5, times: [0, 0.18, 0.7, 1], repeat: Infinity, repeatDelay: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={92} blush live={!p.paused} showName={false} />
        </motion.div>

        {/* Back of the envelope */}
        <div className="absolute inset-0 z-[1] rounded-[6px]" style={{ background: c.cream, boxShadow: "0 30px 50px -28px rgba(60,20,30,.55), 0 2px 0 rgba(0,0,0,.04)" }}>
          <div className="absolute inset-0 rounded-[6px]" style={{ background: `linear-gradient(180deg, ${c.oxblood}26, transparent 55%)` }} />
        </div>

        {/* The letter */}
        <motion.div
          className="absolute inset-x-[7%] z-[2]"
          style={{ top: "8%", height: "84%", transformStyle: "preserve-3d" }}
          animate={{ y: rise ? "-58%" : "0%", scale: unfold ? 1.06 : 1, zIndex: rise ? 6 : 2 }}
          transition={{ ...SPRING.heavy, zIndex: { delay: rise ? 0.35 : 0 } }}
        >
          <div className="absolute inset-0 rounded-[3px] bg-[#FFFDF8]" style={{ boxShadow: "0 10px 26px -12px rgba(60,20,30,.4)", backgroundImage: "repeating-linear-gradient(transparent 0 23px, rgba(180,51,90,.08) 23px 24px)" }}>
            <div className="flex h-full flex-col items-center justify-center px-[8%] text-center" style={{ color: c.oxblood }}>
              <motion.div animate={{ opacity: unfold ? 1 : 0, y: unfold ? 0 : 10 }} transition={{ ...SPRING.soft, delay: unfold ? 0.25 : 0 }}>
                <Greeting text={p.greeting} className="text-[clamp(1.9rem,10.5cqi,3.2rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
                <span className="mt-3 block text-[12px] tracking-[0.2em] uppercase opacity-70">{p.badge}</span>
              </motion.div>
            </div>
          </div>
          {/* The fold: the top half of the letter flips down to show the words. */}
          <motion.div
            className="absolute inset-x-0 top-0 h-1/2 origin-bottom rounded-t-[3px]"
            style={{ background: "linear-gradient(180deg,#FBF4EA,#F3E8D8)", backfaceVisibility: "hidden", boxShadow: "inset 0 -10px 18px -12px rgba(60,20,30,.35)" }}
            animate={{ rotateX: unfold ? -178 : 0, opacity: unfold ? 0 : 1 }}
            transition={{ rotateX: SPRING.heavy, opacity: { delay: unfold ? 0.45 : 0, duration: 0.2 } }}
          />
        </motion.div>

        {/* Front pocket: three folded panels */}
        <div className="pointer-events-none absolute inset-0 z-[4]">
          <div className="absolute inset-0 rounded-[6px]" style={{ background: c.cream, clipPath: "polygon(0 0, 52% 56%, 0 100%)", filter: "brightness(.97)" }} />
          <div className="absolute inset-0 rounded-[6px]" style={{ background: c.cream, clipPath: "polygon(100% 0, 48% 56%, 100% 100%)", filter: "brightness(.95)" }} />
          <div className="absolute inset-0 rounded-[6px]" style={{ background: `linear-gradient(0deg, ${c.cream}, #F1E5D3)`, clipPath: "polygon(0 100%, 50% 46%, 100% 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,.35), transparent 40%)", clipPath: "polygon(0 100%, 50% 46%, 100% 100%)" }} />
        </div>

        {/* The flap */}
        <motion.div
          className="absolute inset-x-0 top-0 origin-top"
          style={{ height: "58%", transformStyle: "preserve-3d" }}
          animate={{ rotateX: flapOpen ? 178 : 0, zIndex: flapOpen ? 1 : 5 }}
          transition={{ rotateX: SPRING.heavy, zIndex: { delay: flapOpen ? 0.18 : 0 } }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#F7EEE2,#EBDDC9)", clipPath: "polygon(0 0, 100% 0, 50% 100%)", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.12))", backfaceVisibility: "hidden" }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${c.cream}, #E9DCC8)`, clipPath: "polygon(0 0, 100% 0, 50% 100%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
        </motion.div>

        {/* The wax seal */}
        <div
          ref={sealRef}
          className="absolute left-1/2 z-[7] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
          style={{ top: "57%", width: "min(25cqi, 104px)", aspectRatio: "1" }}
        >
          {!cracked ? (
            <motion.button
              type="button"
              aria-label="Press and hold the wax seal to open"
              disabled={!p.interactive || p.paused}
              className="relative grid size-full touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              {...hold.handlers}
              animate={{ scale: 1 - hold.progress * 0.08, rotate: hold.progress > 0 ? [0, -2, 2, 0] : 0 }}
              transition={{ scale: SPRING.snappy, rotate: { duration: 0.18, repeat: hold.progress > 0 ? Infinity : 0 } }}
              whileHover={{ scale: 1.04 }}
            >
              <WaxSeal color={c.rose!} dark={c.oxblood!} />
              <svg viewBox="0 0 100 100" className="pointer-events-none absolute -inset-[14%] size-[128%] -rotate-90" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="none" stroke={c.gold} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - hold.progress)} opacity={hold.progress > 0 ? 1 : 0} />
              </svg>
            </motion.button>
          ) : (
            <>
              {[-1, 1].map((side) => (
                <motion.div
                  key={side}
                  className="absolute inset-0"
                  style={{ clipPath: side < 0 ? "polygon(0 0, 54% 0, 44% 38%, 58% 62%, 46% 100%, 0 100%)" : "polygon(54% 0, 100% 0, 100% 100%, 46% 100%, 58% 62%, 44% 38%)" }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: side * 46, y: 120, rotate: side * 38, opacity: 0 }}
                  transition={{ x: SPRING.snappy, rotate: SPRING.snappy, y: { type: "spring", stiffness: 60, damping: 12, mass: 1.4 }, opacity: { delay: 0.5, duration: 0.3 } }}
                >
                  <WaxSeal color={c.rose!} dark={c.oxblood!} />
                </motion.div>
              ))}
            </>
          )}
        </div>
        </div>
      </Layer>

      <div className="mt-[9cqi] h-11">
        <FallbackButton onClick={crack} color={c.oxblood!} ink={c.oxblood!} hidden={cracked || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** Wax with an irregular rim, a pressed heart and a little gloss. */
function WaxSeal({ color, dark }: { color: string; dark: string }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full" aria-hidden="true" style={{ filter: "drop-shadow(0 6px 8px rgba(60,10,20,.45))" }}>
      <defs>
        <radialGradient id="wax" cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      <path d="M50 3c9 0 12 6 20 8s14 1 17 10-2 13 1 21 9 12 5 20-11 7-15 14-3 15-12 18-12-3-19-1-13 8-21 3-4-13-9-19-15-6-15-15 9-11 9-19-7-14-1-21 13-2 20-7S41 3 50 3z" fill="url(#wax)" />
      <circle cx="50" cy="51" r="30" fill="none" stroke={dark} strokeOpacity=".5" strokeWidth="2.5" />
      <circle cx="50" cy="51" r="30" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1" transform="translate(-1 -1)" />
      <path d="M50 66s-15-9-15-20a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 11-15 20-15 20z" fill={dark} fillOpacity=".55" />
      <path d="M49 64s-14-9-14-19a7.5 7.5 0 0 1 14-4" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />
    </svg>
  );
}

export const valentineBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.linen,
  backgroundImage: [
    "radial-gradient(120% 90% at 50% 40%, transparent 50%, rgba(80,40,30,.18))",
    "repeating-linear-gradient(0deg, rgba(120,90,60,.05) 0 1px, transparent 1px 3px)",
    "repeating-linear-gradient(90deg, rgba(120,90,60,.045) 0 1px, transparent 1px 4px)",
  ].join(","),
});
