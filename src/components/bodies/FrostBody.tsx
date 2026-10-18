/**
 * Winter Window's body: a log cabin wall of frosted windows, snow falling outside.
 *
 * The opening's frosted window becomes the cabin itself. Up in the gable, the
 * name is traced in the frost of the top window. Below the snowy eave, a log
 * wall of little windows, six panes each, with a candle on every sill. Each pane
 * is frosted over and hides one note (the friend traced their initial in the
 * frost). Tap a pane and a hand wipes an arc through the frost; the warm room and
 * the note show through, and it opens to read. Wiped panes stay clear and glow.
 */
// Its styles load with it, not with every page.
import "@/styles/bodies/frost.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Mic, Music2 } from "lucide-react";
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

const PANES = 6;
/** Icicles along the eave: thin triangles of different lengths. */
const ICICLES = Array.from({ length: 30 }, (_, i) => {
  const x = i * 3.33 + ((i * 7) % 3) * 0.4;
  const len = 2.5 + (((i * 37) % 11) / 11) * 7;
  return `M${x.toFixed(2)} 0L${(x + 0.9).toFixed(2)} ${len.toFixed(2)}L${(x + 1.8).toFixed(2)} 0Z`;
}).join("");
/** A string of lights draped under the eave: seven dips, three bulbs in each. */
const WIRE = Array.from(
  { length: 7 },
  (_, i) => `${i ? "" : "M0 4"}Q${i * 100 + 50} 24 ${(i + 1) * 100} 4`,
).join("");
const BULBS: [number, number][] = Array.from({ length: 7 }, (_, i) =>
  [0.25, 0.5, 0.75].map((tt) => [((i + tt) / 7) * 100, 4 + 40 * tt * (1 - tt)] as [number, number]),
).flat();
const WIPE_MS = 820;

