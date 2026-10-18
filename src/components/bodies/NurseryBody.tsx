/**
 * Crib Mobile's body: a nursery wall.
 *
 * The opening's mobile still turns slowly in the corner. The name is spelled in
 * soft wall letters. Below, wooden shelves hold alphabet blocks, stacked two
 * rows high, one block per note with the friend's initial on its face and a
 * small sign of what's inside. Tap a block and it hops and tumbles forward,
 * turning its top up to show the note face, then the note opens. Turned blocks
 * stay turned on this device. Photos are clipped along a growth chart, and the
 * words float by as little clouds. Everything moves gently.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Camera, Heart, Lock, Mail, Mic, Moon, Music2, Star } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { useCountdown } from "@/lib/giftPieces";
import { burst, buzz, chime, foley } from "@/lib/play";
import {
  BodyFooter,
  BodyRoot,
  PhotoFace,
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
const PER_SHELF = 7;
const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function NurseryBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("nursery", body.site.id, body.sample);
  const [tumbling, setTumbling] = useState<string | null>(null);

  // Pastels from the opening (sky, butter, blush, mint), leaning toward the gift's palette.
  const pastels = useMemo(() => {
    const lean = (c: string, k = 0.22) => colors.mix(c, colors.primary, k);
    return [
      lean("#AFCDEB"),
      lean("#FBE3A0", 0.12),
      colors.mix("#F4BFC8", colors.accent, 0.25),
      lean("#C9E6D5", 0.15),
      colors.mix("#D9CCF0", colors.accent, 0.15),
      colors.mix(colors.accent, "#FFFFFF", 0.55),
    ];
  }, [colors]);
  const deep = colors.mix("#3D4660", colors.primary, 0.25);

  const blocks = data.notes.filter((p) => p.kind !== "photo" || p.sealed);
  const photos = data.notes.filter((p) => p.kind === "photo" && !p.sealed);
  const shelves = useMemo(() => chunk(blocks, PER_SHELF), [blocks]);
  const count = blocks.filter((p) => opened.has(p.id)).length;

  function read(p: Piece, e: React.MouseEvent) {
    if (tumbling) return;
    const first = !opened.has(p.id);
    const x = e.clientX;
    const y = e.clientY;
    if (!first || reduce || p.kind === "photo") {
      open(p.id);
      if (p.kind === "photo") foley("paper");
      body.read(p);
      return;
    }
    setTumbling(p.id);
    foley("thunk");
    buzz([6, 60, 10]);
    window.setTimeout(() => {
      open(p.id);
      foley("thunk");
      chime("chime");
    }, 380);
    window.setTimeout(() => {
      setTumbling(null);
      body.read(p);
      if (!p.sealed && !isLocked(p))
        burst(body.hostRef.current, x, y - 20, {
          shape: "stars",
          colors: [pastels[0]!, pastels[1]!, pastels[2]!],
          count: 8,
          spread: 0.6,
          up: true,
        });
    }, 820);
  }

  const name = data.named ? data.name : "";
  return (
    <BodyRoot
      body={body}
      className="nu-root"
      style={
        {
          "--nu-wall": colors.dark
            ? colors.mix(colors.bg, colors.primary, 0.12)
            : colors.mix(colors.bg, "#FFFFFF", 0.25),
          "--nu-dot": colors.dark
            ? "rgba(255,255,255,.07)"
            : colors.mix(colors.bg, colors.primary, 0.16),
          "--nu-wood": colors.mix("#E9CFA4", colors.primary, 0.05),
          "--nu-wood-deep": colors.mix("#C99E6A", colors.primary, 0.06),
          "--nu-deep": deep,
          "--nu-p0": pastels[0],
          "--nu-p1": pastels[1],
          "--nu-p2": pastels[2],
          "--nu-p3": pastels[3],
        } as React.CSSProperties
      }
    >
      <div className="nu-wall" aria-hidden="true" />
      <Mobile pastels={pastels} />
      <div className="relative mx-auto max-w-6xl px-4 pt-[clamp(104px,14vh,128px)] pb-20">
        <header className="nu-head" data-gift-page="">
          <p className="nu-kicker">{data.named ? t("nursery.kicker") : ""}</p>
          <h1
            className="nu-name"
            style={{ fontFamily: fonts.heading }}
            aria-label={data.named ? data.name : body.heading}
          >
            {data.named ? (
              <SampleText on={data.nameIsSample}>
                <WallLetters text={data.name} pastels={pastels} />
              </SampleText>
            ) : (
              <WallLetters text={body.heading} pastels={pastels} />
            )}
          </h1>
          {data.named ? (
            <p className="nu-heading" style={{ fontFamily: fonts.heading }}>
              {body.heading}
            </p>
          ) : null}
          <p className="nu-intro">{body.intro || body.voice.intro(name)}</p>
          <CloudCountdown date={data.countdownDate} />
        </header>

        <p className="nu-progress" role="status" aria-live="polite">
          {data.notes.length === 0
            ? body.voice.empty(t("nursery.what"))
            : blocks.length === 0
              ? null
              : count === 0
                ? t("nursery.count", { n: blocks.length })
                : count === blocks.length
                  ? t("nursery.allRead")
                  : t("nursery.progress", { n: count, total: blocks.length })}
        </p>

        {blocks.length || !photos.length ? (
          <div className="nu-shelves">
            {(shelves.length ? shelves : [[]]).map((shelf, s) => {
              const bottom = shelf.slice(0, 4);
              const top = shelf.slice(4);
              return (
                <div className="nu-shelf" key={s}>
                  <div className="nu-stack">
                    <ul className="nu-row">
                      {bottom.map((p, i) => (
                        <li key={p.id}>
                          <Block
                            piece={p}
                            index={s * PER_SHELF + i}
                            pastels={pastels}
                            turned={opened.has(p.id)}
                            tumbling={tumbling === p.id}
                            onOpen={(e) => read(p, e)}
                            headingFont={fonts.heading}
                          />
                        </li>
                      ))}
                    </ul>
                    {top.length ? (
                      <ul className="nu-row is-top">
                        {top.map((p, i) => (
                          <li key={p.id}>
                            <Block
                              piece={p}
                              index={s * PER_SHELF + 4 + i}
                              pastels={pastels}
                              turned={opened.has(p.id)}
                              tumbling={tumbling === p.id}
                              onOpen={(e) => read(p, e)}
                              headingFont={fonts.heading}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div className="nu-plank" aria-hidden="true">
                    <span className="nu-bracket is-left" />
                    <span className="nu-bracket is-right" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {photos.length ? (
          <section className="nu-chart-wrap" aria-label={t("nursery.chartTitle")}>
            <p className="nu-section-title" style={{ fontFamily: fonts.heading }}>
              {t("nursery.chartTitle")}
            </p>
            <p className="nu-section-note">{t("nursery.chartNote")}</p>
            <div className="nu-chart" style={{ "--n": photos.length } as React.CSSProperties}>
              <div className="nu-ruler" aria-hidden="true">
                <span className="nu-ruler-cap">
                  <Star className="size-4" fill="currentColor" />
                </span>
                {Array.from({ length: photos.length * 2 + 2 }, (_, i) => (
                  <span
                    key={i}
                    className="nu-ruler-mark"
                    style={{ top: `${((i / (photos.length * 2 + 2)) * 100).toFixed(2)}%` }}
                  >
                    {i % 2 === 0 && i > 0 ? <span>{photos.length * 2 + 2 - i}</span> : null}
                  </span>
                ))}
              </div>
              <ul className="nu-photos">
                {photos.map((p, i) => (
                  <li
                    key={p.id}
                    className={i % 2 ? "is-right" : "is-left"}
                    style={
                      {
                        "--tilt": `${((seed(p.id) - 0.5) * 10).toFixed(1)}deg`,
                      } as React.CSSProperties
                    }
                  >
                    <button
                      type="button"
                      className={`nu-photo ${opened.has(p.id) ? "is-seen" : ""}`}
                      onClick={(e) => read(p, e)}
                      aria-label={pieceLabel(p)}
                    >
                      <span className="nu-pin" aria-hidden="true" />
                      <span className="nu-photo-pic">
                        <PhotoFace piece={p} tint={pastels[i % pastels.length]!} sizes="180px" />
                      </span>
                      <span className="nu-photo-name">{p.author || t("nursery.friend")}</span>
                    </button>
                    <span className="nu-mark" aria-hidden="true" />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {data.words.length ? (
          <section className="nu-words" aria-label={t("nursery.wordsTitle")}>
            <p className="nu-section-title" style={{ fontFamily: fonts.heading }}>
              {t("nursery.wordsTitle")}
            </p>
            <ul className="nu-clouds">
              {data.words.map((w, i) => (
                <li
                  key={w.id}
                  style={
                    {
                      "--d": `${((seed(w.id) * 5) % 5).toFixed(2)}s`,
                      "--c": pastels[i % 4],
                    } as React.CSSProperties
                  }
                >
                  <span className="nu-cloud">{w.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="nu-footer"
          buttonStyle={{ background: deep, color: "#FFFFFF" }}
        />
      </div>

      {body.reading ? <StoryCard body={body} piece={body.reading} pastels={pastels} /> : null}
    </BodyRoot>
  );
}

/** The name in soft wall letters, each its own pastel and tilt. */
function WallLetters({ text, pastels }: { text: string; pastels: string[] }) {
  return (
    <span className="nu-letters" aria-hidden="true">
      {text.split(" ").map((word, w) => (
        <span key={w} className="nu-word">
          {[...word].map((ch, i) => (
            <span
              key={i}
              className="nu-letter"
              style={
                {
                  "--c": pastels[(w * 3 + i) % 4],
                  "--cd": deepOf(pastels[(w * 3 + i) % 4]!),
                  "--r": `${((seed(`${word}${i}`) - 0.5) * 12).toFixed(1)}deg`,
                } as React.CSSProperties
              }
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/** The countdown on a little cloud with a moon. Client only (minutes move between server and browser). */
function CloudCountdown({ date }: { date: string | null }) {
  const c = useCountdown(date);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!c) return null;
  if (!mounted) return <div className="nu-count is-waiting" aria-hidden="true" />;
  return (
    <div className="nu-count" role="timer">
      <Moon className="nu-count-moon" aria-hidden="true" />
      <span>
        <span className="nu-count-label">{c.done ? t("nursery.now") : t("nursery.until")}</span>
        {c.done ? null : (
          <span className="nu-count-time">
            {t("body.countdown.left", { days: c.days, hours: c.hours, mins: c.mins })}
          </span>
        )}
      </span>
    </div>
  );
}

/** The crib mobile from the opening, still turning slowly in the corner. */
function Mobile({ pastels }: { pastels: string[] }) {
  return (
    <div className="nu-mobile" aria-hidden="true">
      <span className="nu-mobile-hook" />
      <div className="nu-mobile-arm">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`nu-mobile-drop is-${i}`}>
            <svg viewBox="0 0 40 40">
              {i === 0 ? (
                <path
                  d="M26 6a15 15 0 1 0 8 26A13 13 0 0 1 26 6Z"
                  fill={pastels[1]}
                  stroke="rgba(61,70,96,.25)"
                />
              ) : i === 1 ? (
                <path
                  d="M20 4 24.5 15 36 15.6 27 23 30 34.5 20 28 10 34.5 13 23 4 15.6 15.5 15Z"
                  fill={pastels[2]}
                  stroke="rgba(61,70,96,.25)"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M10 30a7 7 0 0 1 1-14 9 9 0 0 1 17-2 7 7 0 0 1 3 16Z"
                  fill={pastels[0]}
                  stroke="rgba(61,70,96,.25)"
                />
              )}
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

function KindIcon({ p, className }: { p: Piece; className?: string }) {
  const locked = p.sealed || isLocked(p);
  const Icon = locked
    ? Lock
    : p.kind === "photo"
      ? Camera
      : p.kind === "song"
        ? Music2
        : p.kind === "voice"
          ? Mic
          : p.kind === "ornament"
            ? Star
            : p.kind === "calendar"
              ? CalendarDays
              : Mail;
  return <Icon className={className} aria-hidden="true" />;
}

/** An alphabet block: a real cube. Its top face is the note face; tapping tumbles it forward to show it. */
function Block({
  piece,
  index,
  pastels,
  turned,
  tumbling,
  onOpen,
  headingFont,
}: {
  piece: Piece;
  index: number;
  pastels: string[];
  turned: boolean;
  tumbling: boolean;
  onOpen: (e: React.MouseEvent) => void;
  headingFont: string;
}) {
  const r = seed(piece.id);
  const c = (k: number) => pastels[(index + k) % pastels.length]!;
  const letter = initial(piece.author || "♡");
  const other = ABC[Math.floor(r * 26) % 26]!;
  const yaw = -24 + (r - 0.5) * 14;
  return (
    <button
      type="button"
      className={`nu-block ${turned ? "is-turned" : ""} ${tumbling ? "is-tumbling" : ""}`}
      style={
        {
          "--yaw": `${yaw.toFixed(1)}deg`,
          "--sit": `${((r - 0.5) * 6).toFixed(1)}px`,
        } as React.CSSProperties
      }
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="nu-cube" aria-hidden="true">
        <span className="nu-face is-front" style={{ "--c": c(0) } as React.CSSProperties}>
          <span className="nu-panel">
            <span className="nu-big" style={{ fontFamily: headingFont }}>
              {letter}
            </span>
            <KindIcon p={piece} className="nu-corner" />
          </span>
        </span>
        <span className="nu-face is-top" style={{ "--c": c(2) } as React.CSSProperties}>
          <span className="nu-panel">
            <KindIcon p={piece} className="nu-top-icon" />
          </span>
        </span>
        <span className="nu-face is-right" style={{ "--c": c(1) } as React.CSSProperties}>
          <span className="nu-panel">
            <span className="nu-big is-small" style={{ fontFamily: headingFont }}>
              {other}
            </span>
          </span>
        </span>
        {/* The note face: underneath until the block tumbles back onto it. */}
        <span className="nu-face is-bottom" style={{ "--c": c(5) } as React.CSSProperties}>
          <span className="nu-panel is-note">
            <KindIcon p={piece} className="nu-note-icon" />
            <span className="nu-note-from">{piece.author || "♡"}</span>
            <Heart className="nu-note-heart" fill="currentColor" />
          </span>
        </span>
      </span>
      <span className="nu-block-shadow" aria-hidden="true" />
    </button>
  );
}

/** The note, read on a soft card with stitched edges and the block's face up top. */
function StoryCard({ body, piece, pastels }: { body: Body; piece: Piece; pastels: string[] }) {
  const { colors, fonts } = body;
  const tint = pastels[Math.floor(seed(piece.id) * pastels.length) % pastels.length]!;
  return (
    <Reader
      piece={piece}
      onClose={body.closeReader}
      accent={colors.mix("#3D4660", colors.primary, 0.3)}
      className="nu-reader"
      style={{ "--nu-tint": tint } as React.CSSProperties}
    >
      <div className="nu-reader-head">
        <span className="nu-reader-block" style={{ fontFamily: fonts.heading }} aria-hidden="true">
          {initial(piece.author || "♡")}
        </span>
        <span className="nu-reader-from">
          {piece.author ? t("nursery.from", { name: piece.author }) : t("nursery.friend")}
        </span>
      </div>
    </Reader>
  );
}

/** A pastel, deepened enough to read as a letter on a pale wall. */
function deepOf(c: string) {
  const n = parseInt(c.slice(1), 16);
  const ch = (sh: number) => Math.round(((n >> sh) & 255) * 0.62 + 0x3d * 0.38);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
