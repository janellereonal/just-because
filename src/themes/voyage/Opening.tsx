/**
 * BON VOYAGE — a boarding pass.
 * Gesture: drag the little tab along the dotted line to tear off the stub.
 * The paper rips as you go (sound and ticks), and the stub drops away. Then
 * passport stamps thunk down on the pass, one for every friend who added
 * something. The character wears a pilot cap and has a tiny suitcase.
 * Beats (ms after the tear): 0 stub falls · 450 stamps (240ms apart) ·
 * then greeting · then open.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import { Greeting, type OpeningProps } from "@/themes/_shared/opening";
import type { ThemePalette } from "@/themes/_shared/design";
import { FallbackButton, Layer, SPRING, useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { initialsOf } from "@/themes/_shared/iconSets";
import { foley, melody } from "@/lib/play";

const STAMP_GAP = 240;

export function VoyageOpening(p: OpeningProps) {
  const c = p.design.palette;
  const cast = useRef<CharacterHandle | null>(null);
  const passRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [torn, setTorn] = useState(false);
  const h = useHaptics();
  const lastTick = useRef(0);

  const names = useMemo(() => {
    const list = p.contributors.filter(Boolean);
    const fill = ["Friends", "With love", "Bon voyage"];
    while (list.length < 3) list.push(fill[list.length] ?? "Friends");
    return list.slice(0, 8);
  }, [p.contributors]);
  const stampsEnd = 450 + names.length * STAMP_GAP;
  const beat = useBeats(torn, [450, stampsEnd + 250, stampsEnd + 1700]);
  const [stamped, setStamped] = useState(0);

  const [lineW, setLineW] = useState(280);
  const width = () => lineRef.current?.offsetWidth ?? lineW;
  useEffect(() => {
    const el = lineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLineW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const progress = useTransform(x, (v) => Math.min(1, Math.max(0, v / width())));
  const stubAngle = useTransform(progress, (v) => v * 9);
  const gap = useTransform(progress, (v) => v * 10);

  function tear() {
    if (torn) return;
    setTorn(true);
    void animate(x, width(), SPRING.snappy);
    foley("rip");
    h.thud();
    cast.current?.anticipate();
  }

  // Stamps land one at a time.
  useEffect(() => {
    if (beat < 1) {
      setStamped(0);
      return;
    }
    if (p.reduced) {
      setStamped(names.length);
      return;
    }
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setStamped(i);
      foley("thunk");
      h.tap();
      if (i >= names.length) window.clearInterval(t);
    }, STAMP_GAP);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat >= 1]);

  useEffect(() => {
    if (beat === 2) {
      cast.current?.celebrate();
      h.success();
      melody([523, 659, 784, 659, 1047], 0.12, "triangle", 0.05);
      const r = passRef.current?.getBoundingClientRect();
      if (r)
        burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.2, p.iconSet, {
          colors: [c.orange!, c.sky!, c.ink!],
          count: 16,
          spread: 1.1,
          up: true,
          gravity: 0.7,
        });
    }
    if (beat === 3) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  useEffect(() => {
    p.setHint(torn ? "" : "Tear the stub along the dotted line");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torn]);

  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const t = window.setTimeout(() => {
      void animate(x, width() * 0.8, { type: "spring", stiffness: 40, damping: 14 }).then(tear);
    }, 800);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.autoplay, p.paused]);

  const canDrag = !torn && p.interactive && !p.paused;
  const today = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" })
        .format(new Date())
        .toUpperCase(),
    [],
  );
  const code = (
    p.recipient.replace(/[^\p{L}]/gu, "").slice(0, 3) || initialsOf(p.recipient)
  ).toUpperCase();

  return (
    <div
      className="relative flex size-full flex-col items-center justify-center"
      style={{ color: c.ink }}
    >
      <Layer depth={8} rotate={5} className="relative z-[3]" style={{ width: "min(80cqi, 340px)" }}>
        <div ref={passRef} className="relative" style={{ fontFamily: "var(--jb-text)" }}>
          {/* The main pass */}
          <motion.div
            className="relative overflow-hidden rounded-t-[18px]"
            animate={torn ? { y: -14, rotate: -1.5 } : { y: 0, rotate: 0 }}
            transition={SPRING.heavy}
            style={{
              background: c.cream,
              boxShadow: "0 22px 40px -24px rgba(34,48,63,.55)",
              ...(paperMask("bottom") as object),
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: c.orange, color: c.cream }}
            >
              <span className="text-[11px] font-bold tracking-[0.24em] uppercase">
                {p.badge || "Boarding pass"}
              </span>
              <Plane color={c.cream!} />
            </div>
            <div className="relative px-5 pt-4 pb-6">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[9px] tracking-[0.2em] uppercase opacity-60">From</div>
                  <div
                    className="text-[clamp(2rem,11cqi,2.8rem)] leading-none font-bold"
                    style={{ fontFamily: "var(--jb-display)" }}
                  >
                    YOU
                  </div>
                </div>
                <div className="mb-2 flex-1 px-3">
                  <div
                    className="relative h-px w-full"
                    style={{
                      backgroundImage: `linear-gradient(90deg, ${c.ink}66 50%, transparent 0)`,
                      backgroundSize: "8px 1px",
                    }}
                  >
                    <span className="absolute -top-[7px] left-1/2 -translate-x-1/2">
                      <Plane color={c.orange!} small />
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] tracking-[0.2em] uppercase opacity-60">To</div>
                  <div
                    className="text-[clamp(2rem,11cqi,2.8rem)] leading-none font-bold"
                    style={{ fontFamily: "var(--jb-display)" }}
                  >
                    {code}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] leading-tight">
                <Field label="Passenger" value={p.recipient} wide />
                <Field label="Date" value={today} />
                <Field label="Gate" value="B4" />
                <Field label="Seat" value="1A" />
                <Field label="Class" value="First" />
              </div>
              {/* Passport stamps land here */}
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {names.map((n, i) => (
                  <Stamp
                    key={i}
                    i={i}
                    name={n}
                    on={i < stamped}
                    reduced={p.reduced}
                    colors={[c.orange!, c.ink!, "#2F6FA8"]}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* The perforation, with the tab you drag */}
          <motion.div
            ref={lineRef}
            className="relative h-0"
            animate={{ opacity: torn ? 0 : 1 }}
            transition={{ duration: 0.25 }}
          >
            <span
              className="absolute top-[-1px] right-[14px] left-[14px] h-[2px]"
              style={{
                backgroundImage: `radial-gradient(circle, ${c.ink}55 1px, transparent 1.5px)`,
                backgroundSize: "8px 2px",
              }}
            />
            <motion.span
              className="absolute top-0 left-0 h-[2px] origin-left"
              style={{ width: x, background: `${c.ink}22` }}
            />
            <motion.button
              type="button"
              aria-label="Tear off the stub"
              disabled={!canDrag}
              className="absolute top-[-20px] left-[-12px] z-[6] grid size-10 touch-none place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              style={{ x }}
              drag={canDrag ? "x" : false}
              dragConstraints={{ left: 0, right: lineW }}
              dragElastic={0.04}
              dragMomentum={false}
              onDrag={() => {
                const t = Math.floor(progress.get() * 7);
                if (t > lastTick.current) {
                  lastTick.current = t;
                  h.tick();
                  foley("rip");
                }
              }}
              onDragEnd={() => {
                if (progress.get() > 0.6) tear();
                else {
                  lastTick.current = 0;
                  void animate(x, 0, SPRING.wobbly);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
                  e.preventDefault();
                  tear();
                }
              }}
            >
              <span
                className="grid size-7 place-items-center rounded-full text-[13px] font-bold"
                style={{
                  background: c.orange,
                  color: c.cream,
                  boxShadow: "0 4px 10px -4px rgba(0,0,0,.45)",
                }}
              >
                ›
              </span>
              {canDrag ? (
                <span
                  className="jb-pulse absolute top-1/2 left-1/2 size-9 -translate-y-1/2 rounded-full"
                  style={{ boxShadow: `0 0 0 2px ${c.orange}88` }}
                />
              ) : null}
            </motion.button>
          </motion.div>

          {/* The stub: hinges down as you tear, then falls away */}
          <motion.div style={{ rotate: stubAngle, y: gap, originX: 1, originY: 0 }}>
            <motion.div
              className="relative rounded-b-[18px] px-5 pt-4 pb-4"
              initial={false}
              animate={
                torn
                  ? { y: 420, rotate: 24, x: 40, opacity: 0 }
                  : { y: 0, rotate: 0, x: 0, opacity: 1 }
              }
              transition={
                torn ? { ...SPRING.heavy, opacity: { delay: 0.5, duration: 0.3 } } : { duration: 0 }
              }
              style={{
                background: c.cream,
                boxShadow: "0 22px 40px -24px rgba(34,48,63,.55)",
                ...(paperMask("top") as object),
              }}
            >
              <div className="flex items-center justify-between text-[10px] leading-tight">
                <Field label="Passenger" value={p.recipient} />
                <Field label="Seat" value="1A" />
              </div>
              <Barcode ink={c.ink!} seed={p.recipient} />
            </motion.div>
          </motion.div>
        </div>

        {/* The character, ready to go */}
        <div className="absolute -top-[72px] right-[2%] z-[7] flex items-end">
          {p.character.type !== "none" ? <Suitcase color={c.orange!} band={c.kraft!} /> : null}
          <Character
            ref={cast}
            setting={p.character}
            accessory={p.accessory}
            size={80}
            live={!p.paused}
            showName={false}
          />
        </div>
      </Layer>

      <div className="relative z-[4] grid h-[clamp(84px,24cqi,120px)] w-full place-items-center px-6 text-center">
        {beat >= 2 ? (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={SPRING.soft}
          >
            <Greeting
              text={p.greeting}
              className="text-[clamp(1.8rem,9cqi,2.6rem)] font-bold"
              style={{ color: c.ink }}
            />
          </motion.div>
        ) : null}
      </div>

      <div className="relative z-[45] h-11">
        <FallbackButton
          onClick={tear}
          color={c.ink!}
          ink={c.ink!}
          hidden={torn || !p.interactive || p.paused}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-3" : ""}>
      <div className="text-[8.5px] tracking-[0.2em] uppercase opacity-55">{label}</div>
      <div className="truncate text-[12px] font-bold uppercase">{value}</div>
    </div>
  );
}

