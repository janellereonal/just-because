/**
 * Parol's body: a street of lanterns.
 *
 * The opening's capiz star now hangs over the top of the page with their
 * initial in the rosette. Below it is a street at night: wires strung across
 * between the roofs, and a parol hanging from them for every note, each in its
 * own colors, all dim. Tap one and it lights up (a warm glow, a little flicker,
 * a swing on its string) and the note opens. Lit lanterns stay lit on this
 * device, and the street gets brighter as more are lit: the sky warms and the
 * windows of the houses come on.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime } from "@/lib/play";
import { loadFont, type FontSpec } from "@/themes/_shared/design";
import { formatDay } from "@/lib/time";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

/** The parol opening's display face. */
const DISPLAY: FontSpec = {
  family: '"Young Serif", Georgia, serif',
  source: "google",
  query: "Young+Serif",
};

/* ---------- the star: same geometry as the opening's, in a 100 x 150 box ---------- */
const C = { x: 50, y: 46 };
const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: C.x + Math.cos(a) * r, y: C.y + Math.sin(a) * r };
};
const TIPS = Array.from({ length: 5 }, (_, k) => pt(-90 + 72 * k, 44));
const INNER = Array.from({ length: 5 }, (_, k) => pt(-90 + 72 * k + 36, 19));
const f = (n: number) => n.toFixed(1);
const TRIS = Array.from({ length: 10 }, (_, i) => {
  const k = Math.floor(i / 2);
  const a = i % 2 === 0 ? INNER[(k + 4) % 5]! : TIPS[k]!;
  const b = i % 2 === 0 ? TIPS[k]! : INNER[k]!;
  return `M${C.x} ${C.y}L${f(a.x)} ${f(a.y)}L${f(b.x)} ${f(b.y)}Z`;
});
const OUTLINE =
  TIPS.flatMap((tip, k) => [tip, INNER[k]!])
    .map((p, i) => `${i ? "L" : "M"}${f(p.x)} ${f(p.y)}`)
    .join("") + "Z";
const SPOKES = TIPS.map(
  (p, k) => `M${C.x} ${C.y}L${f(p.x)} ${f(p.y)}M${C.x} ${C.y}L${f(INNER[k]!.x)} ${f(INNER[k]!.y)}`,
).join("");
const TAILS = [TIPS[3]!, TIPS[2]!].map((tip, si) => {
  const dir = si ? 1 : -1;
  const end = { x: tip.x + dir * 3, y: tip.y + 52 };
  return {
    d: `M${f(tip.x)} ${f(tip.y)}C${f(tip.x + dir * 10)} ${f(tip.y + 18)} ${f(tip.x - dir * 8)} ${f(tip.y + 34)} ${f(end.x)} ${f(end.y)}`,
    fringe: [-3, -1.5, 0, 1.5, 3]
      .map((dx) => `M${f(end.x + dx)} ${f(end.y)}l${f(dx * 0.5)} 8`)
      .join(""),
  };
});
const ROSETTE = Array.from({ length: 8 }, (_, k) => pt(k * 45, 8.5));

/** A parol's colors (the ones you see on Filipino streets in December). */
const HUES = ["#E8B04B", "#D9473F", "#3E9E6A", "#4C82D6", "#E36FA2", "#F3E6C8"];

