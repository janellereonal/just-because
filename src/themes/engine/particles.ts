/**
 * Particle presets for payoff moments. They wrap the shared `burst` in
 * src/lib/play.ts (DOM particles, transform and opacity only, cleaned up after
 * themselves) and the gift's own icon set when the theme has one. Under reduced
 * motion they do nothing: the payoff is the light and the sound instead.
 */
import { burst, reducedMotion, type BurstShape } from "@/lib/play";
import { burstSet } from "@/themes/_shared/Sprinkles";
import type { IconSet } from "@/themes/_shared/iconSets";

export const PARTICLES = ["confetti", "petals", "snow", "sparks", "dust"] as const;
export type ParticlePreset = (typeof PARTICLES)[number];

const PRESETS: Record<ParticlePreset, { shape: BurstShape; count: number; spread: number; up: boolean; colors?: string[] }> = {
  confetti: { shape: "confetti", count: 42, spread: 2, up: true },
  petals: { shape: "petals", count: 22, spread: 1.6, up: false, colors: ["#F4C6CF", "#FBE3E8", "#E9A8B6", "#FFFFFF"] },
  snow: { shape: "snow", count: 26, spread: 1.8, up: false, colors: ["#FFFFFF", "#E8F1F8", "#D4E4F0"] },
  sparks: { shape: "sparkles", count: 24, spread: 1.4, up: true, colors: ["#FFE7A3", "#FFD166", "#FFF6DA"] },
  dust: { shape: "sparkles", count: 12, spread: 0.8, up: true, colors: ["rgba(255,255,255,.8)", "rgba(255,240,210,.7)"] },
};

/** Fire a preset at a point (viewport coordinates) inside `host`. */
export function particles(
  preset: ParticlePreset,
  host: HTMLElement | null,
  at: { x: number; y: number },
  o: { colors?: string[]; count?: number; icons?: IconSet | null } = {},
) {
  if (!host || reducedMotion()) return;
  const p = PRESETS[preset];
  // The gift's own sprinkles make confetti feel like theirs.
  if (o.icons && (preset === "confetti" || preset === "sparks")) {
    burstSet(host, at.x, at.y, o.icons, { count: Math.round((o.count ?? p.count) * 0.4), spread: p.spread * 0.5, up: p.up });
  }
  burst(host, at.x, at.y, {
    shape: p.shape,
    colors: o.colors ?? p.colors ?? ["#E8577E", "#FFD166", "#7A5CFF", "#4CC9A0"],
    count: o.count ?? p.count,
    spread: p.spread,
    up: p.up,
  });
}

/** Particles from the centre of an element. */
export function particlesFrom(preset: ParticlePreset, host: HTMLElement | null, el: Element | null, o: Parameters<typeof particles>[3] = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  particles(preset, host, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, o);
}
