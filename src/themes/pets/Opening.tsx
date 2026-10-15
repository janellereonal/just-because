/**
 * PETS — your pet, who brings the gift.
 * Gesture: stroke the pet back and forth. It closes its eyes, blushes, wags
 * and purrs, and little paws float up. Once it has had enough love it trots
 * off screen and comes back carrying the gift, drops it, and the box pops.
 * Beats (ms after enough petting): 0 happy wiggle · 650 trots off ·
 * 1650 comes back with the gift · 2700 drops it, box pops · 3200 greeting ·
 * 4500 open.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { foley, melody } from "@/lib/play";

/** How much stroking (in px of back-and-forth) makes a happy pet. */
const ENOUGH = 650;

export function PetsOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const petRef = useRef<HTMLDivElement | null>(null);
  const giftRef = useRef<HTMLDivElement | null>(null);
  const [loved, setLoved] = useState(false);
  const [petting, setPetting] = useState(false);
  const [love, setLove] = useState(0);
  const h = useHaptics();
  const beat = useBeats(loved, [10, 650, 1650, 2700, 3200, 4500]);

  // Stroke tracking.
  const last = useRef<{ x: number; y: number } | null>(null);
  const travelled = useRef(0);
  const sinceSpark = useRef(0);
  const lastPurr = useRef(0);
  const lean = useMotionValue(0);
  const leanS = useSpring(lean, { stiffness: 220, damping: 16 });
  const squash = useTransform(leanS, (v) => 1 - Math.abs(v) * 0.004);

  function done() {
    if (loved) return;
    setLoved(true);
    setPetting(false);
    lean.set(0);
    h.success();
    cast.current?.celebrate();
    foley("purr");
  }

  function addLove(px: number, at?: { x: number; y: number }) {
    if (loved) return;
    travelled.current += px;
    sinceSpark.current += px;
    const v = Math.min(1, travelled.current / ENOUGH);
    setLove(v);
    const now = performance.now();
    if (now - lastPurr.current > 700) {
      lastPurr.current = now;
      foley("purr");
    }
    if (sinceSpark.current > 110) {
      sinceSpark.current = 0;
      h.tick();
      cast.current?.tap();
      const r = petRef.current?.getBoundingClientRect();
      const x = at?.x ?? (r ? r.left + r.width / 2 : 0);
      const y = r ? r.top + r.height * 0.2 : (at?.y ?? 0);
      burstSet(p.hostRef.current, x, y, p.iconSet, {
        colors: [c.terracotta!, c.peach!, c.ink!],
        count: 3,
        spread: 0.5,
        up: true,
        gravity: 0.25,
      });
    }
    if (v >= 1) done();
  }

  const can = !loved && p.interactive && !p.paused;
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (!can) return;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ok */
      }
      last.current = { x: e.clientX, y: e.clientY };
      setPetting(true);
      cast.current?.anticipate();
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!can || !last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      lean.set(Math.max(-14, Math.min(14, lean.get() + dx * 0.5)));
      addLove(Math.hypot(dx, dy), { x: e.clientX, y: e.clientY });
    },
    onPointerUp: () => {
      last.current = null;
      setPetting(false);
      lean.set(0);
    },
    onPointerCancel: () => {
      last.current = null;
      setPetting(false);
      lean.set(0);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        lean.set(e.key === "ArrowLeft" ? -10 : 10);
        window.setTimeout(() => lean.set(0), 180);
        addLove(ENOUGH / 3 + 1);
      }
    },
  };

  useEffect(() => {
    if (beat === 4) {
      foley("thunk");
      h.thud();
      melody([659, 784, 988, 1319], 0.12, "triangle", 0.05);
      const r = giftRef.current?.getBoundingClientRect();
      if (r)
        burstSet(p.hostRef.current, r.left + r.width / 2, r.top, p.iconSet, {
          colors: [c.terracotta!, c.tennis!, c.peach!],
          count: 20,
          spread: 1.1,
          up: true,
          gravity: 0.7,
        });
      cast.current?.celebrate();
    }
    if (beat === 6) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(loved ? "" : love > 0 ? "Keep going, they love it" : "Stroke them back and forth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loved, love > 0]);

  // Previews pet by themselves.
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      setPetting(true);
      void animate(0, 1, {
        duration: 1.6,
        ease: [0.45, 0, 0.55, 1],
        onUpdate: (v) => {
          lean.set(Math.sin(v * Math.PI * 6) * 10);
          setLove(v);
        },
      }).then(done);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  // Where the pet is: home, gone right, back from the left with the gift.
  const away = beat >= 2 && beat < 3;
  const carrying = beat === 3;
  const petX = p.reduced ? "0%" : away ? "170%" : "0%";
  const giftDown = beat >= 4 || (p.reduced && loved);

  return (
    <div
      className="relative flex size-full flex-col items-center justify-center"
      style={{ color: c.ink }}
    >
      <div className="relative z-[4] flex h-[clamp(80px,22cqi,110px)] w-full items-end justify-center px-6 text-center">
        {beat >= 5 || (p.reduced && loved) ? (
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={SPRING.wobbly}
          >
            <Greeting
              text={p.greeting}
              className="text-[clamp(2rem,10cqi,3rem)] font-extrabold"
              style={{ letterSpacing: "-0.03em" }}
            />
          </motion.div>
        ) : null}
      </div>

      {/* The rug, the ball, the pet */}
      <Layer
        depth={10}
        className="relative z-[3] mt-4"
        style={{ width: "min(88cqi, 400px)", height: "clamp(260px,70cqi,330px)" }}
      >
        <div
          className="absolute inset-x-[4%] bottom-[2%] h-[30%] rounded-[50%]"
          style={{
            background: `radial-gradient(closest-side, ${c.peach}, ${c.peach}CC 70%, ${c.terracotta}55)`,
            boxShadow: `inset 0 0 0 6px ${c.oat}66`,
          }}
        />
        <span
          className="absolute bottom-[14%] left-[10%] block size-8 rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 35%, #F1F7A0, ${c.tennis} 60%, #A9B53A)`,
            boxShadow: "0 6px 6px -4px rgba(0,0,0,.3)",
          }}
          aria-hidden="true"
        >
          <span className="absolute inset-[3px] rounded-full border-2 border-white/70 border-t-transparent border-l-transparent" />
        </span>

        {/* The gift, once it's been dropped */}
        <motion.div
          ref={giftRef}
          className="absolute bottom-[12%] left-[66%] z-[4]"
          initial={false}
          animate={giftDown ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -30, scale: 0.7 }}
          transition={SPRING.wobbly}
          aria-hidden="true"
        >
          <GiftBox open={beat >= 4} paper={c.terracotta!} ribbon={c.tennis!} />
        </motion.div>

        <motion.div
          className="absolute bottom-[12%] left-1/2 z-[3] -translate-x-1/2"
          initial={false}
          animate={{ x: petX }}
          transition={away ? { type: "spring", stiffness: 60, damping: 14 } : { duration: 0 }}
        >
          {/* Coming back from the other side: jump to the left edge first */}
          <ReturnFromLeft active={carrying}>
            <Trot active={(away || carrying) && !p.reduced}>
              <motion.div
                animate={beat === 1 ? { rotate: [0, -8, 8, -6, 6, 0] } : { rotate: 0 }}
                transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                style={{ originY: 1 }}
              >
                <motion.div
                  ref={petRef}
                  {...handlers}
                  role="button"
                  tabIndex={can ? 0 : -1}
                  aria-label="Stroke your pet"
                  className="relative touch-none outline-none select-none focus-visible:ring-4 focus-visible:ring-black/20"
                  style={{
                    rotate: leanS,
                    scaleY: squash,
                    originY: 1,
                    cursor: can ? "grab" : "default",
                  }}
                >
                  <Character
                    ref={cast}
                    setting={p.character}
                    accessory={p.accessory}
                    size={170}
                    live={!p.paused}
                    showName={false}
                    sleepy={petting}
                    blush={petting || loved}
                    follow={!petting}
                  />
                  {carrying ? (
                    <div
                      className="absolute -top-[18px] left-1/2 -translate-x-1/2"
                      aria-hidden="true"
                    >
                      <GiftBox open={false} paper={c.terracotta!} ribbon={c.tennis!} small />
                    </div>
                  ) : null}
                </motion.div>
              </motion.div>
            </Trot>
          </ReturnFromLeft>
        </motion.div>

        {/* A little love meter of three paws */}
        <div
          className="absolute -bottom-[6%] left-1/2 flex -translate-x-1/2 gap-2"
          aria-hidden="true"
          style={{ opacity: loved ? 0 : 1, transition: "opacity .3s" }}
        >
          {[0, 1, 2].map((i) => {
            const on = love > (i + 0.5) / 3 || (i === 2 && love >= 1);
            return (
              <motion.svg
                key={i}
                width="18"
                height="18"
                viewBox="0 0 24 24"
                animate={{ scale: on ? [1, 1.4, 1] : 1, opacity: on ? 1 : 0.3 }}
                transition={{ duration: 0.35, ease: [0.3, 1.4, 0.5, 1] }}
              >
                <path
                  fill={c.terracotta}
                  d="M12 13c-3 0-6 3-6 5.5S8 22 12 21s6 .5 6-2.5S15 13 12 13zM5 8.5a2.3 2.8 0 1 0 0 .1zM9 4a2.3 2.8 0 1 0 0 .1zM15 4a2.3 2.8 0 1 0 0 .1zM19 8.5a2.3 2.8 0 1 0 0 .1z"
                />
              </motion.svg>
            );
          })}
        </div>
      </Layer>

      <div className="relative z-[45] mt-10 h-11">
        <FallbackButton
          onClick={done}
          color={c.ink!}
          ink={c.ink!}
          hidden={loved || !p.interactive || p.paused}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** Bouncy little steps while moving. */
function Trot({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      animate={active ? { y: [0, -10, 0], rotate: [0, -3, 0, 3, 0] } : { y: 0, rotate: 0 }}
      transition={
        active ? { duration: 0.32, repeat: Infinity, ease: [0.3, 0, 0.7, 1] } : SPRING.soft
      }
    >
      {children}
    </motion.div>
  );
}

/** When the pet comes back, it enters from the left edge, not from where it left. */
function ReturnFromLeft({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={active ? { x: ["-260%", "0%"] } : { x: "0%" }}
      transition={active ? { duration: 0.9, ease: [0.2, 0.8, 0.3, 1] } : { duration: 0 }}
    >
      {children}
    </motion.div>
  );
}

function GiftBox({
  open,
  paper,
  ribbon,
  small = false,
}: {
  open: boolean;
  paper: string;
  ribbon: string;
  small?: boolean;
}) {
  const s = small ? 40 : 76;
  return (
    <div className="relative" style={{ width: s, height: s }}>
      <motion.div
        className="absolute inset-x-[-6%] top-0 z-[2] h-[28%] rounded-[4px]"
        style={{ background: paper, boxShadow: "0 3px 0 rgba(0,0,0,.12)" }}
        initial={false}
        animate={open ? { y: -s * 0.7, rotate: -24, x: -s * 0.2 } : { y: 0, rotate: 0, x: 0 }}
        transition={SPRING.wobbly}
      >
        <span
          className="absolute inset-y-0 left-1/2 w-[18%] -translate-x-1/2"
          style={{ background: ribbon }}
        />
      </motion.div>
      <div
        className="absolute inset-x-0 top-[24%] bottom-0 rounded-[4px]"
        style={{
          background: paper,
          boxShadow: "inset 0 -8px 0 rgba(0,0,0,.08), 0 8px 10px -6px rgba(0,0,0,.3)",
        }}
      >
        <span
          className="absolute inset-y-0 left-1/2 w-[18%] -translate-x-1/2"
          style={{ background: ribbon }}
        />
      </div>
    </div>
  );
}

export const petsBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.oat,
  backgroundImage: [
    // Wall, a warm patch of sunlight, then the floor.
    `radial-gradient(40% 26% at 72% 26%, #FFF8E8, transparent 70%)`,
    `linear-gradient(180deg, ${c.oat} 0 62%, #E6D6BC 62% 100%)`,
  ].join(","),
});
