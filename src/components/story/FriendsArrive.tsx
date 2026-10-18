/**
 * "Friends arrive" (flag friendsIntro): a short story the recipient plays before their gift opens.
 *
 * 1. A gift box on the floor wiggles. Something inside is giggling. Knock on it.
 * 2. Someone inside says "Shh" and two eyes peek out under the lid. Knock again.
 * 3. The lid pops off and the friends tumble out, one little character per friend who wrote a
 *    note, each with their name. The last one is late, trips in, and everyone turns to look.
 * 4. They whisper to each other, then notice you.
 * 5. Press and hold: they crouch and wind up while you hold. Let them burst: "Surprise!"
 * Then the gift's own opening plays (the cake, the letter...).
 *
 * Every gesture has a plain button, sound is off unless turned on, and reduced motion gets the
 * same story without the flying. The characters follow your finger the whole time.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { Character } from "@/themes/_shared/cast/Character";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { ThemeKind } from "@/lib/themeKind";
import type { Palette } from "@/lib/themes";
import { burst, buzz, reducedMotion, useSound } from "@/lib/play";
import { storyAccessory, storyCast, storySeats } from "@/lib/story/cast";
import { holdHum, storySound } from "@/lib/story/sound";
import { t } from "@/i18n";

type Phase = "box" | "peek" | "pop" | "late" | "whisper" | "ready" | "shout" | "leaving";

/** Mix a color toward white: 0 keeps it, 1 is white. Keeps the box and bunting soft on any palette. */
function soft(hex: string, amount: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#F4EEE3";
  const n = parseInt(m[1]!, 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * amount));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const WHISPERS = ["story.whisper.1", "story.whisper.2", "story.whisper.3", "story.whisper.4", "story.whisper.5", "story.whisper.6"] as const;