export function LanternsBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, reduce } = body;
  useEffect(() => loadFont(DISPLAY, "high"), []);
  const display =
    !body.site.font_choice || body.site.font_choice === "theme"
      ? DISPLAY.family
      : body.fonts.heading;
  const { opened: lit, open: light } = useOpened("lanterns", body.site.id, body.sample);
  const [swinging, setSwinging] = useState<string | null>(null);
  const [fizzle, setFizzle] = useState<string | null>(null);
  const notes = data.notes;
  const litCount = notes.filter((p) => lit.has(p.id)).length;
  const glow = notes.length ? litCount / notes.length : 0;
  const name = data.named ? data.name : "";
  const dark = colors.dark;

  // Wires hold as many lanterns as fit the street's width.
  const streetRef = useRef<HTMLDivElement | null>(null);
  const [perWire, setPerWire] = useState(4);
  useEffect(() => {
    const el = streetRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = e!.contentRect.width;
      setPerWire(w < 540 ? 4 : w < 820 ? 5 : w < 1040 ? 6 : 7);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const wires = useMemo(() => {
    const out: Piece[][] = [];
    for (let i = 0; i < notes.length; i += perWire) out.push(notes.slice(i, i + perWire));
    return out;
  }, [notes, perWire]);

  // Each hue lit and unlit, worked out once for this palette.
  const hues = useMemo(() => {
    const night = dark
      ? colors.mix(colors.bg, "#050816", 0.3)
      : colors.mix(colors.bg, "#FFFFFF", 0.4);
    return HUES.map((h, i) => {
      const hue = i === 0 ? colors.mix(colors.primary, h, 0.35) : h;
      return {
        "--l1": colors.mix(hue, "#FFFFFF", 0.55),
        "--l2": hue,
        "--d1": colors.mix(hue, night, dark ? 0.7 : 0.62),
        "--d2": colors.mix(hue, night, dark ? 0.8 : 0.5),
        "--glow": colors.mix(hue, "#FFE3A0", 0.5),
        "--tail": colors.mix(hue, "#FFFFFF", 0.2),
      } as React.CSSProperties;
    });
  }, [colors, dark]);

  function tap(p: Piece, e: React.MouseEvent) {
    const x = e.clientX;
    const y = e.clientY;
    if (isLocked(p)) {
      // Not yet: it flickers and goes dark again.
      setFizzle(p.id);
      window.setTimeout(() => setFizzle(null), 700);
      buzz([5, 40, 5]);
      window.setTimeout(() => body.read(p), reduce ? 0 : 420);
      return;
    }
    if (lit.has(p.id)) {
      body.read(p);
      return;
    }
    light(p.id);
    setSwinging(p.id);
    window.setTimeout(() => setSwinging((s) => (s === p.id ? null : s)), 1500);
    chime("sparkle");
    buzz(8);
    burst(body.hostRef.current, x, y, {
      shape: "sparkles",
      colors: ["#FFF4D6", "#FFD9A0", colors.primary],
      count: 10,
      spread: 0.7,
    });
    if (litCount + 1 === notes.length) window.setTimeout(() => chime("tada"), 500);
    window.setTimeout(() => body.read(p), reduce ? 0 : 460);
  }

  return (
    <BodyRoot
      body={body}
      className={`pl-root ${dark ? "is-dark" : "is-light"}`}
      style={
        {
          "--pl-glow": glow.toFixed(3),
          "--pl-display": display,
          "--pl-sky": dark ? colors.bg : colors.mix(colors.bg, colors.accent, 0.12),
          "--pl-sky-lo": dark
            ? colors.mix(colors.bg, colors.accent, 0.12)
            : colors.mix(colors.bg, "#FFD9A0", 0.35),
          "--pl-house": dark
            ? colors.mix(colors.bg, "#000000", 0.42)
            : colors.mix(colors.mix(colors.bg, colors.primary, 0.3), "#D9A27A", 0.4),
          "--pl-house-hi": dark
            ? colors.mix(colors.bg, colors.primary, 0.22)
            : colors.mix(colors.mix(colors.bg, colors.primary, 0.15), "#FFD9A0", 0.45),
          "--pl-roof": dark
            ? colors.mix(colors.bg, "#000000", 0.58)
            : colors.mix(colors.primary, "#7A3E22", 0.55),
          "--pl-wire": dark
            ? colors.mix(colors.bg, "#FFFFFF", 0.32)
            : colors.mix(colors.bg, colors.ink, 0.55),
          "--pl-gold": colors.mix(colors.primary, "#E8B04B", 0.5),
          "--pl-frame": dark ? "#C9A55C" : "#A9843E",
          "--pl-ground": dark
            ? colors.mix(colors.bg, "#000000", 0.5)
            : colors.mix(colors.bg, colors.ink, 0.1),
          "--pl-ground-ink": dark ? "#F6EEDC" : colors.ink,
        } as React.CSSProperties
      }
    >
      <div className="pl-sky" aria-hidden="true">
        <span className="pl-moon" />
        <span className="pl-warm" />
      </div>
      {/* Shared paint for every lantern: the capiz shells and a warm core. */}
      <svg className="pl-defs" aria-hidden="true" focusable="false">
        <defs>
          <pattern
            id="pl-capiz"
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(18)"
          >
            <rect
              x="0.5"
              y="0.5"
              width="6"
              height="6"
              rx="1.8"
              fill="none"
              stroke="rgba(255,255,255,.26)"
              strokeWidth="0.5"
            />
          </pattern>
          <radialGradient id="pl-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#FFF4D6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#FFF4D6" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <div className="relative mx-auto max-w-6xl px-4 pb-0">
        <header className="pl-head">
          <div className="pl-hero" aria-hidden="true">
            <span className="pl-hero-glow" />
            <span className="pl-hero-swing">
              <ParolSvg mono={initial(name || "★")} big />
            </span>
          </div>
          <p className="pl-kicker">{t("lanterns.kicker")}</p>
          <h1 className="pl-name">
            {name ? <SampleText on={data.nameIsSample}>{name}</SampleText> : body.heading}
          </h1>
          {name ? <p className="pl-heading">{body.heading}</p> : null}
          <p className="pl-intro">{body.intro || body.voice.intro(name)}</p>
          <CountdownLine date={data.countdownDate} className="pl-countdown" />
        </header>

        <p className="pl-progress" role="status" aria-live="polite">
          {notes.length === 0
            ? body.voice.empty(t("lanterns.what"))
            : litCount === 0
              ? t("lanterns.start", { n: notes.length })
              : litCount === notes.length
                ? t("lanterns.allLit")
                : t("lanterns.progress", { n: litCount, total: notes.length })}
        </p>

        <div className="pl-street" ref={streetRef}>
          {wires.map((row, w) => (
            <Wire
              key={`${perWire}-${w}`}
              row={row}
              index={w}
              per={perWire}
              lit={lit}
              glow={glow}
              hues={hues}
              swinging={swinging}
              fizzle={fizzle}
              onTap={tap}
            />
          ))}
          {notes.length === 0 ? (
            <section className="pl-block is-empty">
              <Houses index={0} count={5} glow={0.4} />
            </section>
          ) : null}
        </div>
      </div>

      {/* The street itself: banderitas with their words, then the pavement */}
      <div className="pl-ground">
        <div className="relative mx-auto max-w-6xl px-4">
          {data.words.length ? (
            <section className="pl-words" aria-label={t("lanterns.wordsTitle")}>
              <p className="pl-words-title">{t("lanterns.wordsTitle")}</p>
              <ul className="pl-flags">
                {data.words.map((w, i) => (
                  <li
                    key={w.id}
                    style={
                      {
                        "--c": HUES[i % HUES.length],
                        "--r": `${((seed(w.id) - 0.5) * 8).toFixed(1)}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <span>{w.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <BodyFooter
            body={body}
            className="pl-footer"
            buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
          />
        </div>
      </div>

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.primary, "#7A4A10", 0.45)}
          className="pl-reader"
        >
          <span className="pl-reader-star" aria-hidden="true">
            <svg viewBox="0 0 100 100">
              <path d={OUTLINE} transform="translate(0 4)" />
            </svg>
          </span>
          <p className="pl-reader-kicker">
            {t("lanterns.readerKicker", { n: notes.indexOf(body.reading) + 1 })}
          </p>
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/** One wire across the street, its lanterns, and the roofs below it. */
function Wire({
  row,
  index,
  per,
  lit,
  glow,
  hues,
  swinging,
  fizzle,
  onTap,
}: {
  row: Piece[];
  index: number;
  per: number;
  lit: Set<string>;
  glow: number;
  hues: React.CSSProperties[];
  swinging: string | null;
  fizzle: string | null;
  onTap: (p: Piece, e: React.MouseEvent) => void;
}) {
  // The wire: one end a little higher than the other, sagging in the middle (in % of the block).
  const left = 5 + seed(`wire-l-${index}`) * 7;
  const right = 5 + seed(`wire-r-${index}`) * 7;
  const sag = 7;
  const y = (x: number) => left + (right - left) * x + 4 * sag * x * (1 - x);
  const path = Array.from(
    { length: 21 },
    (_, i) => `${i ? "L" : "M"}${i * 5} ${y(i / 20).toFixed(2)}`,
  ).join("");
  return (
    <section className="pl-block">
      <Houses index={index} count={per + 1} glow={glow} />
      <svg className="pl-wire" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={path} vectorEffect="non-scaling-stroke" />
      </svg>
      <ul className="pl-row">
        {row.map((p, j) => {
          const r = seed(p.id);
          const x = (j + 0.5) / per + (r - 0.5) * (0.3 / per);
          const len = 3 + (j % 2) * 8 + r * 5;
          const on = lit.has(p.id);
          return (
            <li
              key={p.id}
              className="pl-spot"
              style={
                {
                  left: `${(x * 100).toFixed(2)}%`,
                  top: `${y(x).toFixed(2)}%`,
                  "--len": (len / 100).toFixed(3),
                  "--sway": `${(4.2 + r * 2.6).toFixed(2)}s`,
                  "--delay": `${(-r * 5).toFixed(2)}s`,
                  "--flick": `${(2.2 + r * 2).toFixed(2)}s`,
                  ...hues[Math.floor(seed(`${p.id}-hue`) * hues.length)],
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className={`pl-lantern ${on ? "is-lit" : ""} ${swinging === p.id ? "is-swinging" : ""} ${fizzle === p.id ? "is-fizzle" : ""}`}
                onClick={(e) => onTap(p, e)}
                aria-label={pieceLabel(p)}
                aria-pressed={on}
              >
                <span className="pl-string" />
                <span className="pl-body">
                  <span className="pl-halo" />
                  <ParolSvg mono={p.sealed || isLocked(p) ? "" : initial(p.author || "★")} />
                  {p.sealed || isLocked(p) ? (
                    <span className="pl-lock">
                      <Lock className="size-3" />
                    </span>
                  ) : null}
                  {/* A little paper tag on a thread, hanging between the tails */}
                  <span
                    className="pl-tag"
                    style={{ "--tr": `${((r - 0.5) * 10).toFixed(1)}deg` } as React.CSSProperties}
                  >
                    <span className="pl-tag-text">
                      {isLocked(p)
                        ? t("body.opensOn", {
                            day: formatDay(p.date!, { day: "numeric", month: "short" }),
                          })
                        : p.author || t("lanterns.surprise")}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** A parol, drawn the same way as the opening's: ten capiz panels, a rosette, two tails. */
function ParolSvg({ mono, big = false }: { mono: string; big?: boolean }) {
  return (
    <svg
      viewBox="0 0 100 150"
      className={`pl-parol ${big ? "is-big" : ""}`}
      aria-hidden="true"
      focusable="false"
    >
      {TAILS.map((tl, i) => (
        <g key={i} className="pl-tail">
          <path d={tl.d} className="pl-tail-band" />
          <path d={tl.fringe} className="pl-tail-fringe" />
        </g>
      ))}
      {TRIS.map((d, i) => (
        <path key={i} d={d} className={i % 2 ? "pl-f2" : "pl-f1"} />
      ))}
      <path d={OUTLINE} fill="url(#pl-capiz)" />
      <circle cx={C.x} cy={C.y} r="40" fill="url(#pl-core)" className="pl-core" />
      <path d={SPOKES} className="pl-spokes" />
      <path d={OUTLINE} className="pl-frame" />
      <circle cx={C.x} cy={C.y} r="12.5" className="pl-rose" />
      {ROSETTE.map((p, k) => (
        <circle key={k} cx={f(p.x)} cy={f(p.y)} r="3.4" className="pl-rose-ring" />
      ))}
      {mono ? (
        <text x={C.x} y={C.y + 4.2} textAnchor="middle" className="pl-mono">
          {mono}
        </text>
      ) : null}
    </svg>
  );
}

/** A row of houses along the street. Windows come on as more lanterns are lit. */
function Houses({ index, count, glow }: { index: number; count: number; glow: number }) {
  const houses = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = seed(`house-${index}-${i}`);
        const r2 = seed(`house2-${index}-${i}`);
        return {
          w: 0.8 + r * 0.9,
          h: 52 + r2 * 40,
          roof: r < 0.4 ? "gable" : r < 0.75 ? "hip" : "flat",
          cols: r2 < 0.5 ? 2 : 3,
          rows: r2 > 0.6 ? 2 : 1,
          capiz: r2 < 0.35,
          tint: Math.floor(seed(`tint-${index}-${i}`) * HUES.length),
          id: `${index}-${i}`,
        };
      }),
    [index, count],
  );
  return (
    <div className="pl-houses" aria-hidden="true">
      {houses.map((h) => (
        <span
          key={h.id}
          className={`pl-house is-${h.roof}`}
          style={{ "--w": h.w, "--h": `${h.h}%`, "--tint": HUES[h.tint] } as React.CSSProperties}
        >
          <span className="pl-roof" />
          <span
            className="pl-wins"
            style={{ gridTemplateColumns: `repeat(${h.cols}, minmax(5px, 15px))` }}
          >
            {Array.from({ length: h.cols * h.rows }, (_, k) => {
              const th = seed(`win-${h.id}-${k}`);
              const on = th < 0.1 || th < glow * 1.05;
              return (
                <span
                  key={k}
                  className={`pl-win ${h.capiz ? "is-capiz" : ""} ${on ? "is-on" : ""}`}
                />
              );
            })}
          </span>
        </span>
      ))}
    </div>
  );
}