export function FrostBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("frost", body.site.id, body.sample);
  const notes = data.notes;
  const [wiping, setWiping] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    setMounted(true);
    return () => timers.current.forEach((x) => window.clearTimeout(x));
  }, []);
  const count = notes.filter((p) => opened.has(p.id)).length;
  const windows = useMemo(() => {
    const out: Piece[][] = [];
    for (let i = 0; i < notes.length; i += PANES) out.push(notes.slice(i, i + PANES));
    return out;
  }, [notes]);

  const wood = colors.mix("#8A5A34", colors.primary, 0.1);
  const glow = colors.mix("#FFB54D", colors.accent, 0.3);

  function wipe(p: Piece, e: React.MouseEvent) {
    if (wiping) return;
    if (opened.has(p.id)) {
      foley("paper");
      body.read(p);
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (reduce) {
      open(p.id);
      chime("sparkle");
      body.read(p);
      return;
    }
    setWiping(p.id);
    foley("breath");
    buzz([4, 60, 4, 60, 4]);
    timers.current.push(
      window.setTimeout(() => foley("crunch"), 260),
      window.setTimeout(() => {
        burst(body.hostRef.current, r.left + r.width * 0.75, r.top + r.height * 0.3, {
          shape: "snow",
          colors: ["#FFFFFF", "#DDEBF7", glow],
          count: 12,
          spread: 0.8,
          up: true,
        });
        chime("sparkle");
      }, WIPE_MS - 200),
      window.setTimeout(() => {
        open(p.id);
        setWiping(null);
      }, WIPE_MS),
      window.setTimeout(() => body.read(p), WIPE_MS + 220),
    );
  }

  return (
    <BodyRoot
      body={body}
      className="fw-root"
      style={
        {
          "--fw-wood": wood,
          "--fw-wood-hi": colors.mix(wood, "#FFFFFF", 0.16),
          "--fw-wood-lo": colors.mix(wood, "#000000", 0.38),
          "--fw-log": colors.mix(wood, colors.bg, colors.dark ? 0.08 : 0.12),
          "--fw-glow": glow,
          "--fw-glow-deep": colors.mix(glow, "#5A1E0A", 0.55),
          "--fw-sky-top": colors.dark
            ? colors.mix(colors.bg, "#000000", 0.25)
            : colors.mix(colors.bg, "#C9DAEA", 0.45),
          "--fw-sky-low": colors.bg,
          "--fw-flake": colors.dark ? "#FFFFFF" : "#FFFFFF",
          "--fw-flake-edge": colors.dark ? "rgba(255,255,255,.4)" : "rgba(120,150,180,.55)",
          "--fw-ink-soft": colors.mix(colors.ink, colors.bg, 0.25),
          "--fw-mitt-c": colors.mix("#C8402F", colors.accent, 0.3),
        } as React.CSSProperties
      }
    >
      <div className="fw-sky" aria-hidden="true" />
      {!reduce ? <Snowfall /> : null}
      <div className="relative mx-auto max-w-[1240px] px-4 pt-[clamp(24px,5vh,56px)] pb-10">
        {/* The gable, with the name traced in the frost of its window */}
        <header className="fw-gable">
          <span className="fw-roof" aria-hidden="true" />
          <div className="fw-transom">
            <div className="fw-transom-glass">
              <span className="fw-fern" aria-hidden="true" />
              <p className="fw-kicker">{data.named ? t("frost.kicker") : ""}</p>
              <h1 className="fw-name" style={{ fontFamily: fonts.heading }}>
                {data.named ? (
                  <SampleText on={data.nameIsSample}>{data.name}</SampleText>
                ) : (
                  body.heading
                )}
              </h1>
              {data.named ? <p className="fw-heading">{body.heading}</p> : null}
            </div>
          </div>
        </header>

        <div className="fw-cabin">
          <div className="fw-eave" aria-hidden="true">
            <span className="fw-eave-snow" />
            <svg className="fw-icicles" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d={ICICLES} />
            </svg>
            <span className="fw-lights">
              <svg viewBox="0 0 700 30" preserveAspectRatio="none">
                <path d={WIRE} />
              </svg>
              {BULBS.map(([x, y], i) => (
                <span
                  key={i}
                  style={
                    {
                      left: `${x}%`,
                      top: `${y}px`,
                      "--bulb": ["#FFD27A", "#FF8A6B", "#9FE0B0", "#FFF2D0", "#8FC8FF"][i % 5],
                      animationDelay: `${(i % 7) * -0.37}s`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </span>
          </div>
          <div className="fw-wall">
            {/* A wooden sign on the wall */}
            <section className="fw-sign">
              <span className="fw-sign-rope is-l" aria-hidden="true" />
              <span className="fw-sign-rope is-r" aria-hidden="true" />
              <p className="fw-sign-intro">
                {body.intro || body.voice.intro(data.named ? data.name : "")}
              </p>
              <CountdownLine date={data.countdownDate} className="fw-sign-countdown" />
              <p className="fw-sign-count" role="status" aria-live="polite">
                {notes.length === 0
                  ? body.voice.empty(t("frost.what"))
                  : count === 0
                    ? `${t("frost.count", { n: notes.length })}. ${t("frost.hint")}`
                    : count === notes.length
                      ? t("frost.allRead")
                      : t("frost.progress", { n: count, total: notes.length })}
              </p>
            </section>

            {windows.length ? (
              <ul className="fw-windows">
                {windows.map((panes, w) => (
                  <li key={w} className="fw-window" style={{ "--w": w } as React.CSSProperties}>
                    <span className="fw-lintel" aria-hidden="true">
                      <span className="fw-lintel-snow" />
                    </span>
                    <div className="fw-frame">
                      {Array.from({ length: PANES }, (_, k) => {
                        const p = panes[k];
                        if (!p)
                          return (
                            <span key={`f${k}`} className="fw-pane is-blank" aria-hidden="true">
                              <span className="fw-frost">
                                <span className="fw-fern" />
                              </span>
                            </span>
                          );
                        return (
                          <Pane
                            key={p.id}
                            piece={p}
                            clear={opened.has(p.id)}
                            wiping={wiping === p.id}
                            onWipe={(e) => wipe(p, e)}
                            headingFont={fonts.heading}
                            mounted={mounted}
                          />
                        );
                      })}
                    </div>
                    <span className="fw-sill" aria-hidden="true">
                      <span className="fw-sill-snow" />
                      <span className="fw-candle" style={{ left: `${30 + seed(String(w)) * 40}%` }}>
                        <span className="fw-candle-halo" />
                        <span className="fw-candle-flame" />
                        <span className="fw-candle-wax" />
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="fw-ground" aria-hidden="true" />
        </div>

        {data.words.length ? (
          <section className="fw-words" aria-label={t("frost.wordsTitle")}>
            <p className="fw-words-title" style={{ fontFamily: fonts.heading }}>
              {t("frost.wordsTitle")}
            </p>
            <div className="fw-words-glass">
              <span className="fw-fern" aria-hidden="true" />
              {data.words.map((w, i) => (
                <span
                  key={w.id}
                  className="fw-word"
                  style={{
                    fontFamily: fonts.heading,
                    rotate: `${((seed(w.id) - 0.5) * 8).toFixed(1)}deg`,
                    fontSize: `${1.15 + (i % 3) * 0.25}rem`,
                  }}
                >
                  {w.text}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="fw-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.accent, "#000000", 0.15)}
          className="fw-reader"
        >
          <p className="fw-reader-from" style={{ fontFamily: fonts.heading }}>
            <span className="fw-reader-init">{initial(body.reading.author || "♡")}</span>
            <span>
              {body.reading.author
                ? t("frost.from", { name: body.reading.author })
                : t("frost.fromFriend")}
              <span className="fw-reader-what">{pieceWhat(body.reading)}</span>
            </span>
          </p>
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

function Pane({
  piece,
  clear,
  wiping,
  onWipe,
  headingFont,
  mounted,
}: {
  piece: Piece;
  clear: boolean;
  wiping: boolean;
  onWipe: (e: React.MouseEvent) => void;
  headingFont: string;
  mounted: boolean;
}) {
  const r = seed(piece.id);
  const locked = mounted && isLocked(piece);
  const photo = piece.kind === "photo" && !piece.sealed && !locked;
  const text =
    piece.text?.trim() ||
    (piece.kind === "song"
      ? t("body.songFallback")
      : piece.kind === "voice"
        ? t("body.voiceFallback")
        : "");
  const Icon = piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : null;
  return (
    <button
      type="button"
      className={`fw-pane ${clear ? "is-clear" : ""} ${wiping ? "is-wiping" : ""}`}
      style={
        {
          "--r": r,
          "--flip": r > 0.5 ? -1 : 1,
          "--light": `${20 + r * 60}%`,
        } as React.CSSProperties
      }
      onClick={onWipe}
      aria-label={pieceLabel(piece)}
    >
      <span className="fw-room" aria-hidden="true" />
      <span className="fw-note" aria-hidden={!clear}>
        {photo ? (
          <span className="fw-photo" style={{ rotate: `${((r - 0.5) * 8).toFixed(1)}deg` }}>
            <PhotoFace piece={piece} tint="#E7B98A" sizes="160px" />
          </span>
        ) : (
          <span className="fw-card" style={{ rotate: `${((r - 0.5) * 6).toFixed(1)}deg` }}>
            {piece.sealed || locked ? (
              <span className="fw-card-lock">
                <Lock className="size-4" />
                {locked ? formatDay(piece.date!, { day: "numeric", month: "short" }) : null}
              </span>
            ) : (
              <>
                <span className="fw-card-init" style={{ fontFamily: headingFont }}>
                  {initial(piece.author || "♡")}
                  {Icon ? <Icon className="fw-card-icon" /> : null}
                </span>
                <span className="fw-card-text">{text}</span>
              </>
            )}
          </span>
        )}
      </span>
      <span className="fw-frost">
        <span className="fw-fern" />
        <span className="fw-trace" style={{ fontFamily: headingFont }}>
          {piece.sealed || locked ? "✱" : initial(piece.author || "♡")}
        </span>
      </span>
      <span className="fw-rime" aria-hidden="true" />
      <span className="fw-arm" aria-hidden="true">
        <span className="fw-mitt">
          <span className="fw-mitt-thumb" />
          <span className="fw-mitt-cuff" />
        </span>
      </span>
      <span className="fw-glare" aria-hidden="true" />
    </button>
  );
}

/** Snow falling in front of the cabin, in a layer that stays on screen while the page scrolls. */
function Snowfall() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: (i * 29.7) % 100,
        size: 3 + ((i * 7) % 5),
        dur: 9 + ((i * 13) % 9),
        delay: -((i * 37) % 17),
        drift: ((i * 17) % 40) - 14,
        blur: i % 5 === 0,
      })),
    [],
  );
  return (
    <div className="fw-snow" aria-hidden="true">
      {flakes.map((f, i) => (
        <span
          key={i}
          className={f.blur ? "is-near" : ""}
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animationDuration: `${f.dur}s`,
              animationDelay: `${f.delay}s`,
              "--drift": `${f.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
