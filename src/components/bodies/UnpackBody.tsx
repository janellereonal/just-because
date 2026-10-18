/**
 * Care Package's body: unpacking the box.
 *
 * The parcel from the opening is now open on the table, seen from above: flaps
 * folded out, tape still on them, a label in marker. Inside, every note is
 * something wrapped in kraft paper or tissue (a jar, a parcel, a tin, a rolled
 * letter, an envelope, a little box), packed in layers, each with a paper tag
 * saying who packed it. A packing slip on top lists everyone who did, and ticks
 * them off as their things come out. Tap a thing and the paper unfolds with a
 * crinkle, the note opens up close, and the unwrapped thing goes on the table
 * beside the box. Balikbayan Box is the same body in its own look: printed
 * bands, tape everywhere and the name in marker.
 */
import { useEffect, useMemo, useState } from "react";
import { Camera, Check, Lock, Mail, Mic, Music2, Sparkles } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import { formatDay } from "@/lib/time";
import { loadFont, type FontSpec } from "@/themes/_shared/design";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  PhotoFace,
  PieceContent,
  Reader,
  isLocked,
  pieceLabel,
  seed,
  useBody,
  useOpened,
  type BodyProps,
  type Piece,
} from "@/components/bodies/kit";

/** The two looks' own type (the same faces their openings use). */
const FONTS: Record<"care" | "bb", { display: FontSpec; text: FontSpec }> = {
  care: {
    display: {
      family: '"Fraunces", Georgia, serif',
      source: "google",
      query: "Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500",
    },
    text: {
      family: '"Space Mono", ui-monospace, monospace',
      source: "google",
      query: "Space+Mono:wght@400;700",
    },
  },
  bb: {
    display: {
      family: '"Permanent Marker", "Comic Sans MS", cursive',
      source: "google",
      query: "Permanent+Marker",
    },
    text: {
      family: '"Archivo", system-ui, sans-serif',
      source: "google",
      query: "Archivo:wght@500;700;900",
    },
  },
};

type Shape = "jar" | "parcel" | "tin" | "roll" | "envelope" | "cube";
type Paper = "kraft" | "tissue" | "dots" | "stripes";

/** What a note is wrapped as: its kind picks the shape, its seed the variation. */
function wrapFor(p: Piece): { shape: Shape; paper: Paper } {
  const r = seed(p.id);
  switch (p.kind) {
    case "photo":
      return { shape: "parcel", paper: r < 0.7 ? "kraft" : "tissue" };
    case "song":
      return { shape: "tin", paper: "dots" };
    case "voice":
      return { shape: "cube", paper: "stripes" };
    case "ornament":
      return { shape: "jar", paper: "tissue" };
    case "calendar":
      return { shape: "cube", paper: r < 0.5 ? "kraft" : "stripes" };
    default:
      if (r < 0.3) return { shape: "roll", paper: "kraft" };
      if (r < 0.55) return { shape: "envelope", paper: r < 0.45 ? "kraft" : "tissue" };
      if (r < 0.75) return { shape: "jar", paper: "tissue" };
      if (r < 0.9) return { shape: "parcel", paper: "kraft" };
      return { shape: "tin", paper: "dots" };
  }
}

/** Notes per layer of tissue (fits 3, 4 and 6 across). */
const LAYER = 12;

