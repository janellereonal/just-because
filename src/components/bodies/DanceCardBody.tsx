/**
 * Debut's body: the dance card.
 *
 * The opening's curtain is drawn back and tied at the sides; a chandelier glows
 * over the ballroom. Under their name sits a row of roses (a nod to the 18
 * roses) that bloom one by one as notes are read. Below it waits a dance card
 * with a silk tassel and a little pencil on a cord. Open it and its pages fold
 * out like a concertina: every friend has signed one dance, a line with the
 * dance and their name. Tap a line and the card opens to that friend's note.
 * Read dances get a pressed rose in the margin (on this device).
 */
import { useEffect, useMemo, useState } from "react";
import { Lock, Mic, Music2, Camera } from "lucide-react";
import { t, type MessageKey } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import { loadFont, type FontSpec } from "@/themes/_shared/design";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

/** The debut opening's display face. */
const DISPLAY: FontSpec = {
  family: '"Cormorant Garamond", Georgia, serif',
  source: "google",
  query: "Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600",
};
const DANCES = 18;
const PER_PAGE = 12;
const ROSES = 18;

/** "Tango", or "Tango, encore" once the 18 dances come round again. */
function danceName(i: number) {
  const base = t(`dancecard.dance.${i % DANCES}` as MessageKey);
  return i < DANCES ? base : t("dancecard.encore", { dance: base });
}

