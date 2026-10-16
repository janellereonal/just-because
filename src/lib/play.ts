/**
 * Little bits of play shared by the opening, the occasion skins and the formats:
 * particle bursts (Web Animations, transform/opacity only), soft synthesized
 * chimes (off until the viewer turns sound on) and a tiny haptic tap on phones.
 * Everything is a no-op on the server and quiet under prefers-reduced-motion.
 */
import { useEffect, useState } from "react";
import type { ThemeKind } from "@/lib/themeKind";

export type BurstShape =
  "confetti" | "hearts" | "stars" | "bubbles" | "petals" | "snow" | "paws" | "sparkles";

export const KIND_BURST: Record<ThemeKind, BurstShape> = {
  valentine: "hearts",
  birthday: "confetti",
  voyage: "stars",
  christmas: "snow",
  pets: "paws",
  newyear: "sparkles",
  anniversary: "hearts",
  wedding: "petals",
  bridal: "petals",
  baby: "stars",
  handwritten: "hearts",
  game: "confetti",
  pixel: "stars",
  default: "confetti",
};

const GLYPH: Partial<Record<BurstShape, string[]>> = {
  hearts: ["♥", "♥", "❤"],
  stars: ["★", "✦", "✧"],
  snow: ["❄", "❅", "❆"],
  paws: ["🐾", "🦴", "♥"],
  sparkles: ["✦", "✧", "★", "✺"],
  petals: ["❀", "✿", "❁"],
};

export function reducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Spray particles from a point (viewport coords) inside `host`, which must be
 * positioned. Works inside scaled previews: positions are mapped into the
 * host's own coordinate space.
 */