export function UnpackBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, reduce } = body;
  const bb = /balikbayan/i.test(body.theme?.name ?? "");
  const look = FONTS[bb ? "bb" : "care"];
  useEffect(() => {
    loadFont(look.display, "high");
    loadFont(look.text, "low");
  }, [look]);
  const ownType = !body.site.font_choice || body.site.font_choice === "theme";
  const display = ownType ? look.display.family : body.fonts.heading;
  const label = ownType ? look.text.family : body.fonts.body;

  const { opened, open } = useOpened("unpack", body.site.id, body.sample);
  const [unwrapping, setUnwrapping] = useState<string | null>(null);
  const [shaking, setShaking] = useState<string | null>(null);
  const notes = data.notes;
  const out = notes.filter((p) => opened.has(p.id));
  // The table keeps the order things came out in.
  const onTable = useMemo(() => {
    const byId = new Map(notes.map((p) => [p.id, p]));
    return [...opened].map((id) => byId.get(id)).filter((p): p is Piece => !!p);
  }, [opened, notes]);
  const name = data.named ? data.name : "";

  // Everyone who packed something, ticked once all their things are out.
  const packers = useMemo(() => {
    const m = new Map<string, { n: number; done: number }>();
    for (const p of notes) {
      const who = p.author || t("unpack.slipSurprise");
      const row = m.get(who) ?? { n: 0, done: 0 };
      row.n += 1;
      if (opened.has(p.id)) row.done += 1;
      m.set(who, row);
    }
    return [...m.entries()];
  }, [notes, opened]);

  function tap(p: Piece, e: React.MouseEvent) {
    // Locked and sealed things stay wrapped: a little shake, then the reader says why.
    if (isLocked(p) || p.sealed) {
      setShaking(p.id);
      window.setTimeout(() => setShaking(null), 500);
      foley("thunk");
      buzz([6, 40, 6]);
      window.setTimeout(() => body.read(p), reduce ? 0 : 260);
      return;
    }
    if (opened.has(p.id) || reduce) {
      open(p.id);
      body.read(p);
      return;
    }
    setUnwrapping(p.id);
    foley("crunch");
    buzz(8);
    const x = e.clientX;
    const y = e.clientY;
    window.setTimeout(() => {
      foley("paper");
      burst(body.hostRef.current, x, y, {
        shape: "confetti",
        colors: [
          colors.mix("#C9A273", colors.primary, 0.1),
          colors.mix("#FFFFFF", colors.accent, 0.25),
          "#E9DCC2",
          colors.primary,
        ],
        count: 12,
        spread: 0.8,
        up: true,
      });
    }, 260);
    window.setTimeout(() => {
      open(p.id);
      setUnwrapping(null);
      body.read(p);
      if (out.length + 1 === notes.length) chime("tada");
    }, 640);
  }

  const kraft = colors.mix("#C69A64", colors.primary, 0.12);
  const tissue = colors.mix("#FFFFFF", colors.accent, colors.dark ? 0.22 : 0.18);
  return (
    <BodyRoot
      body={body}
      className={`up-root ${bb ? "is-bb" : ""} ${colors.dark ? "is-dark" : ""}`}
      style={
        {
          "--up-display": display,
          "--up-label": label,
          "--up-card": colors.mix("#C89B65", colors.primary, 0.1),
          "--up-card-hi": colors.mix("#DDB683", colors.primary, 0.08),
          "--up-card-lo": colors.mix("#9C7243", colors.primary, 0.14),
          "--up-floor": colors.mix("#7E5A35", colors.primary, 0.15),
          "--up-kraft": kraft,
          "--up-kraft-lo": colors.mix(kraft, "#3A2414", 0.22),
          "--up-tissue": tissue,
          "--up-tissue-lo": colors.mix(tissue, colors.accent, 0.3),
          "--up-twine": colors.mix("#EFE3C8", colors.primary, 0.1),
          "--up-ribbon": colors.mix(colors.primary, "#B4423A", bb ? 0.6 : 0.15),
          "--up-ink": colors.mix("#2A2420", colors.primary, 0.25),
          "--up-stamp": bb
            ? colors.mix("#C8352B", colors.primary, 0.15)
            : colors.mix("#C8452B", colors.primary, 0.2),
          "--up-band": colors.mix("#1F4E8C", colors.accent, 0.5),
          "--up-table": colors.dark
            ? colors.mix(colors.bg, "#8A5A34", 0.32)
            : colors.mix(colors.bg, "#B07A48", 0.32),
        } as React.CSSProperties
      }
    >
      <div className="up-grain" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 pt-[clamp(26px,6vh,64px)] pb-20">
        {/* The shipping label (or the cargo label) */}
        <header className="up-head">
          <div className="up-label-card">
            <div className="up-label-top">
              <span>{bb ? t("unpack.bbKicker") : t("unpack.kicker")}</span>
              {bb ? (
                <span className="up-barcode" aria-hidden="true" />
              ) : (
                <span className="up-label-no">
                  {t("unpack.labelNo", { n: Math.max(1, notes.length) })}
                </span>
              )}
            </div>
            <p className="up-to-tag">{t("unpack.to")}</p>
            <h1 className="up-name">
              {name ? <SampleText on={data.nameIsSample}>{name}</SampleText> : body.heading}
            </h1>
            {name ? <p className="up-heading">{body.heading}</p> : null}
            <p className="up-intro">{body.intro || body.voice.intro(name)}</p>
            <CountdownLine date={data.countdownDate} className="up-countdown" />
            {!bb ? (
              <span className="up-stamps" aria-hidden="true">
                <span
                  className="up-stamp"
                  style={{ "--r": "5deg", "--c": "var(--up-band)" } as React.CSSProperties}
                >
                  ✈
                </span>
                <span
                  className="up-stamp"
                  style={{ "--r": "-4deg", "--c": "var(--up-stamp)" } as React.CSSProperties}
                >
                  ♥
                </span>
                <span className="up-postmark">{t("unpack.postmark")}</span>
              </span>
            ) : null}
          </div>
        </header>

        <p className="up-progress" role="status" aria-live="polite">
          {notes.length === 0
            ? null
            : out.length === 0
              ? t("unpack.start", { n: notes.length })
              : out.length === notes.length
                ? t("unpack.allOut")
                : t("unpack.progress", { n: out.length, total: notes.length })}
        </p>

        <div className="up-scene">
          {/* The open box, from above */}
          <section className="up-box" aria-label={t("unpack.boxAria")}>
            <span className="up-flap is-top" aria-hidden="true">
              {bb ? (
                <span className="up-marker" style={{ fontFamily: "var(--up-display)" }}>
                  {name ? t("unpack.bbPara", { name: name.toUpperCase() }) : t("unpack.bbParaYou")}
                </span>
              ) : (
                <span className="up-fragile">{t("unpack.fragile")}</span>
              )}
            </span>
            <span className="up-flap is-left" aria-hidden="true" />
            <span className="up-flap is-right" aria-hidden="true" />
            <span className="up-flap is-bottom" aria-hidden="true">
              <span className="up-arrows">
                ↑↑ {bb ? t("unpack.handle") : t("unpack.thisSideUp")}
              </span>
            </span>
            <span className="up-tape is-a" aria-hidden="true" />
            <span className="up-tape is-b" aria-hidden="true" />
            {bb ? (
              <>
                <span className="up-tape is-c" aria-hidden="true" />
                <span className="up-tape is-d" aria-hidden="true" />
              </>
            ) : null}

            <div className="up-inside">
              {notes.length ? (
                <div className="up-slip">
                  <p className="up-slip-title">{t("unpack.slipTitle")}</p>
                  <p className="up-slip-sub">
                    {t("unpack.slipSub", { n: notes.length, name: name || t("unpack.slipYou") })}
                  </p>
                  <ul className="up-slip-list">
                    {packers.map(([who, row]) => (
                      <li key={who} className={row.done === row.n ? "is-done" : ""}>
                        <span className="up-slip-box" aria-hidden="true">
                          {row.done === row.n ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="up-slip-who">{who}</span>
                        <span className="up-slip-dots" aria-hidden="true" />
                        <span className="up-slip-n">{t("unpack.slipQty", { n: row.n })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="up-empty">{body.voice.empty(t("unpack.what"))}</p>
              )}
              {notes.length ? (
                <ul className="up-floor">
                  {notes.map((p, i) => {
                    const items = [
                      <li key={p.id} className="up-cell">
                        <Thing
                          piece={p}
                          state={
                            unwrapping === p.id ? "unwrapping" : opened.has(p.id) ? "out" : "packed"
                          }
                          shaking={shaking === p.id}
                          onTap={(e) => tap(p, e)}
                        />
                      </li>,
                    ];
                    if ((i + 1) % LAYER === 0 && i + 1 < notes.length)
                      items.push(
                        <li key={`layer-${i}`} className="up-layer" aria-hidden="true">
                          <span>{t("unpack.layer", { n: (i + 1) / LAYER + 1 })}</span>
                        </li>,
                      );
                    return items;
                  })}
                </ul>
              ) : null}
            </div>
          </section>

          {/* The table beside it: what's been unwrapped */}
          {notes.length ? (
            <aside className="up-side" aria-label={t("unpack.tableTitle")}>
              <div className="up-table">
                <p className="up-table-title">{t("unpack.tableTitle")}</p>
                {onTable.length ? (
                  <ul className="up-things">
                    {onTable.map((p, i) => (
                      <li key={p.id} style={{ "--i": i } as React.CSSProperties}>
                        <Unwrapped piece={p} onOpen={() => body.read(p)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="up-table-empty">{t("unpack.tableEmpty")}</p>
                )}
                <span className="up-crumple is-a" aria-hidden="true" />
                <span className="up-crumple is-b" aria-hidden="true" />
              </div>
            </aside>
          ) : null}
        </div>

        {data.words.length ? (
          <section className="up-words" aria-label={t("unpack.wordsTitle")}>
            <p className="up-words-kicker">{t("unpack.wordsKicker")}</p>
            <p className="up-words-title">{t("unpack.wordsTitle")}</p>
            <p className="up-words-list">
              {data.words.map((w) => (
                <span
                  key={w.id}
                  style={
                    { "--r": `${((seed(w.id) - 0.5) * 9).toFixed(1)}deg` } as React.CSSProperties
                  }
                >
                  {w.text}
                </span>
              ))}
            </p>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="up-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.primary, "#2A2420", colors.dark ? 0 : 0.1)}
          className="up-reader"
        >
          <span className="up-reader-tape" aria-hidden="true" />
          <p className="up-reader-kicker">{t(`unpack.thing.${wrapFor(body.reading).shape}`)}</p>
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/** One wrapped thing in the box. Unwrapped, its slot keeps the crumpled paper and the tag. */
function Thing({
  piece,
  state,
  shaking,
  onTap,
}: {
  piece: Piece;
  state: "packed" | "unwrapping" | "out";
  shaking: boolean;
  onTap: (e: React.MouseEvent) => void;
}) {
  const { shape, paper } = wrapFor(piece);
  const r = seed(piece.id);
  const locked = isLocked(piece);
  const Icon =
    piece.kind === "photo"
      ? Camera
      : piece.kind === "song"
        ? Music2
        : piece.kind === "voice"
          ? Mic
          : piece.kind === "ornament"
            ? Sparkles
            : null;
  return (
    <button
      type="button"
      className={`up-thing is-${shape} paper-${paper} is-${state} ${shaking ? "is-shake" : ""}`}
      style={
        {
          "--tilt": `${((r - 0.5) * 16).toFixed(1)}deg`,
          "--tag": `${(((r * 7) % 1) - 0.5) * 20}deg`,
        } as React.CSSProperties
      }
      onClick={onTap}
      aria-label={pieceLabel(piece)}
    >
      {state === "out" ? (
        <span className="up-nest" aria-hidden="true" />
      ) : (
        <span className="up-obj" aria-hidden="true">
          <span className="up-obj-paper" />
          {state === "unwrapping" ? (
            <>
              <span className="up-reveal">
                {Icon ? <Icon className="size-4" /> : <Mail className="size-4" />}
              </span>
              <span className="up-peel is-n" />
              <span className="up-peel is-e" />
              <span className="up-peel is-s" />
              <span className="up-peel is-w" />
            </>
          ) : null}
          {piece.sealed || locked ? (
            <span className="up-seal">
              <Lock className="size-3" />
            </span>
          ) : (
            <span className="up-tie" />
          )}
        </span>
      )}
      <span className="up-tag" aria-hidden="true">
        {Icon && state !== "out" ? <Icon className="size-2.5 shrink-0" /> : null}
        <span className="truncate">
          {locked
            ? t("body.opensOn", { day: formatDay(piece.date!, { day: "numeric", month: "short" }) })
            : piece.author || t("unpack.surpriseTag")}
        </span>
      </span>
    </button>
  );
}

/** What came out of the paper, lying on the table. */
function Unwrapped({ piece, onOpen }: { piece: Piece; onOpen: () => void }) {
  const r = seed(piece.id);
  const tilt = `${((r - 0.5) * 10).toFixed(1)}deg`;
  if (piece.kind === "photo")
    return (
      <button
        type="button"
        className="up-out is-photo"
        style={{ "--tilt": tilt } as React.CSSProperties}
        onClick={onOpen}
        aria-label={pieceLabel(piece)}
      >
        <span className="up-out-pic">
          <PhotoFace piece={piece} tint="#C9A273" sizes="180px" />
        </span>
        <span className="up-out-cap">{piece.text || piece.author}</span>
      </button>
    );
  const Icon = piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : null;
  return (
    <button
      type="button"
      className={`up-out ${piece.kind === "ornament" ? "is-slip" : Icon ? "is-card" : "is-letter"}`}
      style={{ "--tilt": tilt } as React.CSSProperties}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      {Icon ? (
        <span className="up-out-icon">
          <Icon className="size-4" />
        </span>
      ) : null}
      <span className="up-out-text">
        <PieceContent
          piece={
            piece.kind === "song" || piece.kind === "voice"
              ? {
                  ...piece,
                  kind: "letter",
                  text:
                    piece.text?.trim() ||
                    t(piece.kind === "song" ? "body.songFallback" : "body.voiceFallback"),
                }
              : piece
          }
          accent="var(--up-ink)"
          clamp={piece.kind === "ornament" ? 2 : 4}
        />
      </span>
      {piece.author ? <span className="up-out-from">{piece.author}</span> : null}
    </button>
  );
}
