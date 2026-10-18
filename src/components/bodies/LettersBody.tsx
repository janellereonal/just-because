/**
 * Love Letter's body: a bundle of letters tied with a ribbon.
 *
 * The opening's letter grows into the cover letter at the top (it carries
 * `data-gift-page`, the hand-off target). Under it sits the bundle. Untie the
 * ribbon and the envelopes spread across the desk, one per note, each sealed
 * with the friend's initial. Open one and the flap lifts, the letter slides out
 * and reads on its own paper. Opened envelopes stay open on this device.
 */
import { useEffect, useState } from "react";
import { Mic, Music2, Camera, Lock } from "lucide-react";
import { t } from "@/i18n";
import { SampleText } from "@/components/SampleMark";
import { burst, buzz, chime, foley } from "@/lib/play";
import {
  BodyFooter,
  BodyRoot,
  CountdownLine,
  PhotoFace,
  PieceContent,
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

export function LettersBody(props: BodyProps) {
  const body = useBody(props);
  const { data, colors, fonts, reduce } = body;
  const { opened, open } = useOpened("letters", body.site.id, body.sample);
  const [untied, setUntied] = useState(false);
  const letters = data.notes;
  // Already untied on this device (or nothing to untie): go straight to the desk.
  useEffect(() => {
    if (opened.has("ribbon") || reduce) setUntied(true);
  }, [opened, reduce]);
  const count = letters.filter((p) => opened.has(p.id)).length;

  function untie(e: React.MouseEvent) {
    if (untied) return;
    setUntied(true);
    open("ribbon");
    foley("paper");
    chime("whoosh");
    buzz(10);
    burst(body.hostRef.current, e.clientX, e.clientY, { shape: "hearts", colors: [colors.primary, colors.accent, "#F4C6CF"], count: 14, spread: 1.2, up: true });
  }

  function read(p: Piece, e: React.MouseEvent) {
    if (!opened.has(p.id)) {
      open(p.id);
      foley("paper");
      buzz(6);
    }
    // Let the flap lift and the letter rise before it comes up close.
    const delay = reduce ? 0 : 420;
    const x = e.clientX;
    const y = e.clientY;
    window.setTimeout(() => {
      body.read(p);
      if (!reduce && !p.sealed && !isLocked(p)) burst(body.hostRef.current, x, y, { shape: "hearts", colors: [colors.primary, colors.accent], count: 6, spread: 0.7, up: true });
    }, delay);
  }

  return (
    <BodyRoot
      body={body}
      className="ll-root"
      style={
        {
          "--ll-paper": colors.dark ? "#F3EADB" : "#FFFBF3",
          "--ll-env": colors.mix(colors.dark ? "#E9DCC6" : "#F1E6D3", colors.primary, 0.06),
          "--ll-env-deep": colors.mix(colors.dark ? "#D9C8AC" : "#E4D4BA", colors.primary, 0.1),
          "--ll-wax": colors.primary,
          "--ll-wax-deep": colors.mix(colors.primary, "#000000", 0.35),
          "--ll-ribbon": colors.mix(colors.primary, colors.accent, 0.25),
        } as React.CSSProperties
      }
    >
      <div className="ll-desk" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-4 pt-[clamp(28px,7vh,72px)] pb-20">
        {/* The cover letter: the opening's letter lands here. */}
        <article className="ll-cover" data-gift-page="">
          <p className="ll-cover-kicker">{t("letters.kicker")}</p>
          <h1 className="ll-cover-name" style={{ fontFamily: fonts.heading }}>
            {data.named ? (
              <>
                {t("letters.for")} <SampleText on={data.nameIsSample}>{data.name}</SampleText>
              </>
            ) : (
              body.heading
            )}
          </h1>
          {data.named ? <p className="ll-cover-heading">{body.heading}</p> : null}
          <p className="ll-cover-intro">{body.intro || body.voice.intro(data.named ? data.name : "")}</p>
          <CountdownLine date={data.countdownDate} className="ll-cover-countdown" />
          <p className="ll-cover-count">
            {letters.length === 0
              ? body.voice.empty(t("letters.what"))
              : t("letters.count", { n: letters.length })}
          </p>
          <span className="ll-cover-seal" aria-hidden="true" style={{ fontFamily: fonts.heading }}>
            {initial(data.named ? data.name : "♡")}
          </span>
        </article>

        {letters.length ? (
          untied ? (
            <>
              <p className="ll-progress" role="status" aria-live="polite">
                {count === letters.length ? t("letters.allRead") : t("letters.progress", { n: count, total: letters.length })}
              </p>
              <ul className="ll-spread">
                {letters.map((p, i) => (
                  <li key={p.id} style={{ "--i": Math.min(i, 24) } as React.CSSProperties}>
                    <Envelope piece={p} recipient={data.named ? data.name : ""} open={opened.has(p.id)} onOpen={(e) => read(p, e)} headingFont={fonts.heading} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Bundle count={letters.length} onUntie={untie} />
          )
        ) : null}

        {data.words.length ? (
          <section className="ll-words" aria-label={t("letters.wordsTitle")}>
            <p className="ll-words-title" style={{ fontFamily: fonts.heading }}>
              {t("letters.wordsTitle")}
            </p>
            <p className="ll-words-list">
              {data.words.map((w, i) => (
                <span key={w.id} style={{ fontFamily: i % 3 === 0 ? fonts.heading : undefined }}>
                  {w.text}
                </span>
              ))}
            </p>
          </section>
        ) : null}

        <BodyFooter body={body} className="ll-footer" buttonStyle={{ background: colors.primary, color: colors.onPrimary }} />
      </div>

      {body.reading ? (
        <Reader piece={body.reading} onClose={body.closeReader} accent={colors.primary} className="ll-reader">
          {!body.reading.sealed && !isLocked(body.reading) && body.reading.kind !== "photo" && data.named ? (
            <p className="ll-reader-dear" style={{ fontFamily: fonts.heading }}>
              {t("letters.dear", { name: data.name })}
            </p>
          ) : null}
        </Reader>
      ) : null}
    </BodyRoot>
  );
}

/** The bundle before it's untied: a few envelopes stacked, a ribbon around them and a bow. */
function Bundle({ count, onUntie }: { count: number; onUntie: (e: React.MouseEvent) => void }) {
  return (
    <div className="ll-bundle-wrap">
      <button type="button" className="ll-bundle" onClick={onUntie} aria-label={t("letters.untieAria", { n: count })}>
        <span className="ll-bundle-env" style={{ "--r": "-5deg", "--y": "14px" } as React.CSSProperties} />
        <span className="ll-bundle-env" style={{ "--r": "4deg", "--y": "7px" } as React.CSSProperties} />
        <span className="ll-bundle-env" style={{ "--r": "-1deg", "--y": "0px" } as React.CSSProperties} />
        <span className="ll-ribbon-v" />
        <span className="ll-ribbon-h" />
        <span className="ll-bow">
          <span className="ll-bow-loop is-left" />
          <span className="ll-bow-loop is-right" />
          <span className="ll-bow-tail is-left" />
          <span className="ll-bow-tail is-right" />
          <span className="ll-bow-knot" />
        </span>
      </button>
      <p className="ll-bundle-hint">{t("letters.untie")}</p>
    </div>
  );
}

function Envelope({
  piece,
  recipient,
  open,
  onOpen,
  headingFont,
}: {
  piece: Piece;
  recipient: string;
  open: boolean;
  onOpen: (e: React.MouseEvent) => void;
  headingFont: string;
}) {
  const r = seed(piece.id);
  const tilt = (r - 0.5) * 7;
  const locked = isLocked(piece);
  const Icon = piece.kind === "photo" ? Camera : piece.kind === "song" ? Music2 : piece.kind === "voice" ? Mic : null;
  return (
    <button
      type="button"
      className={`ll-env ${open ? "is-open" : ""} ${piece.kind === "photo" ? "is-photo" : ""}`}
      style={{ "--tilt": `${tilt.toFixed(2)}deg` } as React.CSSProperties}
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
    >
      <span className="ll-env-back" />
      <span className="ll-env-letter">
        {piece.kind === "photo" ? (
          <span className="ll-env-photo">
            <PhotoFace piece={piece} tint={"#C9A9A0"} sizes="200px" />
          </span>
        ) : (
          <span className="ll-env-lines">
            <PieceContent piece={piece} accent="var(--ll-wax)" clamp={3} />
          </span>
        )}
      </span>
      <span className="ll-env-pocket">
        <span className="ll-env-to" style={{ fontFamily: headingFont }}>
          {recipient ? t("letters.to", { name: recipient }) : null}
        </span>
        <span className="ll-env-from">{piece.author ? t("letters.fromLine", { name: piece.author }) : t("letters.fromFriend")}</span>
        {Icon || piece.sealed || locked ? (
          <span className="ll-env-stamp" aria-hidden="true">
            {piece.sealed || locked ? <Lock className="size-3.5" /> : Icon ? <Icon className="size-3.5" /> : null}
          </span>
        ) : null}
      </span>
      <span className="ll-env-flap">
        <span className="ll-env-seal" style={{ fontFamily: headingFont }}>
          {initial(piece.author || "♡")}
        </span>
      </span>
    </button>
  );
}
