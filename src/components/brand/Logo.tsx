/**
 * DRAFT logo for "Keepsake Modern": a gift tag with a small heart cutout, plus the wordmark
 * in Fraunces. Only used on /dev/design until it's approved. A designer may refine the mark later.
 */

/** Tag body with the string hole and the heart punched out (even-odd fill). */
const TAG =
  "M11.2 8H26a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H11.2a2 2 0 0 1-1.5-.7L4.6 17.3a2 2 0 0 1 0-2.6l5.1-6a2 2 0 0 1 1.5-.7Z" +
  "M9.6 14.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2Z" +
  "M19.4 20.1c-3.9-2.4-4.6-4.5-3.9-5.9.7-1.3 2.8-1.5 3.9 0 1.1-1.5 3.2-1.3 3.9 0 .7 1.4 0 3.5-3.9 5.9Z";

export function TagMark({ size = 32, color = "#C2366B", string = "#2B2522", title }: { size?: number; color?: string; string?: string | null; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <g transform="rotate(-14 16 16)">
        {string ? <path d="M9.6 16c-3-1.2-5.4-4.4-5.6-8.4" fill="none" stroke={string} strokeWidth="1.4" strokeLinecap="round" /> : null}
        <path d={TAG} fill={color} fillRule="evenodd" />
      </g>
    </svg>
  );
}

type Variant = "horizontal" | "stacked";

export function Lockup({
  variant = "horizontal",
  size = 32,
  mono,
  className = "",
}: {
  variant?: Variant;
  size?: number;
  /** One colour for everything (stamps, emails on dark, embossing). */
  mono?: string;
  className?: string;
}) {
  const ink = mono ?? "#2B2522";
  const mark = <TagMark size={variant === "stacked" ? size * 1.5 : size} color={mono ?? "#C2366B"} string={mono ?? "#2B2522"} />;
  const word = (
    <span
      style={{
        fontFamily: "var(--kd-display)",
        fontVariationSettings: '"SOFT" 100, "WONK" 0',
        fontWeight: 520,
        fontSize: size * 0.72,
        letterSpacing: "-0.02em",
        color: ink,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      Just Because
    </span>
  );
  return variant === "stacked" ? (
    <span className={`inline-flex flex-col items-center gap-1.5 ${className}`} aria-label="Just Because" role="img">
      {mark}
      {word}
    </span>
  ) : (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Just Because" role="img">
      {mark}
      {word}
    </span>
  );
}

/** Favicon / app icon: the mark on paper (or raspberry for the app icon), rounded like an OS icon. */
export function AppIcon({ size = 96, tone = "paper" }: { size?: number; tone?: "paper" | "raspberry" }) {
  const bg = tone === "paper" ? "#FAF6F0" : "#C2366B";
  const fg = tone === "paper" ? "#C2366B" : "#FFFFFF";
  return (
    <span className="grid place-items-center" style={{ width: size, height: size, borderRadius: size * 0.23, background: bg, boxShadow: "inset 0 0 0 1px rgb(43 37 34 / .08)" }}>
      <TagMark size={size * 0.7} color={fg} string={tone === "paper" ? "#2B2522" : "#FFFFFF"} />
    </span>
  );
}
