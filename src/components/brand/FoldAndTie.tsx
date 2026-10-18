import { motion, useReducedMotion } from "motion/react";

/**
 * DRAFT signature transition for "sent" and "wrapped" moments: the note folds in half,
 * a ribbon wraps around it and ties. About 900ms, ease-out, no bounce. Under reduced
 * motion it simply fades to the tied note. `play` restarts it (change the key).
 */
export function FoldAndTie({ size = 160, color = "#FFFFFF", ribbon = "#C2366B", onDone }: { size?: number; color?: string; ribbon?: string; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const ease = [0.22, 0.61, 0.36, 1] as const;
  const w = size;
  const h = size * 0.68;
  if (reduced) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} onAnimationComplete={() => onDone?.()} style={{ width: w, height: h / 2 + 8 }} className="relative">
        <div className="absolute inset-x-0 bottom-0 rounded-[6px]" style={{ height: h / 2, background: color, boxShadow: "0 6px 18px -10px rgb(43 37 34 / .3)" }} />
        <div className="absolute inset-y-0 left-1/2 w-[10px] -translate-x-1/2" style={{ background: ribbon }} />
      </motion.div>
    );
  }
  return (
    <div className="relative" style={{ width: w, height: h, perspective: 700 }}>
      {/* bottom half stays put */}
      <div className="absolute inset-x-0 bottom-0 rounded-b-[6px]" style={{ height: h / 2, background: color, boxShadow: "0 6px 18px -10px rgb(43 37 34 / .3)" }}>
        <div className="mx-4 mt-3 h-[3px] rounded bg-black/10" />
        <div className="mx-4 mt-2 h-[3px] w-1/2 rounded bg-black/10" />
      </div>
      {/* top half folds down over it */}
      <motion.div
        className="absolute inset-x-0 top-0 rounded-t-[6px]"
        style={{ height: h / 2, background: color, transformOrigin: "50% 100%", backfaceVisibility: "hidden" }}
        initial={{ rotateX: 0 }}
        animate={{ rotateX: -180 }}
        transition={{ duration: 0.42, ease }}
      >
        <div className="mx-4 mt-4 h-[3px] rounded bg-black/10" />
        <div className="mx-4 mt-2 h-[3px] w-2/3 rounded bg-black/10" />
      </motion.div>
      {/* ribbon wraps, then the bow ties */}
      <motion.div
        className="absolute left-1/2 w-[10px] -translate-x-1/2"
        style={{ bottom: 0, height: h / 2, background: ribbon, transformOrigin: "50% 100%" }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ delay: 0.42, duration: 0.22, ease }}
      />
      <motion.svg
        width={44}
        height={24}
        viewBox="0 0 44 24"
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: h / 2 - 12 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.64, duration: 0.24, ease }}
        onAnimationComplete={() => onDone?.()}
      >
        <path d="M22 12C16 2 4 2 4 9s12 6 18 3Zm0 0c6-10 18-10 18-3s-12 6-18 3Z" fill={ribbon} />
        <circle cx="22" cy="12" r="3.4" fill={ribbon} stroke="rgb(0 0 0 / .15)" />
      </motion.svg>
    </div>
  );
}
