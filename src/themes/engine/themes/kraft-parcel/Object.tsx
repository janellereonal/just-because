import { useEffect, useRef } from "react";
import { motion, useTransform } from "motion/react";
import { material, noise, shade } from "@/themes/engine/materials";
import { particlesFrom } from "@/themes/engine/particles";
import type { EngineObjectProps } from "@/themes/engine/define";

/** The sample parcel. Every value it draws comes from the slots, with fallbacks. */
export default function KraftParcel({ slots, palette, gesture, reduced, hostRef }: EngineObjectProps) {
  const tapeRef = useRef<HTMLDivElement | null>(null);
  const p = gesture.progress;
  // The tape peels from the left: what's left shrinks, the loose end lifts and curls.
  const tapeLeft = useTransform(p, (v) => `${v * 100}%`);
  const curl = useTransform(p, (v) => (v > 0.02 ? -28 * Math.min(1, v * 3) : 0));
  useEffect(() => {
    if (gesture.done) particlesFrom("sparks", hostRef.current, tapeRef.current);
  }, [gesture.done, hostRef]);

  const kraft = material("cardboard", { tint: palette.surface, lift: 0.7 });
  return (
    <div className="relative grid place-items-center" style={{ width: "min(80cqi, 360px)", aspectRatio: "1.25 / 1", perspective: 900 }}>
      {/* The box */}
      <div className="absolute inset-0" style={kraft} />
      {/* Top flaps, opening on done */}
      {[0, 1].map((i) => (
        <motion.div
          key={i}
          className="absolute top-0 h-1/2 w-1/2"
          style={{
            ...(material("cardboard", { tint: shade(palette.surface, 0.06), lift: 0 }) as object),
            left: i ? "50%" : 0,
            transformOrigin: i ? "100% 0%" : "0% 0%",
            borderBottom: `1px solid ${shade(palette.surface, -0.25)}55`,
          }}
          animate={gesture.done ? (reduced ? { opacity: 0 } : { rotateX: -100, rotateY: i ? 18 : -18, opacity: 0.2 }) : {}}
          transition={{ type: "spring", stiffness: 90, damping: 14, delay: i * 0.08 }}
        />
      ))}
      {/* Shipping label */}
      <div
        className="absolute bottom-[10%] left-[8%] w-[56%] px-3 py-2 text-left"
        style={{ ...material("paper", { lift: 0.2 }), transform: "rotate(-2deg)", color: palette.ink }}
      >
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-60">To</p>
        <p className="truncate font-[var(--jb-display)] text-[clamp(15px,4.6cqi,20px)] leading-tight font-semibold" style={{ fontFamily: "var(--jb-display)" }}>
          {slots.recipient}
        </p>
        <p className="truncate text-[11px] opacity-75">{slots.place.label}</p>
        <div className="my-1.5 h-px" style={{ background: `${palette.ink}22` }} />
        <p className="truncate text-[10px] opacity-70">From {slots.senderPlace.label}</p>
      </div>
      {/* A stamp with the monogram */}
      <div
        className="absolute top-[12%] right-[9%] grid size-[20%] place-items-center text-center"
        style={{
          background: palette.accent2,
          color: "#fff",
          borderRadius: 4,
          boxShadow: `0 0 0 3px #fff, 0 0 0 4px ${palette.accent2}55, 2px 4px 8px rgba(0,0,0,.18)`,
          backgroundImage: noise(1.2, 0.12),
          transform: "rotate(6deg)",
        }}
      >
        <span className="text-[clamp(14px,5cqi,22px)] font-bold" style={{ fontFamily: "var(--jb-display)" }}>
          {slots.monogram || "♥"}
        </span>
      </div>
      {/* The tape: the thing you tear */}
      <div
        ref={tapeRef}
        {...gesture.bind}
        className="absolute inset-x-[-3%] top-1/2 h-[16%] -translate-y-1/2 cursor-grab outline-none focus-visible:ring-4 focus-visible:ring-white/80 active:cursor-grabbing"
      >
        <motion.div
          className="absolute inset-y-0 right-0"
          style={{
            left: tapeLeft,
            backgroundColor: "rgba(172,128,72,.92)",
            backgroundImage: `${noise(1.6, 0.1)}, linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0) 40%, rgba(0,0,0,.08))`,
            boxShadow: "0 1px 0 rgba(255,255,255,.6) inset, 0 2px 4px rgba(60,40,20,.18)",
            transformOrigin: "0% 50%",
            rotate: curl,
          }}
        />
        {/* The torn end you grab, with a little arrow until you start */}
        {!gesture.done ? (
          <motion.span className="absolute top-1/2 -left-1 grid size-8 -translate-y-1/2 place-items-center rounded-full text-sm" style={{ left: tapeLeft, background: palette.accent, color: "#fff", x: -12 }} aria-hidden>
            →
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}
