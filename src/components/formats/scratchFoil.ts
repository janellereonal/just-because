/**
 * The scratch cards' foil, in the gift's own colors. Shared by the Scratch Cards
 * body (ScratchView) and its opening (src/themes/layouts/Scratch.tsx).
 */
import { mixHex } from "@/themes/_shared/iconSets";

/** Foils in the gift's own colors: the accent, the primary and a blend, kept light so they still read as foil. */
export function foilFor(index: number, colors: string[]): [string, string, string] {
  const hex = (c: string | undefined, fb: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fb);
  const accent = hex(colors[0], "#B5623E");
  const primary = hex(colors[1], accent);
  const bases = [accent, primary, mixHex(accent, primary, 0.5), mixHex(accent, "#C9A96E", 0.45)];
  const base = bases[index % bases.length]!;
  return [
    mixHex(base, "#FFFFFF", 0.6),
    mixHex(base, "#FFFFFF", 0.38),
    mixHex(base, "#FFFFFF", 0.86),
  ];
}

/** Paints one card's foil (already scaled for the device pixel ratio). */
export function paintFoil(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  index: number,
  colors: string[],
  big = false,
) {
  const [a, b, hi] = foilFor(index, colors);
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, a);
  g.addColorStop(0.45, hi);
  g.addColorStop(0.55, b);
  g.addColorStop(1, a);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // Glittery speckle and a little pattern so it reads as foil.
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + ((i * 37) % 10) / 25})`;
    ctx.fillRect((((i * 97) % 1000) / 1000) * width, (((i * 53) % 997) / 997) * height, 1.4, 1.4);
  }
  const k = big ? 1.3 : 1;
  ctx.fillStyle = "rgba(60,50,70,.55)";
  ctx.font = `600 ${Math.round(13 * k)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("SCRATCH ME", width / 2, height / 2 - 4 * k);
  ctx.font = `${Math.round(20 * k)}px system-ui, sans-serif`;
  ctx.fillText("✦ ✦ ✦", width / 2, height / 2 + 22 * k);
}
