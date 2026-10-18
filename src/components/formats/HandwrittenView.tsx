import { shareGift } from "@/lib/track";
import { useEffect, useMemo, useRef, useState } from "react";
import { NewSections } from "@/components/sections/NewSections";
import { resolveIconSet } from "@/themes/_shared/iconSets";
import { castFor } from "@/themes/_shared/design";
import { themeKindOf } from "@/lib/themeKind";
import { Lock, Play } from "lucide-react";
import { giftVoice } from "@/lib/giftVoice";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { giftToday, useCountdown, useMediaUrl, usePieces, type Piece } from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, pieceLabel, seed } from "@/components/formats/PieceSheet";
import { loadFont } from "@/themes/_shared/design";
import { CircleAround, Doodle, Underline, type DoodleName } from "@/components/formats/handwritten/doodles";

/**
 * Handwritten: the gift as a well-loved notebook. Every friend writes in their own hand
 * (a handwriting font picked from their name), on lined pages, grid paper, sticky notes and
 * index cards, with doodles in the margins that draw themselves in as you scroll. Photos are
 * taped in, songs and voice notes are sticky notes, and everyone signs the last page.
 */

/** Handwriting faces. Never Caveat, Pacifico, Dancing Script, Lobster or Great Vibes. */
const HANDS = [
  { family: "'Kalam', cursive", query: "Kalam:wght@400;700", size: 1 },
  { family: "'Patrick Hand', cursive", query: "Patrick+Hand", size: 1.06 },
  { family: "'Gochi Hand', cursive", query: "Gochi+Hand", size: 1.04 },
  { family: "'Gaegu', cursive", query: "Gaegu:wght@400;700", size: 1.12 },
  { family: "'Nanum Pen Script', cursive", query: "Nanum+Pen+Script", size: 1.3 },
  { family: "'Reenie Beanie', cursive", query: "Reenie+Beanie", size: 1.38 },
] as const;

/** Pen colours: ballpoint blue, felt-tip black, green and plum. The gift's accent joins in. */
const INKS = ["#2A4B9B", "#262220", "#2D6A4F", "#6B2D5C"];

const PAPERS = ["lined", "grid", "card", "sticky", "lined", "grid", "sticky-pink", "lined", "card", "sticky-mint"] as const;
type Paper = (typeof PAPERS)[number];

const CORNER: DoodleName[] = ["heart", "star", "flower", "sun", "sparkle", "smiley", "swirl", "cloud", "bow"];
const FASTEN = ["tape", "tape", "pin", "clip", "tape-2"] as const;

const handFor = (author: string) => HANDS[Math.floor(seed(`hand:${author.trim().toLowerCase()}`) * HANDS.length)]!;

function inkFor(author: string, accent: string) {
  const s = seed(`ink:${author.trim().toLowerCase()}`);
  return s > 0.82 ? accent : INKS[Math.floor(s * INKS.length)]!;
}

/** Shorter notes are written bigger, like they would be. */
function textSize(text: string) {
  const n = [...text].length;
  return n < 60 ? 1.55 : n < 140 ? 1.3 : n < 300 ? 1.15 : 1.05;
}

const LONG = 420;

function Fastener({ kind, accent }: { kind: (typeof FASTEN)[number]; accent: string }) {
  if (kind === "pin") return <span className="hw-pin" style={{ background: accent }} aria-hidden />;
  if (kind === "clip") return <span className="hw-clip" aria-hidden />;
  return <span className={kind === "tape-2" ? "hw-tape hw-tape-dots" : "hw-tape"} aria-hidden />;
}

