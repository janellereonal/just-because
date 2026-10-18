/**
 * Small synthesized instruments, so every style ends on its own sound instead of one shared
 * chime: Scrapbook a music box, Storybook a celesta, Comic a brass sting, Bento a marimba,
 * Gift Hunt a kalimba, Zine a punk power chord, Mixtape a lo-fi keys chord, Scratch a coin
 * jackpot, Constellation glass bells. Silent unless the viewer turned sound on.
 *
 * Every voice is a few oscillators with its own envelope and partials, through a shared
 * gentle reverb. Notes are MIDI numbers (60 = middle C).
 */
import { soundContext } from "@/lib/play";

type Bus = { ctx: AudioContext; dry: GainNode; wet: GainNode };
let bus: Bus | null = null;

function getBus(): Bus | null {
  const ctx = soundContext();
  if (!ctx) return null;
  if (bus && bus.ctx === ctx) return bus;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 3;
  comp.connect(ctx.destination);
  const dry = ctx.createGain();
  dry.connect(comp);
  const verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 1.8);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.28;
  wet.connect(verb).connect(comp);
  bus = { ctx, dry, wet };
  return bus;
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

type Partial = {
  ratio: number;
  gain: number;
  decay: number;
  type?: OscillatorType;
  detune?: number;
};
type Voice = {
  partials: Partial[];
  attack: number;
  /** Wet share, 0..1. */
  room: number;
  /** Optional lowpass on the whole voice. */
  lowpass?: number;
  /** Small pitch bend at the start (cents), like a plucked tine settling. */
  bend?: number;
};

const VOICES: Record<string, Voice> = {
  // Steel comb: a bright fundamental and a high inharmonic ping, quick decay.
  musicBox: {
    attack: 0.002,
    room: 0.45,
    partials: [
      { ratio: 1, gain: 1, decay: 1.2 },
      { ratio: 3.98, gain: 0.32, decay: 0.35 },
      { ratio: 8.1, gain: 0.12, decay: 0.12 },
    ],
  },
  // Celesta: softer, rounder, longer, with an octave above.
  celesta: {
    attack: 0.004,
    room: 0.5,
    partials: [
      { ratio: 1, gain: 1, decay: 1.8 },
      { ratio: 2, gain: 0.35, decay: 0.9 },
      { ratio: 4.2, gain: 0.08, decay: 0.25 },
    ],
  },
  // Marimba: wooden bar, strong fundamental, a 4x partial that dies fast, short.
  marimba: {
    attack: 0.002,
    room: 0.25,
    partials: [
      { ratio: 1, gain: 1, decay: 0.55 },
      { ratio: 3.93, gain: 0.25, decay: 0.08 },
      { ratio: 10, gain: 0.05, decay: 0.02 },
    ],
  },
  // Kalimba: a plucked tine, a little bend and buzz.
  kalimba: {
    attack: 0.002,
    room: 0.35,
    bend: 18,
    partials: [
      { ratio: 1, gain: 1, decay: 0.9 },
      { ratio: 5.4, gain: 0.18, decay: 0.12 },
      { ratio: 2.01, gain: 0.12, decay: 0.4, type: "triangle" },
    ],
  },
  // Lo-fi electric piano: warm, a tine plus a gentle bell, a bit muffled.
  keys: {
    attack: 0.006,
    room: 0.3,
    lowpass: 2600,
    partials: [
      { ratio: 1, gain: 1, decay: 1.6, type: "triangle" },
      { ratio: 1, gain: 0.6, decay: 1.4, detune: 9 },
      { ratio: 2, gain: 0.25, decay: 0.5 },
      { ratio: 7, gain: 0.06, decay: 0.08 },
    ],
  },
  // Brass sting: two detuned saws through a lowpass, short swell.
  brass: {
    attack: 0.03,
    room: 0.2,
    lowpass: 2200,
    partials: [
      { ratio: 1, gain: 0.5, decay: 0.55, type: "sawtooth", detune: -6 },
      { ratio: 1, gain: 0.5, decay: 0.55, type: "sawtooth", detune: 6 },
      { ratio: 2, gain: 0.15, decay: 0.4, type: "square" },
    ],
  },
  // Overdriven guitar-ish power chord tone: square + saw, gritty, short.
  grit: {
    attack: 0.004,
    room: 0.15,
    lowpass: 3200,
    partials: [
      { ratio: 1, gain: 0.55, decay: 0.7, type: "square" },
      { ratio: 1.003, gain: 0.45, decay: 0.7, type: "sawtooth" },
      { ratio: 0.5, gain: 0.35, decay: 0.6, type: "triangle" },
    ],
  },
  // Coin: a bright two-tone ping.
  coin: {
    attack: 0.001,
    room: 0.25,
    partials: [
      { ratio: 1, gain: 1, decay: 0.25, type: "square" },
      { ratio: 2.76, gain: 0.25, decay: 0.12 },
    ],
  },
  // Glass bell, for the night sky.
  glass: {
    attack: 0.003,
    room: 0.7,
    partials: [
      { ratio: 1, gain: 1, decay: 2.2 },
      { ratio: 2.76, gain: 0.3, decay: 0.9 },
      { ratio: 5.4, gain: 0.1, decay: 0.4 },
    ],
  },
};