/** Notches on the perforated edge, cut with a mask. */
function paperMask(edge: "top" | "bottom"): React.CSSProperties {
  const at = edge === "bottom" ? "100%" : "0";
  const m = `radial-gradient(circle 12px at 0 ${at}, transparent 11.5px, #000 12px), radial-gradient(circle 12px at 100% ${at}, transparent 11.5px, #000 12px)`;
  return {
    WebkitMaskImage: m,
    maskImage: m,
    WebkitMaskComposite: "source-in",
    maskComposite: "intersect",
  } as React.CSSProperties;
}

/** A passport stamp with a friend's name, slammed down with a little overshoot. */
function Stamp({
  i,
  name,
  on,
  reduced,
  colors,
}: {
  i: number;
  name: string;
  on: boolean;
  reduced: boolean;
  colors: string[];
}) {
  const spots = [
    [58, 12, -14],
    [8, 40, 9],
    [62, 52, 16],
    [30, 6, -6],
    [36, 62, -18],
    [70, 30, 7],
    [4, 66, -10],
    [46, 34, 12],
  ] as const;
  const [left, top, rot] = spots[i % spots.length]!;
  const color = colors[i % colors.length]!;
  const round = i % 3 !== 1;
  return (
    <motion.div
      className="absolute grid place-items-center text-center font-bold uppercase"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: round ? 76 : 96,
        height: round ? 76 : 50,
        borderRadius: round ? "50%" : 6,
        color,
        boxShadow: `inset 0 0 0 2.5px ${color}, inset 0 0 0 5px transparent, inset 0 0 0 6px ${color}88`,
        mixBlendMode: "multiply",
        // Uneven ink.
        WebkitMaskImage:
          "radial-gradient(circle at 30% 40%, #000 55%, rgba(0,0,0,.55) 75%, #000 100%)",
        maskImage: "radial-gradient(circle at 30% 40%, #000 55%, rgba(0,0,0,.55) 75%, #000 100%)",
      }}
      initial={false}
      animate={
        on
          ? { opacity: 0.78, scale: 1, rotate: rot }
          : { opacity: 0, scale: reduced ? 1 : 1.7, rotate: rot - 8 }
      }
      transition={on ? { type: "spring", stiffness: 700, damping: 18, mass: 0.8 } : { duration: 0 }}
    >
      <span className="block px-2 text-[8px] leading-tight tracking-[0.12em]">
        Arrived
        <span
          className="my-0.5 block truncate text-[11px] tracking-normal"
          style={{ fontFamily: "var(--jb-display)" }}
        >
          {name}
        </span>
        With love
      </span>
    </motion.div>
  );
}