function Note({ piece, accent, name, onOpen }: { piece: Piece; accent: string; name: string; onOpen: () => void }) {
  const s = seed(piece.id);
  const paper: Paper = PAPERS[Math.floor(s * PAPERS.length)]!;
  const hand = handFor(piece.author || "friend");
  const ink = inkFor(piece.author || "friend", accent);
  const rot = (s - 0.5) * 4.4;
  const fasten = FASTEN[Math.floor(seed(`f:${piece.id}`) * FASTEN.length)]!;
  const corner = CORNER[Math.floor(seed(`d:${piece.id}`) * CORNER.length)]!;
  const text = piece.text ?? "";
  const long = [...text].length > LONG;
  const locked = piece.kind === "calendar" && !!piece.date && piece.date > giftToday();
  const closed = piece.sealed || locked;
  return (
    <article
      className={`hw-note hw-paper-${paper} ${piece.mine ? "is-mine" : ""}`}
      style={{ "--rot": `${rot.toFixed(2)}deg`, "--ink": ink, fontFamily: hand.family } as React.CSSProperties}
    >
      <Fastener kind={fasten} accent={accent} />
      {closed ? (
        <div className="hw-sealed">
          <Lock className="size-5" strokeWidth={1.6} aria-hidden />
          <p className="hw-text" style={{ fontSize: `${1.35 * hand.size}em` }}>
            {locked ? `Open me on ${piece.date}` : `Just for ${name}. No peeking.`}
          </p>
          <p className="hw-sign">from {piece.author}</p>
        </div>
      ) : (
        <>
          <p className="hw-text" style={{ fontSize: `${textSize(text) * hand.size}em` }}>
            {long ? `${[...text].slice(0, LONG).join("").trimEnd()}…` : text}
          </p>
          {long ? (
            <button type="button" className="hw-more" onClick={onOpen} aria-label={pieceLabel(piece)}>
              keep reading →
            </button>
          ) : null}
          {piece.author ? (
            <p className="hw-sign" style={{ fontSize: `${1.25 * hand.size}em` }}>
              <span className="relative inline-block">
                love, {piece.author}
                {[...piece.author].length <= 18 ? <Underline color={ink} seedKey={piece.id} className="hw-sign-line" /> : null}
              </span>
            </p>
          ) : null}
        </>
      )}
      <Doodle name={corner} seedKey={piece.id} color={accent} size={46} className="hw-corner" />
      {piece.mine ? <span className="hw-yours">yours</span> : null}
    </article>
  );
}

function Photo({ piece, accent, onOpen }: { piece: Piece; accent: string; onOpen: () => void }) {
  const url = useMediaUrl(piece.media);
  const s = seed(piece.id);
  const hand = handFor(piece.author || "friend");
  return (
    <figure className="hw-photo" style={{ "--rot": `${((s - 0.5) * 6).toFixed(2)}deg` } as React.CSSProperties}>
      <span className="hw-tape hw-tape-photo" aria-hidden />
      <button type="button" onClick={onOpen} aria-label={pieceLabel(piece)} className="block w-full">
        <span className="hw-photo-frame">
          {url ? <img src={url} alt={piece.text ?? `Photo from ${piece.author}`} loading="lazy" /> : <span className="hw-photo-empty" aria-hidden />}
        </span>
      </button>
      <figcaption style={{ fontFamily: hand.family, fontSize: `${1.2 * hand.size}em` }}>
        <Doodle name="arrow" seedKey={piece.id} color={accent} size={42} className="hw-photo-arrow" />
        {piece.text || "us"}
        <span className="hw-photo-by"> · {piece.author}</span>
      </figcaption>
    </figure>
  );
}

function Sticky({ piece, accent, onOpen }: { piece: Piece; accent: string; onOpen: () => void }) {
  const hand = handFor(piece.author || "friend");
  const s = seed(piece.id);
  const label = piece.kind === "song" ? "a song for you" : piece.kind === "voice" ? "listen to this" : piece.kind === "ornament" ? "a wish" : "a surprise";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={pieceLabel(piece)}
      className={`hw-sticky ${s > 0.5 ? "hw-sticky-pink" : ""}`}
      style={{ "--rot": `${((s - 0.5) * 7).toFixed(2)}deg`, fontFamily: hand.family } as React.CSSProperties}
    >
      <span className="hw-sticky-top">
        <Doodle name={piece.kind === "ornament" ? "star" : "music"} seedKey={piece.id} color="#262220" size={34} />
        <span style={{ fontSize: `${1.25 * hand.size}em` }}>{label}</span>
      </span>
      {piece.text ? (
        <span className="hw-sticky-text" style={{ fontSize: `${1.15 * hand.size}em` }}>
          {piece.text}
        </span>
      ) : null}
      <span className="hw-sticky-play" style={{ background: accent }}>
        <Play className="size-4 translate-x-px" aria-hidden />
      </span>
      <span className="hw-sign" style={{ fontSize: `${1.1 * hand.size}em` }}>
        from {piece.author}
      </span>
    </button>
  );
}

