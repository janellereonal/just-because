/**
 * Record Player's body: a crate of records.
 *
 * After the turntable, the notes are a wooden crate of LPs, one sleeve per
 * friend, each with its own cover art (a photo note is the cover). Dig through
 * them like in a record shop: swipe, use the arrows, or tap a sleeve peeking from
 * the back, and the records tip forward one by one. Tap the record at the front:
 * the sleeve rises out of the crate, the vinyl slides out with the friend's
 * initial on its label, and the note reads as liner notes. The back cover below
 * lists every record (Side A, Side B), so any of them is one tap away.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Mic, Music2 } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  PhotoFace,
  Reader,
  initial,
  isLocked,
  pieceLabel,
  pieceWhat,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

/** "Oct 20": short enough for a small card. */
const SHORT_DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** Records drawn behind the front one, and tipped forward in front of it. */
const BEHIND = 5;
const FRONT = 2;

export function CrateBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("crate", body.site.id, body.sample);
  const records = data.notes;
  const total = records.length;
  const [cur, setCur] = useState(0);
  const [pulling, setPulling] = useState<string | null>(null);
  const played = records.filter((p) => opened.has(p.id)).length;
  const crateRef = useRef<HTMLDivElement | null>(null);
  const wasReading = useRef(false);
  const sideB = total > 6 ? Math.ceil(total / 2) : total;

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(total - 1, to));
      if (next === cur) return;
      foley("paper");
      buzz(4);
      setCur(next);
    },
    [total, cur],
  );

  function pull(p: Piece, i: number) {
    if (i !== cur) {
      go(i);
      return;
    }
    if (pulling) return;
    setPulling(p.id);
    if (!opened.has(p.id)) open(p.id);
    chime("whoosh");
    buzz(8);
    window.setTimeout(
      () => {
        body.read(p);
        foley("needle");
        const r = crateRef.current?.getBoundingClientRect();
        if (r && !reduce && !p.sealed && !isLocked(p))
          burst(body.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.15, { shape: "hearts", colors: [colors.primary, colors.accent, "#F6E3B4"], count: 8, spread: 0.8, up: true });
      },
      reduce ? 0 : 760,
    );
  }

  // The sleeve sinks back into the crate once its notes are closed.
  useEffect(() => {
    if (body.reading) {
      wasReading.current = true;
      return;
    }
    if (!wasReading.current) return;
    wasReading.current = false;
    const tm = window.setTimeout(() => setPulling(null), 120);
    return () => window.clearTimeout(tm);
  }, [body.reading]);

  // Swipe sideways to dig (vertical drags still scroll the page).
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { x: e.clientX, y: e.clientY, moved: false };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
        d.moved = true;
        d.x = e.clientX;
        go(cur + (dx < 0 ? 1 : -1));
      }
    },
    onPointerUp: () => {
      window.setTimeout(() => (drag.current = null), 0);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        go(cur + 1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        go(cur - 1);
      }
    },
  };

  const shades = [colors.primary, colors.accent, colors.mix(colors.primary, colors.accent, 0.5), colors.mix(colors.accent, "#1A1210", 0.45), colors.mix(colors.primary, "#FFFFFF", 0.4)];
  const label = (i: number) => (i < sideB ? `A${i + 1}` : `B${i - sideB + 1}`);

  return (
    <BodyRoot
      body={body}
      className="rc-root"
      style={
        {
          "--rc-wood": colors.mix("#B98552", colors.primary, 0.1),
          "--rc-wood-deep": colors.mix("#7A4E2C", colors.primary, 0.06),
          "--rc-wood-dark": colors.mix("#3E2716", colors.bg, 0.15),
          "--rc-paper": colors.mix("#F3E9D6", colors.primary, 0.08),
          "--rc-ink": "#2E211B",
          "--rc-label": colors.accent,
          "--rc-label-ink": colors.onAccent,
          "--rc-gold": colors.primary,
          "--rc-glow": colors.dark ? "rgba(255, 196, 120, .16)" : "rgba(255, 210, 150, .35)",
          "--rc-shadow": colors.dark ? "rgba(0,0,0,.6)" : "rgba(60,35,20,.35)",
        } as React.CSSProperties
      }
    >
      <div className="rc-room" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1080px] px-4 pt-[clamp(30px,8vh,76px)] pb-20">
        <header className="rc-head">
          <p className="rc-kicker">{t("crate.kicker")}</p>
          <h1 className="rc-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : body.heading}
          </h1>
          {data.named ? <p className="rc-heading">{body.heading}</p> : null}
          <p className="rc-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
          <CountdownLine date={data.countdownDate} className="rc-countdown" />
        </header>

        <div className="rc-main">
        <section className="rc-shop" aria-label={total ? t("crate.count", { n: total }) : t("crate.what")}>
          <div ref={crateRef} className="rc-crate" {...handlers}>
            <span className="rc-crate-back" aria-hidden="true" />
            <span className="rc-crate-side is-left" aria-hidden="true" />
            <span className="rc-crate-side is-right" aria-hidden="true" />
            <div className="rc-stage">
              {records.map((p, i) => {
                const d = i - cur;
                if (d > BEHIND || d < -FRONT) return null;
                return (
                  <Sleeve
                    key={p.id}
                    piece={p}
                    d={d}
                    index={i}
                    track={label(i)}
                    played={opened.has(p.id)}
                    pulled={pulling === p.id}
                    shades={shades}
                    headingFont={fonts.heading}
                    onClick={() => {
                      if (drag.current?.moved) return;
                      pull(p, i);
                    }}
                  />
                );
              })}
              {total === 0 ? <p className="rc-empty">{body.voice.empty(t("crate.what"))}</p> : null}
            </div>
            <span className="rc-crate-front" aria-hidden="true">
              <span className="rc-crate-handle" />
              <span className="rc-crate-stencil" style={{ fontFamily: fonts.heading }}>
                {data.named ? data.name : t("crate.what")}
              </span>
            </span>
          </div>

          {total ? (
            <div className="rc-dig">
              <button type="button" className="rc-dig-btn" onClick={() => go(cur - 1)} disabled={cur === 0} aria-label={t("crate.prev")}>
                <ChevronLeft className="size-5" />
              </button>
              <p className="rc-dig-count" aria-live="polite">
                <span>{t("crate.sleeves", { n: cur + 1, total })}</span>
                <span className="rc-dig-hint">{t("crate.hint")}</span>
              </p>
              <button type="button" className="rc-dig-btn" onClick={() => go(cur + 1)} disabled={cur >= total - 1} aria-label={t("crate.next")}>
                <ChevronRight className="size-5" />
              </button>
            </div>
          ) : null}
        </section>

        {total ? (
          <section className="rc-back" aria-label={t("crate.tracklist")}>
            <div className="rc-back-head">
              <p className="rc-back-title" style={{ fontFamily: fonts.heading }}>
                {t("crate.tracklist")}
              </p>
              <p className="rc-back-progress" role="status">
                {played === total ? t("crate.allPlayed") : t("crate.progress", { n: played, total })}
              </p>
            </div>
            <div className="rc-sides">
              {[records.slice(0, sideB), records.slice(sideB)].map((side, s) =>
                side.length ? (
                  <div key={s} className="rc-side">
                    <p className="rc-side-name">{s ? t("crate.sideB") : t("crate.sideA")}</p>
                    <ol>
                      {side.map((p, k) => {
                        const i = s ? sideB + k : k;
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              className={`rc-track ${i === cur ? "is-cur" : ""} ${opened.has(p.id) ? "is-played" : ""}`}
                              aria-label={pieceLabel(p)}
                              onClick={() => {
                                go(i);
                                crateRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
                              }}
                            >
                              <span className="rc-track-no">{label(i)}</span>
                              <span className="rc-track-name">{p.author || t("crate.surprise")}</span>
                              <span className="rc-track-dots" />
                              <span className="rc-track-what">
                                {p.sealed || isLocked(p) ? <Lock className="size-3" /> : null}
                                {opened.has(p.id) ? t("crate.played") : isLocked(p) ? t("body.opensOn", { day: formatDay(p.date!, SHORT_DAY) }) : pieceWhat(p)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                ) : null,
              )}
            </div>
          </section>
        ) : null}
        </div>

        {data.words.length ? (
          <section className="rc-words" aria-label={t("crate.wordsTitle")}>
            <p className="rc-words-title" style={{ fontFamily: fonts.heading }}>
              {t("crate.wordsTitle")}
            </p>
            <ul className="rc-dividers">
              {data.words.map((w, i) => (
                <li key={w.id} className="rc-divider" style={{ "--tab": `${(seed(w.id) * 46).toFixed(0)}%`, "--dc": shades[i % 3] } as React.CSSProperties}>
                  <span className="rc-divider-tab">{w.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BodyFooter body={body} className="rc-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
      </div>

      {body.reading ? (
        <Reader piece={body.reading} onClose={body.closeReader} accent={colors.mix(colors.accent, "#2E211B", 0.35)} className="rc-reader">
          <LinerHead
            piece={body.reading}
            index={records.findIndex((p) => p.id === body.reading!.id)}
            sideB={sideB}
            shades={shades}
            headingFont={fonts.heading}
            recipient={data.named ? data.name : ""}
          />
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/* ---------- a record in the crate ---------- */

function Sleeve({
  piece,
  d,
  index,
  track,
  played,
  pulled,
  shades,
  headingFont,
  onClick,
}: {
  piece: Piece;
  d: number;
  index: number;
  track: string;
  played: boolean;
  pulled: boolean;
  shades: string[];
  headingFont: string;
  onClick: () => void;
}) {
  const front = d === 0;
  return (
    <button
      type="button"
      className={`rc-sleeve ${front ? "is-front" : d < 0 ? "is-tipped" : "is-behind"} ${pulled ? "is-pull" : ""}`}
      style={{ "--d": d, "--jit": `${((seed(piece.id) - 0.5) * 3).toFixed(2)}deg`, zIndex: 50 - d } as React.CSSProperties}
      onClick={onClick}
      tabIndex={front ? 0 : -1}
      aria-hidden={front ? undefined : true}
      aria-label={front ? `${pieceLabel(piece)}. ${t("crate.pull")}` : pieceLabel(piece)}
    >
      <span className="rc-vinyl" aria-hidden="true">
        <span className="rc-vinyl-label" style={{ fontFamily: headingFont }}>
          {initial(piece.author || "♪")}
        </span>
      </span>
      <span className="rc-sleeve-face">
        <Cover piece={piece} index={index} shades={shades} headingFont={headingFont} />
        <span className="rc-sleeve-track">{track}</span>
        {played ? <span className="rc-sticker">{t("crate.played")}</span> : null}
      </span>
      <span className="rc-sleeve-back" />
    </button>
  );
}

/** Cover art: a photo note is its own cover; everything else gets a print in the gift's colors. */
function Cover({ piece, index, shades, headingFont, small = false }: { piece: Piece; index: number; shades: string[]; headingFont: string; small?: boolean }) {
  const r = seed(piece.id);
  const style = Math.floor(r * 6);
  const a = shades[index % shades.length]!;
  const b = shades[(index + 2) % shades.length]!;
  const name = piece.author || t("crate.surprise");
  const locked = isLocked(piece);
  if (piece.sealed || locked)
    return (
      <span className="rc-cover is-plain">
        <span className="rc-plain-ring" />
        <span className="rc-plain-note">
          <Lock className="size-4" />
          {piece.sealed ? pieceWhat(piece) : t("body.opensOn", { day: formatDay(piece.date!) })}
        </span>
        {!small ? (
          <span className="rc-cover-name is-dark" style={{ fontFamily: headingFont }}>
            {name}
          </span>
        ) : null}
      </span>
    );
  if (piece.kind === "photo")
    return (
      <span className="rc-cover is-photo">
        <PhotoFace piece={piece} tint={a} sizes="260px" />
        {!small ? (
          <span className="rc-cover-band" style={{ fontFamily: headingFont }}>
            {name}
          </span>
        ) : null}
      </span>
    );
  const Icon = piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : null;
  return (
    <span className={`rc-cover is-art is-s${style}`} style={{ "--ca": a, "--cb": b } as React.CSSProperties}>
      <span className="rc-art" />
      {!small ? (
        <>
          <span className="rc-cover-name" style={{ fontFamily: headingFont }}>
            {name}
          </span>
          <span className="rc-cover-what">
            {Icon ? <Icon className="size-3" /> : null}
            {pieceWhat(piece)}
          </span>
        </>
      ) : null}
    </span>
  );
}

/** The top of the liner notes: the sleeve, with the record half out of it, spinning. */
function LinerHead({
  piece,
  index,
  sideB,
  shades,
  headingFont,
  recipient,
}: {
  piece: Piece;
  index: number;
  sideB: number;
  shades: string[];
  headingFont: string;
  recipient: string;
}) {
  const side = index < sideB ? "A" : "B";
  const n = index < sideB ? index + 1 : index - sideB + 1;
  return (
    <div className="rc-liner-head">
      <div className="rc-liner-disc" aria-hidden="true">
        <span className="rc-liner-vinyl">
          <span className="rc-vinyl-label" style={{ fontFamily: headingFont }}>
            {initial(piece.author || "♪")}
          </span>
        </span>
        <span className="rc-liner-sleeve">
          <Cover piece={piece} index={Math.max(0, index)} shades={shades} headingFont={headingFont} small />
        </span>
      </div>
      <div className="rc-liner-meta">
        <p className="rc-liner-kicker">{t("crate.linerNotes")}</p>
        <p className="rc-liner-artist" style={{ fontFamily: headingFont }}>
          {piece.author || t("crate.surprise")}
        </p>
        <p className="rc-liner-track">
          {index >= 0 ? t("crate.side", { side, n }) : null}
          {recipient && !piece.sealed && !isLocked(piece) ? ` · ${t("crate.for", { name: recipient })}` : ""}
        </p>
      </div>
    </div>
  );
}
