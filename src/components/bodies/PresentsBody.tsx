/**
 * Gift Box's body: presents piled under a tree.
 *
 * The opening's box was the first present; the rest wait under a Christmas tree,
 * one per note, in different sizes and wrapping papers (stripes, dots, plaid...
 * all in the gift's palette), each tied with a ribbon and a bow and carrying a
 * hanging name tag. Tap one: the bow pulls loose, the lid pops off, tissue paper
 * puffs up and the note rises out into the reader. Unwrapped presents stay open
 * (lid tipped back, tissue showing) on this device.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Lock, Mic, Music2, Camera, Star } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { useCountdown } from "@/lib/giftPieces";
import { burst, buzz, chime, foley } from "@/lib/play";
import {
  BodyFooter,
  BodyRoot,
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

type Body = ReturnType<typeof useBody>;
type Paper = { base: string; ink: string; ribbon: string; pattern: number };

export function PresentsBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("presents", body.site.id, body.sample);
  const [unwrapping, setUnwrapping] = useState<string | null>(null);
  const notes = data.notes;
  const count = notes.filter((p) => opened.has(p.id)).length;

  const gold = "#E2B755";
  const cream = "#FBF4E6";
  // Wrapping papers and ribbons, all from the palette (plus gold and cream).
  const papers = useMemo<Paper[]>(() => {
    const p = colors.primary;
    const a = colors.accent;
    const soft = (c: string) => colors.mix(c, "#FFFFFF", 0.55);
    return [
      { base: p, ink: colors.mix(p, "#FFFFFF", 0.82), ribbon: gold, pattern: 0 },
      { base: cream, ink: p, ribbon: a, pattern: 1 },
      { base: a, ink: colors.mix(a, "#000000", 0.28), ribbon: cream, pattern: 2 },
      { base: soft(p), ink: p, ribbon: colors.mix(a, "#000000", 0.1), pattern: 3 },
      { base: colors.mix(a, cream, 0.15), ink: gold, ribbon: p, pattern: 1 },
      { base: cream, ink: colors.mix(a, "#000000", 0.05), ribbon: p, pattern: 4 },
      { base: colors.mix(p, "#000000", 0.25), ink: gold, ribbon: cream, pattern: 5 },
      { base: soft(a), ink: a, ribbon: p, pattern: 0 },
    ];
  }, [colors]);

  function unwrap(p: Piece, e: React.MouseEvent) {
    if (unwrapping) return;
    const first = !opened.has(p.id);
    const x = e.clientX;
    const y = e.clientY;
    if (!first || reduce) {
      open(p.id);
      body.read(p);
      return;
    }
    setUnwrapping(p.id);
    foley("rip");
    buzz([8, 40, 12]);
    window.setTimeout(() => {
      open(p.id);
      chime("pop");
      if (!p.sealed && !isLocked(p))
        burst(body.hostRef.current, x, y - 30, { shape: "snow", colors: [gold, colors.accent, "#FFFFFF"], count: 12, spread: 0.9, up: true });
    }, 260);
    window.setTimeout(() => {
      setUnwrapping(null);
      body.read(p);
    }, 900);
  }

  const name = data.named ? data.name : "";
  return (
    <BodyRoot
      body={body}
      className="pr-root"
      style={
        {
          "--pr-gold": gold,
          "--pr-cream": cream,
          "--pr-pine": colors.mix("#2E6B4E", colors.accent, 0.18),
          "--pr-pine-deep": colors.mix("#1D4A36", colors.accent, 0.18),
          "--pr-wall": colors.dark ? colors.mix(colors.bg, "#000000", 0.1) : colors.mix(colors.bg, colors.primary, 0.04),
          "--pr-floor": colors.mix("#DDC19E", colors.primary, 0.04),
          "--pr-floor-deep": colors.mix("#C9A276", colors.primary, 0.06),
          "--pr-skirt": colors.primary,
          "--pr-title": colors.dark ? colors.mix(colors.primary, "#FFFFFF", 0.5) : colors.primary,
        } as React.CSSProperties
      }
    >
      <div className="pr-wall" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pt-[clamp(28px,7vh,72px)]">
        <header className="pr-head" data-gift-page="">
          <p className="pr-kicker">{t("presents.kicker")}</p>
          <h1 className="pr-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? (
              <>
                {t("presents.for")} <SampleText on={data.nameIsSample}>{data.name}</SampleText>
              </>
            ) : (
              body.heading
            )}
          </h1>
          {data.named ? (
            <p className="pr-heading" style={{ fontFamily: fonts.heading }}>
              {body.heading}
            </p>
          ) : null}
          <p className="pr-intro">{body.intro || body.voice.intro(name)}</p>
          <CountdownTag date={data.countdownDate} />
        </header>

        <div className="pr-tree-wrap">
          <Tree />
        </div>
      </div>

      <section className="pr-floor" aria-label={t("presents.what")}>
        <div className="relative mx-auto max-w-6xl px-3">
          <p className="pr-progress" role="status" aria-live="polite">
            {notes.length === 0
              ? body.voice.empty(t("presents.what"))
              : count === 0
                ? `${t("presents.count", { n: notes.length })}. ${t("presents.hint")}`
                : count === notes.length
                  ? t("presents.allRead")
                  : t("presents.progress", { n: count, total: notes.length })}
          </p>
          <ul className="pr-pile">
            {notes.map((p, i) => (
              <li key={p.id} style={{ zIndex: i + 1, "--lift": `${Math.round(seed(`${p.id}-lift`) * 16)}px` } as React.CSSProperties}>
                <Present
                  piece={p}
                  paper={papers[Math.floor(seed(`${p.id}-paper`) * papers.length) % papers.length]!}
                  open={opened.has(p.id)}
                  unwrapping={unwrapping === p.id}
                  onOpen={(e) => unwrap(p, e)}
                  recipient={name}
                />
              </li>
            ))}
          </ul>

          {data.words.length ? (
            <section className="pr-words" aria-label={t("presents.wordsTitle")}>
              <p className="pr-words-title" style={{ fontFamily: fonts.heading }}>
                {t("presents.wordsTitle")}
              </p>
              <ul className="pr-garland">
                {data.words.map((w, i) => (
                  <li key={w.id} style={{ "--sw": `${((seed(w.id) - 0.5) * 10).toFixed(1)}deg`, "--d": `${(i % 7) * -0.4}s` } as React.CSSProperties}>
                    <span className="pr-word">{w.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <BodyFooter body={body} className="pr-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
        </div>
      </section>

      {body.reading ? <Card body={body} piece={body.reading} /> : null}
    </BodyRoot>
  );
}

/** The countdown on a gift tag: "Don't open until". */
function CountdownTag({ date }: { date: string | null }) {
  const c = useCountdown(date);
  // Client only: the minutes would differ between the server render and hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!c) return null;
  if (!mounted) return <div className="pr-ctag is-waiting" aria-hidden="true" />;
  return (
    <div className="pr-ctag" role="timer">
      <span className="pr-ctag-hole" aria-hidden="true" />
      <span className="pr-ctag-label">{c.done ? t("presents.openNow") : t("presents.dontOpen")}</span>
      {c.done ? null : <span className="pr-ctag-time">{t("body.countdown.left", { days: c.days, hours: c.hours, mins: c.mins })}</span>}
    </div>
  );
}

