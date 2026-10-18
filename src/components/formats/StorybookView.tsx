import { giftVoice } from "@/lib/giftVoice";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Mic, Music2 } from "lucide-react";
import { FONT_PAIRINGS, toEmbedUrl } from "@/lib/gift";
import { readableInk } from "@/lib/palettes";
import { pieceLocked, useMediaUrl, usePieces, useReducedMotion, type Piece } from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { seed } from "@/components/formats/PieceSheet";
import { burst, buzz, chime } from "@/lib/play";
import { material } from "@/lib/sound/material";

type Page =
  | { type: "cover" }
  | { type: "dedication" }
  | { type: "piece"; piece: Piece; n: number }
  | { type: "words"; words: string[] }
  | { type: "end" };

function PieceBody({ piece, accent }: { piece: Piece; accent: string }) {
  const media = useMediaUrl(piece.media);
  const embed = piece.link ? toEmbedUrl(piece.link) : null;
  const locked = pieceLocked(piece);
  if (piece.sealed || locked)
    return (
      <div className="sbk-sealed">
        <Lock className="size-6" />
        <p>
          {locked
            ? `This page opens on ${piece.date}.`
            : `A sealed page from ${piece.author}, just for you.`}
        </p>
      </div>
    );
  return (
    <>
      {piece.kind === "photo" ? (
        <div
          className="sbk-photo"
          style={{ transform: `rotate(${(seed(piece.id) - 0.5) * 6}deg)` }}
        >
          {media ? (
            <img
              {...photoProps(media, piece.thumb, "(max-width: 640px) 80vw, 420px")}
              alt={piece.text ?? ""}
              draggable={false}
              loading="lazy"
              decoding="async"
              data-framed={piece.framed || undefined}
            />
          ) : (
            <span className="sbk-photo-empty" />
          )}
          <i className="sbk-corner sbk-c1" />
          <i className="sbk-corner sbk-c2" />
          <i className="sbk-corner sbk-c3" />
          <i className="sbk-corner sbk-c4" />
        </div>
      ) : null}
      {piece.kind === "song" ? (
        <div className="sbk-song">
          <Music2 className="size-5" style={{ color: accent }} />
          {embed ? (
            <iframe
              src={embed}
              title={`Song from ${piece.author}`}
              loading="lazy"
              allow="encrypted-media; clipboard-write; picture-in-picture"
            />
          ) : piece.link ? (
            <a href={piece.link} target="_blank" rel="noreferrer" style={{ color: accent }}>
              Play the song
            </a>
          ) : (
            <span>A song for you</span>
          )}
        </div>
      ) : null}
      {piece.kind === "voice" ? (
        <div className="sbk-song">
          <Mic className="size-5" style={{ color: accent }} />
          {media ? <audio controls src={media} /> : <span>A voice note</span>}
        </div>
      ) : null}
      {piece.text ? (
        <p
          className={
            piece.kind === "letter" || piece.kind === "ornament" ? "sbk-letter" : "sbk-caption"
          }
        >
          {piece.text}
        </p>
      ) : null}
    </>
  );
}

/**
 * Storybook: the gift as a little hardcover book. Pages turn in 3D. Drag a page
 * by its edge and it follows your finger, or tap the sides, swipe, or use the
 * arrow keys. Reduced motion: pages simply fade.
 */
