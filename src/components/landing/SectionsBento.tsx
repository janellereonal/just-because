/**
 * "What goes inside": neutral cream cards, each with a small live demo of the
 * section: letters fanning out, polaroids shuffling, a little music player,
 * a voice clip you can play, a word cloud putting itself together and a
 * countdown that's actually counting (in your own time zone).
 */
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { LANDING } from "@/copy/strings";
import { SPRING } from "@/themes/_shared/stage";
import { formatMoment } from "@/lib/time";

const T = LANDING.inside.tiles;

function Tile({
  title,
  body,
  className = "",
  children,
}: {
  title: string;
  body: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={SPRING.soft}
      className={`group relative flex flex-col overflow-hidden rounded-[28px] bg-cream p-5 ring-1 ring-ink/6 sm:p-6 ${className}`}
    >
      <div className="relative grid min-h-[150px] flex-1 place-items-center">{children}</div>
      <h3 className="mt-4 font-display text-lg font-semibold sm:text-xl">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/70 sm:text-[15px]">{body}</p>
    </motion.article>
  );
}

/* Letters fan out when you look at them, and fan wider on hover. */
function FanningLetters() {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const [hover, setHover] = useState(false);
  const letters = [
    { who: "Sofia", text: "Thirty looks good on you." },
    { who: "Mateo", text: "Thank you for every late-night call." },
    { who: "Aisha", text: "Never change." },
  ];
  return (
    <div
      ref={ref}
      className="relative h-[150px] w-full max-w-[300px]"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {letters.map((l, i) => {
        const spread = hover ? 1.5 : 1;
        const rot = seen ? (i - 1) * 9 * spread : 0;
        const x = seen ? (i - 1) * 46 * spread : 0;
        return (
          <motion.div
            key={l.who}
            className="absolute top-3 left-1/2 w-[150px] -ml-[75px] origin-bottom rounded-md bg-white p-3 text-left text-[12px] leading-snug shadow-[0_12px_24px_-16px_rgba(43,37,34,.5)] ring-1 ring-ink/5"
            animate={{ rotate: rot, x, y: seen ? Math.abs(i - 1) * 8 : 0 }}
            transition={{ ...SPRING.wobbly, delay: seen && !hover ? i * 0.08 : 0 }}
            style={{ zIndex: i === 1 ? 2 : 1 }}
          >
            <p>{l.text}</p>
            <p className="mt-2 font-display text-[13px] font-semibold text-accent">{l.who}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* Three polaroids that shuffle every few seconds. */
function ShufflingPolaroids() {
  const reduce = useReducedMotion();
  const [order, setOrder] = useState([0, 1, 2]);
  const photos = [
    { src: "/demo/cake.webp", cap: "The cake" },
    { src: "/demo/city.webp", cap: "Rainy week" },
    { src: "/demo/mountains.webp", cap: "Sunrise hike" },
  ];
  useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setOrder((o) => [o[2]!, o[0]!, o[1]!]), 2600);
    return () => window.clearInterval(t);
  }, [reduce]);
  return (
    <div className="relative h-[160px] w-[200px]">
      {order.map((idx, depth) => {
        const p = photos[idx]!;
        return (
          <motion.figure
            key={p.src}
            layout
            className="absolute top-0 left-1/2 w-[120px] -ml-[60px] bg-white p-2 pb-1 shadow-[0_14px_24px_-16px_rgba(43,37,34,.55)]"
            animate={{
              rotate: [-7, 5, -2][depth] ?? 0,
              x: [-30, 26, 0][depth] ?? 0,
              y: [8, 12, 0][depth] ?? 0,
              scale: depth === 2 ? 1 : 0.94,
            }}
            transition={SPRING.soft}
            style={{ zIndex: depth }}
          >
            <img
              src={p.src}
              alt=""
              className="aspect-square w-full object-cover"
              draggable={false}
            />
            <figcaption className="py-1 text-center text-[10px] text-ink/70">{p.cap}</figcaption>
          </motion.figure>
        );
      })}
    </div>
  );
}

/* A tiny player with a moving waveform. Silent: it's a picture of a song. */
function MiniPlayer() {
  const [on, setOn] = useState(false);
  const bars = 28;
  return (
    <div className="w-full max-w-[260px] rounded-2xl bg-white p-3 shadow-[0_12px_24px_-18px_rgba(43,37,34,.5)] ring-1 ring-ink/5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-[conic-gradient(from_200deg,#E8577E,#FFD166,#7A5CFF,#E8577E)] text-white">
          ♪
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">Our road trip song</p>
          <p className="truncate text-[11px] text-ink/60">Added by Chen</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => setOn((v) => !v)}
          aria-label={on ? "Pause" : "Play"}
          className="grid size-9 place-items-center rounded-full bg-ink text-cream"
        >
          {on ? (
            <Pause className="size-4" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-4" aria-hidden="true" />
          )}
        </motion.button>
      </div>
      <div className="mt-3 flex h-8 items-center gap-[3px]" aria-hidden="true">
        {Array.from({ length: bars }, (_, i) => (
          <motion.span
            key={i}
            className="w-full rounded-full bg-accent/70"
            animate={
              on
                ? { height: [6, 8 + ((i * 37) % 22), 5, 10 + ((i * 53) % 18), 6] }
                : { height: 4 + ((i * 29) % 10) }
            }
            transition={
              on
                ? { duration: 1.1, repeat: Infinity, delay: i * 0.03, ease: [0.45, 0, 0.55, 1] }
                : SPRING.soft
            }
          />
        ))}
      </div>
    </div>
  );
}

/* A voice clip you can actually hear: a soft little "happy birthday" hum. */
function VoiceClip() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  function play() {
    if (playing) return;
    // The visitor pressed play, so this one plays even with the site's sound off.
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const dur = 3.2;
    if (Ctor) {
      const ctx = new Ctor();
      const notes = [392, 392, 440, 392, 523, 494, 0, 392, 392, 440, 392, 587, 523];
      notes.forEach((f, i) => {
        if (!f) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        const v = ctx.createOscillator();
        const vg = ctx.createGain();
        v.frequency.value = 5.5;
        vg.gain.value = 4;
        v.connect(vg).connect(o.frequency);
        const t = ctx.currentTime + i * 0.24;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        v.start(t);
        o.stop(t + 0.25);
        v.stop(t + 0.25);
      });
      window.setTimeout(() => void ctx.close(), (dur + 0.5) * 1000);
    }
    setPlaying(true);
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / (dur * 1000));
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else {
        setPlaying(false);
        setProgress(0);
      }
    };
    raf.current = requestAnimationFrame(step);
  }
  const bars = [4, 9, 14, 7, 18, 11, 6, 15, 20, 9, 5, 12, 17, 8, 13, 6, 10, 16, 7, 4];
  return (
    <div className="flex w-full max-w-[260px] items-center gap-3 rounded-full bg-white py-2 pr-4 pl-2 shadow-[0_12px_24px_-18px_rgba(43,37,34,.5)] ring-1 ring-ink/5">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={play}
        aria-label="Play Grandma's voice note"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-cream"
      >
        {playing ? (
          <Pause className="size-4" aria-hidden="true" />
        ) : (
          <Play className="ml-0.5 size-4" aria-hidden="true" />
        )}
      </motion.button>
      <div className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden="true">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-full rounded-full transition-colors"
            style={{
              height: h + 6,
              background:
                i / bars.length < progress ? "var(--color-accent, #B5623E)" : "rgba(43,37,34,.18)",
            }}
          />
        ))}
      </div>
      <span className="text-[11px] text-ink/60 tabular-nums">
        0:0{Math.ceil(3.2 - progress * 3.2)}
      </span>
    </div>
  );
}