export type Instrument = keyof typeof VOICES;

/** Play one note. `at` is seconds from now. */
export function note(inst: Instrument, midi: number, at = 0, gain = 0.07, pan = 0) {
  const b = getBus();
  if (!b) return;
  const v = VOICES[inst]!;
  const { ctx } = b;
  const t = ctx.currentTime + at + 0.01;
  const f = hz(midi);
  const out = ctx.createGain();
  out.gain.value = gain;
  let head: AudioNode = out;
  if (v.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = v.lowpass;
    out.connect(lp);
    head = lp;
  }
  const p = ctx.createStereoPanner?.();
  if (p) {
    p.pan.value = pan;
    head.connect(p);
    head = p;
  }
  head.connect(b.dry);
  const w = ctx.createGain();
  w.gain.value = v.room;
  head.connect(w).connect(b.wet);
  let longest = 0;
  for (const part of v.partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = part.type ?? "sine";
    o.frequency.setValueAtTime(f * part.ratio, t);
    if (v.bend) {
      o.detune.setValueAtTime(v.bend + (part.detune ?? 0), t);
      o.detune.exponentialRampToValueAtTime(Math.max(0.01, part.detune ?? 0.01), t + 0.08);
    } else if (part.detune) o.detune.value = part.detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(part.gain, t + v.attack);
    g.gain.setTargetAtTime(0.0001, t + v.attack, part.decay / 4);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + part.decay * 1.6 + 0.1);
    longest = Math.max(longest, part.decay * 1.6);
  }
}

/** A run of notes: `[midi, beatsFromStart]`, with `step` seconds per beat. */
export function phrase(
  inst: Instrument,
  notes: [number, number][],
  step = 0.12,
  gain = 0.07,
  spread = 0.5,
) {
  notes.forEach(([m, beat], i) =>
    note(inst, m, beat * step, gain, (i / Math.max(1, notes.length - 1) - 0.5) * spread),
  );
}

/**
 * Each style's payoff: what it sounds like when the object is open. Short (about a
 * second), in key, and made for that object.
 */
export const PAYOFF = {
  // A music box wind-down: a little rising figure that slows at the end.
  scrapbook: () =>
    phrase(
      "musicBox",
      [
        [76, 0],
        [79, 1],
        [83, 2],
        [84, 3],
        [88, 4.4],
      ],
      0.13,
      0.06,
    ),
  // Celesta, like the first page of a fairy tale.
  storybook: () =>
    phrase(
      "celesta",
      [
        [72, 0],
        [76, 1],
        [79, 2],
        [84, 3],
        [83, 4],
        [84, 5.5],
      ],
      0.14,
      0.06,
    ),
  // A brass "ta-da" with a cymbal-ish hit underneath (the material sounds add the panel snap).
  comic: () => {
    phrase(
      "brass",
      [
        [67, 0],
        [72, 1.4],
      ],
      0.1,
      0.05,
      0,
    );
    phrase(
      "brass",
      [
        [64, 1.4],
        [76, 1.4],
      ],
      0.1,
      0.035,
      0.6,
    );
  },
  // Wooden marimba, a neat little four-bar tag.
  bento: () =>
    phrase(
      "marimba",
      [
        [72, 0],
        [76, 1],
        [79, 2],
        [76, 3],
        [84, 4],
      ],
      0.11,
      0.08,
    ),
  // Kalimba, a found-it motif that goes up and resolves.
  hunt: () =>
    phrase(
      "kalimba",
      [
        [69, 0],
        [72, 1],
        [76, 2],
        [74, 3],
        [81, 4.2],
      ],
      0.13,
      0.08,
    ),
  // A power chord hit, then the fifth on top: loud on paper, quiet in volume.
  zine: () => {
    for (const m of [45, 52, 57]) note("grit", m, 0, 0.035);
    for (const m of [47, 54, 59]) note("grit", m, 0.26, 0.03);
  },
  // Lo-fi keys: a soft seventh chord, rolled.
  mixtape: () =>
    phrase(
      "keys",
      [
        [60, 0],
        [64, 0.35],
        [67, 0.7],
        [71, 1.05],
        [74, 1.4],
      ],
      0.08,
      0.05,
    ),
  // Coins tumbling out: a jackpot run.
  scratch: () =>
    phrase(
      "coin",
      [
        [83, 0],
        [88, 1],
        [83, 2],
        [88, 3],
        [95, 4],
      ],
      0.07,
      0.04,
    ),
  // Glass bells across the sky.
  stars: () =>
    phrase(
      "glass",
      [
        [74, 0],
        [78, 1],
        [81, 2],
        [86, 3.2],
      ],
      0.16,
      0.06,
      1,
    ),
} as const;

export type PayoffStyle = keyof typeof PAYOFF;