export function StorybookView({
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
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const reduce = useReducedMotion();
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  const ink = "#3b2f2a";
  const coverInk = readableInk(palette.accent);
  const heading = giftHeading(site.custom_text, theme, site.occasion);

  const pages: Page[] = [
    { type: "cover" },
    { type: "dedication" },
    ...data.notes.map((piece, i) => ({ type: "piece" as const, piece, n: i + 1 })),
    ...(data.words.length
      ? [{ type: "words" as const, words: data.words.map((w) => w.text ?? "").filter(Boolean) }]
      : []),
    { type: "end" },
  ];
  const total = pages.length;
  // The opening already opened the gift, so the book starts open on the first page
  // (the cover is one page back). A layout never adds a second opening.
  const [at, setAt] = useState(1);
  const [drag, setDrag] = useState<{ dir: 1 | -1; angle: number } | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; id: number; w: number; dir: 1 | -1 } | null>(null);

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(total - 1, to));
      if (next === at) return;
      setAt(next);
      material("pageTurn", { pan: next > at ? 0.25 : -0.25 });
      buzz(6);
      if (next === total - 1 && !reduce) {
        const r = bookRef.current?.getBoundingClientRect();
        if (r)
          window.setTimeout(
            () =>
              burst(rootRef.current, r.left + r.width / 2, r.top + r.height * 0.35, {
                shape: "hearts",
                colors: [palette.accent, palette.primary, "#FFD166"],
                count: 26,
                spread: 1.6,
              }),
            500,
          );
      }
    },
    [at, total, reduce, palette.accent, palette.primary],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        document.activeElement !== document.body
      )
        return;
      if (e.key === "ArrowRight") go(at + 1);
      if (e.key === "ArrowLeft") go(at - 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [at, go]);

  function onDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("a,button,iframe,audio,input")) return;
    const r = bookRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width;
    const dir: 1 | -1 = x > 0.5 ? 1 : -1;
    if ((dir === 1 && at >= total - 1) || (dir === -1 && at <= 0)) return;
    start.current = { x: e.clientX, id: e.pointerId, w: r.width, dir };
  }
  function onMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s || s.id !== e.pointerId || reduce) return;
    const dx = e.clientX - s.x;
    if (!drag && Math.abs(dx) < 8) return;
    if (!drag)
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* ok */
      }
    // Turning forward pulls the page left (0 → -180), back pulls it right.
    const p = Math.max(0, Math.min(1, (s.dir === 1 ? -dx : dx) / (s.w * 0.9)));
    setDrag({ dir: s.dir, angle: p * 180 });
  }
  function onUp(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    if (drag) {
      if (drag.angle > 70) go(at + drag.dir);
      setDrag(null);
    } else {
      go(at + s.dir);
    }
  }

  function pageFace(page: Page, i: number) {
    switch (page.type) {
      case "cover":
        return (
          <div className="sbk-cover" style={{ background: palette.accent, color: coverInk }}>
            <span className="sbk-cover-frame" />
            <p className="sbk-cover-kicker">A storybook for</p>
            <h1 style={{ fontFamily: fonts.heading }}>
              <SampleText on={data.nameIsSample}>{data.name}</SampleText>
            </h1>
            <p className="sbk-cover-sub">{heading}</p>
            <span className="sbk-cover-emblem" aria-hidden="true">
              ✦
            </span>
            <p className="sbk-cover-hint">Tap or drag the page to open</p>
          </div>
        );
      case "dedication":
        return (
          <div className="sbk-page sbk-center">
            <p className="sbk-kicker" style={{ color: palette.accent }}>
              This book belongs to
            </p>
            <p className="sbk-name" style={{ fontFamily: fonts.heading }}>
              <SampleText on={data.nameIsSample}>{data.name}</SampleText>
            </p>
            <p className="sbk-body">
              {site.custom_text.intro_message?.trim() ||
                (voice.solo
                  ? "Every page here is ours. Turn slowly."
                  : "Everyone who loves you wrote a page. Turn slowly.")}
            </p>
            {data.friends.length ? (
              <p className="sbk-small">Written by {data.friends.join(", ")}</p>
            ) : null}
            {data.isSample ? <p className="sbk-small opacity-60">{voice.sample}</p> : null}
          </div>
        );
      case "piece":
        return (
          <div className="sbk-page">
            <p className="sbk-chapter" style={{ color: palette.accent }}>
              Chapter {page.n}
            </p>
            <div className="sbk-content">
              <PieceBody piece={page.piece} accent={palette.accent} />
            </div>
            {page.piece.author ? (
              <p className="sbk-sign" style={{ color: palette.accent }}>
                {page.piece.author}
              </p>
            ) : null}
            <span className="sbk-folio">{i}</span>
          </div>
        );
      case "words":
        return (
          <div className="sbk-page sbk-center">
            <p className="sbk-kicker" style={{ color: palette.accent }}>
              In a few words
            </p>
            <div className="sbk-words">
              {page.words.map((w, k) => (
                <span
                  key={k}
                  style={{
                    fontSize: `${1.1 + seed(w + k) * 1.1}rem`,
                    color: k % 2 ? palette.accent : ink,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
            <span className="sbk-folio">{i}</span>
          </div>
        );
      case "end":
        return (
          <div className="sbk-page sbk-center">
            <p className="sbk-the-end" style={{ fontFamily: fonts.heading }}>
              The end
            </p>
            <p className="sbk-body">
              (For now. There are more pages still to write{data.named ? `, ${data.name}` : ""}.)
            </p>
            {site.custom_text.footer_note ? (
              <p className="sbk-small">{site.custom_text.footer_note}</p>
            ) : null}
            {showShare ? (
              <button
                type="button"
                className="sbk-btn"
                style={{ background: palette.accent, color: coverInk }}
                onClick={() => shareGift(site)}
              >
                Share the book
              </button>
            ) : null}
            <button type="button" className="sbk-link" onClick={() => go(0)}>
              Read it again
            </button>
          </div>
        );
    }
  }

  return (
    <div
      ref={rootRef}
      className="sbk-root relative min-h-screen"
      data-play-host
      style={
        {
          "--sbk-accent": palette.accent,
          "--sbk-primary": palette.primary,
          background: `radial-gradient(120% 80% at 50% 0%, ${palette.background}, color-mix(in oklab, ${palette.primary} 22%, ${palette.background}))`,
          color: ink,
          fontFamily: fonts.body,
        } as React.CSSProperties
      }
    >
      <div className="sbk-stage">
        <div
          ref={bookRef}
          // Openings that hand off into the gift (the Love Letter's letter) grow into this page.
          data-gift-page=""
          className={`sbk-book ${at === 0 ? "is-closed" : ""} ${reduce ? "is-still" : ""}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => {
            start.current = null;
            setDrag(null);
          }}
          role="group"
          aria-roledescription="book"
          aria-label={`Storybook for ${data.name}. Page ${at + 1} of ${total}.`}
        >
          <span className="sbk-edges" aria-hidden="true" />
          {pages.map((page, i) => {
            // Pages before `at` are turned over to the left; `at` is open.
            let angle = i < at ? -180 : 0;
            if (drag && drag.dir === 1 && i === at) angle = -drag.angle;
            if (drag && drag.dir === -1 && i === at - 1) angle = -180 + drag.angle;
            const near = Math.abs(i - at) <= 2;
            return (
              <div
                key={i}
                className={`sbk-leaf ${i === at ? "is-current" : ""} ${i < at ? "is-turned" : ""} ${drag ? "is-dragging" : ""}`}
                style={{
                  transform: reduce ? undefined : `rotateY(${angle}deg)`,
                  opacity: reduce ? (i === at ? 1 : 0) : undefined,
                  zIndex:
                    i === at - 1 ? total * 2 : i === at ? total * 2 - 1 : i < at ? i : total - i,
                  visibility: Math.abs(i - at) > 3 ? "hidden" : undefined,
                }}
                aria-hidden={i !== at}
              >
                <div className="sbk-front">{near ? pageFace(page, i) : null}</div>
                <div className="sbk-back" aria-hidden="true" />
              </div>
            );
          })}
        </div>

        <nav className="sbk-nav" aria-label="Turn pages">
          <button
            type="button"
            onClick={() => go(at - 1)}
            disabled={at === 0}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="sbk-count" aria-live="polite">
            {at === 0 ? "Cover" : `Page ${at} of ${total - 1}`}
          </span>
          <button
            type="button"
            onClick={() => go(at + 1)}
            disabled={at === total - 1}
            aria-label="Next page"
          >
            <ChevronRight className="size-5" />
          </button>
        </nav>
      </div>
      {extras ? (
        <div className="fmt-extras is-storybook mx-auto max-w-3xl px-5 pb-20">{extras}</div>
      ) : null}
    </div>
  );
}
