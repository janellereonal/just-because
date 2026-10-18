/**
 * Love Letter openings (flag letterOpenings). The organiser picks one in the editor's opening
 * section (intro_settings.letter); all three end the same way: the letter grows into the gift's
 * first page (`[data-gift-underlay] [data-gift-page]`, or the whole screen), then the stage fades.
 * Try them at /dev/love-letter?d=a|b|c. This is the bar for every style's opening.
 *
 *  A · Break the seal (default, "seal")  Press and hold. Their initial is pressed into the wax; it cracks along a
 *                     line that's different for every gift, the flap curls open, the letter rises
 *                     and unfolds, then grows until it IS the first page (no cut).
 *  B · Peel the seal ("peel")  Drag the seal up. The wax stretches and the flap lifts with your finger;
 *                     let go past the point and the seal pops off, the flap flips, the letter
 *                     springs out.
 *  C · Slide it out ("slide")  The flap is already open and the letter peeks out with their name on it.
 *                     Slide it up out of the pocket against a little resistance; it comes free,
 *                     the envelope drops away and the letter unfolds in thirds.
 */
import { t } from "@/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics, useHold } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { Extrude, FloorShadow, LightShaft, Object3D, Sheen, Texture, rim } from "@/themes/_shared/light";
import { chime, foley, melody } from "@/lib/play";
import { WaxSeal, liner } from "@/themes/valentine/Opening";

/* ---------- shared ---------- */

/** A small seeded random, so every gift's crack and scatter is its own, and stays the same on replay. */
function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The first letter of their name (letters only), for the monogram. */
function initialOf(name: string) {
  const m = name.match(/\p{L}/u);
  return (m ? m[0] : "J").toUpperCase();
}

const PAPER_LINES = "repeating-linear-gradient(transparent 0 23px, rgba(180,51,90,.08) 23px 24px)";

/** Back of the envelope, with the liner showing at the top. */
function EnvelopeBack({ c }: { c: ThemePalette }) {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden rounded-[6px]" style={{ background: c.cream, boxShadow: rim(0.9) }}>
      <div className="absolute inset-x-[3%] top-[2%] h-[56%]" style={{ ...liner(c), clipPath: "polygon(0 0, 100% 0, 50% 100%)", opacity: 0.9 }} />
      <div className="absolute inset-0 rounded-[6px]" style={{ background: `linear-gradient(180deg, ${c.oxblood}38, transparent 60%)` }} />
      <Texture material="paper" opacity={0.55} />
    </div>
  );
}

/** The front pocket: three folded panels. */
function Pocket({ c }: { c: ThemePalette }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]">
      <div className="absolute inset-0 overflow-hidden rounded-[6px]" style={{ background: `linear-gradient(100deg, #FBF5EC, ${c.cream} 60%)`, clipPath: "polygon(0 0, 52% 56%, 0 100%)" }}>
        <Texture material="paper" opacity={0.5} />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-[6px]" style={{ background: `linear-gradient(260deg, #E3D4BE, ${c.cream} 70%)`, clipPath: "polygon(100% 0, 48% 56%, 100% 100%)" }}>
        <Texture material="paper" opacity={0.5} />
      </div>
      <div className="absolute inset-0" style={{ background: "rgba(80,40,30,.16)", clipPath: "polygon(0 100%, 50% 43%, 100% 100%)", filter: "blur(3px)" }} />
      <div className="absolute inset-0 overflow-hidden rounded-[6px]" style={{ background: `linear-gradient(0deg, ${c.cream}, #F4EADC)`, clipPath: "polygon(0 100%, 50% 46%, 100% 100%)" }}>
        <Texture material="paper" opacity={0.5} />
        <Sheen strength={0.55} angle={120} width={30} />
      </div>
      <div className="absolute inset-0" style={{ background: "linear-gradient(115deg, rgba(255,255,255,.4), transparent 40%)", clipPath: "polygon(0 100%, 50% 46%, 100% 100%)" }} />
    </div>
  );
}

/** The paper of the letter, with ruled lines, grain and raking light. */
function LetterPaper({ c, children, shade = 1 }: { c: ThemePalette; children?: React.ReactNode; shade?: number }) {
  return (
    <div className="absolute inset-0 rounded-[3px] bg-[#FFFDF8]" style={{ boxShadow: `${rim(0.6)}, 3px 10px 22px -12px rgba(60,20,30,${0.45 * shade})`, backgroundImage: PAPER_LINES }}>
      <Texture material="paper" opacity={0.45} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 block" style={{ background: "linear-gradient(125deg, rgba(255,255,255,.55), transparent 38%, transparent 70%, rgba(80,40,30,.06))" }} />
      <div className="relative flex h-full flex-col items-center justify-center px-[8%] text-center" style={{ color: c.oxblood }}>
        {children}
      </div>
    </div>
  );
}

