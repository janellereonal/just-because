import { useMemo } from "react";
import type { ThemeKind } from "@/lib/themeKind";
import { pick, type IconSet } from "@/themes/_shared/iconSets";
import { IconGlyph } from "@/themes/_shared/Sprinkles";

/**
 * Background layers for an occasion skin: a palette-tinted pattern over the whole
 * gift, and particles near the top (snow, confetti, hearts, petals, sparkles...).
 * Everything is decorative, absolutely positioned inside the gift's own
 * overflow-hidden wrapper (so nothing leaks over the editor), and animates
 * transform/opacity only. Reduced motion freezes it (styles/skins.css).
 */

type Particle = {
  left: number;
  top: number;
  size: number;
  delay: number;
  dur: number;
  drift: number;
  hue: number;
};

const COUNTS: Record<ThemeKind, number> = {
  valentine: 16,
  birthday: 34,
  voyage: 5,
  christmas: 46,
  pets: 10,
  newyear: 40,
  anniversary: 22,
  wedding: 16,
  bridal: 18,
  baby: 16,
  handwritten: 12,
  game: 22,
  pixel: 26,
  default: 12,
};

/** Seeded random, so server and browser draw the same particles. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Just the floating particles, for openings with the creator's own background. */
export function SkinParticles({ kind, icons }: { kind: ThemeKind; icons?: IconSet | undefined }) {
  return <SkinDecor kind={kind} pattern={false} icons={icons} />;
}

/**
 * `icons`: the gift's icon set. When given, every particle is drawn from it
 * (hearts, paws, the creator's own emoji…) instead of the skin's CSS shapes.
 */
export function SkinDecor({
  kind,
  pattern = true,
  icons,
  colors = [],
}: {
  kind: ThemeKind;
  pattern?: boolean;
  icons?: IconSet | undefined;
  colors?: string[];
}) {
  const tint = icons?.colors.length ? icons.colors : colors.length ? colors : ["#FFFFFF"];
  const particles = useMemo<Particle[]>(() => {
    const r = rng(kind.length * 97 + 13);
    return Array.from({ length: COUNTS[kind] }, () => ({
      left: r() * 100,
      top: r() * 100,
      size: 0.6 + r() * 0.9,
      delay: -r() * 14,
      dur: 9 + r() * 10,
      drift: (r() - 0.5) * 80,
      hue: Math.floor(r() * 5),
    }));
  }, [kind]);

  return (
    <div className="sk-decor" aria-hidden="true">
      {pattern ? <div className="sk-pattern" /> : null}
      <div className="sk-sky">
        {kind === "birthday" ? <Bunting /> : null}
        {kind === "christmas" ? <Lights /> : null}
        {kind === "voyage" ? <Route /> : null}
        {kind === "newyear" ? <Fireworks /> : null}
        {particles.map((p, i) => (
          <i
            key={i}
            className={icons ? "sk-p sk-ico" : "sk-p"}
            data-h={p.hue}
            style={
              {
                left: `${p.left}%`,
                top: `${p.top}%`,
                "--s": p.size,
                "--dx": `${p.drift}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
              } as React.CSSProperties
            }
          >
            {icons ? <IconGlyph item={pick(icons.items, i)} color={pick(tint, p.hue)} size={Math.round(12 * p.size + 6)} /> : null}
          </i>
        ))}
      </div>
    </div>
  );
}

function Bunting() {
  return (
    <div className="sk-bunting">
      {Array.from({ length: 22 }, (_, i) => (
        <span key={i} data-h={i % 5} style={{ animationDelay: `${(i % 7) * 0.15}s` }} />
      ))}
    </div>
  );
}

function Lights() {
  return (
    <div className="sk-lights">
      {Array.from({ length: 18 }, (_, i) => (
        <span key={i} data-h={i % 4} style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
      ))}
    </div>
  );
}

function Route() {
  return (
    <svg className="sk-route" viewBox="0 0 1000 300" preserveAspectRatio="none">
      <path
        d="M-20 250 C 200 40, 420 40, 560 150 S 860 260, 1020 60"
        fill="none"
        strokeDasharray="2 12"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Fireworks() {
  return (
    <div className="sk-fireworks">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} data-i={i}>
          {Array.from({ length: 12 }, (_, k) => (
            <b key={k} style={{ transform: `rotate(${k * 30}deg)` }} />
          ))}
        </span>
      ))}
    </div>
  );
}
