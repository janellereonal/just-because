import { giftVoice } from "@/lib/giftVoice";
import { shareGift } from "@/lib/track";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { centerInScroller } from "@/lib/scroll";
import { useEffect, useRef, useState } from "react";
import { Lock, Mic, Music2, Pause, Play, RotateCw, SkipBack, SkipForward } from "lucide-react";
import { FONT_PAIRINGS, toEmbedUrl } from "@/lib/gift";
import { readableInk } from "@/lib/palettes";
import {
  giftToday,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { buzz, chime } from "@/lib/play";

function trackTitle(p: Piece) {
  if (p.sealed) return "Sealed track";
  const t = p.text?.trim();
  if (!t)
    return {
      photo: "A picture",
      song: "A song",
      voice: "A voice note",
      letter: "A note",
      word: "A word",
      ornament: "A wish",
      calendar: "A surprise",
    }[p.kind];
  return t.length > 42 ? `${t.slice(0, 40).trimEnd()}…` : t;
}

/** What's "playing": the liner note for a track. */
function Liner({ piece, accent }: { piece: Piece; accent: string }) {
  const media = useMediaUrl(piece.media);
  const embed = piece.link ? toEmbedUrl(piece.link) : null;
  const locked = piece.kind === "calendar" && !!piece.date && piece.date > giftToday();
  if (piece.sealed || locked)
    return (
      <div className="mix-liner-sealed">
        <Lock className="size-5" />
        {locked
          ? `This track unlocks on ${piece.date}.`
          : `Only you can hear this one. From ${piece.author}.`}
      </div>
    );
  return (
    <div className="mix-liner-body">
      {piece.kind === "photo" && media ? (
        <img src={media} alt={piece.text ?? ""} className="mix-liner-photo" data-framed={piece.framed || undefined} />
      ) : null}
      {piece.kind === "voice" && media ? <audio controls src={media} className="w-full" /> : null}
      {embed ? (
        <iframe
          src={embed}
          title={`Song from ${piece.author}`}
          loading="lazy"
          allow="encrypted-media; clipboard-write; picture-in-picture; autoplay"
          className="mix-embed"
        />
      ) : piece.link ? (
        <a
          href={piece.link}
          target="_blank"
          rel="noreferrer"
          style={{ color: accent }}
          className="font-semibold underline"
        >
          Play the song
        </a>
      ) : null}
      {piece.text ? <p className="mix-liner-text">{piece.text}</p> : null}
      {piece.author ? (
        <p className="mix-liner-by" style={{ color: accent }}>
          {piece.author}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Mixtape: the gift is a cassette. Every note is a track. Press play and the
 * reels turn, drag a reel to scrub between tracks, flip the tape for side B.
 */
export function MixtapeView({
  theme,
  site,
  modules,
  contributions,
  calendarEntries,
  palette,
  sample,
  showShare,
}: FormatViewProps) {
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const reduce = useReducedMotion();
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  const tracks = data.notes;
  const half = Math.ceil(tracks.length / 2);
  const [side, setSide] = useState<"A" | "B">("A");
  const sideTracks = side === "A" ? tracks.slice(0, half) : tracks.slice(half);
  const offset = side === "A" ? 0 : half;
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [spin, setSpin] = useState(0);
  const current = sideTracks[at] ?? null;
  const reel = useRef<{ id: number; a: number; acc: number } | null>(null);
  const tapeRef = useRef<HTMLDivElement | null>(null);
  const linerRef = useRef<HTMLDivElement | null>(null);
  const ink = readableInk(palette.accent);
  const [counter, setCounter] = useState(0);

  // The tape counter ticks while playing; the reels spin in CSS.
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setCounter((c) => (c + 1) % 1000), 400);
    return () => window.clearInterval(t);
  }, [playing]);

  function pick(i: number, scroll = true) {
    const n = Math.max(0, Math.min(sideTracks.length - 1, i));
    setAt(n);
    setPlaying(true);
    chime("boop");
    buzz(8);
    if (scroll)
      window.setTimeout(
        () =>
          linerRef.current && centerInScroller(linerRef.current, null, reduce ? "auto" : "smooth"),
        60,
      );
  }

  function flip() {
    if (tracks.length <= 1) return;
    setFlipping(true);
    chime("whoosh");
    buzz([6, 30, 6]);
    window.setTimeout(
      () => {
        setSide((s) => (s === "A" ? "B" : "A"));
        setAt(0);
      },
      reduce ? 0 : 350,
    );
    window.setTimeout(() => setFlipping(false), reduce ? 0 : 750);
  }

  // Drag a reel around to scrub through tracks (a full turn = one track).
  function angleOf(e: React.PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }
  const reelHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLSpanElement>) => {
      e.preventDefault();
      reel.current = { id: e.pointerId, a: angleOf(e, e.currentTarget), acc: 0 };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ok */
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLSpanElement>) => {
      const r = reel.current;
      if (!r || r.id !== e.pointerId) return;
      const a = angleOf(e, e.currentTarget);
      let d = a - r.a;
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      r.a = a;
      r.acc += d;
      setSpin((s) => s + (d * 180) / Math.PI);
      if (Math.abs(r.acc) > Math.PI * 1.2) {
        const step = r.acc > 0 ? 1 : -1;
        r.acc = 0;
        setAt((i) => Math.max(0, Math.min(sideTracks.length - 1, i + step)));
        chime("pop");
        buzz(5);
      }
    },
    onPointerUp: () => {
      reel.current = null;
    },
  };

  const label = giftHeading(site.custom_text, theme);
  const mm = String(Math.floor(counter / 10)).padStart(3, "0");

  return (
    <div
      className="mix-root relative min-h-screen"
      data-play-host
      style={
        {
          "--mix-accent": palette.accent,
          "--mix-primary": palette.primary,
          "--mix-bg": palette.background,
          color: readableInk(palette.background),
          fontFamily: fonts.body,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-xl px-4 pt-10 pb-16">
        <p className="mix-kicker">A mixtape for <SampleText on={data.nameIsSample}>{data.name}</SampleText></p>
        <h1 className="mix-title" style={{ fontFamily: fonts.heading }}>
          {label}
        </h1>
        <p className="mix-intro">
          {site.custom_text.intro_message?.trim() ||
            (voice.solo ? `${tracks.length} tracks, picked just for you. Press play.` : `${tracks.length} tracks from the people who love you. Press play.`)}
        </p>

        <div className={`mix-deck ${flipping ? "is-flipping" : ""}`}>
          <div
            ref={tapeRef}
            className={`mix-tape ${playing && !reduce ? "is-playing" : ""}`}
            data-side={side}
          >
            <div className="mix-label">
              <span className="mix-side">{side}</span>
              <span className="mix-label-text">{label}</span>
              <span className="mix-label-lines" />
            </div>
            <div className="mix-window">
              {[0, 1].map((k) => (
                <span
                  key={k}
                  className="mix-reel"
                  role="slider"
                  tabIndex={0}
                  aria-label="Turn to change track"
                  aria-valuemin={1}
                  aria-valuemax={Math.max(1, sideTracks.length)}
                  aria-valuenow={at + 1}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") pick(at + 1, false);
                    if (e.key === "ArrowLeft" || e.key === "ArrowDown") pick(at - 1, false);
                  }}
                  style={
                    {
                      "--spin": `${spin}deg`,
                      "--fill":
                        k === 0
                          ? 1 - (at + 1) / (sideTracks.length + 1)
                          : (at + 1) / (sideTracks.length + 1),
                    } as React.CSSProperties
                  }
                  {...reelHandlers}
                >
                  <i />
                </span>
              ))}
              <span className="mix-tape-ribbon" />
            </div>
            <span className="mix-screw mix-s1" />
            <span className="mix-screw mix-s2" />
            <span className="mix-screw mix-s3" />
            <span className="mix-screw mix-s4" />
          </div>

          <div className="mix-controls">
            <button
              type="button"
              onClick={() => pick(at - 1)}
              aria-label="Previous track"
              disabled={at === 0}
            >
              <SkipBack className="size-5" />
            </button>
            <button
              type="button"
              className="mix-play"
              onClick={() => {
                setPlaying((p) => !p);
                chime(playing ? "boop" : "pop");
                buzz(8);
              }}
              aria-label={playing ? "Pause" : "Play"}
              style={{ background: palette.accent, color: ink }}
            >
              {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
            </button>
            <button
              type="button"
              onClick={() => pick(at + 1)}
              aria-label="Next track"
              disabled={at >= sideTracks.length - 1}
            >
              <SkipForward className="size-5" />
            </button>
            <span className="mix-counter" aria-hidden="true">
              {mm}
            </span>
            {tracks.length > 1 ? (
              <button
                type="button"
                onClick={flip}
                className="mix-flip"
                aria-label={`Flip to side ${side === "A" ? "B" : "A"}`}
              >
                <RotateCw className="size-4" /> Side {side === "A" ? "B" : "A"}
              </button>
            ) : null}
          </div>
        </div>
        <p className="mix-tip">Tip: grab a reel and turn it to scrub through the tracks.</p>

        {current ? (
          <div ref={linerRef} className="mix-liner" key={`${side}-${at}`}>
            <p className="mix-now">
              {playing ? "Now playing" : "Paused"} · {side}
              {at + 1}
            </p>
            <Liner piece={current} accent={palette.accent} />
          </div>
        ) : (
          <p className="mix-empty">{voice.empty("tracks")}</p>
        )}

        <ol className="mix-list" aria-label={`Side ${side}`}>
          {sideTracks.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => pick(i)}
                className={i === at ? "is-on" : ""}
                aria-current={i === at ? "true" : undefined}
              >
                <span className="mix-num">
                  {side}
                  {i + 1}
                </span>
                <span className="mix-track">
                  <span className="mix-track-title">{trackTitle(p)}</span>
                  <span className="mix-track-by">{p.author}</span>
                </span>
                <span className="mix-kind" aria-hidden="true">
                  {p.kind === "song" ? (
                    <Music2 className="size-4" />
                  ) : p.kind === "voice" ? (
                    <Mic className="size-4" />
                  ) : p.sealed ? (
                    <Lock className="size-4" />
                  ) : (
                    "♪"
                  )}
                </span>
                {i === at && playing && !reduce ? (
                  <span className="mix-eq" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ol>

        {data.words.length ? (
          <p className="mix-words">
            Liner notes:{" "}
            {data.words
              .map((w) => w.text)
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}

        <footer className="mix-foot">
          <p>
            Recorded with love by{" "}
            {data.friends.length ? data.friends.join(", ") : "your favourite people"}.
          </p>
          {site.custom_text.footer_note ? (
            <p className="mt-2 opacity-70">{site.custom_text.footer_note}</p>
          ) : null}
          {data.isSample ? (
            <p className="mt-2 opacity-60">{voice.sample}</p>
          ) : null}
          {showShare ? (
            <button
              type="button"
              className="mix-share"
              style={{ background: palette.accent, color: ink }}
              onClick={() => shareGift(site)}
            >
              Share the mixtape
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
