/**
 * Materials and effects for engine themes. Each material is a set of CSS
 * layers (colour, texture, sheen, edge light) that follows the house key
 * light in src/themes/_shared/light.tsx: light from the top left, shadows down
 * and to the right. Textures are tiny inline SVG noise, so nothing downloads.
 *
 * Use: <div style={material("cardboard", { tint: "#C99A62" })} />
 */
import { elevation, rim } from "@/themes/_shared/light";

export const MATERIALS = ["paper", "cardboard", "wax", "foil", "fabric", "glass", "capiz", "frost", "wood", "metal"] as const;
export type MaterialName = (typeof MATERIALS)[number];

/** Static noise as an inline SVG image. `freq` sets the grain size, `alpha` its strength. */
export function noise(freq = 0.9, alpha = 0.18, octaves = 2, stretch: [number, number] = [1, 1]): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${(freq * stretch[0]).toFixed(3)} ${(freq * stretch[1]).toFixed(3)}' numOctaves='${octaves}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Mix a #rrggbb colour towards white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  const to = amount >= 0 ? 255 : 0;
  const k = Math.min(1, Math.abs(amount));
  const ch = (sh: number) => Math.round(((n >> sh) & 255) * (1 - k) + to * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

export type MaterialOptions = {
  /** The base colour. Each material has a sensible default. */
  tint?: string;
  /** How high it sits above the surface, 0..1 (shadow size). 0 for no shadow. */
  lift?: number;
  /** Shadow hue as "r,g,b". Warm rooms get warm shadows. */
  shadowTint?: string;
  /** Corner radius in px. */
  radius?: number;
};

const DEFAULT_TINT: Record<MaterialName, string> = {
  paper: "#FBF6EC",
  cardboard: "#C89B65",
  wax: "#A3243B",
  foil: "#D9C08A",
  fabric: "#B5623E",
  glass: "#DDEBF2",
  capiz: "#F6EEDC",
  frost: "#EEF4F8",
  wood: "#8A5A36",
  metal: "#B8BCC4",
};

/** The CSS for a surface made of `name`. */
export function material(name: MaterialName, o: MaterialOptions = {}): React.CSSProperties {
  const c = o.tint ?? DEFAULT_TINT[name];
  const lift = o.lift ?? 0.5;
  const shadow = lift > 0 ? elevation(lift, o.shadowTint ?? "45,30,25") : "";
  const join = (...parts: string[]) => parts.filter(Boolean).join(", ");
  const radius = o.radius ?? ({ paper: 3, cardboard: 6, wax: 999, foil: 6, fabric: 4, glass: 14, capiz: 6, frost: 14, wood: 8, metal: 10 } as const)[name];

  switch (name) {
    case "paper":
      return {
        backgroundColor: c,
        backgroundImage: join(noise(0.95, 0.07), `linear-gradient(160deg, ${shade(c, 0.35)} 0%, ${c} 45%, ${shade(c, -0.04)} 100%)`),
        boxShadow: join(rim(0.9), shadow),
        borderRadius: radius,
      };
    case "cardboard":
      return {
        backgroundColor: c,
        // Corrugated fibres: stretched noise plus faint flute lines.
        backgroundImage: join(
          noise(0.6, 0.16, 3, [0.35, 2.4]),
          `repeating-linear-gradient(90deg, rgba(0,0,0,.025) 0 2px, transparent 2px 7px)`,
          `linear-gradient(165deg, ${shade(c, 0.16)}, ${c} 50%, ${shade(c, -0.12)})`,
        ),
        boxShadow: join(rim(0.6, "255,240,220"), shadow),
        borderRadius: radius,
      };
    case "wax":
      return {
        backgroundColor: c,
        backgroundImage: join(
          `radial-gradient(circle at 34% 28%, ${shade(c, 0.42)} 0 12%, transparent 34%)`,
          `radial-gradient(circle at 50% 55%, ${c} 0 58%, ${shade(c, -0.28)} 100%)`,
          noise(1.4, 0.12),
        ),
        boxShadow: join(`inset -3px -5px 9px ${shade(c, -0.4)}66`, `inset 3px 4px 6px ${shade(c, 0.5)}55`, shadow),
        borderRadius: radius,
      };
    case "foil":
      return {
        backgroundColor: c,
        backgroundImage: join(
          `linear-gradient(115deg, ${shade(c, -0.18)} 0%, ${shade(c, 0.55)} 28%, ${c} 42%, ${shade(c, 0.7)} 55%, ${shade(c, -0.12)} 78%, ${shade(c, 0.3)} 100%)`,
          noise(2.2, 0.08),
        ),
        backgroundSize: "220% 220%, 160px 160px",
        boxShadow: join(rim(1.2), shadow),
        borderRadius: radius,
      };
    case "fabric":
      return {
        backgroundColor: c,
        // A fine weave: two crossing thread patterns.
        backgroundImage: join(
          `repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0 1px, transparent 1px 3px)`,
          `repeating-linear-gradient(90deg, rgba(0,0,0,.07) 0 1px, transparent 1px 3px)`,
          `linear-gradient(160deg, ${shade(c, 0.12)}, ${c} 55%, ${shade(c, -0.14)})`,
        ),
        boxShadow: join(rim(0.5), shadow),
        borderRadius: radius,
      };
    case "glass":
      return {
        backgroundColor: `${c}55`,
        backgroundImage: join(
          `linear-gradient(125deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.08) 32%, transparent 33%, transparent 64%, rgba(255,255,255,.18) 65%, transparent 80%)`,
        ),
        boxShadow: join(`inset 0 0 0 1px rgba(255,255,255,.55)`, `inset 1px 2px 0 rgba(255,255,255,.7)`, shadow),
        borderRadius: radius,
      };
    case "capiz":
      return {
        backgroundColor: c,
        // Translucent shell: soft glow from behind, milky streaks, pearly sheen.
        backgroundImage: join(
          `radial-gradient(120% 90% at 50% 40%, rgba(255,250,235,.95), ${c} 60%, ${shade(c, -0.1)})`,
          `repeating-linear-gradient(72deg, rgba(255,255,255,.18) 0 2px, transparent 2px 9px)`,
          `linear-gradient(135deg, rgba(255,220,240,.18), rgba(200,240,255,.16), rgba(255,240,200,.18))`,
          noise(0.7, 0.07),
        ),
        boxShadow: join(`inset 0 0 22px rgba(255,214,140,.35)`, rim(0.8), shadow),
        borderRadius: radius,
      };
    case "frost":
      return {
        backgroundColor: `${c}D9`,
        backgroundImage: join(noise(1.6, 0.22, 3), `radial-gradient(140% 100% at 50% 0%, rgba(255,255,255,.6), transparent 70%)`),
        boxShadow: join(`inset 0 0 30px rgba(255,255,255,.6)`, `inset 0 0 0 1px rgba(255,255,255,.7)`, shadow),
        borderRadius: radius,
      };
    case "wood":
      return {
        backgroundColor: c,
        backgroundImage: join(
          noise(0.5, 0.2, 3, [0.08, 3]),
          `repeating-linear-gradient(92deg, ${shade(c, -0.12)} 0 1px, transparent 1px 11px)`,
          `linear-gradient(170deg, ${shade(c, 0.14)}, ${c} 50%, ${shade(c, -0.18)})`,
        ),
        boxShadow: join(rim(0.5, "255,230,200"), shadow),
        borderRadius: radius,
      };
    case "metal":
      return {
        backgroundColor: c,
        backgroundImage: join(
          `repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 2px)`,
          `linear-gradient(115deg, ${shade(c, -0.25)} 0%, ${shade(c, 0.6)} 30%, ${c} 48%, ${shade(c, 0.4)} 62%, ${shade(c, -0.2)} 100%)`,
        ),
        boxShadow: join(rim(1.3), shadow),
        borderRadius: radius,
      };
  }
}

/** The house lighting, in one place, for themes that draw their own shading. */
export const LIGHTING = {
  /** Where the key light comes from, as CSS angles: highlights at the top left. */
  highlightAt: "34% 26%",
  /** Shadows fall this way (x, y), in px per unit of lift. */
  shadowDir: [0.35, 1] as const,
  /** Gradients run from lit to shaded at this angle. */
  gradientAngle: "160deg",
  elevation,
  rim,
};
