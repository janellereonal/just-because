import { giftVoice } from "@/lib/giftVoice";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { useState } from "react";
import { Lock, Mic, Play } from "lucide-react";
import { readableInk } from "@/lib/palettes";
import {
  pieceLocked,
  useCountdown,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, pieceLabel, seed } from "@/components/formats/PieceSheet";

const STICKERS = ["WOW", "♥", "BFF", "★", "YES", "LOL", "4EVER", "✿"];

/** Ransom-note letters: every letter cut from a different "magazine". */
function Ransom({ text, accent }: { text: string; accent: string }) {
  const styles = [
    { background: "#111", color: "#fff" },
    { background: accent, color: readableInk(accent) },
    { background: "#fff", color: "#111", outline: "2px solid #111" },
    { background: "#FFE45C", color: "#111" },
    { background: "transparent", color: "#111" },
  ];
  // Letters stay together by word, so a name only ever wraps between words.
  // Long names get smaller instead of breaking.
  const n = [...text].length;
  const scale = n <= 14 ? 1 : n <= 22 ? 0.8 : n <= 32 ? 0.66 : 0.56;
  let i = 0;
  return (
    <span className="zine-ransom" aria-label={text} style={{ fontSize: `${scale}em` }}>
      {text
        .split(/\s+/)
        .filter(Boolean)
        .map((word, w) => (
          <span
            key={w}
            className={[...word].length > 14 ? "zine-rword zine-rword-long" : "zine-rword"}
            aria-hidden
          >
            {[...word].map((ch) => {
              const k = (i += 1);
              const st = styles[Math.floor(seed(text + k) * styles.length)]!;
              const r = (seed(k + text) - 0.5) * 14;
              return (
                <span
                  key={k}
                  className={k % 3 === 0 ? "zine-letter zine-serif" : "zine-letter"}
                  style={{ ...st, transform: `rotate(${r.toFixed(1)}deg)` }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
    </span>
  );
}

function Scribble({ color }: { color: string }) {
  return (
    <svg className="zine-scribble" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden>
      <path
        d="M2 14 C 30 4, 60 18, 90 9 S 150 4, 198 12"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Photo({ piece }: { piece: Piece }) {
  const url = useMediaUrl(piece.media);
  return url ? (
    <img
      data-framed={piece.framed || undefined}
      {...photoProps(url, piece.thumb, "(max-width: 640px) 45vw, 300px")}
      alt={piece.text ?? `Photo from ${piece.author}`}
      loading="lazy"
      decoding="async"
      className="zine-xerox size-full object-cover"
    />
  ) : (
    <span className="zine-xerox-empty" aria-hidden />
  );
}

function Cutout({
  piece,
  accent,
  onOpen,
  name,
}: {
  piece: Piece;
  accent: string;
  onOpen: () => void;
  name: string;
}) {
  const s = seed(piece.id);
  const rot = (s - 0.5) * 7;
  const sticker = s > 0.62 ? STICKERS[Math.floor(s * 100) % STICKERS.length] : null;
  const locked = pieceLocked(piece);
  const variant =
    piece.kind === "letter"
      ? s > 0.5
        ? "zine-paper-lined"
        : s > 0.25
          ? "zine-paper-yellow"
          : "zine-paper"
      : "zine-paper";
  return (
    <button
      type="button"
      onClick={piece.sealed || locked ? undefined : onOpen}
      aria-label={piece.sealed ? `Sealed note from ${piece.author}` : pieceLabel(piece)}
      className={`zine-cut ${variant} ${piece.kind === "photo" ? "zine-cut-photo" : ""} ${piece.mine ? "zine-mine" : ""}`}
      style={{ "--rot": `${rot.toFixed(2)}deg` } as React.CSSProperties}
    >
      <span
        className="zine-tape"
        style={{ transform: `rotate(${(s * 30 - 15).toFixed(1)}deg)` }}
        aria-hidden
      />
      {piece.sealed || locked ? (
        <span className="flex flex-col items-start gap-2 text-left">
          <Lock className="size-5" />
          <span className="zine-marker text-xl">
            {locked ? `Opens ${piece.date}` : `For ${name} only`}
          </span>
          <span className="zine-mono">from {piece.author}</span>
        </span>
      ) : piece.kind === "photo" ? (
        <>
          <span className="block aspect-[4/5] w-full overflow-hidden bg-neutral-200">
            <Photo piece={piece} />
          </span>
          <span className="zine-marker mt-2 block text-left text-lg">
            {piece.text || "this one"}
          </span>
          <span className="zine-mono block text-left">by {piece.author}</span>
        </>
      ) : piece.kind === "song" ? (
        <span className="flex w-full items-center gap-3 text-left">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-white">
            <Play className="size-5 translate-x-px" />
          </span>
          <span className="min-w-0">
            <span className="zine-mono block">TRACK FROM {piece.author.toUpperCase()}</span>
            <span className="mt-1 line-clamp-2 block text-lg font-bold">
              {piece.text || "press play"}
            </span>
          </span>
        </span>
      ) : piece.kind === "voice" ? (
        <span className="flex items-center gap-3 text-left">
          <Mic className="size-6" />
          <span>
            <span className="zine-mono block">VOICE MEMO</span>
            <span className="zine-marker text-xl">from {piece.author}</span>
          </span>
        </span>
      ) : (
        <span className="block text-left">
          <span className="line-clamp-[8] block text-[17px] leading-snug whitespace-pre-line">
            {piece.text}
          </span>
          <span className="zine-marker mt-3 block text-xl" style={{ color: accent }}>
            xo, {piece.author}
          </span>
        </span>
      )}
      {sticker ? (
        <span
          className="zine-sticker"
          style={{
            background: s > 0.8 ? accent : "#FFE45C",
            color: s > 0.8 ? readableInk(accent) : "#111",
          }}
          aria-hidden
        >
          {sticker}
        </span>
      ) : null}
      {piece.mine ? <span className="zine-yours">YOURS</span> : null}
    </button>
  );
}

export function ZineView({
  theme,
  site,
  modules,
  contributions,
  calendarEntries,
  palette,
  sample,
  showShare,
  extraSections: extras,
}: FormatViewProps) {
  const reduce = useReducedMotion();
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const cd = useCountdown(data.countdownDate);
  const [sheet, setSheet] = useState<Piece | null>(null);
  const accent = palette.accent;
  const heading = giftHeading(site.custom_text, theme, site.occasion);
  const issueDate = new Date()
    .toLocaleDateString(undefined, { month: "short", year: "numeric" })
    .toUpperCase();
  const ticker = data.friends.length
    ? data.friends
    : data.isSample
      ? ["SAM", "ALEX", "BEA", "JO", "MIKA", "LIA"]
      : [];

  return (
    // The paper is tinted with the gift's background, so each occasion's zine has its own stock.
    <div
      className="zine-root min-h-screen"
      style={{ "--z-accent": accent, "--z-theme": palette.background } as React.CSSProperties}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 @2xl:px-8 @2xl:py-12">
        <header className="zine-masthead">
          <div className="flex items-center justify-between gap-3">
            <span className="zine-mono">ISSUE 01 · {issueDate}</span>
            <span className="zine-mono">PRICELESS</span>
          </div>
          <h1 className="mt-6 text-[clamp(2.6rem,10cqi,6.5rem)] leading-[0.92]">
            <SampleText on={data.nameIsSample}>
              <Ransom text={data.name.toUpperCase()} accent={accent} />
            </SampleText>
          </h1>
          <div className="mt-6 grid gap-6 @2xl:grid-cols-[1.4fr_1fr] @2xl:items-end">
            <div>
              <p className="zine-headline">{heading}</p>
              <Scribble color={accent} />
              <p className="mt-3 max-w-md text-[17px] leading-snug">
                {site.custom_text.intro_message?.trim() ||
                  site.intro_text ||
                  (voice.solo
                    ? "A zine I made just for you. Cut, pasted and slightly unhinged."
                    : "A zine made by everyone who loves you. Cut, pasted and slightly unhinged.")}
              </p>
            </div>
            {cd ? (
              <div className="zine-box text-left">
                <span className="zine-mono">{cd.done ? "IT'S TODAY" : "COUNTDOWN"}</span>
                <p className="zine-huge">{cd.done ? "NOW" : cd.days}</p>
                <span className="zine-mono">
                  {cd.done
                    ? `HAPPY DAY${data.named ? ` ${data.name.toUpperCase()}` : ""}`
                    : `${cd.days === 1 ? "DAY" : "DAYS"} TO GO`}
                </span>
              </div>
            ) : null}
          </div>
        </header>
      </div>

      {ticker.length ? (
        <div
          className={`zine-ticker ${reduce ? "is-still" : ""}`}
          aria-label={`Made by ${ticker.join(", ")}`}
        >
          <div aria-hidden>
            {[0, 1].map((k) => (
              <span key={k}>
                {ticker.map((n) => (
                  <span key={n + k}>
                    {n.toUpperCase()} <b>✶</b>{" "}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-5xl px-4 py-10 @2xl:px-8">
        <div className="zine-wall">
          {data.notes.map((p) => (
            <Cutout
              key={p.id}
              piece={p}
              accent={accent}
              name={data.name}
              onOpen={() => setSheet(p)}
            />
          ))}
        </div>
        {data.notes.length === 0 && !data.words.length ? (
          <p className="zine-marker mt-6 text-center text-2xl">
            {voice.solo ? "your notes get pasted here" : "notes from friends get pasted here"}
          </p>
        ) : null}

        {data.words.length ? (
          <section className="zine-words mt-14" aria-label="Words about you">
            <span className="zine-mono">IN OTHER WORDS</span>
            <p className="mt-3">
              {data.words.map((w, n) => (
                <span
                  key={w.id}
                  className={n % 2 ? "zine-word zine-word-alt" : "zine-word"}
                  style={{ "--w": 300 + Math.round(seed(w.id) * 600) } as React.CSSProperties}
                >
                  {w.text}{" "}
                </span>
              ))}
            </p>
          </section>
        ) : null}

        {extras ? <div className="fmt-extras is-zine">{extras}</div> : null}

        <footer className="zine-back mt-16">
          <span className="zine-mono">BACK PAGE</span>
          <p className="zine-headline mt-2">
            That's the issue{data.named ? `, ${data.name}` : ""}.
          </p>
          {data.friends.length ? (
            <p className="mt-3 text-[17px]">Made by {data.friends.join(", ")}.</p>
          ) : null}
          {site.custom_text.footer_note ? (
            <p className="mt-2 text-[15px] opacity-80">{site.custom_text.footer_note}</p>
          ) : null}
          {showShare ? (
            <button type="button" className="zine-btn mt-6" onClick={() => shareGift(site)}>
              Share the zine
            </button>
          ) : null}
        </footer>
      </div>
      {sheet ? (
        <PieceSheet
          piece={sheet}
          palette={{ background: palette.background, primary: palette.primary, accent }}
          onClose={() => setSheet(null)}
          sound="tape"
        />
      ) : null}
    </div>
  );
}
