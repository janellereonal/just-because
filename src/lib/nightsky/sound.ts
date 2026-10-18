/**
 * The night sky's own sounds. Silent unless the viewer turned sound on (like every
 * sound on Just Because).
 *
 *  - Each star you find rings a glass bell, one note higher each time, so finding the
 *    whole heart plays a melody.
 *  - A soft shimmer while a line draws between two stars.
 *  - A quiet night breath of air while the sky is on screen.
 *  - When the heart is complete, the bells ring out together over a warm swell.
 *
 * Everything is synthesized here (no audio files) and shares one small reverb, so it
 * all sounds like it's in the same big, open night.
 */
import { soundContext } from "@/lib/play";

// A major pentatonic across three octaves: every note sounds good after any other.
const SCALE = [0, 2, 4, 7, 9];
const ROOT = 587.33; // D5
const noteAt = (i: number) => ROOT * Math.pow(2, (SCALE[i % 5]! + 12 * Math.floor(i / 5)) / 12);

type Bus = { ctx: AudioContext; dry: GainNode; wet: GainNode };
let bus: Bus | null = null;

/** One output with a long, airy reverb, built once per audio context. */
function getBus(): Bus | null {
  const ctx = soundContext();
  if (!ctx) return null;
  if (bus && bus.ctx === ctx) return bus;
  const dry = ctx.createGain();
  dry.gain.value = 0.8;
  dry.connect(ctx.destination);
  const verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 3.2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // Smooth exponential tail with a slow fade-in, so taps don't sound like a slap.
      d[i] =
        (Math.random() * 2 - 1) * Math.pow(1 - t, 3.2) * Math.min(1, i / (ctx.sampleRate * 0.02));
    }
  }
  verb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.55;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 5200;
  wet.connect(verb).connect(tone).connect(ctx.destination);
  bus = { ctx, dry, wet };
  return bus;
}

/** A glass bell: FM with an inharmonic ratio, a bright attack and a long shimmer. */
function bell(b: Bus, freq: number, at: number, peak = 0.07, pan = 0, length = 2.4) {
  const { ctx } = b;
  const carrier = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const amp = ctx.createGain();
  const panner = ctx.createStereoPanner?.();
  carrier.type = "sine";
  mod.type = "sine";
  carrier.frequency.value = freq;
  mod.frequency.value = freq * 3.51;
  modGain.gain.setValueAtTime(freq * 2.2, at);
  modGain.gain.exponentialRampToValueAtTime(freq * 0.05, at + length * 0.6);
  mod.connect(modGain).connect(carrier.frequency);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(peak, at + 0.006);
  amp.gain.exponentialRampToValueAtTime(peak * 0.35, at + 0.25);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  // A pure octave partial on top, for the glassy sparkle.
  const top = ctx.createOscillator();
  const topAmp = ctx.createGain();
  top.frequency.value = freq * 2.003;
  topAmp.gain.setValueAtTime(0.0001, at);
  topAmp.gain.exponentialRampToValueAtTime(peak * 0.3, at + 0.004);
  topAmp.gain.exponentialRampToValueAtTime(0.0001, at + length * 0.45);
  carrier.connect(amp);
  top.connect(topAmp).connect(amp);
  let out: AudioNode = amp;
  if (panner) {
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    amp.connect(panner);
    out = panner;
  }
  out.connect(b.dry);
  out.connect(b.wet);
  for (const o of [carrier, mod, top]) {
    o.start(at);
    o.stop(at + length + 0.1);
  }
}

/** Filtered noise that rises and falls: a shimmer for lines, an air sweep for shooting stars. */
function sweep(b: Bus, at: number, dur: number, from: number, to: number, peak: number, pan = 0) {
  const { ctx } = b;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 6;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let out: AudioNode = g;
  const panner = ctx.createStereoPanner?.();
  if (panner) {
    panner.pan.setValueAtTime(-pan, at);
    panner.pan.linearRampToValueAtTime(pan, at + dur);
    g.connect(panner);
    out = panner;
  }
  src.connect(f).connect(g);
  out.connect(b.dry);
  out.connect(b.wet);
  src.start(at);
}

/** The n-th star found (0-based). `x` is where it is across the screen, 0..1, for stereo. */
export function starFound(n: number, x = 0.5) {
  const b = getBus();
  if (!b) return;
  const now = b.ctx.currentTime + 0.01;
  const pan = (x - 0.5) * 1.2;
  bell(b, noteAt(n), now, 0.075, pan);
  // A quiet fifth below, so each note has some body.
  bell(b, noteAt(n) / 1.5, now + 0.012, 0.025, pan, 1.6);
}

/** A star you'd already found, opened again: the same note, softer. */
export function starAgain(n: number, x = 0.5) {
  const b = getBus();
  if (!b) return;
  bell(b, noteAt(n), b.ctx.currentTime + 0.01, 0.04, (x - 0.5) * 1.2, 1.6);
}

/** A line drawing itself between two stars. */
export function lineDrawn() {
  const b = getBus();
  if (!b) return;
  sweep(b, b.ctx.currentTime + 0.05, 0.85, 2400, 7800, 0.018);
}

export function shootingStar(fromLeft: boolean) {
  const b = getBus();
  if (!b) return;
  sweep(b, b.ctx.currentTime, 0.9, 5200, 1800, 0.012, fromLeft ? 0.8 : -0.8);
}

/** Every star found: the bells ring out together over a warm swell. */
export function heartComplete(count: number) {
  const b = getBus();
  if (!b) return;
  const now = b.ctx.currentTime + 0.35;
  // A rolled chord up the scale, then the root an octave up to land on.
  const steps = Math.min(8, Math.max(5, count));
  for (let i = 0; i < steps; i++)
    bell(b, noteAt(i * 2) / 2, now + i * 0.11, 0.05, (i / steps - 0.5) * 1.4, 3.6);
  bell(b, ROOT * 2, now + steps * 0.11 + 0.15, 0.06, 0, 4.5);
  // The swell: two soft detuned tones on the root and fifth.
  const { ctx } = b;
  for (const [f, det] of [
    [ROOT / 4, -4],
    [ROOT / 4, 5],
    [(ROOT / 4) * 1.5, 0],
  ] as const) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = det;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(300, now);
    lp.frequency.exponentialRampToValueAtTime(1400, now + 1.6);
    lp.frequency.exponentialRampToValueAtTime(400, now + 5);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.018, now + 1.4);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
    o.connect(lp).connect(g);
    g.connect(b.dry);
    g.connect(b.wet);
    o.start(now);
    o.stop(now + 5.6);
  }
}

/* ---------- the night air ---------- */

let air: { stop: () => void } | null = null;

/** A very quiet, slowly moving breath of air while the sky is on screen. */
export function nightAir(on: boolean) {
  if (!on) {
    air?.stop();
    air = null;
    return;
  }
  if (air) return;
  const b = getBus();
  if (!b) return;
  const { ctx } = b;
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // Brown noise: soft and deep, like wind far away.
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = last * 3.2;
    }
    // Crossfade the ends so the loop has no click.
    const fade = Math.floor(ctx.sampleRate * 0.25);
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      d[i] = d[i]! * k + d[len - fade + i]! * (1 - k);
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopEnd = 4 - 0.25;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  // A slow LFO on the filter, so the air drifts.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain).connect(lp.frequency);
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.05, now + 2.5);
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start(now);
  lfo.start(now);
  air = {
    stop() {
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      src.stop(t + 1.3);
      lfo.stop(t + 1.3);
    },
  };
}
