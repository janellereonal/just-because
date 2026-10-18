/**
 * Sounds for "Friends arrive". All tonal (no noise), short and quiet, so it stays cute.
 * Silent unless the viewer turned sound on (soundContext() is null otherwise).
 * Each sound has a `play*` version that takes any audio context, so it can be rendered offline.
 */
import { playCandle, soundContext } from "@/lib/play";

type Ctx = BaseAudioContext;

function tone(ctx: Ctx, at: number, f0: number, f1: number, dur: number, peak: number, type: OscillatorType = "sine") {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur * 0.7);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

/** A knock on a cardboard box: two soft wooden "toc"s. */
export function playKnock(ctx: Ctx, at: number) {
  for (const d of [0, 0.13]) {
    tone(ctx, at + d, 330, 150, 0.09, 0.16, "triangle");
    tone(ctx, at + d, 900, 500, 0.03, 0.03, "sine");
  }
}

/** Little-creature chatter: a few quick blips that wander in pitch. `base` sets the voice. */
export function playBabble(ctx: Ctx, at: number, syllables = 3, base = 820, peak = 0.05) {
  for (let i = 0; i < syllables; i++) {
    const f = base * (0.85 + Math.random() * 0.5);
    tone(ctx, at + i * 0.085, f, f * (1.05 + Math.random() * 0.2), 0.07, peak);
  }
}

/** The lid popping off: a bubbly rising bloop and a twinkle. */
export function playLid(ctx: Ctx, at: number) {
  tone(ctx, at, 260, 780, 0.22, 0.12);
  [1568, 2093, 2637].forEach((f, i) => tone(ctx, at + 0.12 + i * 0.05, f, f, 0.3, 0.04));
}

/** A friend landing: the candle plip, climbing with each friend. */
export function playLand(ctx: Ctx, at: number, index: number) {
  playCandle(ctx, at, index);
}

/** The late friend tripping in: a slide-whistle dip and a boing. */
export function playLate(ctx: Ctx, at: number) {
  tone(ctx, at, 1200, 500, 0.32, 0.05);
  tone(ctx, at + 0.34, 300, 520, 0.18, 0.08, "triangle");
}

/** Everyone shouting: a bright major chord, rolled, with a sparkle on top. */
export function playShout(ctx: Ctx, at: number) {
  [523, 659, 784, 1046].forEach((f, i) => tone(ctx, at + i * 0.04, f, f, 0.9, 0.06, "triangle"));
  [2093, 2637, 3136, 4186].forEach((f, i) => tone(ctx, at + 0.2 + i * 0.06, f, f, 0.35, 0.025));
}

function live(fn: (ctx: Ctx, at: number) => void) {
  const ctx = soundContext();
  if (!ctx) return;
  try {
    fn(ctx, ctx.currentTime + 0.005);
  } catch {
    /* sound is a nicety */
  }
}

export const storySound = {
  knock: () => live(playKnock),
  babble: (n = 3, base = 820) => live((c, at) => playBabble(c, at, n, base)),
  lid: () => live(playLid),
  land: (i: number) => live((c, at) => playLand(c, at, i)),
  late: () => live(playLate),
  shout: () => live(playShout),
};

/**
 * The "hold" hum: one soft tone whose pitch follows how far along the hold is.
 * Returns set(progress 0..1) and stop().
 */
export function holdHum() {
  const ctx = soundContext();
  if (!ctx) return { set: (_p: number) => {}, stop: () => {} };
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 330;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.035, ctx.currentTime + 0.08);
    o.connect(g).connect(ctx.destination);
    o.start();
    let stopped = false;
    return {
      set: (p: number) => {
        if (stopped) return;
        o.frequency.setTargetAtTime(330 + p * 520, ctx.currentTime, 0.03);
      },
      stop: () => {
        if (stopped) return;
        stopped = true;
        g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
        o.stop(ctx.currentTime + 0.3);
      },
    };
  } catch {
    return { set: (_p: number) => {}, stop: () => {} };
  }
}
