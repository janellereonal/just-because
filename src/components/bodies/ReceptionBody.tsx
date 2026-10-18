/**
 * Invitation's body: a reception.
 *
 * The invitation from the opening leads into the room. Photos hang salon style
 * on a panelled wall, each in its own gilded frame. Below, the tables are laid
 * in linen with taper candles and a garland of flowers, and every friend has a
 * tented place card with their name in the invitation's type. Tap a card and it
 * unfolds flat into a heavy card-stock note. Two looks: Weddings (ivory and
 * greenery) and Bridal Shower (blush and roses).
 */
// Its styles load with it, not with every page.
import "@/styles/bodies/reception.css";
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

/** Shapes in pairs that share a row on a phone, and the frames each shape can wear. */
const SHAPES = [
  "is-wide",
  "is-tall",
  "is-square",
  "is-square",
  "is-tall",
  "is-wide",
  "is-tall",
  "is-tall",
] as const;
const FRAMES = {
  "is-wide": ["is-ornate", "is-thin"],
  "is-square": ["is-thin", "is-ornate"],
  "is-tall": ["is-oval", "is-arch", "is-ornate"],
} as const;

export function ReceptionBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce, site, theme } = body;
  const { opened, open } = useOpened("reception", site.id, body.sample);
  const blush = site.occasion === "bridal-shower" || /bridal/i.test(theme?.name ?? "");
  const notes = data.notes;
  const photos = notes.filter((p) => p.kind === "photo" && !p.sealed);
  const cards = notes.filter((p) => !(p.kind === "photo" && !p.sealed));
  const read = notes.filter((p) => opened.has(p.id)).length;
  const [unfolding, setUnfolding] = useState<string | null>(null);

  // Cards per table: as many as fit nicely in the room there is.
  const hallRef = useRef<HTMLDivElement | null>(null);
  const [hw, setHw] = useState(358);
  useEffect(() => {
    const el = hallRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => e && setHw(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const per = Math.max(2, Math.min(6, Math.floor((hw - 20) / 112)));
  const tables = useMemo(() => {
    const out: Piece[][] = [];
    for (let i = 0; i < cards.length; i += per) out.push(cards.slice(i, i + per));
    return out;
  }, [cards, per]);

  function unfold(p: Piece, e: React.MouseEvent<HTMLElement>) {
    if (!opened.has(p.id)) {
      open(p.id);
      buzz(6);
    }
    foley("paper");
    setUnfolding(p.id);
    const r = e.currentTarget.getBoundingClientRect();
    window.setTimeout(
      () => {
        setUnfolding(null);
        body.read(p);
        if (!reduce && !p.sealed && !isLocked(p)) {
          chime("chime");
          burst(body.hostRef.current, r.left + r.width / 2, r.top, {
            shape: "petals",
            colors: blush
              ? ["#F2C6C2", "#E7A9A3", "#FFFFFF"]
              : ["#FFFFFF", colors.primary, "#E9DFC8"],
            count: 9,
            spread: 0.8,
            up: true,
          });
        }
      },
      reduce ? 0 : 420,
    );
  }

  function view(p: Piece) {
    if (!opened.has(p.id)) open(p.id);
    body.read(p);
  }

  return (
    <BodyRoot
      body={body}
      className={`rx-root ${blush ? "is-blush" : "is-ivory"}`}
      style={
        {
          "--rx-linen": colors.mix(
            blush ? "#FFF6F3" : "#FFFDF8",
            colors.primary,
            colors.dark ? 0.06 : 0.04,
          ),
          "--rx-linen-deep": colors.mix(blush ? "#EBD7D1" : "#E9E2D2", colors.primary, 0.08),
          "--rx-card": blush ? "#FFFAF8" : "#FFFEFA",
          "--rx-ink": blush ? "#4A3A3A" : "#3B3A33",
          "--rx-gold": colors.mix("#C9A55C", colors.accent, 0.35),
          "--rx-gold-deep": colors.mix("#8E6F31", colors.accent, 0.3),
          "--rx-leaf": colors.mix(blush ? "#A3B596" : "#8FA587", colors.primary, 0.15),
          "--rx-leaf-deep": colors.mix(blush ? "#728A66" : "#5E7656", colors.primary, 0.12),
          "--rx-bloom": blush ? "#F2C6C2" : "#FFFFFF",
          "--rx-swag": colors.mix(
            blush
              ? colors.mix("#E0A9A3", colors.primary, 0.25)
              : colors.mix("#9DB08F", colors.primary, 0.45),
            "#FFFFFF",
            0.25,
          ),
          "--rx-bloom-deep": blush ? "#D9918B" : "#E6DCCB",
          "--rx-wall": colors.dark
            ? colors.mix(colors.bg, "#FFFFFF", 0.04)
            : colors.mix(colors.bg, colors.primary, 0.05),
          "--rx-wall-line": colors.dark
            ? "rgba(255,255,255,.07)"
            : colors.mix(colors.bg, colors.primary, 0.16),
          "--rx-accent-ink": colors.mix(colors.primary, colors.ink, colors.dark ? 0.7 : 0.35),
          "--rx-glow": colors.dark ? "rgba(255, 220, 160, .07)" : "rgba(255,255,255,.5)",
        } as React.CSSProperties
      }
    >
      <div className="rx-paper" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1080px] px-4 pt-[clamp(30px,8vh,76px)] pb-20">
        <header className="rx-head">
          <Sprig className="rx-head-sprig" />
          <p className="rx-kicker">{t("reception.kicker")}</p>
          <h1 className="rx-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? (
              <SampleText on={data.nameIsSample}>{data.name}</SampleText>
            ) : (
              body.heading
            )}
          </h1>
          {data.named ? <p className="rx-heading">{body.heading}</p> : null}
          <p className="rx-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
          <CountdownLine date={data.countdownDate} className="rx-countdown" />
        </header>

        {photos.length ? (
          <section className="rx-wall" aria-label={t("reception.wall")}>
            <p className="rx-section" style={{ fontFamily: fonts.heading }}>
              {t("reception.wall")}
            </p>
            <ul className="rx-frames">
              {photos.map((p, i) => {
                const shape = SHAPES[i % SHAPES.length]!;
                const kinds = FRAMES[shape];
                const kind = kinds[(i + Math.floor(seed(p.id) * kinds.length)) % kinds.length]!;
                return (
                  <li
                    key={p.id}
                    className={`rx-frame-spot ${shape}`}
                    style={
                      {
                        "--drop": `${Math.round((seed(`${p.id}d`) - 0.5) * 30)}px`,
                      } as React.CSSProperties
                    }
                  >
                    <span className="rx-hook" aria-hidden="true" />
                    <button
                      type="button"
                      className={`rx-frame ${kind} ${opened.has(p.id) ? "is-seen" : ""}`}
                      onClick={() => view(p)}
                      aria-label={pieceLabel(p)}
                    >
                      <span className="rx-mat">
                        <span className="rx-pic">
                          <PhotoFace
                            piece={p}
                            tint={colors.primary}
                            sizes="(max-width: 640px) 45vw, 280px"
                          />
                        </span>
                      </span>
                    </button>
                    <span className="rx-plaque">{p.author}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section
          ref={hallRef}
          className="rx-hall"
          aria-label={t("reception.count", { n: cards.length })}
        >
          <div className="rx-hall-head">
            <p className="rx-section" style={{ fontFamily: fonts.heading }}>
              {notes.length ? t("reception.hint") : body.voice.empty(t("reception.what"))}
            </p>
            {notes.length ? (
              <p className="rx-progress" role="status">
                {read === notes.length
                  ? t("reception.allRead")
                  : t("reception.progress", { n: read, total: notes.length })}
              </p>
            ) : null}
          </div>
          {(tables.length ? tables : [[]]).map((row, k) => (
            <Table
              key={k}
              index={k}
              row={row}
              per={per}
              opened={opened}
              unfolding={unfolding}
              onOpen={unfold}
              headingFont={fonts.heading}
            />
          ))}
        </section>

        {data.words.length ? (
          <section className="rx-words" aria-label={t("reception.wordsTitle")}>
            <div className="rx-menu">
              <Sprig className="rx-menu-sprig" />
              <p className="rx-menu-title" style={{ fontFamily: fonts.heading }}>
                {t("reception.wordsTitle")}
              </p>
              <ul className="rx-menu-list" style={{ fontFamily: fonts.heading }}>
                {data.words.map((w) => (
                  <li key={w.id}>{w.text}</li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        <BodyFooter
          body={body}
          className="rx-footer"
          buttonStyle={{ background: colors.primary, color: colors.onPrimary }}
        />
      </div>

      {body.reading ? (
        <Reader
          piece={body.reading}
          onClose={body.closeReader}
          accent={colors.mix(colors.accent, "#3B3A33", 0.25)}
          className="rx-reader"
        >
          <span className="rx-reader-crease" aria-hidden="true" />
          <span className="rx-reader-border" aria-hidden="true" />
          <Sprig className="rx-reader-sprig" />
          {data.named &&
          !body.reading.sealed &&
          !isLocked(body.reading) &&
          body.reading.kind !== "photo" ? (
            <p className="rx-reader-dear" style={{ fontFamily: fonts.heading }}>
              {t("reception.dear", { name: data.name })}
            </p>
          ) : null}
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/* ---------- a table ---------- */

function Table({
  index,
  row,
  per,
  opened,
  unfolding,
  onOpen,
  headingFont,
}: {
  index: number;
  row: Piece[];
  per: number;
  opened: Set<string>;
  unfolding: string | null;
  onOpen: (p: Piece, e: React.MouseEvent<HTMLElement>) => void;
  headingFont: string;
}) {
  // Candles between the cards, flowers along the back.
  const candles = Math.max(2, Math.min(5, per - 1 - (index % 2)));
  return (
    <div className="rx-table" style={{ "--per": per } as React.CSSProperties}>
      <div className="rx-table-top" aria-hidden="true">
        <span className="rx-garland">
          {Array.from({ length: per + 3 }, (_, i) => (
            <span
              key={i}
              className={`rx-bloom ${i % 3 === 1 ? "is-small" : ""}`}
              style={
                {
                  left: `${(i / (per + 2)) * 100}%`,
                  "--rot": `${(seed(`b${index}-${i}`) * 90).toFixed(0)}deg`,
                } as React.CSSProperties
              }
            />
          ))}
          {Array.from({ length: per * 2 + 4 }, (_, i) => (
            <span
              key={`l${i}`}
              className="rx-leaf"
              style={
                {
                  left: `${(i / (per * 2 + 3)) * 100}%`,
                  "--rot": `${(i % 2 ? -1 : 1) * (30 + seed(`l${index}-${i}`) * 50)}deg`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
        {Array.from({ length: candles }, (_, i) => (
          <span
            key={i}
            className="rx-candle"
            style={
              {
                left: `${((i + 1) / (candles + 1)) * 100}%`,
                "--h": `${0.8 + seed(`c${index}-${i}`) * 0.3}`,
              } as React.CSSProperties
            }
          >
            <span
              className="rx-flame"
              style={{ animationDelay: `${-seed(`f${index}-${i}`) * 1.3}s` }}
            />
          </span>
        ))}
      </div>
      <ul className="rx-cards">
        {row.map((p) => (
          <li key={p.id}>
            <PlaceCard
              piece={p}
              open={opened.has(p.id)}
              unfolding={unfolding === p.id}
              onOpen={(e) => onOpen(p, e)}
              headingFont={headingFont}
            />
          </li>
        ))}
      </ul>
      <div className="rx-skirt" aria-hidden="true" />
    </div>
  );
}

function PlaceCard({
  piece,
  open,
  unfolding,
  onOpen,
  headingFont,
}: {
  piece: Piece;
  open: boolean;
  unfolding: boolean;
  onOpen: (e: React.MouseEvent<HTMLElement>) => void;
  headingFont: string;
}) {
  const locked = isLocked(piece);
  const Icon =
    piece.sealed || locked
      ? Lock
      : piece.kind === "song"
        ? Music2
        : piece.kind === "voice"
          ? Mic
          : null;
  return (
    <button
      type="button"
      className={`rx-card ${open ? "is-open" : ""} ${unfolding ? "is-unfold" : ""}`}
      style={{ "--tilt": `${((seed(piece.id) - 0.5) * 5).toFixed(1)}deg` } as React.CSSProperties}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="rx-card-back" />
      <span className="rx-card-face">
        <span className="rx-card-name" style={{ fontFamily: headingFont }}>
          {piece.author || t("reception.surprise")}
        </span>
        <span className="rx-card-rule" />
        <span className="rx-card-what">
          {Icon ? <Icon className="size-2.5" /> : null}
          {locked
            ? t("body.opensOn", { day: formatDay(piece.date!, SHORT_DAY) })
            : pieceWhat(piece)}
        </span>
        {open ? <span className="rx-card-foil" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

/** A little sprig of leaves, drawn once in SVG and tinted by the look. */
function Sprig({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 120 40" aria-hidden="true">
      <path
        d="M6 22 C 34 18, 70 18, 114 20"
        fill="none"
        stroke="var(--rx-leaf-deep)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {[16, 30, 44, 58, 72, 86, 100].map((x, i) => (
        <g
          key={x}
          transform={`translate(${x} ${20 - (i % 2 ? -1 : 1) * 0.5}) rotate(${i % 2 ? 32 : -32})`}
        >
          <ellipse
            cx="0"
            cy={i % 2 ? 6 : -6}
            rx="4.2"
            ry="8"
            fill={i % 3 === 0 ? "var(--rx-leaf-deep)" : "var(--rx-leaf)"}
          />
        </g>
      ))}
      <circle
        cx="60"
        cy="19"
        r="5.5"
        fill="var(--rx-bloom)"
        stroke="var(--rx-bloom-deep)"
        strokeWidth="1"
      />
      <circle cx="60" cy="19" r="2.2" fill="var(--rx-bloom-deep)" />
    </svg>
  );
}