/* Words drift in from everywhere and settle into a cloud. */
function WordCloud() {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useInView(ref, { once: true, amount: 0.6 });
  const words = [
    ["kind", 1.6],
    ["funny", 1.15],
    ["brave", 1.35],
    ["home", 0.95],
    ["loyal", 1.05],
    ["generous", 0.9],
    ["golden", 1.25],
    ["calm", 0.85],
  ] as const;
  return (
    <div
      ref={ref}
      className="flex max-w-[260px] flex-wrap items-baseline justify-center gap-x-3 gap-y-1"
    >
      {words.map(([w, s], i) => (
        <motion.span
          key={w}
          className="font-display font-semibold"
          style={{
            fontSize: `${s * 1.15}rem`,
            color: i % 3 === 0 ? "var(--color-accent, #B5623E)" : "#2B2522",
          }}
          initial={{
            opacity: 0,
            x: ((i * 73) % 120) - 60,
            y: ((i * 41) % 90) - 45,
            rotate: ((i * 29) % 40) - 20,
          }}
          animate={seen ? { opacity: 1, x: 0, y: 0, rotate: 0 } : {}}
          transition={{ ...SPRING.wobbly, delay: i * 0.07 }}
        >
          {w}
        </motion.span>
      ))}
    </div>
  );
}

/* A real countdown to four days from now, shown in your own zone. */
function LiveCountdown() {
  const [target] = useState(() => Date.now() + 4 * 86400000 + 3 * 3600000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const parts = [
    [Math.floor(s / 86400), "days"],
    [Math.floor((s % 86400) / 3600), "hrs"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "sec"],
  ] as const;
  return (
    <div className="text-center">
      <div className="flex gap-2" suppressHydrationWarning>
        {parts.map(([v, l]) => (
          <span
            key={l}
            className="flex w-14 flex-col items-center rounded-xl bg-white py-2 ring-1 ring-ink/6"
          >
            <motion.span
              key={v}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={SPRING.snappy}
              className="font-display text-2xl font-semibold tabular-nums"
              suppressHydrationWarning
            >
              {String(v).padStart(2, "0")}
            </motion.span>
            <span className="text-[10px] tracking-[0.14em] text-ink/55 uppercase">{l}</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink/55" suppressHydrationWarning>
        {formatMoment(target)}, your time
      </p>
    </div>
  );
}

export function SectionsBento() {
  return (
    <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <Tile title={T.letters.title} body={T.letters.body}>
        <FanningLetters />
      </Tile>
      <Tile title={T.photos.title} body={T.photos.body}>
        <ShufflingPolaroids />
      </Tile>
      <Tile title={T.songs.title} body={T.songs.body}>
        <MiniPlayer />
      </Tile>
      <Tile title={T.voice.title} body={T.voice.body}>
        <VoiceClip />
      </Tile>
      <Tile title={T.words.title} body={T.words.body}>
        <WordCloud />
      </Tile>
      <Tile title={T.countdown.title} body={T.countdown.body}>
        <LiveCountdown />
      </Tile>
    </div>
  );
}
