/**
 * Material sounds for the bodies of the styles: what paper, card, tape, plastic and foil
 * actually sound like when you touch them. Synthesized (no audio files), quiet, and
 * silent unless the viewer turned sound on, like every sound on Just Because.
 *
 * Each sound is a few layers: a short transient (the "touch"), a filtered noise body (the
 * material), and sometimes a tonal part (a click, a resonance). Small random variation on
 * every play keeps repeated actions (turning ten pages) from sounding like a machine.
 *
 * Openings keep their own foley in src/lib/play.ts; these are for reading the gift.
 */
import { soundContext } from "@/lib/play";

type Out = { ctx: AudioContext; dry: GainNode; room: GainNode };
let out: Out | null = null;
const noiseCache = new WeakMap<AudioContext, AudioBuffer>();

/** A small room reverb shared by every material sound, so they sit in one space. */
function bus(): Out | null {
  const ctx = soundContext();
  if (!ctx) return null;
  if (out && out.ctx === ctx) return out;
  const dry = ctx.createGain();
  dry.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  dry.connect(comp).connect(ctx.destination);
  const verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 0.9);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  }
  verb.buffer = ir;
  const room = ctx.createGain();
  room.gain.value = 0.12;
  room.connect(verb).connect(comp);
  out = { ctx, dry, room };
  return out;
}