/** Wax with an irregular rim and their initial pressed into it, lit from the top left. */
function MonogramSeal({ color, dark, letter, warmth = 0 }: { color: string; dark: string; letter: string; warmth?: number }) {
  return (
    <svg viewBox="0 0 100 100" className="size-full overflow-visible" aria-hidden="true" style={{ filter: `drop-shadow(2px 4px 3px rgba(60,10,20,.4)) drop-shadow(4px 10px 10px rgba(60,10,20,.25)) brightness(${1 + warmth * 0.22}) saturate(${1 + warmth * 0.3})` }}>
      <defs>
        <radialGradient id="wax-mono" cx="38%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset=".35" stopColor={color} />
          <stop offset="1" stopColor={dark} />
        </radialGradient>
      </defs>
      <g filter="url(#jb-gloss)">
        <path d="M50 3c9 0 12 6 20 8s14 1 17 10-2 13 1 21 9 12 5 20-11 7-15 14-3 15-12 18-12-3-19-1-13 8-21 3-4-13-9-19-15-6-15-15 9-11 9-19-7-14-1-21 13-2 20-7S41 3 50 3z" fill="url(#wax-mono)" />
      </g>
      <circle cx="50" cy="51" r="30" fill="none" stroke={dark} strokeOpacity=".55" strokeWidth="2.5" />
      <circle cx="50" cy="51" r="30" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1" transform="translate(1.2 1.2)" />
      {/* The pressed initial: a dark recess with a lit lower edge, like a real die. */}
      <text x="51.2" y="63.4" textAnchor="middle" fontFamily="'Cormorant Garamond', 'Playfair Display', Georgia, serif" fontStyle="italic" fontWeight="600" fontSize="38" fill="#fff" fillOpacity=".3">
        {letter}
      </text>
      <text x="50" y="62" textAnchor="middle" fontFamily="'Cormorant Garamond', 'Playfair Display', Georgia, serif" fontStyle="italic" fontWeight="600" fontSize="38" fill={dark} fillOpacity=".72">
        {letter}
      </text>
    </svg>
  );
}