export function DanceCardBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, reduce } = body;
  useEffect(() => loadFont(DISPLAY, "high"), []);
  const display =
    !body.site.font_choice || body.site.font_choice === "theme"
      ? DISPLAY.family
      : body.fonts.heading;
  const { opened: read, open: markRead } = useOpened("dancecard", body.site.id, body.sample);
  const [open, setOpen] = useState(false);
  const [justRead, setJustRead] = useState<string | null>(null);
  const notes = data.notes;
  const name = data.named ? data.name : "";
  // Opened before on this device (or nothing to open): the card is already unfolded.
  useEffect(() => {
    if (read.has("card") || reduce) setOpen(true);
  }, [read, reduce]);

  const readCount = notes.filter((p) => read.has(p.id)).length;
  const roses = Math.min(ROSES, Math.max(notes.length, 1));
  const bloomed = notes.length <= ROSES ? readCount : Math.ceil((readCount * ROSES) / notes.length);
  const pages = useMemo(() => {
    const out: { start: number; notes: Piece[] }[] = [];
    for (let i = 0; i < notes.length; i += PER_PAGE)
      out.push({ start: i, notes: notes.slice(i, i + PER_PAGE) });
    return out;
  }, [notes]);

  function unfold(e: React.MouseEvent) {
    if (open) return;
    setOpen(true);
    markRead("card");
    foley("paper");
    chime("whoosh");
    buzz(10);
    burst(body.hostRef.current, e.clientX, e.clientY, {
      shape: "petals",
      colors: [colors.primary, colors.mix(colors.primary, "#FFFFFF", 0.5), "#E8C9A0"],
      count: 14,
      spread: 1.1,
      up: true,
    });
  }

  function dance(p: Piece, e: React.MouseEvent) {
    if (!read.has(p.id) && !p.sealed && !isLocked(p)) {
      markRead(p.id);
      setJustRead(p.id);
      window.setTimeout(() => setJustRead((s) => (s === p.id ? null : s)), 1200);
      chime("chime");
      buzz(6);
      burst(body.hostRef.current, e.clientX, e.clientY, {
        shape: "petals",
        colors: [colors.primary, colors.mix(colors.primary, "#FFFFFF", 0.45)],
        count: 7,
        spread: 0.6,
        up: true,
      });
      if (readCount + 1 === notes.filter((n) => !n.sealed && !isLocked(n)).length)
        window.setTimeout(() => chime("tada"), 600);
    } else foley("paper");
    window.setTimeout(() => body.read(p), reduce ? 0 : 260);
  }

  // Roses stay rosy whatever the palette, leaning toward its main color.
  const rose = colors.mix(colors.primary, "#C2506A", 0.45);
  const CoverTag = open || !notes.length ? "div" : "button";
  const reading = body.reading;
  const readingIndex = reading ? notes.indexOf(reading) : -1;
  return (
    <BodyRoot
      body={body}
      className={`dc-root ${colors.dark ? "is-dark" : "is-light"}`}
      style={
        {
          "--dc-display": display,
          "--dc-rose": rose,
          "--dc-rose-deep": colors.mix(rose, "#2A0A14", 0.35),
          "--dc-rose-soft": colors.mix(rose, "#FFFFFF", 0.55),
          "--dc-gold": colors.mix(colors.accent, "#D9B46A", 0.55),
          "--dc-gold-deep": colors.mix(colors.accent, "#7A5A20", 0.4),
          "--dc-velvet": colors.mix(colors.primary, "#B8707A", 0.35),
          "--dc-card": colors.mix("#FFFCF6", colors.primary, 0.025),
          "--dc-card-edge": colors.mix("#F1E6D6", colors.primary, 0.06),
          "--dc-ink": colors.mix("#3A2228", colors.primary, 0.2),
          "--dc-wall": colors.dark
            ? colors.mix(colors.bg, colors.primary, 0.1)
            : colors.mix(colors.bg, colors.primary, 0.05),
        } as React.CSSProperties
      }
    >
      <div className="dc-hall" aria-hidden="true">
        <span className="dc-drape is-left" />
        <span className="dc-drape is-right" />
        <span className="dc-swag" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-20">
        <header className="dc-head">
          <Chandelier />
          <p className="dc-kicker">{t("dancecard.kicker")}</p>
          <h1 className="dc-name">
            {name ? <SampleText on={data.nameIsSample}>{name}</SampleText> : body.heading}
          </h1>
          {name ? <p className="dc-heading">{body.heading}</p> : null}
          <p className="dc-intro">{body.intro || body.voice.intro(name)}</p>
          <CountdownLine date={data.countdownDate} className="dc-countdown" />
        </header>

        {/* The roses: one blooms for every dance read */}
        {notes.length ? (
          <section className="dc-roses-wrap" aria-label={t("dancecard.rosesAria")}>
            <div
              className="dc-roses"
              style={{ "--c1": Math.min(roses, 9), "--c2": roses } as React.CSSProperties}
            >
              <svg
                className="dc-vine"
                viewBox="0 0 100 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0 6 Q25 18 50 10 T100 8" vectorEffect="non-scaling-stroke" />
              </svg>
              {Array.from({ length: roses }, (_, i) => (
                <span
                  key={i}
                  className={`dc-rose ${i < bloomed ? "is-open" : ""}`}
                  style={
                    {
                      "--i": i,
                      "--y": `${(Math.sin((i / Math.max(1, roses - 1)) * Math.PI * 2) * 4).toFixed(1)}px`,
                    } as React.CSSProperties
                  }
                >
                  <Rose />
                </span>
              ))}
            </div>
            <p className="dc-roses-count" role="status" aria-live="polite">
              {bloomed >= roses
                ? t("dancecard.allRoses", { n: roses })
                : t("dancecard.roses", { n: bloomed, total: roses })}
            </p>
          </section>
        ) : null}

        {/* The dance card */}
        <section
          className={`dc-card-area ${open ? "is-open" : ""}`}
          aria-label={t("dancecard.cardAria")}
        >
          <div className="dc-cover-wrap">
            <CoverTag
              className="dc-cover"
              {...(open || !notes.length
                ? {}
                : {
                    type: "button" as const,
                    onClick: unfold,
                    "aria-label": t("dancecard.openAria", { n: notes.length }),
                  })}
            >
              <span className="dc-cover-frame" aria-hidden="true" />
              <span className="dc-hole" aria-hidden="true" />
              <span className="dc-cover-small">{t("dancecard.coverKicker")}</span>
              <span className="dc-cover-title">{t("dancecard.coverTitle")}</span>
              <span className="dc-cover-mono" aria-hidden="true">
                {initial(name || "♡")}
              </span>
              <span className="dc-cover-name">
                {name ? t("dancecard.coverFor", { name }) : body.heading}
              </span>
              <span className="dc-cover-count">
                {notes.length
                  ? t("dancecard.count", { n: notes.length })
                  : body.voice.empty(t("dancecard.what"))}
              </span>
            </CoverTag>
            <Tassel />
            <span className="dc-pencil" aria-hidden="true" />
          </div>
          {!open && notes.length ? <p className="dc-hint">{t("dancecard.open")}</p> : null}

          {open && notes.length ? (
            <div className="dc-pages">
              {pages.map((pg, k) => (
                <div
                  key={pg.start}
                  className="dc-page"
                  style={{ "--k": k, "--fold": k % 2 ? 1 : -1 } as React.CSSProperties}
                >
                  <p className="dc-page-head">
                    <span>
                      {t("dancecard.pageHead", {
                        from: pg.start + 1,
                        to: pg.start + pg.notes.length,
                      })}
                    </span>
                  </p>
                  <ol className="dc-lines">
                    {pg.notes.map((p, j) => {
                      const i = pg.start + j;
                      const locked = isLocked(p);
                      const done = read.has(p.id);
                      const Icon =
                        p.kind === "photo"
                          ? Camera
                          : p.kind === "song"
                            ? Music2
                            : p.kind === "voice"
                              ? Mic
                              : null;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            className={`dc-line ${done ? "is-read" : ""} ${justRead === p.id ? "is-new" : ""}`}
                            onClick={(e) => dance(p, e)}
                            aria-label={`${danceName(i)}, ${pieceLabel(p)}`}
                          >
                            <span className="dc-no">{i + 1}</span>
                            <span className="dc-dance">{danceName(i)}</span>
                            <span className="dc-dots" aria-hidden="true" />
                            <span className={`dc-who ${locked ? "is-locked" : ""}`}>
                              {locked
                                ? t("body.opensOn", {
                                    day: formatDay(p.date!, { day: "numeric", month: "short" }),
                                  })
                                : p.author || t("dancecard.surprise")}
                            </span>
                            <span className="dc-mark" aria-hidden="true">
                              {p.sealed || locked ? (
                                <Lock className="size-3" />
                              ) : done ? (
                                <PressedRose />
                              ) : Icon ? (
                                <Icon className="size-3" />
                              ) : (
                                <span className="dc-dot" />
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {data.words.length ? (
          <section className="dc-words" aria-label={t("dancecard.wordsTitle")}>
            <p className="dc-words-title">{t("dancecard.wordsTitle")}</p>
            <p className="dc-words-list">
              {data.words.map((w) => (
                <span key={w.id}>{w.text}</span>
              ))}
            </p>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="dc-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {reading ? (
        <Reader
          piece={reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.primary, "#3A1A22", 0.25)}
          className="dc-reader"
        >
          <span className="dc-reader-frame" aria-hidden="true" />
          <p className="dc-reader-kicker">
            {t("dancecard.readerNo", {
              n: readingIndex + 1,
              dance: danceName(Math.max(0, readingIndex)),
            })}
          </p>
          {reading.author && !reading.sealed && !isLocked(reading) ? (
            <p className="dc-reader-with">{t("dancecard.with", { name: reading.author })}</p>
          ) : null}
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/** The chandelier over the ballroom: two tiers of candles and strands of crystals. */
function Chandelier() {
  const arms = [-78, -50, -22, 22, 50, 78];
  return (
    <div className="dc-chandelier" aria-hidden="true">
      <span className="dc-chand-glow" />
      <svg viewBox="0 0 200 150" className="dc-chand-svg">
        <path d="M100 0 V36" className="dc-chain" />
        {/* crystal strands */}
        {[-1, 1].map((s) => (
          <g key={s}>
            <path d={`M100 70 Q${100 + s * 40} 96 ${100 + s * 82} 74`} className="dc-strand" />
            <path d={`M100 84 Q${100 + s * 28} 104 ${100 + s * 52} 92`} className="dc-strand" />
            {Array.from({ length: 7 }, (_, i) => {
              const u = (i + 1) / 8;
              const x = 100 + s * 82 * u;
              const y = 70 * (1 - u) * (1 - u) + 2 * (1 - u) * u * 96 + u * u * 74;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.6"
                  className="dc-crystal"
                  style={{ animationDelay: `${(i * 0.37 + (s > 0 ? 0.2 : 0)).toFixed(2)}s` }}
                />
              );
            })}
          </g>
        ))}
        {/* arms */}
        {arms.map((dx) => (
          <path
            key={dx}
            d={`M100 62 C${100 + dx * 0.3} 78 ${100 + dx * 0.9} 76 ${100 + dx} 58`}
            className="dc-arm"
          />
        ))}
        <ellipse cx="100" cy="58" rx="13" ry="16" className="dc-body" />
        <ellipse cx="100" cy="78" rx="7" ry="9" className="dc-body" />
        <path d="M100 86 l-3 8 l3 8 l3 -8 z" className="dc-drop" />
        {/* candles and flames */}
        {arms.map((dx) => (
          <g key={dx} transform={`translate(${100 + dx} 58)`}>
            <path d="M-6 0 h12 l-2 4 h-8 z" className="dc-cup" />
            <rect x="-2.4" y="-14" width="4.8" height="14" rx="1" className="dc-candle" />
            <g className="dc-flame" style={{ animationDelay: `${((dx + 80) / 60).toFixed(2)}s` }}>
              <ellipse cx="0" cy="-19" rx="5" ry="7" className="dc-flame-halo" />
              <path
                d="M0 -26 C3 -21 3 -17 0 -15 C-3 -17 -3 -21 0 -26 Z"
                className="dc-flame-core"
              />
            </g>
            <path d={`M0 6 l-2 5 l2 5 l2 -5 z`} className="dc-drop" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** A rose for the garland: a bud that opens. */
function Rose() {
  return (
    <svg viewBox="0 0 40 46" className="dc-rose-svg" aria-hidden="true" focusable="false">
      <path d="M20 26 C19 34 21 40 20 46" className="dc-stem" />
      <path d="M20 36 C14 34 11 30 10 27 C15 27 19 30 20 36 Z" className="dc-leaf" />
      <path d="M20 38 C26 36 29 32 30 29 C25 29 21 32 20 38 Z" className="dc-leaf" />
      <g className="dc-bloom">
        <path
          d="M8 19 C4 11 11 4 16 8 C18 2 25 2 26 8 C31 4 37 11 32 19 Z"
          className="dc-petal-back"
        />
        <path d="M12 15 C13 9 27 9 28 15 C26 19 14 19 12 15 Z" className="dc-petal" />
        <path d="M20 11 C24 11 25 14 22 15.5 C19 16.5 17 14 19 12.8" className="dc-swirl" />
        <path
          d="M9 16 C9 25 14 29.5 20 29.5 C26 29.5 31 25 31 16 C27 21 13 21 9 16 Z"
          className="dc-petal is-front"
        />
        <path d="M9 16 C5 20 7 27 15 29 C11 25 10 21 9 16 Z" className="dc-petal is-side" />
        <path d="M31 16 C35 20 33 27 25 29 C29 25 30 21 31 16 Z" className="dc-petal is-side" />
        <path d="M14 22 C17 24 23 24 26 22" className="dc-swirl is-soft" />
      </g>
      <g className="dc-bud">
        <path d="M20 9 C26 12 26 22 20 25 C14 22 14 12 20 9 Z" className="dc-petal" />
        <path d="M14 20 C16 26 24 26 26 20 C24 24 16 24 14 20 Z" className="dc-sepal" />
      </g>
    </svg>
  );
}

/** A small pressed rose, for the dances already read. */
function PressedRose() {
  return (
    <svg viewBox="0 0 20 20" className="dc-pressed" aria-hidden="true" focusable="false">
      <circle cx="10" cy="9" r="5.5" className="dc-petal-back" />
      <path d="M10 5 C13 6 14 9 12 11 C10 12 7 11 7 9 C7 7 9 7 10 8" className="dc-swirl" />
      <path d="M10 14 L10 19 M10 16 C8 15 6 15 5 16" className="dc-stem" />
    </svg>
  );
}

/** The silk tassel on its cord, through the card's hole. */
function Tassel() {
  return (
    <span className="dc-tassel" aria-hidden="true">
      <svg viewBox="0 0 40 120">
        <path d="M14 4 C4 14 6 30 18 40" className="dc-cord" />
        <path d="M14 4 C26 12 28 28 18 40" className="dc-cord" />
        <circle cx="18" cy="44" r="6" className="dc-knot" />
        <path d="M12 48 Q18 54 24 48 L29 106 Q18 114 7 106 Z" className="dc-silk" />
        {[10, 13, 16, 19, 22, 25].map((x) => (
          <path key={x} d={`M${x} 54 L${x - 1 + (x - 18) * 0.2} 108`} className="dc-thread" />
        ))}
        <path d="M11 56 Q18 61 25 56" className="dc-band" />
      </svg>
    </span>
  );
}