/** The tree: tiers of pine, a garland, baubles, twinkling lights and a star. */
function Tree() {
  const lights = [
    [150, 92], [128, 120], [176, 128], [110, 170], [150, 160], [196, 176], [92, 222], [136, 214], [182, 226], [214, 210],
    [78, 272], [120, 264], [162, 276], [206, 262], [236, 280], [104, 314], [150, 318], [196, 312],
  ];
  const baubles: [number, number, number, number][] = [
    [140, 140, 9, 0], [172, 104, 7, 1], [120, 196, 10, 2], [196, 200, 9, 0], [156, 240, 11, 1], [96, 250, 9, 0], [222, 246, 9, 2],
    [130, 296, 11, 2], [184, 296, 10, 0], [72, 304, 8, 1], [236, 306, 8, 1],
  ];
  return (
    <svg viewBox="0 0 300 400" className="pr-tree" aria-hidden="true">
      <defs>
        <radialGradient id="pr-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFE9B0" stopOpacity=".42" />
          <stop offset="55%" stopColor="#FFE9B0" stopOpacity=".12" />
          <stop offset="100%" stopColor="#FFE9B0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pr-pine" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--pr-pine)" />
          <stop offset="60%" stopColor="var(--pr-pine)" />
          <stop offset="100%" stopColor="var(--pr-pine-deep)" />
        </linearGradient>
        <radialGradient id="pr-bauble" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity=".85" />
          <stop offset="25%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity=".28" />
        </radialGradient>
      </defs>
      <ellipse cx="150" cy="190" rx="150" ry="190" fill="url(#pr-glow)" />
      {/* trunk */}
      <rect x="138" y="338" width="24" height="40" rx="4" fill="#7A5236" />
      <rect x="138" y="338" width="9" height="40" rx="3" fill="#94683F" />
      {/* tiers, back to front */}
      <path className="pr-tier" d="M150 236 L262 346 Q236 360 206 350 Q178 364 150 352 Q122 364 94 350 Q64 360 38 346 Z" />
      <path className="pr-tier" d="M150 150 L240 262 Q218 276 194 266 Q172 280 150 268 Q128 280 106 266 Q82 276 60 262 Z" />
      <path className="pr-tier" d="M150 70 L214 178 Q196 190 176 182 Q162 192 150 184 Q138 192 124 182 Q104 190 86 178 Z" />
      {/* needles: light edges on the left of each tier */}
      <path d="M150 74 L96 172 M150 154 L70 256 M150 240 L50 340" className="pr-needle" />
      {/* garlands */}
      <path d="M112 136 Q150 162 196 138" className="pr-swag" />
      <path d="M84 216 Q150 252 222 214" className="pr-swag" />
      <path d="M62 300 Q150 338 244 298" className="pr-swag" />
      {baubles.map(([x, y, r, c], i) => (
        <g key={i} className={`pr-bauble is-${c}`}>
          <rect x={x - 2.5} y={y - r - 3} width="5" height="4" rx="1" fill="#D9B45A" />
          <circle cx={x} cy={y} r={r} />
          <circle cx={x} cy={y} r={r} fill="url(#pr-bauble)" />
        </g>
      ))}
      {lights.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" className="pr-light" style={{ animationDelay: `${(i * 0.37) % 2.2}s` }} />
      ))}
      {/* star */}
      <g className="pr-star" transform="translate(150 62)">
        <circle r="26" fill="#FFE39A" opacity=".35" className="pr-star-glow" />
        <path d="M0-22 6.5-7 22-6 10 4.5 13.5 20 0 11.5-13.5 20-10 4.5-22-6-6.5-7Z" fill="var(--pr-gold)" stroke="#B88A2E" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M0-22 6.5-7 0 0Z M22-6 10 4.5 0 0Z" fill="#fff" opacity=".35" />
      </g>
      {/* tree skirt */}
      <ellipse cx="150" cy="380" rx="118" ry="17" fill="var(--pr-skirt)" />
      <ellipse cx="150" cy="378" rx="118" ry="15" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