export function burst(
  host: HTMLElement | null,
  clientX: number,
  clientY: number,
  {
    shape = "confetti",
    colors = ["#E8577E", "#FFD166", "#7A5CFF", "#4CC9A0"],
    count = 18,
    spread = 1,
    up = false,
  }: { shape?: BurstShape; colors?: string[]; count?: number; spread?: number; up?: boolean } = {},
) {
  if (!host || typeof window === "undefined") return;
  const rect = host.getBoundingClientRect();
  const scale = host.offsetWidth ? rect.width / host.offsetWidth : 1;
  const x = (clientX - rect.left) / (scale || 1);
  const y = (clientY - rect.top) / (scale || 1);
  const reduce = reducedMotion();
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText =
    "position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:80;contain:layout";
  host.appendChild(layer);
  const n = reduce ? 3 : count;
  let longest = 0;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    const color = colors[i % colors.length]!;
    const glyphs = GLYPH[shape];
    const size = 10 + Math.random() * 12;
    el.style.cssText = `position:absolute;left:${x}px;top:${y}px;will-change:transform,opacity;line-height:1;font-size:${size}px;color:${color};`;
    if (glyphs) {
      el.textContent = glyphs[i % glyphs.length]!;
    } else if (shape === "bubbles") {
      el.style.width = el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.border = `2px solid ${color}`;
      el.style.background = "rgba(255,255,255,.35)";
    } else {
      el.style.width = `${6 + Math.random() * 5}px`;
      el.style.height = `${9 + Math.random() * 7}px`;
      el.style.borderRadius = "2px";
      el.style.background = color;
    }
    layer.appendChild(el);
    const angle = up ? -Math.PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * Math.PI * 2;
    const dist = (50 + Math.random() * 90) * spread;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const fall = shape === "bubbles" || shape === "sparkles" ? -30 : 60 + Math.random() * 60;
    const spin = (Math.random() - 0.5) * 720;
    const dur = reduce ? 600 : 900 + Math.random() * 700;
    longest = Math.max(longest, dur);
    el.animate(
      reduce
        ? [
            { opacity: 0, transform: "translate(-50%,-50%) scale(.6)" },
            { opacity: 1, transform: "translate(-50%,-80%) scale(1)", offset: 0.3 },
            { opacity: 0, transform: "translate(-50%,-120%) scale(1)" },
          ]
        : [
            { opacity: 1, transform: "translate(-50%,-50%) scale(.3) rotate(0deg)" },
            {
              opacity: 1,
              transform: `translate(calc(-50% + ${dx * 0.8}px), calc(-50% + ${dy * 0.8}px)) scale(1) rotate(${spin * 0.6}deg)`,
              offset: 0.45,
            },
            {
              opacity: 0,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + fall}px)) scale(.8) rotate(${spin}deg)`,
            },
          ],
      { duration: dur, easing: "cubic-bezier(.15,.7,.3,1)", fill: "forwards" },
    );
  }
  window.setTimeout(() => layer.remove(), longest + 80);
}

/* ---------- sound ---------- */

const SOUND_KEY = "jb-sound";
const listeners = new Set<(on: boolean) => void>();
let audio: AudioContext | null = null;

export function soundOn() {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* fine for this visit */
  }
  listeners.forEach((l) => l(on));
  if (on) chime("pop");
}

export function useSound() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(soundOn());
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return [on, setSound] as const;
}

type ChimeKind = "pop" | "chime" | "sparkle" | "boop" | "whoosh" | "tada";

/** A tiny synthesized sound. Silent unless the viewer turned sound on. */
export function chime(kind: ChimeKind = "pop") {
  if (typeof window === "undefined" || !soundOn()) return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    const ctx = audio;
    void ctx.resume();
    const now = ctx.currentTime;
    const notes: Record<ChimeKind, [number, number, OscillatorType][]> = {
      pop: [
        [620, 0, "sine"],
        [930, 0.04, "sine"],
      ],
      boop: [
        [330, 0, "triangle"],
        [262, 0.07, "triangle"],
      ],
      chime: [
        [880, 0, "sine"],
        [1320, 0.09, "sine"],
        [1760, 0.18, "sine"],
      ],
      sparkle: [
        [1568, 0, "sine"],
        [2093, 0.06, "sine"],
        [2637, 0.12, "sine"],
        [3136, 0.18, "sine"],
      ],
      whoosh: [[220, 0, "sawtooth"]],
      tada: [
        [523, 0, "triangle"],
        [659, 0.1, "triangle"],
        [784, 0.2, "triangle"],
        [1046, 0.32, "triangle"],
      ],
    };
    for (const [freq, at, type] of notes[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + at);
      if (kind === "whoosh") osc.frequency.exponentialRampToValueAtTime(1200, now + at + 0.35);
      const peak = type === "sawtooth" ? 0.025 : 0.09;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(peak, now + at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + (kind === "tada" ? 0.5 : 0.32));
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.6);
    }
  } catch {
    /* sound is a nicety */
  }
}

type Texture = "crack" | "crunch" | "rip" | "thunk" | "needle" | "fizz" | "purr" | "breath" | "paper";

function ctxNow() {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    const Ctor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio ??= new Ctor();
    void audio.resume();
    return audio;
  } catch {
    return null;
  }
}

/** Filtered noise for physical sounds: a seal cracking, paper tearing, a stamp landing. */
export function foley(kind: Texture) {
  const ctx = ctxNow();
  if (!ctx) return;
  try {
    const spec: Record<Texture, { dur: number; type: BiquadFilterType; freq: number; q: number; gain: number; grains?: number }> = {
      crack: { dur: 0.16, type: "bandpass", freq: 2400, q: 0.9, gain: 0.5, grains: 3 },
      crunch: { dur: 0.32, type: "bandpass", freq: 1500, q: 0.7, gain: 0.35, grains: 6 },
      rip: { dur: 0.55, type: "highpass", freq: 1800, q: 0.6, gain: 0.25, grains: 14 },
      thunk: { dur: 0.12, type: "lowpass", freq: 260, q: 1.4, gain: 0.9 },
      needle: { dur: 0.6, type: "bandpass", freq: 3200, q: 0.4, gain: 0.08, grains: 20 },
      fizz: { dur: 0.9, type: "highpass", freq: 4200, q: 0.5, gain: 0.12 },
      purr: { dur: 0.9, type: "lowpass", freq: 180, q: 3, gain: 0.5, grains: 9 },
      breath: { dur: 0.7, type: "bandpass", freq: 900, q: 0.4, gain: 0.18 },
      paper: { dur: 0.25, type: "bandpass", freq: 3000, q: 0.6, gain: 0.18, grains: 4 },
    };
    const sp = spec[kind];
    const now = ctx.currentTime;
    const len = Math.ceil(ctx.sampleRate * sp.dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    const grains = sp.grains ?? 1;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Grainy envelopes make crackle; a single envelope makes a thump or a hiss.
      const g = grains > 1 ? Math.max(0, Math.sin(t * Math.PI * grains)) ** 6 : 1;
      data[i] = (Math.random() * 2 - 1) * g * (1 - t) ** (kind === "thunk" ? 3 : 1.4);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = sp.type;
    filter.frequency.value = sp.freq;
    filter.Q.value = sp.q;
    const gain = ctx.createGain();
    gain.gain.value = sp.gain;
    src.connect(filter).connect(gain).connect(ctx.destination);
    if (kind === "thunk") {
      // A low body under the thud.
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.frequency.setValueAtTime(120, now);
      o.frequency.exponentialRampToValueAtTime(55, now + 0.12);
      og.gain.setValueAtTime(0.35, now);
      og.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.connect(og).connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.2);
    }
    src.start(now);
  } catch {
    /* sound is a nicety */
  }
}

/** A few notes, like a music box or a toast chime. Frequencies in Hz, spaced `step` seconds. */
export function melody(notes: number[], step = 0.18, type: OscillatorType = "sine", peak = 0.07) {
  const ctx = ctxNow();
  if (!ctx) return;
  const now = ctx.currentTime;
  notes.forEach((f, i) => {
    if (!f) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = f;
    const at = now + i * step;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + step * 2.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + step * 3);
  });
}

/** A tiny tap on phones that support it. */
export function buzz(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

/** Burst + chime + buzz, the usual "you touched something cute" response. */
export function delight(
  host: HTMLElement | null,
  x: number,
  y: number,
  kind: ThemeKind,
  colors: string[],
  opts: { count?: number; sound?: ChimeKind; shape?: BurstShape } = {},
) {
  burst(host, x, y, { shape: opts.shape ?? KIND_BURST[kind], colors, count: opts.count ?? 16 });
  chime(opts.sound ?? "pop");
  buzz(10);
}