/** The opening's room: soft rose light, a shaft of window light. */
function Room({ c }: { c: ThemePalette }) {
  return (
    <Layer depth={-14} className="pointer-events-none absolute -inset-[30%]">
      <div className="size-full" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${c.rose}22, transparent 70%)` }} />
      <LightShaft strength={0.55} motes={9} />
    </Layer>
  );
}

const ENVELOPE_SIZE = { width: "min(84cqi, 380px)", aspectRatio: "1.42" } as const;

/** Sounds and light for the payoff, shared by every direction. */
function usePayoff(p: OpeningProps, c: ThemePalette) {
  const h = useHaptics();
  return {
    h,
    hearts(at = 0.42) {
      const r = p.hostRef.current?.getBoundingClientRect();
      if (r) burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * at, p.iconSet, { colors: [c.rose!, c.gold!, "#F7B2C4"], count: 26, spread: 1.7, up: true });
      h.success();
    },
  };
}

/* ---------- the hand-off: the letter becomes the gift's first page ---------- */

type Rect = { top: number; left: number; width: number; height: number };

/**
 * Grows a sheet of letter paper from the letter's spot to exactly where the gift's first page
 * waits underneath ([data-gift-page], the Storybook), or the whole screen for layouts without
 * one. The shell then fades (reveal "fade"), so there's no cut between opening and reading.
 */
function useHandoff(p: OpeningProps, c: ThemePalette) {
  const [page, setPage] = useState<{ from: Rect; to: Rect; radius: number } | null>(null);
  function grow(from: Element | null) {
    // Reduced motion: no growing, the stage just fades onto the gift.
    if (p.reduced) return;
    const host = p.hostRef.current?.getBoundingClientRect();
    const r = from?.getBoundingClientRect();
    if (!host || !r) return;
    const target = document.querySelector("[data-gift-underlay] [data-gift-page]")?.getBoundingClientRect();
    const rel = (x: DOMRect): Rect => ({ top: x.top - host.top, left: x.left - host.left, width: x.width, height: x.height });
    setPage({ from: rel(r), to: target && target.width > 0 ? rel(target) : { top: 0, left: 0, width: host.width, height: host.height }, radius: target ? 4 : 0 });
  }
  const node =
    page && p.hostRef.current
      ? createPortal(
          <motion.div
            className="pointer-events-none absolute z-[40] overflow-hidden"
            initial={{ ...page.from, borderRadius: 3, boxShadow: "0 18px 40px -20px rgba(60,20,30,.5)" }}
            animate={{ ...page.to, borderRadius: page.radius, boxShadow: "0 30px 60px -30px rgba(60,20,30,.35)" }}
            transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
          >
            <LetterPaper c={c} shade={0}>
              <motion.div initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.9, times: [0, 0.6, 1] }}>
                <Greeting text={p.greeting} className="text-[clamp(1.9rem,10.5cqi,3.2rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
              </motion.div>
            </LetterPaper>
          </motion.div>,
          p.hostRef.current,
        )
      : null;
  return { grow, node, growing: !!page };
}

/* ---------- A · Monogram seal ---------- */

export function LoveLetterMonogram(p: OpeningProps) {
  const c = p.design.palette;
  const letter = initialOf(p.recipient);
  const rand = useMemo(() => seeded(`${p.recipient}|seal`), [p.recipient]);
  // The crack: a jagged line from top to bottom through the initial, different per gift.
  const crack = useMemo(() => {
    const pts: [number, number][] = [];
    let x = 44 + rand() * 12;
    for (let y = 0; y <= 100; y += 12.5) {
      pts.push([x, y]);
      x = Math.min(64, Math.max(36, x + (rand() - 0.5) * 18));
    }
    const line = pts.map(([px, py]) => `${px}% ${py}%`).join(", ");
    const back = [...pts].reverse().map(([px, py]) => `${px}% ${py}%`).join(", ");
    return {
      left: `polygon(0 0, ${line}, 0 100%)`,
      right: `polygon(${pts[0]![0]}% 0, 100% 0, 100% 100%, ${back})`,
      spin: [-(18 + rand() * 30), 18 + rand() * 30],
      drift: [-(28 + rand() * 30), 28 + rand() * 30],
      crumbs: Array.from({ length: 6 }, () => ({ x: (rand() - 0.5) * 150, y: 40 + rand() * 110, s: 3 + rand() * 5, r: rand() * 360 })),
    };
  }, [rand]);
  const sealRef = useRef<HTMLDivElement | null>(null);
  const letterRef = useRef<HTMLDivElement | null>(null);
  const [cracked, setCracked] = useState(false);
  const { h, hearts } = usePayoff(p, c);
  const beat = useBeats(cracked, [240, 760, 1350, 2250, 3350]);
  const handoff = useHandoff(p, c);

  function doCrack() {
    if (cracked) return;
    setCracked(true);
    foley("crack");
    window.setTimeout(() => foley("crunch"), 60);
    h.thud();
  }
  const hold = useHold(1100, doCrack, p.interactive && !p.paused && !cracked);

  useEffect(() => {
    if (beat === 1) foley("paper");
    if (beat === 2) chime("whoosh");
    if (beat === 3) {
      melody([659, 784, 988, 1319], 0.16);
      hearts(0.36);
    }
    if (beat === 4) {
      handoff.grow(letterRef.current);
    }
    if (beat === 5) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(cracked ? "" : hold.progress > 0 ? t("letter.seal.holding") : t("letter.seal.hint"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cracked, hold.progress > 0]);
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(doCrack, 1300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const flapOpen = beat >= 1;
  const rise = beat >= 2;
  const unfold = beat >= 3;
  const growing = beat >= 4;
  const ring = 2 * Math.PI * 46;
  const warmth = cracked ? 0 : hold.progress;

  return (
    <div className="relative flex w-full flex-col items-center">
      <Room c={c} />
      <motion.div
        className="relative"
        style={ENVELOPE_SIZE}
        animate={{ opacity: growing ? 0 : 1, y: growing ? 40 : 0, scale: growing ? 0.94 : 1 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <Layer depth={10} className="absolute inset-0">
          <Object3D pose={{ x: 13, y: -3, z: -1.5 }} strength={9} settle={rise} className="absolute inset-0">
            <div className="absolute inset-0" style={{ transform: "translateZ(-22px)", transformStyle: "preserve-3d" }}>
              <FloorShadow lift={rise ? 0.25 : 0} tint="70,32,30" depth={4} radius={8} className="inset-[2%_3%_1%_3%]" />
            </div>
            <Extrude depth={5} color="#D9C8AF" edge="#C9B596" radius={6} />
            <div className="absolute inset-0" style={{ perspective: 900 }}>
              <EnvelopeBack c={c} />
              {/* The letter */}
              <motion.div
                ref={letterRef}
                className="absolute inset-x-[7%] z-[2]"
                style={{ top: "8%", height: "84%", transformStyle: "preserve-3d" }}
                animate={{ y: rise ? "-58%" : "0%", scale: unfold ? 1.06 : 1, zIndex: rise ? 6 : 2 }}
                transition={{ ...SPRING.heavy, zIndex: { delay: rise ? 0.35 : 0 } }}
              >
                <LetterPaper c={c}>
                  <motion.div animate={{ opacity: unfold ? 1 : 0, y: unfold ? 0 : 10 }} transition={{ ...SPRING.soft, delay: unfold ? 0.25 : 0 }}>
                    <Greeting text={p.greeting} className="text-[clamp(1.9rem,10.5cqi,3.2rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
                    <span className="mt-3 block text-[12px] tracking-[0.2em] uppercase opacity-70">{p.badge}</span>
                  </motion.div>
                </LetterPaper>
                <motion.span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 block h-1/2" style={{ background: "linear-gradient(0deg, rgba(70,30,30,.22), transparent)" }} animate={{ opacity: rise ? 0 : 1 }} transition={{ duration: 0.5 }} />
                <motion.div
                  className="absolute inset-x-0 top-0 h-1/2 origin-bottom rounded-t-[3px]"
                  style={{ background: "linear-gradient(180deg,#FBF4EA,#EFE2CF)", backfaceVisibility: "hidden", boxShadow: "inset 0 -12px 18px -12px rgba(60,20,30,.4), inset 0 1px 0 rgba(255,255,255,.8)" }}
                  animate={{ rotateX: unfold ? -178 : 0, opacity: unfold ? 0 : 1 }}
                  transition={{ rotateX: SPRING.heavy, opacity: { delay: unfold ? 0.45 : 0, duration: 0.2 } }}
                />
              </motion.div>
              <Pocket c={c} />
              {/* The flap curls as it opens: the tip lags behind the hinge, like real paper. */}
              <motion.div
                className="absolute inset-x-0 top-0 origin-top"
                style={{ height: "58%", transformStyle: "preserve-3d" }}
                animate={{ rotateX: flapOpen ? 178 : 0, zIndex: flapOpen ? 1 : 5 }}
                transition={{ rotateX: SPRING.heavy, zIndex: { delay: flapOpen ? 0.18 : 0 } }}
              >
                <motion.div className="absolute inset-0" style={{ background: "rgba(70,30,25,.22)", clipPath: "polygon(1% 2%, 99% 2%, 51% 100%)", filter: "blur(4px)", x: 2, y: 5 }} animate={{ opacity: flapOpen ? 0 : 1 }} transition={{ duration: 0.2 }} />
                <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(170deg,#FBF4EA,#E8D9C3)", clipPath: "polygon(0 0, 100% 0, 75% 50%, 25% 50%)", backfaceVisibility: "hidden" }}>
                  <Texture material="paper" opacity={0.55} />
                  <Sheen strength={0.6} angle={105} width={24} />
                </div>
                <div className="absolute inset-0" style={{ ...liner(c), clipPath: "polygon(0 0, 100% 0, 75% 50%, 25% 50%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
                <motion.div
                  className="absolute inset-x-0 bottom-0 h-1/2 origin-top"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateX: flapOpen ? [0, -42, 6, 0] : 0 }}
                  transition={{ duration: 0.9, times: [0, 0.35, 0.75, 1], ease: "easeOut" }}
                >
                  <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(170deg,#F6ECDD,#E3D2BA)", clipPath: "polygon(25% 0, 75% 0, 50% 100%)", backfaceVisibility: "hidden" }}>
                    <Texture material="paper" opacity={0.55} />
                  </div>
                  <div className="absolute inset-0" style={{ ...liner(c), clipPath: "polygon(25% 0, 75% 0, 50% 100%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
                </motion.div>
              </motion.div>
              {/* Warm glow under the seal while it's held */}
              <div aria-hidden="true" className="pointer-events-none absolute left-1/2 z-[6] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: "57%", width: "min(40cqi, 160px)", aspectRatio: "1", background: `radial-gradient(circle, ${c.gold}66, transparent 65%)`, opacity: warmth * 0.9, transition: "opacity .15s" }} />
              {/* The seal */}
              <div ref={sealRef} className="absolute left-1/2 z-[7] grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ top: "57%", width: "min(25cqi, 104px)", aspectRatio: "1" }}>
                {!cracked ? (
                  <motion.button
                    type="button"
                    aria-label={t("letter.seal.aria")}
                    disabled={!p.interactive || p.paused}
                    className="relative grid size-full touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                    {...hold.handlers}
                    animate={{ scale: 1 - hold.progress * 0.07, rotate: hold.progress > 0 ? [0, -1.5, 1.5, 0] : 0 }}
                    transition={{ scale: SPRING.snappy, rotate: { duration: 0.16, repeat: hold.progress > 0 ? Infinity : 0 } }}
                    whileHover={{ scale: 1.04 }}
                  >
                    <MonogramSeal color={c.rose!} dark={c.oxblood!} letter={letter} warmth={warmth} />
                    <svg viewBox="0 0 100 100" className="pointer-events-none absolute -inset-[14%] size-[128%] -rotate-90" aria-hidden="true">
                      <circle cx="50" cy="50" r="46" fill="none" stroke={c.gold} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={ring} strokeDashoffset={ring * (1 - hold.progress)} opacity={hold.progress > 0 ? 1 : 0} />
                    </svg>
                  </motion.button>
                ) : (
                  <>
                    {[0, 1].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute inset-0"
                        style={{ clipPath: i === 0 ? crack.left : crack.right }}
                        initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                        animate={{ x: crack.drift[i]!, y: 150, rotate: crack.spin[i]!, opacity: 0 }}
                        transition={{ x: SPRING.snappy, rotate: { type: "spring", stiffness: 120, damping: 14 }, y: { type: "spring", stiffness: 55, damping: 11, mass: 1.5 }, opacity: { delay: 0.55, duration: 0.3 } }}
                      >
                        <MonogramSeal color={c.rose!} dark={c.oxblood!} letter={letter} />
                      </motion.div>
                    ))}
                    {crack.crumbs.map((cr, i) => (
                      <motion.span
                        key={`c${i}`}
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 block rounded-[30%]"
                        style={{ width: cr.s, height: cr.s, background: i % 2 ? c.rose : c.oxblood }}
                        initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
                        animate={{ x: cr.x, y: cr.y, opacity: 0, rotate: cr.r }}
                        transition={{ type: "spring", stiffness: 70, damping: 12, opacity: { delay: 0.4, duration: 0.4 } }}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </Object3D>
        </Layer>
      </motion.div>

      <div className="mt-[min(9cqi,40.5px)] h-11">
        <FallbackButton onClick={doCrack} color={c.oxblood!} ink={c.oxblood!} hidden={cracked || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>

      {handoff.node}
    </div>
  );
}

/* ---------- B · Peel the seal ---------- */

export function LoveLetterPeel(p: OpeningProps) {
  const c = p.design.palette;
  const letter = initialOf(p.recipient);
  const pull = useMotionValue(0);
  const [free, setFree] = useState(false);
  const { h, hearts } = usePayoff(p, c);
  const beat = useBeats(free, [380, 950, 1700, 2500, 3600]);
  const handoff = useHandoff(p, c);
  const letterRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<number | null>(null);
  const ticks = useRef(0);
  const sealBox = useRef<HTMLDivElement | null>(null);
  const [flying, setFlying] = useState<{ x: number; y: number; s: number } | null>(null);

  // The flap lifts with the seal, the wax stretches as it lets go.
  const flapTurn = useTransform(pull, (v) => v * 84);
  const sealY = useTransform(pull, (v) => -v * 46);
  const sealStretch = useTransform(pull, (v) => 1 + v * 0.26);
  const sealSquash = useTransform(pull, (v) => 1 - v * 0.1);
  const strand = useTransform(pull, (v) => Math.max(0, v - 0.2) * 52);

  function release() {
    if (free) return;
    const host = p.hostRef.current?.getBoundingClientRect();
    const r = sealBox.current?.getBoundingClientRect();
    if (host && r) setFlying({ x: r.left - host.left, y: r.top - host.top, s: r.width });
    setFree(true);
    foley("crack");
    chime("pop");
    h.thud();
    animate(pull, 0, SPRING.snappy);
  }
  const move = (y: number) => {
    if (start.current == null || free) return;
    const v = Math.min(1.05, Math.max(0, (start.current - y) / 130));
    pull.set(v);
    const step = Math.floor(v * 5);
    if (step > ticks.current) {
      ticks.current = step;
      h.tick();
      foley("paper");
    }
    if (v >= 1) release();
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!p.interactive || p.paused || free) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      start.current = e.clientY;
      ticks.current = 0;
    },
    onPointerMove: (e: React.PointerEvent) => move(e.clientY),
    onPointerUp: () => {
      start.current = null;
      if (!free) animate(pull, 0, SPRING.heavy);
    },
    onPointerCancel: () => {
      start.current = null;
      if (!free) animate(pull, 0, SPRING.heavy);
    },
  };

  useEffect(() => {
    if (beat === 1) chime("whoosh");
    if (beat === 2) melody([659, 784, 988, 1319], 0.16);
    if (beat === 3) hearts(0.36);
    if (beat === 4) handoff.grow(letterRef.current);
    if (beat === 5) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);
  useEffect(() => {
    p.setHint(free ? "" : t("letter.peel.hint"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free]);
  // Previews: a finger peels it by itself.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      const a = animate(pull, 1, { duration: 1.25, ease: [0.5, 0, 0.75, 0.4] });
      a.then(release);
    }, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const open = free;
  const rise = beat >= 1;
  const unfold = beat >= 2;
  const growing = beat >= 4;

  return (
    <div className="relative flex w-full flex-col items-center">
      <Room c={c} />
      <motion.div className="relative" style={ENVELOPE_SIZE} animate={{ opacity: growing ? 0 : 1, y: growing ? 40 : 0, scale: growing ? 0.94 : 1 }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
      <Layer depth={10} className="absolute inset-0">
        <Object3D pose={{ x: 13, y: -3, z: -1.5 }} strength={9} settle={rise} className="absolute inset-0">
          <div className="absolute inset-0" style={{ transform: "translateZ(-22px)", transformStyle: "preserve-3d" }}>
            <FloorShadow lift={rise ? 0.25 : 0} tint="70,32,30" depth={4} radius={8} className="inset-[2%_3%_1%_3%]" />
          </div>
          <Extrude depth={5} color="#D9C8AF" edge="#C9B596" radius={6} />
          <div className="absolute inset-0" style={{ perspective: 900 }}>
            <EnvelopeBack c={c} />
            <motion.div
              ref={letterRef}
              className="absolute inset-x-[7%] z-[2]"
              style={{ top: "8%", height: "84%", transformStyle: "preserve-3d" }}
              animate={{ y: rise ? "-62%" : "0%", scale: unfold ? 1.06 : 1, zIndex: rise ? 6 : 2, rotate: rise ? [0, -2.5, 1, 0] : 0 }}
              transition={{ y: { type: "spring", stiffness: 140, damping: 11, mass: 1.1 }, scale: SPRING.heavy, rotate: { duration: 0.8 }, zIndex: { delay: rise ? 0.3 : 0 } }}
            >
              <LetterPaper c={c}>
                <motion.div animate={{ opacity: unfold ? 1 : 0, y: unfold ? 0 : 10 }} transition={{ ...SPRING.soft, delay: unfold ? 0.25 : 0 }}>
                  <Greeting text={p.greeting} className="text-[clamp(1.9rem,10.5cqi,3.2rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
                  <span className="mt-3 block text-[12px] tracking-[0.2em] uppercase opacity-70">{p.badge}</span>
                </motion.div>
              </LetterPaper>
              <motion.div
                className="absolute inset-x-0 top-0 h-1/2 origin-bottom rounded-t-[3px]"
                style={{ background: "linear-gradient(180deg,#FBF4EA,#EFE2CF)", backfaceVisibility: "hidden", boxShadow: "inset 0 -12px 18px -12px rgba(60,20,30,.4), inset 0 1px 0 rgba(255,255,255,.8)" }}
                animate={{ rotateX: unfold ? -178 : 0, opacity: unfold ? 0 : 1 }}
                transition={{ rotateX: SPRING.heavy, opacity: { delay: unfold ? 0.45 : 0, duration: 0.2 } }}
              />
            </motion.div>
            <Pocket c={c} />
            {/* The flap: follows the finger, then flips open once the seal lets go. */}
            <FlapFollow c={c} turn={flapTurn} open={open} />
            {/* The seal sits on the flap's tip and stretches as it's peeled. */}
            {!free ? (
              <motion.div
                ref={sealBox}
                className="absolute left-1/2 z-[7] grid -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ top: "57%", width: "min(25cqi, 104px)", aspectRatio: "1", y: sealY, scaleY: sealStretch, scaleX: sealSquash, transformOrigin: "50% 100%" }}
              >
                {/* A strand of soft wax still holding on underneath */}
                <motion.span aria-hidden="true" className="absolute top-[78%] left-1/2 block w-[14%] -translate-x-1/2 rounded-full" style={{ height: strand, background: `linear-gradient(${c.rose}, ${c.oxblood})`, opacity: 0.85 }} />
                <button
                  type="button"
                  aria-label={t("letter.peel.aria")}
                  disabled={!p.interactive || p.paused}
                  className="relative grid size-full cursor-grab touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70 active:cursor-grabbing"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      release();
                    }
                  }}
                  {...handlers}
                >
                  <MonogramSeal color={c.rose!} dark={c.oxblood!} letter={letter} />
                </button>
              </motion.div>
            ) : null}
          </div>
        </Object3D>
      </Layer>
      </motion.div>
      <div className="mt-[min(9cqi,40.5px)] h-11">
        <FallbackButton onClick={release} color={c.oxblood!} ink={c.oxblood!} hidden={free || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
      {/* The seal pops off and spins away */}
      {flying && p.hostRef.current
        ? createPortal(
            <motion.div
              className="pointer-events-none absolute z-[41]"
              style={{ left: flying.x, top: flying.y, width: flying.s, height: flying.s }}
              initial={{ y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 }}
              animate={{ y: [0, -150, -620], x: [0, 46, 170], rotate: [0, 210, 560], scale: [1, 1.12, 0.8], opacity: [1, 1, 0] }}
              transition={{ duration: 1.15, times: [0, 0.3, 1], ease: ["easeOut", "easeIn"] }}
            >
              <MonogramSeal color={c.rose!} dark={c.oxblood!} letter={letter} />
            </motion.div>,
            p.hostRef.current,
          )
        : null}
      {handoff.node}
    </div>
  );
}

function FlapFollow({ c, turn, open }: { c: ThemePalette; turn: MotionValue<number>; open: boolean }) {
  const flip = useMotionValue(0);
  useEffect(() => {
    if (open) animate(flip, 178, { type: "spring", stiffness: 110, damping: 13, mass: 1.2 });
  }, [open, flip]);
  const rotateX = useTransform(() => Math.max(turn.get(), flip.get()));
  const z = useTransform(rotateX, (v) => (v > 95 ? 1 : 5));
  return (
    <motion.div className="absolute inset-x-0 top-0 origin-top" style={{ height: "58%", transformStyle: "preserve-3d", rotateX, zIndex: z }}>
      <div className="absolute inset-0 overflow-hidden" style={{ background: "linear-gradient(170deg,#FBF4EA,#E8D9C3)", clipPath: "polygon(0 0, 100% 0, 50% 100%)", backfaceVisibility: "hidden" }}>
        <Texture material="paper" opacity={0.55} />
        <Sheen strength={0.6} angle={105} width={24} />
      </div>
      <div className="absolute inset-0" style={{ ...liner(c), clipPath: "polygon(0 0, 100% 0, 50% 100%)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
    </motion.div>
  );
}

/* ---------- C · Slide it out ---------- */

/** The outside of the folded letter: their name, as on the envelope it came in. */
function PacketFace({ c, name }: { c: ThemePalette; name: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[3px]" style={{ background: "linear-gradient(180deg,#FFFDF8,#F4EADB)", boxShadow: rim(0.6) }}>
      <Texture material="paper" opacity={0.45} />
      <div className="flex h-full flex-col items-center justify-center text-center" style={{ color: c.oxblood }}>
        <span className="block text-[10px] tracking-[0.3em] uppercase opacity-60">{t("letter.for")}</span>
        <span className="block text-[clamp(1.5rem,8cqi,2.4rem)] leading-tight italic" style={{ fontFamily: "var(--jb-display)" }}>
          {name}
        </span>
      </div>
    </div>
  );
}

export function LoveLetterSlide(p: OpeningProps) {
  const c = p.design.palette;
  const slide = useMotionValue(0);
  const [free, setFree] = useState(false);
  const { h, hearts } = usePayoff(p, c);
  // 1 rises and turns to face them · 2 top third opens · 3 bottom third opens · 4 hearts · 5 grows into the page · 6 open
  const beat = useBeats(free, [420, 1000, 1550, 2150, 2700, 3800]);
  const handoff = useHandoff(p, c);
  const letterRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<number | null>(null);
  const ticks = useRef(0);
  // Rubber band: the packet comes up slower than the finger, until it's free.
  const packetY = useTransform(slide, (v) => `${-14 - v * 34}%`);

  function letGo() {
    if (free) return;
    setFree(true);
    foley("paper");
    chime("whoosh");
    h.thud();
  }
  const move = (y: number) => {
    if (start.current == null || free) return;
    const v = Math.min(1, Math.max(0, (start.current - y) / 170));
    slide.set(v);
    const step = Math.floor(v * 6);
    if (step > ticks.current) {
      ticks.current = step;
      h.tick();
    }
    if (v >= 0.92) letGo();
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!p.interactive || p.paused || free) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      start.current = e.clientY;
      ticks.current = 0;
    },
    onPointerMove: (e: React.PointerEvent) => move(e.clientY),
    onPointerUp: () => {
      start.current = null;
      if (!free) animate(slide, 0, SPRING.heavy);
    },
    onPointerCancel: () => {
      start.current = null;
      if (!free) animate(slide, 0, SPRING.heavy);
    },
  };

  useEffect(() => {
    if (beat === 2) foley("paper");
    if (beat === 3) {
      foley("paper");
      melody([659, 784, 988, 1319], 0.16);
    }
    if (beat === 4) hearts(0.4);
    if (beat === 5) handoff.grow(letterRef.current);
    if (beat === 6) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);
  useEffect(() => {
    p.setHint(free ? "" : t("letter.slide.hint"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [free]);
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      animate(slide, [0, 0.38, 0.3, 0.95], { duration: 1.5, times: [0, 0.45, 0.6, 1], ease: "easeInOut" }).then(letGo);
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const out = beat >= 1;
  const topOpen = beat >= 2;
  const bottomOpen = beat >= 3;
  const growing = beat >= 5;
  const panel: React.CSSProperties = { background: "#FFFDF8", backgroundImage: PAPER_LINES, backfaceVisibility: "hidden" };

  return (
    <div className="relative flex w-full flex-col items-center">
      <Room c={c} />
      <div className="relative" style={ENVELOPE_SIZE}>
        {/* The envelope, flap open, the folded letter peeking out. Once the letter is free it drops away. */}
        <motion.div className="absolute inset-0" animate={{ y: free ? "150%" : "0%", opacity: free ? 0 : 1, rotate: free ? 5 : 0 }} transition={{ y: { type: "spring", stiffness: 55, damping: 14, mass: 1.4 }, opacity: { delay: 0.3, duration: 0.45 }, rotate: SPRING.heavy }}>
          <Layer depth={10} className="absolute inset-0">
            <Object3D pose={{ x: 13, y: -3, z: -1.5 }} strength={9} className="absolute inset-0">
              <div className="absolute inset-0" style={{ transform: "translateZ(-22px)", transformStyle: "preserve-3d" }}>
                <FloorShadow tint="70,32,30" depth={4} radius={8} className="inset-[2%_3%_1%_3%]" />
              </div>
              <Extrude depth={5} color="#D9C8AF" edge="#C9B596" radius={6} />
              <div className="absolute inset-0" style={{ perspective: 900 }}>
                <EnvelopeBack c={c} />
                {/* The opened flap, lying back against the envelope with its liner showing */}
                <div className="absolute inset-x-0 top-0 h-[22%] overflow-hidden rounded-t-[6px]" style={{ ...liner(c), clipPath: "polygon(0 100%, 100% 100%, 92% 0, 8% 0)", transform: "translateY(-96%)" }} />
                {!free ? (
                  <motion.div
                    className="absolute inset-x-[9%] z-[2] cursor-grab touch-none active:cursor-grabbing"
                    style={{ top: "14%", height: "64%", y: packetY }}
                    role="button"
                    aria-label={t("letter.slide.aria")}
                    tabIndex={p.interactive && !p.paused ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        letGo();
                      }
                    }}
                    {...handlers}
                  >
                    <PacketFace c={c} name={p.recipient} />
                  </motion.div>
                ) : null}
                <Pocket c={c} />
              </div>
            </Object3D>
          </Layer>
        </motion.div>

        {/* Free: three times as tall as the packet, folded so only its middle third shows. It rises,
            turns to face them, and opens: the top third swings up, then the bottom third swings down. */}
        {free ? (
          <motion.div
            ref={letterRef}
            className="absolute inset-x-[9%] z-[8]"
            style={{ top: "-50%", height: "192%", transformStyle: "preserve-3d", perspective: 1100 }}
            initial={{ y: "-24%", rotateX: 13, scale: 1 }}
            animate={{ y: out ? "-4%" : "-24%", rotateX: out ? 0 : 13, scale: out ? 1.06 : 1, opacity: growing ? 0 : 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 15, mass: 1.3, opacity: { duration: 0.25 } }}
          >
            {/* Middle third: the greeting */}
            <div className="absolute inset-x-0 top-1/3 h-1/3 overflow-hidden" style={{ ...panel, boxShadow: "0 14px 30px -18px rgba(60,20,30,.5)" }}>
              <Texture material="paper" opacity={0.45} />
              <div className="flex h-full flex-col items-center justify-center px-[6%] text-center" style={{ color: c.oxblood }}>
                <Greeting text={p.greeting} className="text-[clamp(1.6rem,9cqi,2.8rem)]" style={{ fontStyle: "italic", fontWeight: 500 }} />
              </div>
            </div>
            {/* Bottom third: hinged on its top edge; folded up under the top third */}
            <motion.div className="absolute inset-x-0 bottom-0 h-1/3 origin-top" style={{ transformStyle: "preserve-3d", z: 0.8 }} initial={{ rotateX: 178 }} animate={{ rotateX: bottomOpen ? 0 : 178 }} transition={SPRING.heavy}>
              <div className="absolute inset-0 overflow-hidden rounded-b-[3px]" style={panel}>
                <Texture material="paper" opacity={0.45} />
                <div className="flex h-full items-start justify-center pt-[10%] text-[14px] italic opacity-75" style={{ color: c.oxblood, fontFamily: "var(--jb-display)" }}>
                  {t("letter.signoff")}
                </div>
              </div>
              <div className="absolute inset-0 rounded-b-[3px]" style={{ background: "linear-gradient(0deg,#FBF4EA,#EFE2CF)", transform: "rotateX(180deg)", backfaceVisibility: "hidden" }} />
            </motion.div>
            {/* Top third: hinged on its bottom edge; folded down over everything, their name on the back */}
            <motion.div className="absolute inset-x-0 top-0 h-1/3 origin-bottom" style={{ transformStyle: "preserve-3d", z: 1.6 }} initial={{ rotateX: -178 }} animate={{ rotateX: topOpen ? 0 : -178 }} transition={SPRING.heavy}>
              <div className="absolute inset-0 overflow-hidden rounded-t-[3px]" style={panel}>
                <Texture material="paper" opacity={0.45} />
                <div className="flex h-full items-end justify-center pb-[10%] text-[12px] tracking-[0.2em] uppercase opacity-70" style={{ color: c.oxblood }}>
                  {p.badge}
                </div>
              </div>
              <div className="absolute inset-0" style={{ transform: "rotateX(180deg)", backfaceVisibility: "hidden" }}>
                <PacketFace c={c} name={p.recipient} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
      <div className="mt-[min(9cqi,40.5px)] h-11">
        <FallbackButton onClick={letGo} color={c.oxblood!} ink={c.oxblood!} hidden={free || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
      {handoff.node}
    </div>
  );
}

export const LOVE_LETTER_DIRECTIONS = {
  a: { Component: LoveLetterMonogram, label: "A · Monogram seal", reveal: "fade" as const },
  b: { Component: LoveLetterPeel, label: "B · Peel the seal", reveal: "fade" as const },
  c: { Component: LoveLetterSlide, label: "C · Slide it out", reveal: "fade" as const },
};

/** The Love Letter opening the gift asked for (intro_settings.letter); breaking the seal by default. */
export function LoveLetterOpening(p: OpeningProps) {
  if (p.variant === "peel") return <LoveLetterPeel {...p} />;
  if (p.variant === "slide") return <LoveLetterSlide {...p} />;
  return <LoveLetterMonogram {...p} />;
}
