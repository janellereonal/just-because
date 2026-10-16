import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { IconGlyph, burstSet } from "@/themes/_shared/Sprinkles";
import { pick, type IconSet } from "@/themes/_shared/iconSets";
import { chime } from "@/lib/play";

/**
 * One sprinkle from the gift's icon set that wanders around the page: it drifts
 * along the edges (so it rarely sits on the words), bobs, now and then turns to
 * look across, and hops when you tap it. Fixed to the visible screen; inside a
 * preview frame (contain: paint) it stays inside the frame. Still under reduced motion.
 */
export function Roamer({ icons, index, size = 34 }: { icons: IconSet; index: number; size?: number }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(-80);
  const y = useMotionValue(200);
  const hop = useMotionValue(0);
  const turn = useMotionValue(0);
  const [reduce, setReduce] = useState(false);
  const flip = useTransform(turn, (v) => (v < 0 ? -1 : 1));
  const item = pick(icons.items, index);
  const color = pick(icons.colors.length ? icons.colors : ["#E8577E"], index);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (reduce) {
      x.set(box.clientWidth - size - 18);
      y.set(box.clientHeight - size - 90);
      return;
    }
    let alive = true;
    let t = 0;
    const wander = () => {
      if (!alive || !box) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      // Mostly along the left or right edge; now and then across the middle.
      const across = Math.random() < 0.1;
      const side = Math.random() < 0.5 ? 0 : 1;
      const tx = across ? w * (0.2 + Math.random() * 0.6) : side ? w - size - 10 - Math.random() * w * 0.08 : 10 + Math.random() * w * 0.08;
      const ty = 70 + Math.random() * Math.max(40, h - 170);
      turn.set(tx < x.get() ? -1 : 1);
      void animate(x, tx, { type: "spring", stiffness: 9, damping: 7, mass: 1.6 });
      void animate(y, ty, { type: "spring", stiffness: 9, damping: 7, mass: 1.6 });
      t = window.setTimeout(wander, 4200 + Math.random() * 3800);
    };
    t = window.setTimeout(wander, 800);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [reduce, size, x, y, turn]);

  // A gentle bob, always.
  const bobY = useMotionValue(0);
  useEffect(() => {
    if (reduce) return;
    const a = animate(bobY, [0, -6, 0], { duration: 2.4, repeat: Infinity, ease: "easeInOut" });
    return () => a.stop();
  }, [reduce, bobY]);
  const yAll = useTransform(() => y.get() + bobY.get() + hop.get());

  function tap() {
    void animate(hop, [0, -36, 0], { duration: 0.55, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] });
    chime("boop");
    const r = hostRef.current?.getBoundingClientRect();
    if (r) burstSet(boxRef.current, r.left + r.width / 2, r.top + r.height / 2, icons, { count: 8, spread: 0.7, up: true });
  }

  return (
    <div ref={boxRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[6] overflow-hidden">
      <motion.div
        ref={hostRef}
        className="pointer-events-auto absolute top-0 left-0 cursor-pointer"
        style={{ x, y: yAll, scaleX: flip }}
        onClick={tap}
        whileTap={{ scale: 0.86 }}
      >
        <IconGlyph item={item} color={color} size={size} />
      </motion.div>
    </div>
  );
}