/** A little cluster of doodles between pages, like someone drew in the margin. */
function MarginDoodles({ seedKey, accent }: { seedKey: string; accent: string }) {
  const pick = (k: string) => CORNER[Math.floor(seed(`${k}:${seedKey}`) * CORNER.length)]!;
  return (
    <div className="hw-margin" aria-hidden>
      <Doodle name={pick("a")} seedKey={`${seedKey}a`} color={accent} size={44} />
      <Doodle name="swirl" seedKey={`${seedKey}b`} color="#2A4B9B" size={30} delay={0.3} />
      <Doodle name={pick("c")} seedKey={`${seedKey}c`} color="#262220" size={38} delay={0.6} />
    </div>
  );
}

export function HandwrittenView({ theme, site, modules, contributions, calendarEntries, palette, sample, showShare }: FormatViewProps) {
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const cd = useCountdown(data.countdownDate);
  const [sheet, setSheet] = useState<Piece | null>(null);
  const accent = palette.accent;
  const heading = giftHeading(site.custom_text, theme, site.occasion);
  useEffect(() => {
    for (const h of HANDS) loadFont({ family: h.family, source: "google", query: h.query }, "high");
  }, []);
  const intro =
    site.custom_text.intro_message?.trim() ||
    site.intro_text ||
    (voice.solo ? "I filled this little notebook just for you. Take your time." : "Everyone who loves you wrote in this little notebook. Take your time.");
  // Videos and quizzes don't fit on a page, so they sit on their own spread before the end.
  const host = useRef<HTMLDivElement | null>(null);
  const kind = themeKindOf(theme ?? null);
  const enabled = useMemo(() => new Set(modules.filter((m) => m.enabled).map((m) => m.module_type as string)), [modules]);
  const hasExtras = ["video", "quiz"].some((t) => enabled.has(t) && (sample || contributions.some((c) => c.module_type === t)));
  const icons = useMemo(
    () => resolveIconSet(castFor(kind, null, site.icon_set ?? null).iconSet, { recipient: site.custom_text.recipient_name ?? "", palette }),
    [kind, site.icon_set, site.custom_text.recipient_name, palette],
  );
  const signers = data.friends.length ? data.friends : data.isSample ? ["Sam", "Alex", "Bea", "Jo", "Mika"] : [];

  return (
    // The desk takes the gift's background, so a Christmas notebook sits on a Christmas table.
    <div className="hw-root" style={{ "--hw-accent": accent, "--hw-desk": palette.background } as React.CSSProperties}>
      <div className="hw-book">
        <div className="hw-rings" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </div>

        <header className="hw-cover">
          <Doodle name="sun" seedKey="cover" color={accent} size={70} className="hw-float hw-f1" instant />
          <Doodle name="sparkle" seedKey="cover" color="#262220" size={34} className="hw-float hw-f2" instant delay={0.4} />
          <Doodle name="heart" seedKey="cover-2" color={accent} size={44} className="hw-float hw-f3" instant delay={0.7} />
          <Doodle name="star" seedKey="cover-3" color={palette.primary} size={40} className="hw-float hw-f4" instant delay={1} />
          <p className="hw-kicker">a little notebook for</p>
          <h1 className={`hw-name ${[...data.name].length > 16 ? "is-long" : ""}`}>
            {/* Short names get circled; long ones that wrap get underlined instead. */}
            <span className="relative inline-block px-[0.25em]">
              <SampleText on={data.nameIsSample}>{data.name}</SampleText>
              {[...data.name].length <= 12 ? (
                <CircleAround color={accent} seedKey={data.name} className="hw-name-ring" />
              ) : [...data.name].length <= 22 ? (
                <Underline color={accent} seedKey={data.name} className="hw-name-line" />
              ) : null}
            </span>
          </h1>
          <p className="hw-heading">{heading}</p>
          <p className="hw-intro">{intro}</p>
          {data.friends.length > 1 && !voice.solo ? (
            <p className="hw-cover-sticky" aria-label={`${data.friends.length} friends wrote in here`}>
              {data.friends.length} friends
              <br />
              wrote in here
            </p>
          ) : null}
          {cd ? (
            <div className="hw-count">
              <span className="relative inline-block px-3">
                <span className="hw-count-num">{cd.done ? "today" : cd.days}</span>
                <CircleAround color={accent} seedKey="count" />
              </span>
              <span className="hw-count-label">
                {cd.done ? `it's the day${data.named ? `, ${data.name}` : ""}` : cd.days === 1 ? "more sleep" : "more sleeps"}
              </span>
              <Doodle name="burst" seedKey="count" color={accent} size={40} />
            </div>
          ) : null}
        </header>

        <div className="hw-pages">
          {data.notes.flatMap((p, i) => [
            ...(i > 0 && i % 5 === 0 ? [<MarginDoodles key={`m-${p.id}`} seedKey={p.id} accent={accent} />] : []),
            p.kind === "photo" ? (
              <Photo key={p.id} piece={p} accent={accent} onOpen={() => setSheet(p)} />
            ) : p.kind === "song" || p.kind === "voice" || p.kind === "ornament" ? (
              <Sticky key={p.id} piece={p} accent={accent} onOpen={() => setSheet(p)} />
            ) : (
              <Note key={p.id} piece={p} accent={accent} name={data.name} onOpen={() => setSheet(p)} />
            ),
          ])}
        </div>
        {data.notes.length === 0 && !data.words.length ? (
          <p className="hw-empty">{voice.solo ? "your notes get written in here" : "notes from friends get written in here"}</p>
        ) : null}

        {data.words.length ? (
          <section className="hw-words" aria-label={`Words for ${data.name}`}>
            <p className="hw-words-title">
              words for {data.name}
              <Doodle name="heart" seedKey="words" color={accent} size={30} className="ml-1 inline-block align-middle" />
            </p>
            <ul>
              {data.words.map((w, n) => (
                <li key={w.id} style={{ fontFamily: handFor(w.author || String(n)).family }}>
                  <Doodle name="check" seedKey={w.id} color={accent} size={26} />
                  <span className={n % 3 === 1 ? "hw-highlight" : ""}>{w.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasExtras ? (
          <div ref={host} className="hw-extras">
            <NewSections
              kind={kind}
              enabled={enabled}
              contributions={contributions}
              icons={icons}
              hostRef={host}
              sample={!!sample}
              recipient={site.custom_text.recipient_name ?? ""}
              siteId={site.id}
              headingFont="'Gochi Hand', cursive"
              accent={accent}
              only={["video", "quiz"]}
            />
          </div>
        ) : null}

        <footer className="hw-end">
          <p className="hw-end-title">
            the end
            <Doodle name="heart" seedKey="end" color={accent} size={40} className="ml-2 inline-block align-middle" />
          </p>
          {signers.length ? (
            <>
              <p className="hw-end-kicker">signed,</p>
              <div className="hw-signers">
                {signers.map((n) => (
                  <span
                    key={n}
                    style={{ fontFamily: handFor(n).family, color: inkFor(n, accent), "--rot": `${((seed(n) - 0.5) * 12).toFixed(1)}deg` } as React.CSSProperties}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {site.custom_text.footer_note ? <p className="hw-intro mt-4">{site.custom_text.footer_note}</p> : null}
          {showShare ? (
            <button
              type="button"
              className="hw-btn"
              onClick={() => shareGift(site)}
            >
              pass it on
            </button>
          ) : null}
        </footer>
      </div>
      {sheet ? <PieceSheet piece={sheet} palette={{ background: "#FBF6EA", primary: "#262220", accent }} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