/** Box sizes [width, height, depth] by kind, so the pile has big ones, flat ones and tall ones. */
function sizeOf(p: Piece): [number, number, number] {
  const r = seed(`${p.id}-size`);
  if (p.kind === "photo") return [118, 44, 22];
  if (p.kind === "song" || p.kind === "voice") return [72, 100, 18];
  if (p.kind === "ornament") return [66, 58, 16];
  if (p.kind === "calendar") return [86, 70, 20];
  const all: [number, number, number][] = [
    [98, 74, 22],
    [82, 82, 20],
    [120, 86, 24],
    [88, 62, 20],
    [104, 92, 22],
  ];
  return all[Math.floor(r * all.length) % all.length]!;
}

function Present({
  piece,
  paper,
  open,
  unwrapping,
  onOpen,
  recipient,
}: {
  piece: Piece;
  paper: Paper;
  open: boolean;
  unwrapping: boolean;
  onOpen: (e: React.MouseEvent) => void;
  recipient: string;
}) {
  const [w, h, d] = sizeOf(piece);
  const lh = Math.round(Math.max(16, h * 0.24));
  const W = w + d;
  const H = h + d;
  const b = Math.max(5, Math.round(w * 0.075)); // half the ribbon width
  const cx = w / 2;
  const locked = isLocked(piece);
  const tilt = (seed(`${piece.id}-tilt`) - 0.5) * 6;
  // Bow sits where the two top bands cross.
  const bx = cx + d / 2;
  const by = d / 2;
  // The tag hangs off the front, left of the ribbon.
  const tx = Math.max(6, w * 0.08);
  const ty = d + lh + 6;
  const KindIcon = piece.sealed || locked ? Lock : piece.kind === "photo" ? Camera : piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : piece.kind === "ornament" ? Star : piece.kind === "calendar" ? CalendarDays : null;
  const style = {
    "--w": `${w}px`,
    "--h": `${h}px`,
    "--d": `${d}px`,
    "--lh": `${lh}px`,
    "--paper": paper.base,
    "--paper-ink": paper.ink,
    "--ribbon": paper.ribbon,
    "--tilt": `${tilt.toFixed(1)}deg`,
    width: W,
    height: H,
  } as React.CSSProperties;
  return (
    <button
      type="button"
      className={`pr-gift is-p${paper.pattern} ${open ? "is-open" : ""} ${unwrapping ? "is-unwrapping" : ""}`}
      style={style}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="pr-shadow" aria-hidden="true" />
      {/* the box */}
      <span className="pr-inside" aria-hidden="true" style={{ clipPath: `polygon(0 ${d}px, ${d}px 0, 100% 0, ${w}px ${d}px)` }} />
      <span className="pr-tissue" aria-hidden="true">
        <span style={{ left: "14%", rotate: "-16deg" }} />
        <span style={{ left: "38%", rotate: "6deg", height: "120%" }} />
        <span style={{ left: "60%", rotate: "22deg" }} />
      </span>
      <span className="pr-note" aria-hidden="true">
        <span>{initial(piece.author || "♡")}</span>
      </span>
      <span className="pr-side pr-wrap" aria-hidden="true" style={{ clipPath: `polygon(${w}px ${d + lh}px, 100% ${lh}px, 100% ${h}px, ${w}px 100%)` }} />
      <span className="pr-side-band" aria-hidden="true" style={{ clipPath: `polygon(${w + d / 2 - b * 0.7}px ${d / 2 + lh}px, ${w + d / 2 + b * 0.7}px ${d / 2 + lh - b * 0.7}px, ${w + d / 2 + b * 0.7}px ${h + d / 2 - b * 0.7}px, ${w + d / 2 - b * 0.7}px ${h + d / 2}px)` }} />
      <span className="pr-front pr-wrap" aria-hidden="true" style={{ left: 0, top: d + lh, width: w, height: h - lh }}>
        <span className="pr-band" style={{ left: cx - b, width: b * 2 }} />
        {piece.sealed || locked ? (
          <span className="pr-seal">
            <Lock className="size-3" />
          </span>
        ) : null}
      </span>

      {/* the lid, with its ribbon and bow */}
      <span className="pr-lid" aria-hidden="true">
        <span className="pr-lid-top pr-wrap" style={{ clipPath: `polygon(0 ${d}px, ${d}px 0, 100% 0, ${w}px ${d}px)` }} />
        <span className="pr-lid-band" style={{ clipPath: `polygon(${cx - b}px ${d}px, ${cx + d - b}px 0, ${cx + d + b}px 0, ${cx + b}px ${d}px)` }} />
        <span className="pr-lid-band" style={{ clipPath: `polygon(${d / 2 - b * 0.7}px ${d / 2 + b * 0.7}px, ${d / 2 + b * 0.7}px ${d / 2 - b * 0.7}px, ${w + d / 2 + b * 0.7}px ${d / 2 - b * 0.7}px, ${w + d / 2 - b * 0.7}px ${d / 2 + b * 0.7}px)` }} />
        <span className="pr-lid-side pr-wrap" style={{ clipPath: `polygon(${w}px ${d}px, 100% 0, 100% ${lh}px, ${w}px ${d + lh}px)` }} />
        <span className="pr-lid-front pr-wrap" style={{ left: 0, top: d, width: w, height: lh }}>
          <span className="pr-band" style={{ left: cx - b, width: b * 2 }} />
        </span>
        <span className="pr-bow" style={{ left: bx, top: by, "--bs": (Math.min(w, 110) / 100).toFixed(2) } as React.CSSProperties}>
          <span className="pr-bow-loop is-left" />
          <span className="pr-bow-loop is-right" />
          <span className="pr-bow-tail is-left" />
          <span className="pr-bow-tail is-right" />
          <span className="pr-bow-knot" />
        </span>
      </span>

      {/* the name tag on its string */}
      <svg className="pr-string" width={W} height={H} aria-hidden="true">
        <path d={`M${bx} ${by + 2} Q${(bx + tx) / 2} ${Math.max(by, ty) + 14} ${tx + 9} ${ty + 6}`} />
      </svg>
      <span className="pr-tag" style={{ left: tx, top: ty }}>
        <span className="pr-tag-hole" aria-hidden="true" />
        <span className="pr-tag-name">{piece.author || (recipient ? t("presents.tagTo", { name: recipient }) : t("presents.tagFriend"))}</span>
        {KindIcon ? <KindIcon className="pr-tag-icon" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

/** The note, read as a gift card with a ribbon across its corner. */
function Card({ body, piece }: { body: Body; piece: Piece }) {
  const { colors, fonts, data } = body;
  return (
    <Reader piece={piece} onClose={body.closeReader} accent={colors.dark ? colors.mix(colors.primary, "#000000", 0.1) : colors.primary} className="pr-reader">
      <span className="pr-reader-ribbon" aria-hidden="true" />
      <p className="pr-reader-to" style={{ fontFamily: fonts.heading }}>
        {data.named ? t("presents.tagTo", { name: data.name }) : t("presents.insideFriend")}
      </p>
      <p className="pr-reader-from">{piece.author ? t("presents.tagFrom", { name: piece.author }) : t("presents.tagFriend")}</p>
    </Reader>
  );
}