function Barcode({ ink, seed }: { ink: string; seed: string }) {
  const bars = useMemo(() => {
    let s = 7;
    for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 9973;
    return Array.from({ length: 46 }, () => {
      s = (s * 9301 + 49297) % 233280;
      return 1 + Math.floor((s / 233280) * 3);
    });
  }, [seed]);
  return (
    <div className="mt-3 flex h-10 items-stretch gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span key={i} style={{ width: w, background: i % 2 ? "transparent" : ink }} />
      ))}
    </div>
  );
}

function Plane({ color, small = false }: { color: string; small?: boolean }) {
  const s = small ? 14 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill={color}
        d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0v5l-8 5v2l8-2.5v5.5l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5V13z"
        transform="rotate(90 12 12)"
      />
    </svg>
  );
}

function Suitcase({ color, band }: { color: string; band: string }) {
  return (
    <svg width="34" height="38" viewBox="0 0 34 38" className="-mr-3 mb-1" aria-hidden="true">
      <path
        d="M12 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"
        fill="none"
        stroke="#3A2A22"
        strokeWidth="2.4"
      />
      <rect x="2" y="8" width="30" height="26" rx="5" fill={color} />
      <rect x="2" y="17" width="30" height="5" fill={band} />
      <circle cx="9" cy="36" r="2" fill="#3A2A22" />
      <circle cx="25" cy="36" r="2" fill="#3A2A22" />
    </svg>
  );
}

export const voyageBackground = (c: ThemePalette): React.CSSProperties => ({
  backgroundColor: c.sky,
  backgroundImage: [
    // Soft clouds drifting past, a little warm light from the horizon.
    "radial-gradient(28% 8% at 18% 22%, rgba(255,255,255,.75), transparent 70%)",
    "radial-gradient(22% 6% at 80% 14%, rgba(255,255,255,.6), transparent 70%)",
    "radial-gradient(30% 7% at 74% 78%, rgba(255,255,255,.55), transparent 70%)",
    `radial-gradient(90% 40% at 50% 110%, ${c.orange}44, transparent 70%)`,
    `linear-gradient(180deg, #6FAEDF, ${c.sky} 55%, #CFE3F1)`,
  ].join(","),
});
