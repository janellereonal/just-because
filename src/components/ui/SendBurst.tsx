import type { CSSProperties } from "react";

/**
 * A small pop of paper bits from the middle of its (position: relative) parent, for a
 * "sent" moment. Decorative and silent; styles in src/styles/polish.css (hidden under
 * reduced motion). Give it a new `key` to play it again. `delay` (ms) waits for a scroll to land first.
 */
export function SendBurst({ colors, count = 14, delay = 0 }: { colors: string[]; count?: number; delay?: number }) {
  const list = colors.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <span className="jb-pop" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        // Even spread around the circle, a little uneven in distance so it doesn't look stamped.
        const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
        const dist = 70 + ((i * 37) % 50);
        const style = {
          background: list[i % list.length],
          "--dx": `${Math.round(Math.cos(angle) * dist * 1.5)}px`,
          "--dy": `${Math.round(Math.sin(angle) * dist - 24)}px`,
          "--r": `${(i % 2 ? 1 : -1) * (120 + ((i * 53) % 200))}deg`,
          animationDelay: `${delay + (i % 4) * 25}ms`,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </span>
  );
}
