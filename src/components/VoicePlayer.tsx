import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { readableInk } from "@/lib/palettes";

/**
 * A voice note player that matches the gift: a round play button, a waveform you can
 * tap or drag to seek, and the time. Replaces the browser's grey audio controls.
 *
 * The bars are a pattern seeded from the note's id (not a real waveform), so each note
 * looks a little different without decoding any audio. The file isn't fetched until the
 * player is near the screen, and starting one player pauses any other audio on the page.
 */
export function VoicePlayer({
  src,
  seed,
  accent,
  label,
}: {
  src: string;
  /** Anything stable per note (its id), for the bar pattern. */
  seed: string;
  accent: string;
  /** Who it's from, for screen readers: "the voice note from Mom". */
  label: string;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const [near, setNear] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const wave = useRef<HTMLDivElement | null>(null);
  // One thin bar every 6px, however wide the card is.
  const [bars, setBars] = useState(28);
  const heights = useMemo(() => barHeights(seed, bars), [seed, bars]);

  useEffect(() => {
    const el = wave.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = e?.contentRect.width ?? 0;
      if (w > 0) setBars(Math.max(12, Math.min(90, Math.floor((w + 3) / 6))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Only ask for the file's length once the player is close to the screen.
  useEffect(() => {
    const el = root.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: "400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      document.querySelectorAll("audio").forEach((other) => {
        if (other !== a && !other.paused) other.pause();
      });
      void a.play().catch(() => {});
    } else a.pause();
  };

  const seekTo = (fraction: number) => {
    const a = audio.current;
    if (!a || !dur) return;
    a.currentTime = Math.min(dur, Math.max(0, fraction * dur));
    setT(a.currentTime);
  };

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - r.left) / r.width);
  };

  const progress = dur ? t / dur : 0;
  const ink = readableInk(accent);

  return (
    <div ref={root} className="mt-3 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className="relative grid size-11 shrink-0 place-items-center rounded-full shadow-[0_6px_14px_-8px_rgba(0,0,0,.5)] outline-none transition-transform active:scale-95 focus-visible:ring-4"
        style={{ background: accent, color: ink, ["--tw-ring-color" as string]: `${accent}55` }}
      >
        {playing ? (
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <rect x="3.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
            <rect x="9.5" y="3" width="3" height="10" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="ml-0.5 size-4" aria-hidden="true">
            <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L5.7 2.1a.8.8 0 0 0-1.2.7z" fill="currentColor" />
          </svg>
        )}
        {playing && !reduce ? (
          <span className="pointer-events-none absolute inset-0 animate-ping rounded-full opacity-25" style={{ background: accent }} aria-hidden="true" />
        ) : null}
      </button>

      <div
        ref={wave}
        role="slider"
        tabIndex={0}
        aria-label={`Position in ${label}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={Math.round(t)}
        aria-valuetext={`${clock(t)} of ${clock(dur)}`}
        className="flex h-9 min-w-0 flex-1 cursor-pointer touch-none items-center justify-between rounded-md outline-none focus-visible:ring-2"
        style={{ ["--tw-ring-color" as string]: `${accent}55` }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seekFromPointer(e);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const a = audio.current;
            if (a && dur) seekTo((a.currentTime + (e.key === "ArrowRight" ? 5 : -5)) / dur);
          } else if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {heights.map((h, i) => {
          const done = (i + 0.5) / heights.length <= progress;
          const live = playing && !reduce && Math.abs((i + 0.5) / heights.length - progress) < 1.5 / heights.length;
          return (
            <span
              key={i}
              className="w-[3px] shrink-0 rounded-full transition-[background-color,transform] duration-150"
              style={{
                height: `${h}%`,
                background: done ? accent : `${accent}38`,
                transform: live ? "scaleY(1.25)" : undefined,
              }}
            />
          );
        })}
      </div>

      <span className="w-[4.2ch] shrink-0 text-right text-xs tabular-nums opacity-70" aria-hidden="true">
        {dur ? clock(playing || t > 0 ? t : dur) : "0:00"}
      </span>

      <audio
        ref={audio}
        src={near ? src : undefined}
        preload={near ? "metadata" : "none"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setT(0);
        }}
        onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onDurationChange={(e) => setDur(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      />
    </div>
  );
}

/** "0:04", "1:12". */
function clock(s: number): string {
  const n = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}

/** A speech-like bar pattern from a seed: soft at the ends, busier in the middle. */
export function barHeights(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1000) / 1000;
  };
  return Array.from({ length: count }, (_, i) => {
    const edge = Math.sin(((i + 0.5) / count) * Math.PI);
    return Math.round(22 + (0.35 + 0.65 * edge) * rand() * 78);
  });
}
