/**
 * The zine's cut-and-paste pieces, shared by the Zine body (ZineView) and its
 * opening (src/themes/layouts/Zine.tsx), so the cover matches the pages.
 */
import { readableInk } from "@/lib/palettes";
import { seed } from "@/components/formats/PieceSheet";

/** Ransom-note letters: every letter cut from a different "magazine". */
export function Ransom({ text, accent }: { text: string; accent: string }) {
  const styles = [
    { background: "#111", color: "#fff" },
    { background: accent, color: readableInk(accent) },
    { background: "#fff", color: "#111", outline: "2px solid #111" },
    { background: "#FFE45C", color: "#111" },
    { background: "transparent", color: "#111" },
  ];
  // Letters stay together by word, so a name only ever wraps between words.
  // Long names get smaller instead of breaking.
  const n = [...text].length;
  const scale = n <= 14 ? 1 : n <= 22 ? 0.8 : n <= 32 ? 0.66 : 0.56;
  let i = 0;
  return (
    <span className="zine-ransom" aria-label={text} style={{ fontSize: `${scale}em` }}>
      {text
        .split(/\s+/)
        .filter(Boolean)
        .map((word, w) => (
          <span
            key={w}
            className={[...word].length > 14 ? "zine-rword zine-rword-long" : "zine-rword"}
            aria-hidden
          >
            {[...word].map((ch) => {
              const k = (i += 1);
              const st = styles[Math.floor(seed(text + k) * styles.length)]!;
              const r = (seed(k + text) - 0.5) * 14;
              return (
                <span
                  key={k}
                  className={k % 3 === 0 ? "zine-letter zine-serif" : "zine-letter"}
                  style={{ ...st, transform: `rotate(${r.toFixed(1)}deg)` }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
    </span>
  );
}

export function Scribble({ color }: { color: string }) {
  return (
    <svg className="zine-scribble" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden>
      <path
        d="M2 14 C 30 4, 60 18, 90 9 S 150 4, 198 12"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