export function FriendsArrive({
  names,
  recipient,
  palette,
  kind,
  birthday = false,
  contained = false,
  autoplay = false,
  onDone,
}: {
  /** Friends who wrote notes, in the order they wrote them. */
  names: string[];
  recipient?: string | undefined;
  palette: Palette;
  kind: ThemeKind;
  /** Birthday gifts get "Happy birthday" under the shout. */
  birthday?: boolean;
  /** Inside a frame (editor preview) instead of full screen. */
  contained?: boolean;
  /** Plays itself (previews). */
  autoplay?: boolean;
  onDone: () => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("box");
  const [knocks, setKnocks] = useState(0);
  const [out, setOut] = useState(0);
  const [landed, setLanded] = useState<boolean[]>([]);
  const [bubble, setBubble] = useState<{ who: number | "box"; text: string } | null>(null);
  const [tapHint, setTapHint] = useState(false);
  const [sound, setSound] = useSound();
  const reduced = useRef(false);
  const timers = useRef<number[]>([]);
  const refs = useRef<(CharacterHandle | null)[]>([]);
  const spots = useRef<(HTMLDivElement | null)[]>([]);
  const knockAt = useRef(0);
  /** Moves on only from the phase a timer was set in, so a late timer can never send the story back. */
  const go = (from: Phase, to: Phase) => setPhase((p) => (p === from ? to : p));

  const { friends, total } = useMemo(() => storyCast(names), [names]);
  const lateIndex = friends.length >= 3 ? friends.length - 1 : -1;
  const main = lateIndex >= 0 ? friends.length - 1 : friends.length;
  const accessory = storyAccessory(kind);
  const name = recipient?.trim() || "";

  /** Runs `fn` after `ms`. Reduced motion shortens the story beats, but never `keep` ones (time to read). */
  const later = (ms: number, fn: () => void, keep = false) => {
    timers.current.push(window.setTimeout(fn, reduced.current && !keep ? Math.min(ms, 500) : ms));
  };
  useEffect(() => {
    reduced.current = reducedMotion();
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- the story ---------- */

  function knock() {
    if (phase !== "box" && phase !== "peek") return;
    const now = Date.now();
    if (now - knockAt.current < 350) return;
    knockAt.current = now;
    storySound.knock();
    buzz([8, 60, 8]);
    const n = knocks + 1;
    setKnocks(n);
    if (n === 1) {
      setPhase("peek");
      later(380, () => {
        storySound.babble(2, 1100);
        setBubble({ who: "box", text: t("story.inside.bubble") });
      });
      return;
    }
    setBubble(null);
    setPhase("pop");
    later(120, () => storySound.lid());
    friends.forEach((_, i) => {
      if (i === lateIndex) return;
      later(520 + i * 300, () => setOut((o) => Math.max(o, i + 1)));
    });
  }

  function landedOne(i: number) {
    setLanded((prev) => {
      if (prev[i]) return prev;
      const next = [...prev];
      next[i] = true;
      return next;
    });
    refs.current[i]?.tap();
    storySound.land(i);
    buzz(6);
  }

  const mainLanded = friends.every((_, i) => i === lateIndex || landed[i]);
  // Everyone but the late one is out: wait a beat, then the box wiggles again.
  useEffect(() => {
    if (phase !== "pop" || !mainLanded) return;
    if (lateIndex < 0) {
      later(500, () => go("pop", "whisper"));
      return;
    }
    later(700, () => go("pop", "late"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mainLanded]);

  useEffect(() => {
    if (phase !== "late") return;
    later(650, () => {
      setOut(friends.length);
      storySound.late();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // The late one is down: everyone looks at them, they say sorry.
  useEffect(() => {
    if (phase !== "late" || lateIndex < 0 || !landed[lateIndex]) return;
    setBubble({ who: lateIndex, text: t("story.late.bubble") });
    storySound.babble(3, 700);
    refs.current.forEach((r, i) => i !== lateIndex && r?.look(i < lateIndex ? 1 : -1, 0.2));
    later(1400, () => go("late", "whisper"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, landed[lateIndex]]);

  // Whispers: three friends say something, turning to their neighbour.
  useEffect(() => {
    if (phase !== "whisper") return;
    setBubble(null);
    const speakers = friends.map((_, i) => i).filter((i) => i !== lateIndex);
    const order = [...speakers].sort(() => Math.random() - 0.5).slice(0, Math.min(3, speakers.length));
    const lines = [...WHISPERS].sort(() => Math.random() - 0.5);
    order.forEach((who, k) => {
      later(250 + k * 1050, () => {
        setBubble({ who, text: t(lines[k]!) });
        storySound.babble(3 + (k % 2), 760 + who * 60);
        refs.current[who]?.look(who < friends.length / 2 ? 1 : -1, 0);
      });
    });
    later(250 + order.length * 1050, () => {
      setBubble(null);
      // They notice you.
      refs.current.forEach((r) => {
        r?.look(0, 0.35);
        r?.tap();
      });
      storySound.babble(2, 1300);
      go("whisper", "ready");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------- press and hold ---------- */

  const hold = useMotionValue(0);
  const holding = useRef(false);
  const pressedAt = useRef(0);
  const hum = useRef<ReturnType<typeof holdHum> | null>(null);
  const shortTaps = useRef(0);
  const squashY = useTransform(hold, (p) => 1 - p * 0.13);
  const squashX = useTransform(hold, (p) => 1 + p * 0.05);
  const shiver = useTransform(hold, (p) => (p > 0.55 ? (Math.random() - 0.5) * 4 * p : 0));
  const dash = useTransform(hold, (p) => (1 - p) * 226);
  const shouted = useRef(false);

  function shout() {
    if (phase !== "ready" || shouted.current) return;
    shouted.current = true;
    holding.current = false;
    hum.current?.stop();
    hum.current = null;
    hold.set(0);
    setPhase("shout");
    setTapHint(false);
    storySound.shout();
    buzz([10, 40, 16, 40, 24]);
    refs.current.forEach((r, i) => later(i * 60, () => r?.celebrate()));
    const colors = [soft(palette.primary, 0.2), soft(palette.accent, 0.2), "#F4C26B", "#E9C9B6", "#9FC6B0"];
    spots.current.forEach((el, i) => {
      const r = el?.getBoundingClientRect();
      if (r) later(i * 50, () => burst(hostRef.current, r.left + r.width / 2, r.top + r.height * 0.3, { colors, count: 14, spread: 1.3, up: true }));
    });
    later(2600, () => go("shout", "leaving"), true);
  }

  function press() {
    if (phase !== "ready" || holding.current) return;
    if (reduced.current) return shout();
    holding.current = true;
    pressedAt.current = Date.now();
    hum.current = holdHum();
    refs.current.forEach((r) => r?.anticipate());
  }
  function release() {
    if (!holding.current) return;
    holding.current = false;
    hum.current?.stop();
    hum.current = null;
    if (phase !== "ready") return;
    refs.current.forEach((r) => r?.idle());
    if (Date.now() - pressedAt.current < 260) {
      shortTaps.current += 1;
      setTapHint(true);
      // A plain tap works too, the second time (not everyone can press and hold).
      if (shortTaps.current >= 2) shout();
    }
  }

  useEffect(() => {
    if (phase !== "ready") return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Time-based, so a slow phone fills it just as fast (capped, so coming back to the tab is no jump).
      const dt = Math.min(0.2, (now - last) / 1000);
      last = now;
      const p = Math.max(0, Math.min(1, hold.get() + (holding.current ? dt / 1.15 : -dt / 0.45)));
      hold.set(p);
      hum.current?.set(p);
      if (p >= 1) return shout();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => () => hum.current?.stop(), []);

  /* ---------- previews play themselves ---------- */

  useEffect(() => {
    if (!autoplay || !dims) return;
    if (phase === "box" && knocks === 0) later(900, knock);
    if (phase === "peek") later(1200, knock);
    if (phase === "ready") {
      later(600, press);
      later(2200, release);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, dims, phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "ready" || e.repeat || (e.key !== " " && e.key !== "Enter")) return;
      e.preventDefault();
      if (e.type === "keydown") press();
      else release();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  /* ---------- layout ---------- */

  const w = dims?.w ?? 390;
  const h = dims?.h ?? 844;
  const span = Math.min(w, 720);
  const floor = Math.round(Math.min(h * 0.6, h - 220));
  const seats = storySeats(friends.length, span, floor);
  const bw = Math.round(Math.max(170, Math.min(w * 0.58, 300)));
  const bh = Math.round(bw * 0.75);
  const opened = phase !== "box" && phase !== "peek";
  // Once the friends are out, the box steps back so they stand in front of it.
  const boxBottom = opened ? floor - seats[0]!.size * (friends.length > 4 ? 0.85 : 0.5) : floor;
  const boxTop = floor - bh;

  const boxColor = soft(palette.primary, 0.7);
  const boxSide = soft(palette.primary, 0.58);
  const ribbon = soft(palette.accent, 0.45);
  const flags = [soft(palette.primary, 0.55), "#F3DFA6", soft(palette.accent, 0.5), "#E9C9B6", "#BFD9C6"];

  const title =
    phase === "box"
      ? t("story.box.title")
      : phase === "peek"
        ? t("story.box.again")
        : phase === "pop" || phase === "late" || phase === "whisper"
          ? t("story.out.title")
          : phase === "ready"
            ? t("story.ready.title")
            : t("story.shout");
  const sub =
    phase === "shout" || phase === "leaving"
      ? birthday && name
        ? t("story.shout.birthday", { name })
        : total > 1
          ? t("story.shout.friends", { n: total })
          : t("story.shout.some")
      : "";
  const label = total > 0 ? (name ? t("story.label", { n: total, name }) : t("story.labelNoName", { n: total })) : name ? t("story.labelFor", { name }) : "";

  return (
    <motion.div
      ref={hostRef}
      role="region"
      aria-label={t("story.aria")}
      data-phase={phase}
      className={`${contained ? "absolute" : "fixed"} inset-0 z-[58] overflow-hidden select-none`}
      style={{
        background: `radial-gradient(120% 75% at 50% 78%, #FFF9F1 0%, ${soft(palette.primary, 0.9)} 55%, ${soft(palette.primary, 0.82)} 100%)`,
        color: "#2B2522",
        touchAction: "manipulation",
      }}
      animate={phase === "leaving" ? { opacity: 0, scale: 1.04 } : { opacity: 1, scale: 1 }}
      transition={{ duration: phase === "leaving" ? 0.55 : 0.3 }}
      onAnimationComplete={() => phase === "leaving" && onDone()}
    >
      <style>{`@keyframes jb-flag{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}@keyframes jb-glow{0%,100%{opacity:.55}50%{opacity:.9}}`}</style>

      {/* Bunting */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0" width={w} height={90} viewBox={`0 0 ${w} 90`}>
        <path d={`M -10 14 Q ${w / 2} 64 ${w + 10} 14`} fill="none" stroke="#C9B8A6" strokeWidth="1.5" />
        {Array.from({ length: Math.ceil(w / 46) }, (_, i) => {
          const x = 14 + i * 46;
          const tt = x / w;
          const y = 14 + 4 * 50 * tt * (1 - tt) - 2;
          return (
            <path
              key={i}
              d={`M ${x - 13} ${y} L ${x + 13} ${y} L ${x} ${y + 26} Z`}
              fill={flags[i % flags.length]}
              style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box", animation: `jb-flag ${2.6 + (i % 3) * 0.4}s ease-in-out ${i * 0.15}s infinite` }}
            />
          );
        })}
      </svg>

      {/* Words */}
      <div className="pointer-events-none absolute inset-x-0 top-[72px] z-20 px-6 text-center sm:top-[84px]">
        {label ? <p className="font-mono text-[11px] tracking-[0.14em] text-[#2B2522]/60 uppercase">{label}</p> : null}
        <AnimatePresence mode="wait">
          <motion.h2
            key={title}
            aria-live="polite"
            initial={{ opacity: 0, y: 10, scale: phase === "shout" ? 0.6 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={phase === "shout" ? { type: "spring", stiffness: 380, damping: 12 } : { duration: 0.35 }}
            className={`mx-auto mt-2 max-w-[18ch] font-display leading-[1.05] font-medium tracking-tight ${phase === "shout" || phase === "leaving" ? "text-[clamp(3rem,13vw,5.5rem)]" : "text-[clamp(1.7rem,6.4vw,2.6rem)]"}`}
          >
            {title}
          </motion.h2>
        </AnimatePresence>
        {sub ? (
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-2 text-[15px] text-[#2B2522]/70">
            {sub}
          </motion.p>
        ) : null}
      </div>

      {/* Floor light and shadow */}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]" style={{ top: floor - 40, width: Math.min(w * 0.95, 680), height: 120, background: "radial-gradient(closest-side, rgba(255,255,255,.75), rgba(255,255,255,0))", animation: "jb-glow 4s ease-in-out infinite" }} />
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%]" style={{ top: floor - 10, width: Math.min(w * 0.8, 560), height: 34, background: "radial-gradient(closest-side, rgba(70,48,36,.16), rgba(70,48,36,0))" }} />

      {/* The box */}
      <motion.button
        type="button"
        aria-label={t("story.box.button")}
        disabled={opened}
        onClick={knock}
        className="absolute left-1/2 z-[5] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#2B2522]/40 disabled:cursor-default"
        style={{ width: bw, height: bh + 60, marginLeft: -bw / 2, top: boxTop - 60, transformOrigin: "50% 100%" }}
        animate={
          opened
            ? { y: boxBottom - floor, scale: 0.84 }
            : knocks > 0
              ? { rotate: [0, -2, 2, 0], scaleY: [1, 0.94, 1] }
              : reduced.current
                ? {}
                : { rotate: [0, -3.5, 3.5, -2.5, 2.5, 0] }
        }
        transition={
          opened
            ? { type: "spring", stiffness: 160, damping: 18 }
            : knocks > 0
              ? { duration: 0.35 }
              : { duration: 0.7, repeat: Infinity, repeatDelay: 1.4 }
        }
        key={`box-${knocks}`}
      >
        <svg viewBox="0 -60 200 210" width={bw} height={bh + 60} overflow="visible" aria-hidden="true">
          {/* inside, seen when the lid lifts */}
          <rect x="6" y="38" width="188" height="14" rx="4" fill="#5A4436" opacity=".75" />
          {phase === "peek" ? (
            <g>
              {[84, 116].map((cx) => (
                <motion.g key={cx} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1, 1, 0.1, 1] }} transition={{ duration: 1.6, times: [0, 0.15, 0.7, 0.75, 0.8], repeat: Infinity, repeatDelay: 0.6 }} style={{ transformOrigin: `${cx}px 44px`, transformBox: "view-box" }}>
                  <circle cx={cx} cy="44" r="5" fill="#fff" />
                  <circle cx={cx + 1} cy="45" r="2.6" fill="#2B2522" />
                </motion.g>
              ))}
            </g>
          ) : null}
          {/* body */}
          <rect x="8" y="44" width="184" height="106" rx="10" fill={boxColor} />
          <rect x="150" y="44" width="42" height="106" rx="10" fill={boxSide} opacity=".55" />
          <rect x="88" y="44" width="24" height="106" fill={ribbon} />
          <rect x="8" y="44" width="184" height="10" fill="#000" opacity=".06" />
          {/* lid */}
          <motion.g
            style={{ transformOrigin: "100px 34px", transformBox: "view-box" }}
            animate={
              opened
                ? reduced.current
                  ? { opacity: 0 }
                  : { y: [0, -150, -420], x: [0, 30, 90], rotate: [0, 25, 70], opacity: [1, 1, 0] }
                : phase === "peek"
                  ? { y: [-20, -9], rotate: [-4, -2] }
                  : { y: 0 }
            }
            transition={opened ? { duration: 0.9, times: [0, 0.4, 1], ease: "easeOut" } : { type: "spring", stiffness: 300, damping: 12 }}
          >
            <rect x="0" y="22" width="200" height="28" rx="8" fill={boxColor} />
            <rect x="0" y="40" width="200" height="10" rx="4" fill="#000" opacity=".06" />
            <rect x="88" y="22" width="24" height="28" fill={ribbon} />
            <ellipse cx="80" cy="12" rx="22" ry="13" fill={ribbon} transform="rotate(-18 80 12)" />
            <ellipse cx="120" cy="12" rx="22" ry="13" fill={ribbon} transform="rotate(18 120 12)" />
            <ellipse cx="80" cy="12" rx="10" ry="5" fill="#000" opacity=".08" transform="rotate(-18 80 12)" />
            <ellipse cx="120" cy="12" rx="10" ry="5" fill="#000" opacity=".08" transform="rotate(18 120 12)" />
            <circle cx="100" cy="20" r="9" fill={soft(palette.accent, 0.25)} />
          </motion.g>
        </svg>
      </motion.button>

      {/* The friends (the whole group squashes while you hold) */}
      <motion.div className="pointer-events-none absolute inset-0 z-10" style={{ scaleY: squashY, scaleX: squashX, x: shiver, transformOrigin: `50% ${floor}px` }}>
        {friends.map((f, i) => {
          const seat = seats[i]!;
          const launched = i < out;
          const left = w / 2 + seat.x - seat.size / 2;
          const top = seat.y - seat.size;
          const fromX = -seat.x;
          const fromY = boxTop + 30 - seat.y + seat.size * 0.6;
          const peak = Math.min(fromY, 0) - (i === lateIndex ? 220 : 110 + (i % 3) * 30);
          const dir = seat.x >= 0 ? 1 : -1;
          return (
            <motion.div
              key={f.key}
              ref={(el) => {
                spots.current[i] = el;
              }}
              className={`absolute ${launched ? "pointer-events-auto" : "pointer-events-none"}`}
              style={{ left, top, width: seat.size, zIndex: seat.z * 10 + i }}
              initial={{ opacity: 0, x: fromX, y: fromY, scale: 0.3, rotate: 0 }}
              animate={
                !launched
                  ? { opacity: 0, x: fromX, y: fromY, scale: 0.3 }
                  : reduced.current
                    ? { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }
                    : i === lateIndex
                      ? { opacity: [0, 1, 1, 1], x: [fromX, fromX * 0.5, 0, 0], y: [fromY, peak, 0, 0], scale: [0.3, 1, 1, 1], rotate: [0, dir * 300, dir * 380, 0] }
                      : { opacity: [0, 1, 1], x: [fromX, fromX * 0.45, 0], y: [fromY, peak, 0], scale: [0.3, 1, 1], rotate: [0, dir * 180, dir * 360] }
              }
              transition={
                !launched
                  ? { duration: 0 }
                  : reduced.current
                    ? { duration: 0.3 }
                    : i === lateIndex
                      ? { duration: 1.25, times: [0, 0.45, 0.8, 1], ease: ["easeOut", "easeIn", "easeOut"] }
                      : { duration: 0.78, times: [0, 0.45, 1], ease: ["easeOut", "easeIn"] }
              }
              onAnimationComplete={() => launched && landedOne(i)}
            >
              <Character
                ref={(r) => {
                  refs.current[i] = r;
                }}
                setting={{ type: "library", id: f.animal, ...(f.name ? { name_tag: f.name } : {}) }}
                accessory={accessory}
                size={seat.size}
                showName={!!f.name}
                blush
                onTap={() => {
                  storySound.babble(2, 900 + i * 50);
                  buzz(6);
                }}
                label={f.name ? t("story.friendAria", { name: f.name }) : t("story.friendAriaNoName")}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Balloons float up out of the box when they shout */}
      {phase === "shout" || phase === "leaving"
        ? flags.map((fill, i) => {
            const dx = (i - (flags.length - 1) / 2) * Math.min(70, w / 7) + (i % 2 ? 12 : -12);
            return (
              <motion.svg
                key={`balloon-${i}`}
                aria-hidden="true"
                viewBox="0 0 40 90"
                width={Math.min(64, w * 0.13)}
                className="pointer-events-none absolute z-[6]"
                style={{ left: w / 2 + dx - 20, top: boxBottom - bh * 0.84 }}
                initial={{ y: 40, opacity: 0, rotate: 0 }}
                animate={{ y: -h, opacity: [0, 1, 1, 1], rotate: [0, i % 2 ? 6 : -6, i % 2 ? -4 : 4, 0] }}
                transition={{ duration: 3.4 + (i % 3) * 0.5, delay: 0.15 + i * 0.12, ease: [0.3, 0, 0.6, 1] }}
              >
                <path d="M20 46 C 18 60, 24 70, 19 90" fill="none" stroke="#B9A796" strokeWidth="1" />
                <ellipse cx="20" cy="22" rx="17" ry="21" fill={fill} />
                <ellipse cx="14" cy="14" rx="4" ry="6" fill="#fff" opacity=".45" />
                <path d="M17 43 L23 43 L20 47 Z" fill={fill} />
              </motion.svg>
            );
          })
        : null}

      {/* Speech bubbles */}
      <AnimatePresence>
        {bubble ? (
          <motion.div
            key={`${bubble.who}-${bubble.text}`}
            initial={{ opacity: 0, scale: 0.5, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
            className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-2xl bg-white px-3 py-1.5 text-[14px] font-medium whitespace-nowrap shadow-[0_8px_20px_-10px_rgba(60,40,30,.45)]"
            style={
              bubble.who === "box"
                ? { left: w / 2, top: boxTop - 110 }
                : {
                    left: Math.max(70, Math.min(w - 70, w / 2 + seats[bubble.who]!.x)),
                    top: seats[bubble.who]!.y - seats[bubble.who]!.size - 44,
                  }
            }
          >
            {bubble.text}
            <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 bg-white" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Hint and buttons */}
      <div className="absolute inset-x-0 z-40 flex flex-col items-center gap-3 px-6" style={{ top: floor + 44 }}>
        {phase === "box" || phase === "peek" ? (
          <>
            <p className="text-[15px] text-[#2B2522]/70">{t("story.box.hint")}</p>
            <button type="button" onClick={knock} className="squish min-h-11 rounded-full bg-[#2B2522] px-6 text-sm font-medium text-[#FBF8F2]">
              {t("story.box.button")}
            </button>
          </>
        ) : phase === "ready" ? (
          <>
            <p className="text-[15px] text-[#2B2522]/70">{tapHint ? t("story.ready.keep") : t("story.ready.hint")}</p>
            <button
              type="button"
              aria-label={t("story.ready.aria")}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                press();
              }}
              onPointerUp={release}
              onPointerCancel={release}
              onContextMenu={(e) => e.preventDefault()}
              className="relative grid size-20 place-items-center rounded-full bg-[#2B2522] text-sm font-medium text-[#FBF8F2] shadow-[0_14px_30px_-14px_rgba(43,37,34,.7)]"
              style={{ touchAction: "none", WebkitTouchCallout: "none" }}
            >
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
                <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(251,248,242,.18)" strokeWidth="4" />
                <motion.circle cx="40" cy="40" r="36" fill="none" stroke={soft(palette.accent, 0.3)} strokeWidth="4" strokeLinecap="round" strokeDasharray={226} style={{ strokeDashoffset: dash }} />
              </svg>
              <span className="relative">{t("story.ready.button")}</span>
            </button>
          </>
        ) : null}
      </div>

      {/* Sound and skip */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSound(!sound)}
          aria-label={sound ? t("story.soundOff") : t("story.soundOn")}
          className="grid size-10 place-items-center rounded-full bg-white/70 text-[#2B2522] backdrop-blur"
        >
          {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
        <button type="button" onClick={onDone} className="min-h-10 rounded-full bg-white/70 px-4 text-sm font-medium text-[#2B2522] backdrop-blur">
          {t("story.skip")}
        </button>
      </div>
    </motion.div>
  );
}
