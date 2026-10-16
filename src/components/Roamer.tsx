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
    const pickSpot = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      // Mostly along the left or right edge; now and then across the middle.
      const across = Math.random() < 0.1;
      const side = Math.random() < 0.5 ? 0 : 1;
      const tx = across ? w * (0.2 + Math.random() * 0.6) : side ? w - size - 10 - Math.random() * w * 0.08 : 10 + Math.random() * w * 0.08;
      const ty = 70 + Math.random() * Math.max(40, h - 170);
      return { tx, ty };
    };
    // Never park on words, buttons, links or fields: try a few spots, keep the first clear one.
    const clearAt = (tx: number, ty: number) => isClearSpot(box, hostRef.current, tx, ty, size);
    const moveTo = (tx: number, ty: number) => {
      turn.set(tx < x.get() ? -1 : 1);
      void animate(x, tx, { type: "spring", stiffness: 9, damping: 7, mass: 1.6 });
      void animate(y, ty, { type: "spring", stiffness: 9, damping: 7, mass: 1.6 });
    };
    const wander = () => {
      if (!alive || !box) return;
      let spot = pickSpot();
      for (let i = 0; i < 10 && !clearAt(spot.tx, spot.ty); i += 1) spot = pickSpot();
      if (clearAt(spot.tx, spot.ty)) moveTo(spot.tx, spot.ty);
      else moveTo(box.clientWidth - size - 6, box.clientHeight - size - 96);
      t = window.setTimeout(wander, 4200 + Math.random() * 3800);
    };
    t = window.setTimeout(wander, 800);
    // Content scrolls under it, so check again once scrolling settles.
    let settle = 0;
    const onScroll = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        if (!alive || clearAt(x.get(), y.get())) return;
        window.clearTimeout(t);
        wander();
      }, 220);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll, { capture: true });
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

const BUSY = "button, a, input, textarea, select, label, [role=button], [role=link], h1, h2, h3, h4, p, li, img, video, canvas, iframe, figure, blockquote";

/** True when nothing a person reads or taps sits under the icon at (tx, ty) inside the box. */
function isClearSpot(box: HTMLElement, self: HTMLElement | null, tx: number, ty: number, size: number): boolean {
  if (typeof document === "undefined") return true;
  const r = box.getBoundingClientRect();
  const pad = 6;
  const pts: [number, number][] = [
    [tx - pad, ty - pad],
    [tx + size + pad, ty - pad],
    [tx - pad, ty + size + pad],
    [tx + size + pad, ty + size + pad],
    [tx + size / 2, ty + size / 2],
  ];
  for (const [px, py] of pts) {
    const vx = r.left + px;
    const vy = r.top + py;
    if (vx < 0 || vy < 0 || vx > window.innerWidth || vy > window.innerHeight) continue;
    for (const el of document.elementsFromPoint(vx, vy)) {
      if (el === box || (self && self.contains(el))) continue;
      if (el.closest(BUSY)) return false;
      // Words in a plain div or span count too.
      if ([...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) return false;
    }
  }
  return true;
}
