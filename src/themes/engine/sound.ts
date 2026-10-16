/**
 * Sound packs for materials, plus haptics. Every sound is synthesised (no
 * files to download), short, quiet, and silent unless the viewer turned sound
 * on with the opening's toggle. Haptics only run after the first tap and on
 * phones that support them.
 */
import { buzz, chime, foley, melody, soundContext } from "@/lib/play";

export type SoundName =
  | "paper-tear"
  | "paper-rustle"
  | "tape-pull"
  | "wax-crack"
  | "ribbon-pull"
  | "bell"
  | "glass-wipe"
  | "cardboard-thud"
  | "pop"
  | "sparkle"
  | "chime"
  | "whoosh";

/** Which sounds suit which material, so a theme can pick by material. */
export const SOUND_PACKS = {
  paper: { tick: "paper-rustle", done: "paper-tear" },
  cardboard: { tick: "tape-pull", done: "cardboard-thud" },
  wax: { tick: "paper-rustle", done: "wax-crack" },
  fabric: { tick: "ribbon-pull", done: "chime" },
  glass: { tick: "glass-wipe", done: "sparkle" },
  capiz: { tick: "glass-wipe", done: "bell" },
  frost: { tick: "glass-wipe", done: "sparkle" },
  foil: { tick: "paper-rustle", done: "sparkle" },
  wood: { tick: "paper-rustle", done: "cardboard-thud" },
  metal: { tick: "glass-wipe", done: "bell" },
} as const satisfies Record<string, { tick: SoundName; done: SoundName }>;

export type SoundPackName = keyof typeof SOUND_PACKS;

/** Noise through a moving filter: tape squeaks up, ribbon swishes, glass squeaks. */
function sweep(from: number, to: number, dur: number, gain: number, q = 4, type: BiquadFilterType = "bandpass") {
  const ctx = soundContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const tt = i / len;
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * tt) ** 1.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, now);
    f.frequency.exponentialRampToValueAtTime(to, now + dur);
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(now);
  } catch {
    /* sound is a nicety */
  }
}

/** A small hand bell: a few slightly out-of-tune partials with a long tail. */
function bell(base = 880) {
  const ctx = soundContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    for (const [ratio, peak, decay] of [
      [1, 0.07, 1.6],
      [2.01, 0.035, 1.1],
      [2.76, 0.025, 0.8],
      [5.4, 0.012, 0.4],
    ] as const) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = base * ratio;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + decay + 0.05);
    }
  } catch {
    /* sound is a nicety */
  }
}

/** Play one sound by name. Silent unless sound is on. */
export function playSound(name: SoundName) {
  switch (name) {
    case "paper-tear":
      return foley("rip");
    case "paper-rustle":
      return foley("paper");
    case "tape-pull":
      return sweep(900, 2600, 0.28, 0.16, 6);
    case "wax-crack":
      return foley("crack");
    case "ribbon-pull":
      return sweep(500, 1400, 0.32, 0.12, 1.2);
    case "bell":
      return bell(880);
    case "glass-wipe":
      return sweep(2400, 3400, 0.18, 0.05, 9);
    case "cardboard-thud":
      return foley("thunk");
    case "pop":
      return chime("pop");
    case "sparkle":
      return chime("sparkle");
    case "chime":
      return chime("chime");
    case "whoosh":
      return chime("whoosh");
  }
}

/** A short tune at the payoff, for themes that want more than one note. */
export function playTune(notes: number[], step = 0.16) {
  melody(notes, step, "sine", 0.06);
}

/** Phone haptics, matched to the moment. */
export const haptic = {
  tick: () => buzz(5),
  tap: () => buzz(12),
  thud: () => buzz([18, 30, 10]),
  success: () => buzz([10, 40, 16, 40, 24]),
};
