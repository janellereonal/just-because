/**
 * BABY SHOWER — a mobile above a crib.
 * Gesture: pull the string down. The mobile spins up, the soft shapes let go
 * one by one and drift down into a pile in the crib. The character, in a
 * bonnet, wakes from a sleepy blink.
 * Beats (ms after the pull): 0 spin · 900 shapes start dropping (220ms
 * apart) · 2100 greeting · 3300 open.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { IconGlyph } from "@/themes/_shared/Sprinkles";
import { pick, type IconSet } from "@/themes/_shared/iconSets";
import { ContactShadow, LightShaft, TEXTURE_SOFT, Texture } from "@/themes/_shared/light";
import { foley, melody } from "@/lib/play";

const N = 5;

export function BabyOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const pull = useMotionValue(0);
  const theta = useMotionValue(0);
  const [pulled, setPulled] = useState(false);
  const h = useHaptics();
  const beat = useBeats(pulled, [900, 2100, 3300]);
  const lastTick = useRef(0);
  const stringHeight = useTransform(pull, (v) => `calc(62% + ${v}px)`);
  const plush = [c.blue!, c.butter!, c.blush!, "#CFE7D7", "#FFFFFF"];

  function go() {
    if (pulled) return;
    setPulled(true);
    void animate(pull, 0, SPRING.wobbly);
    h.thud();
    // Spin up, then ease out.
    void animate(theta, theta.get() + Math.PI * 6, { duration: p.reduced ? 0 : 3, ease: [0.3, 0.1, 0.2, 1] });
    melody([784, 659, 523, 659, 784, 784, 784], 0.28, "sine", 0.05);
    window.setTimeout(() => cast.current?.tap(), 400);
  }

  useEffect(() => {
    if (beat === 2) {
      cast.current?.celebrate();
      h.success();
    }
    if (beat === 3) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(pulled ? "" : "Give the string a gentle tug");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulled]);

  // Idle: the mobile turns very slowly on its own.
  useEffect(() => {
    if (p.paused || p.reduced) return;
    // A slow sway back and forth, like a mobile turning in a draught.
    const a = animate(theta, theta.get() + Math.PI * 0.9, { duration: 9, repeat: Infinity, repeatType: "mirror", ease: [0.45, 0, 0.55, 1] });
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.paused, p.reduced]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      void animate(pull, 90, { type: "spring", stiffness: 80, damping: 14 }).then(go);
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  return (
    <div className="relative flex size-full flex-col items-center pt-[clamp(44px,11cqi,72px)] pb-[clamp(78px,20cqi,104px)]">
      {/* Moonlight from the window, top left */}
      <Layer depth={-14} className="pointer-events-none absolute -inset-[40%]">
        <LightShaft color="236,242,255" strength={0.75} motes={10} angle={22} />
      </Layer>
      {/* The mobile's shadow on the wall behind, soft and a little further off */}
      <Layer depth={-16} className="pointer-events-none absolute inset-x-0 top-[clamp(44px,11cqi,72px)] z-[1] flex justify-center" style={{ opacity: 0.18 }}>
        <div className="relative" style={{ width: "min(84cqi, 380px)", height: "clamp(250px,68cqi,340px)", transform: "translate(7%, 9%) scale(1.06)" }}>
          <div className="absolute top-[17%] left-1/2 h-[6%] w-[70%] -translate-x-1/2 rounded-[50%]" style={{ boxShadow: "inset 0 0 0 3px #1d2238", filter: "blur(3px)" }} />
          {Array.from({ length: N }, (_, i) => (
            <Hanger key={i} i={i} theta={theta} pulled={pulled} beat={beat} item={pick(p.iconSet.items, i)} felt="#1d2238" shadow />
          ))}
        </div>
      </Layer>

      {/* The mobile hangs from the top */}
      <Layer depth={-6} className="relative z-[2] flex w-full justify-center">
        <div className="relative" style={{ width: "min(84cqi, 380px)", height: "clamp(250px,68cqi,340px)" }}>
          <span className="absolute -top-[30%] left-1/2 h-[47%] w-[2px] -translate-x-1/2" style={{ background: "#B9A98E" }} />
          {/* The ring */}
          <div className="absolute top-[17%] left-1/2 h-[6%] w-[70%] -translate-x-1/2 rounded-[50%]" style={{ boxShadow: "inset 0 0 0 3.5px #CDB58E, inset 1px 1px 0 3.5px #F1E3C8, 1px 2px 2px rgba(60,40,20,.18)" }} />
          {Array.from({ length: N }, (_, i) => (
            <Hanger key={i} i={i} theta={theta} pulled={pulled} beat={beat} item={pick(p.iconSet.items, i)} felt={pick(plush, i)} />
          ))}
          {/* The pull string with a wooden ring */}
          <motion.div className="absolute top-[20%] left-1/2 z-[5] w-[2px] origin-top -translate-x-1/2" style={{ height: stringHeight, background: "#B9A98E" }} />
          <motion.button
            type="button"
            aria-label="Pull the string"
            disabled={pulled || !p.interactive || p.paused}
            className="absolute left-1/2 z-[6] grid size-12 -translate-x-1/2 touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white"
            style={{ top: "calc(82% - 24px)", y: pull }}
            drag={!pulled && p.interactive && !p.paused ? "y" : false}
            dragConstraints={{ top: 0, bottom: 140 }}
            dragElastic={0.12}
            dragMomentum={false}
            onDrag={() => {
              const t = Math.floor(pull.get() / 25);
              if (t > lastTick.current) {
                lastTick.current = t;
                h.tick();
              }
            }}
            onDragEnd={() => {
              lastTick.current = 0;
              if (pull.get() > 70) go();
              else void animate(pull, 0, SPRING.wobbly);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
                e.preventDefault();
                go();
              }
            }}
          >
            <span className="block size-7 rounded-full" style={{ boxShadow: "inset 0 0 0 5px #D8B98A, 0 4px 8px -3px rgba(0,0,0,.3)" }} />
            {!pulled && p.interactive && !p.paused ? <span className="jb-pulse absolute top-1/2 left-1/2 size-10 -translate-y-1/2 rounded-full" style={{ boxShadow: `0 0 0 2px ${c.ink}55` }} /> : null}
          </motion.button>
        </div>
      </Layer>

      {/* Greeting */}
      <div className="relative z-[3] grid w-full flex-1 place-items-center px-4 text-center" style={{ color: c.ink }}>
        {beat >= 2 ? (
          <motion.div initial={{ y: -40, opacity: 0, rotate: -4 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={SPRING.wobbly}>
            <Greeting text={p.greeting} className="text-[clamp(2rem,11cqi,3.4rem)] font-bold" style={{ fontVariationSettings: '"wdth" 85, "opsz" 96' }} />
          </motion.div>
        ) : null}
      </div>

      {/* The crib, with the character tucked in */}
      <Layer depth={10} className="relative z-[4]" style={{ width: "min(88cqi, 410px)", height: "clamp(150px,40cqi,190px)" }}>
        <ContactShadow tint="61,70,96" strength={0.7} className="-inset-x-[2%] -bottom-[8%] h-[22%]" style={{ transform: "translateX(4%)" }} />
        {/* Mattress: quilted cotton */}
        <div
          className="absolute inset-x-[4%] bottom-[22%] h-[30%] overflow-hidden rounded-[16px]"
          style={{
            background: `linear-gradient(180deg, #FFFFFF, ${c.oat})`,
            backgroundImage: [
              "radial-gradient(circle at 50% 50%, rgba(61,70,96,.14) 0 1.2px, transparent 1.6px)",
              "linear-gradient(45deg, transparent 47%, rgba(61,70,96,.06) 50%, transparent 53%)",
              "linear-gradient(-45deg, transparent 47%, rgba(61,70,96,.06) 50%, transparent 53%)",
              `linear-gradient(180deg, #FFFFFF, ${c.oat})`,
            ].join(","),
            backgroundSize: "18px 18px, 18px 18px, 18px 18px, auto",
            boxShadow: "inset 0 6px 10px -6px rgba(0,0,0,.2), inset 2px 0 0 rgba(255,255,255,.8)",
          }}
        >
          <Texture material="felt" opacity={0.25} />
        </div>
        <div className="absolute bottom-[34%] left-[30%] z-[1]">
          <Character ref={cast} setting={p.character} accessory={p.accessory} size={104} sleepy={!pulled} live={!p.paused} showName={false} />
        </div>
        {/* Landed shapes pile up here */}
        <div className="absolute inset-x-[10%] bottom-[30%] z-[2] h-[30%]">
          {Array.from({ length: N }, (_, i) => (
            <motion.span
              key={i}
              className="absolute bottom-0"
              style={{ left: `${8 + i * 18}%` }}
              initial={false}
              animate={beat >= 1 ? { opacity: 1, y: 0, rotate: (i % 2 ? 1 : -1) * (8 + i * 4) } : { opacity: 0, y: -220 }}
              transition={beat >= 1 ? { ...SPRING.wobbly, delay: p.reduced ? 0 : i * 0.22 } : { duration: 0 }}
            >
              <Felt item={pick(p.iconSet.items, i)} color={pick(plush, i)} size={40} />
            </motion.span>
          ))}
        </div>
        {/* Crib rails */}
        <div className="absolute inset-x-0 bottom-0 z-[3] h-full">
          <div className="absolute inset-x-0 top-[18%] h-[10%] overflow-hidden rounded-full" style={{ background: "linear-gradient(180deg,#FBF4E8,#E3D1B5 70%,#CDB794)", boxShadow: "0 3px 4px -1px rgba(80,60,30,.25)" }}>
            <Texture material="wood" opacity={0.12} />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[22%] overflow-hidden rounded-[10px]" style={{ background: "linear-gradient(180deg,#F6EBD8,#D9C4A2)", boxShadow: "inset 0 2px 0 rgba(255,255,255,.7), 4px 18px 26px -18px rgba(0,0,0,.35)" }}>
            <Texture material="wood" opacity={0.14} />
          </div>
          <div className="absolute inset-x-[3%] top-[26%] bottom-[20%] flex justify-between">
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className="h-full w-[3%] rounded-full" style={{ background: "linear-gradient(90deg,#E3D0B2,#FBF5EA 35%,#E9DAC1 60%,#C9B28D)", boxShadow: "2px 0 2px rgba(80,60,30,.12)" }} />
            ))}
          </div>
        </div>
      </Layer>

      <div className="relative z-[45] mt-4 h-11">
        <FallbackButton onClick={go} color={c.ink!} ink={c.ink!} hidden={pulled || !p.interactive || p.paused}>
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** One hanging shape, placed on a turning circle (depth by sine). */
function Hanger({ i, theta, pulled, beat, item, felt, shadow = false }: { i: number; theta: MotionValue<number>; pulled: boolean; beat: number; item: IconSet["items"][number]; felt: string; shadow?: boolean }) {
  const a = (i / N) * Math.PI * 2;
  // Around the ring by transform (not `left`), so nothing lays out or repaints as it turns.
  const x = useTransform(theta, (t) => `calc(min(84cqi, 380px) * ${(Math.cos(t + a) * 0.4).toFixed(4)})`);
  const scale = useTransform(theta, (t) => 0.78 + (Math.sin(t + a) + 1) * 0.14);
  const z = useTransform(theta, (t) => Math.round((Math.sin(t + a) + 1) * 10));
  const len = 50 + ((i * 17) % 3) * 22;
  const dropped = beat >= 1;
  return (
    <motion.div className="absolute top-[20%] left-1/2" style={{ x, scale, zIndex: z, marginLeft: -26, willChange: "transform" }}>
      <span className="absolute left-1/2 w-px -translate-x-1/2" style={{ height: len, opacity: dropped ? 0 : 1, transition: "opacity .3s", background: shadow ? felt : "#B9A98E" }} />
      <motion.div
        style={{ marginTop: len }}
        animate={dropped ? { opacity: 0, y: 260, transition: { delay: i * 0.22, duration: 0.6, ease: [0.4, 0, 1, 1] } } : { rotate: pulled ? [0, -14, 10, -6, 0] : [0, 4, -4, 0], y: 0, opacity: 1 }}
        transition={{ duration: pulled ? 1.4 : 4, repeat: pulled ? 0 : Infinity, ease: [0.45, 0, 0.55, 1] }}
      >
        {shadow ? <IconGlyph item={item} color={felt} size={52} style={{ filter: "blur(3px)" }} /> : <Felt item={item} color={felt} size={52} />}
      </motion.div>
    </motion.div>
  );
}

/** A felt-looking shape: the icon in a soft color with a stitched outline. */
function Felt({ item, color, size }: { item: IconSet["items"][number]; color: string; size: number }) {
  return (
    <span className="block" style={{ filter: "drop-shadow(2px 4px 3px rgba(60,70,96,.28))" }}>
      <IconGlyph item={item} color={color} size={size} material="felt" />
    </span>
  );
}

export const babyBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.oat,
  backgroundImage: [
    // Nursery wall, a skirting line and the floor.
    `linear-gradient(180deg, transparent 0 79.6%, rgba(255,255,255,.7) 79.8%, rgba(61,70,96,.08) 80.4%, rgba(61,70,96,.05))`,
    `linear-gradient(180deg, ${c.blue}55, transparent 55%)`,
    `radial-gradient(60% 40% at 50% 30%, #FFFFFF99, transparent 70%)`,
    "radial-gradient(130% 100% at 50% 45%, transparent 55%, rgba(61,70,96,.16))",
    TEXTURE_SOFT.paper,
  ].join(","),
  backgroundSize: "auto, auto, auto, auto, 260px 260px",
});