function noise(ctx: AudioContext) {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

const vary = (v: number, amount = 0.12) => v * (1 + (Math.random() * 2 - 1) * amount);

type Shape = {
  at?: number;
  dur: number;
  type: BiquadFilterType;
  freq: number;
  /** Optional sweep of the filter over the sound. */
  to?: number;
  q?: number;
  gain: number;
  attack?: number;
  /** Curve of the decay: higher is snappier. */
  curve?: number;
  /** Crackle: how many little bursts make up the sound (paper fibres, foil). */
  grains?: number;
  pan?: number | undefined;
  room?: number;
};

/** One layer of shaped, filtered noise. */
function hiss(o: Out, s: Shape) {
  const { ctx } = o;
  const t = ctx.currentTime + (s.at ?? 0) + 0.005;
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  src.playbackRate.value = vary(1, 0.05);
  const f = ctx.createBiquadFilter();
  f.type = s.type;
  f.Q.value = s.q ?? 0.8;
  f.frequency.setValueAtTime(vary(s.freq), t);
  if (s.to) f.frequency.exponentialRampToValueAtTime(vary(s.to), t + s.dur);
  const g = ctx.createGain();
  const peak = vary(s.gain, 0.15);
  const atk = s.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  if (s.grains && s.grains > 1) {
    // Crackle: a run of small bursts with random spacing and level.
    const step = s.dur / s.grains;
    for (let i = 0; i < s.grains; i++) {
      const at = t + i * step + Math.random() * step * 0.5;
      const lvl = peak * (0.35 + Math.random() * 0.65) * (1 - (i / s.grains) * 0.5);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(lvl, at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, at + step * 0.8);
    }
  } else {
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.setTargetAtTime(0.0001, t + atk, s.dur / (s.curve ?? 4));
  }
  let node: AudioNode = g;
  const p = ctx.createStereoPanner?.();
  if (p) {
    p.pan.value = s.pan ?? (Math.random() - 0.5) * 0.3;
    g.connect(p);
    node = p;
  }
  src.connect(f).connect(g);
  node.connect(o.dry);
  if (s.room !== 0) {
    const r = ctx.createGain();
    r.gain.value = s.room ?? 1;
    node.connect(r).connect(o.room);
  }
  src.start(t, Math.random() * 1.5);
  src.stop(t + s.dur + 0.4);
}

/** A short pitched click or knock (plastic, wood, a cassette latch). */
function knock(
  o: Out,
  freq: number,
  dur: number,
  gain: number,
  at = 0,
  type: OscillatorType = "sine",
  drop = 0.6,
) {
  const { ctx } = o;
  const t = ctx.currentTime + at + 0.005;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(vary(freq, 0.04), t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * drop), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vary(gain, 0.1), t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(o.dry);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/* ------------------------------------------------------------------ the sounds */

export type Material =
  /** A page turning: the lift, the swish through the air, the soft landing. */
  | "pageTurn"
  /** A heavy board page or a book cover settling closed. */
  | "coverThump"
  /** A photo or card sliding across paper. */
  | "slide"
  /** A sticker or stamp slapped down. */
  | "slap"
  /** Peeling a strip of tape. */
  | "tape"
  /** A card flipping over in the hand. */
  | "flip"
  /** A lid lifting off a box with a little suction pop. */
  | "lid"
  /** A cassette clicking into a deck, or a play button. */
  | "cassette"
  /** The tape hiss starting under music. */
  | "tapeHiss"
  /** A coin scratching foil. */
  | "scratch"
  /** A map or scroll unrolling. */
  | "unroll"
  /** A pencil or pen scribbling. */
  | "scribble"
  /** A comic panel snapping into place. */
  | "panel"
  /** A soft paper pop: opening a fold, a small reveal. */
  | "unfold";

/**
 * Level per sound, measured against the openings' foley (tools/screens/sound-meter.cjs):
 * touches sit a little under the boarding pass's paper sound, bigger moments near its stamp.
 */
const LEVEL: Record<Material, number> = {
  pageTurn: 2.5,
  coverThump: 2.5,
  slide: 2.8,
  slap: 3.2,
  tape: 2.4,
  flip: 2.5,
  lid: 1.25,
  cassette: 1.7,
  tapeHiss: 1.3,
  scratch: 3.2,
  unroll: 3.2,
  scribble: 2.7,
  panel: 2.8,
  unfold: 2.8,
};

export function material(
  kind: Material,
  opts: { pan?: number | undefined; strength?: number | undefined } = {},
) {
  const o = bus();
  if (!o) return;
  const k = (opts.strength ?? 1) * LEVEL[kind];
  const pan = opts.pan;
  try {
    switch (kind) {
      case "pageTurn":
        hiss(o, { dur: 0.05, type: "highpass", freq: 2600, gain: 0.08 * k, curve: 6, pan });
        hiss(o, {
          at: 0.03,
          dur: 0.32,
          type: "bandpass",
          freq: 1400,
          to: 5200,
          q: 0.6,
          gain: 0.11 * k,
          attack: 0.09,
          curve: 3,
          pan,
        });
        hiss(o, { at: 0.3, dur: 0.12, type: "lowpass", freq: 900, gain: 0.12 * k, curve: 5, pan });
        hiss(o, {
          at: 0.06,
          dur: 0.22,
          type: "bandpass",
          freq: 3800,
          q: 1.2,
          gain: 0.05 * k,
          grains: 5,
          pan,
        });
        break;
      case "coverThump":
        hiss(o, { dur: 0.16, type: "lowpass", freq: 520, gain: 0.32 * k, curve: 6, pan });
        knock(o, 110, 0.14, 0.18 * k, 0, "sine", 0.55);
        hiss(o, { dur: 0.06, type: "bandpass", freq: 2200, gain: 0.05 * k, curve: 8, pan });
        break;
      case "slide":
        hiss(o, {
          dur: 0.28,
          type: "bandpass",
          freq: 1800,
          to: 3200,
          q: 0.9,
          gain: 0.07 * k,
          attack: 0.05,
          curve: 3,
          pan,
        });
        hiss(o, {
          at: 0.22,
          dur: 0.06,
          type: "lowpass",
          freq: 1200,
          gain: 0.08 * k,
          curve: 7,
          pan,
        });
        break;
      case "slap":
        hiss(o, { dur: 0.07, type: "bandpass", freq: 1400, q: 0.7, gain: 0.35 * k, curve: 7, pan });
        knock(o, 190, 0.07, 0.16 * k, 0, "triangle", 0.5);
        hiss(o, {
          at: 0.01,
          dur: 0.12,
          type: "highpass",
          freq: 3500,
          gain: 0.04 * k,
          curve: 5,
          pan,
        });
        break;
      case "tape":
        hiss(o, {
          dur: 0.45,
          type: "bandpass",
          freq: 2600,
          to: 1900,
          q: 2.2,
          gain: 0.12 * k,
          grains: 22,
          pan,
        });
        hiss(o, {
          at: 0.42,
          dur: 0.05,
          type: "highpass",
          freq: 3000,
          gain: 0.08 * k,
          curve: 8,
          pan,
        });
        break;
      case "flip":
        hiss(o, {
          dur: 0.16,
          type: "bandpass",
          freq: 2000,
          to: 4200,
          q: 0.7,
          gain: 0.09 * k,
          attack: 0.03,
          curve: 4,
          pan,
        });
        knock(o, 1400, 0.03, 0.025 * k, 0.12, "triangle", 0.8);
        break;
      case "lid":
        hiss(o, {
          dur: 0.22,
          type: "bandpass",
          freq: 700,
          to: 1600,
          q: 1.1,
          gain: 0.12 * k,
          attack: 0.08,
          curve: 3,
          pan,
        });
        knock(o, 340, 0.09, 0.14 * k, 0.17, "sine", 1.9);
        hiss(o, {
          at: 0.17,
          dur: 0.05,
          type: "highpass",
          freq: 2400,
          gain: 0.07 * k,
          curve: 8,
          pan,
        });
        break;
      case "cassette":
        knock(o, 2400, 0.018, 0.09 * k, 0, "square", 0.7);
        knock(o, 1700, 0.022, 0.07 * k, 0.045, "square", 0.6);
        hiss(o, {
          at: 0.04,
          dur: 0.06,
          type: "bandpass",
          freq: 3200,
          q: 2,
          gain: 0.06 * k,
          curve: 7,
          pan,
          room: 0.4,
        });
        knock(o, 160, 0.08, 0.09 * k, 0.05, "sine", 0.6);
        break;
      case "tapeHiss":
        hiss(o, {
          dur: 1.6,
          type: "highpass",
          freq: 5200,
          gain: 0.018 * k,
          attack: 0.3,
          curve: 1.5,
          pan: 0,
          room: 0,
        });
        break;
      case "scratch":
        hiss(o, {
          dur: 0.18,
          type: "bandpass",
          freq: 4200,
          to: 3300,
          q: 3,
          gain: 0.07 * k,
          grains: 9,
          pan,
        });
        hiss(o, { dur: 0.18, type: "highpass", freq: 6500, gain: 0.03 * k, curve: 3, pan });
        break;
      case "unroll":
        hiss(o, {
          dur: 0.7,
          type: "bandpass",
          freq: 900,
          to: 2600,
          q: 0.8,
          gain: 0.1 * k,
          attack: 0.1,
          curve: 2.5,
          pan,
        });
        hiss(o, {
          at: 0.1,
          dur: 0.55,
          type: "bandpass",
          freq: 3000,
          q: 1.5,
          gain: 0.05 * k,
          grains: 12,
          pan,
        });
        hiss(o, { at: 0.66, dur: 0.1, type: "lowpass", freq: 700, gain: 0.12 * k, curve: 6, pan });
        break;
      case "scribble":
        hiss(o, { dur: 0.5, type: "bandpass", freq: 5200, q: 4, gain: 0.04 * k, grains: 14, pan });
        break;
      case "panel":
        hiss(o, {
          dur: 0.09,
          type: "bandpass",
          freq: 1100,
          to: 3000,
          q: 0.8,
          gain: 0.12 * k,
          curve: 6,
          pan,
        });
        knock(o, 520, 0.06, 0.07 * k, 0.03, "triangle", 0.7);
        break;
      case "unfold":
        hiss(o, {
          dur: 0.2,
          type: "bandpass",
          freq: 2400,
          to: 1500,
          q: 0.9,
          gain: 0.08 * k,
          attack: 0.02,
          curve: 3,
          grains: 4,
          pan,
        });
        hiss(o, {
          at: 0.16,
          dur: 0.06,
          type: "lowpass",
          freq: 1500,
          gain: 0.07 * k,
          curve: 7,
          pan,
        });
        break;
    }
  } catch {
    /* sound is a nicety */
  }
}

/** Where something is across the screen (0..1 or an element) as a stereo position. */
export function panAt(x: number | Element | null | undefined): number {
  if (typeof window === "undefined" || x == null) return 0;
  const v =
    typeof x === "number"
      ? x
      : (() => {
          const r = x.getBoundingClientRect();
          return (r.left + r.width / 2) / Math.max(1, window.innerWidth);
        })();
  return Math.max(-0.8, Math.min(0.8, (v - 0.5) * 1.4));
}
