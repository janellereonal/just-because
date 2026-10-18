import { giftVoice } from "@/lib/giftVoice";
import { material } from "@/lib/sound/material";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { mixHex } from "@/themes/_shared/iconSets";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Mic, Music2, Sparkles } from "lucide-react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import { giftToday, useMediaUrl, usePieces, useReducedMotion, type Piece } from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, seed } from "@/components/formats/PieceSheet";
import { burst, buzz, chime } from "@/lib/play";

/** Scratched cards are remembered on this device only. */
function useScratched(siteId: string, sample: boolean) {
  const key = `jb-scratch-${siteId}`;
  const [done, setDone] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (sample) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* fine */
    }
  }, [key, sample]);
  const add = useCallback(
    (id: string) =>
      setDone((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        if (!sample)
          try {
            window.localStorage.setItem(key, JSON.stringify([...next]));
          } catch {
            /* fine */
          }
        return next;
      }),
    [key, sample],
  );
  return { done, add };
}

/** Foils in the gift's own colors: the accent, the primary and a blend, kept light so they still read as foil. */
function foilFor(index: number, colors: string[]): [string, string, string] {
  const hex = (c: string | undefined, fb: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : fb);
  const accent = hex(colors[0], "#B5623E");
  const primary = hex(colors[1], accent);
  const bases = [accent, primary, mixHex(accent, primary, 0.5), mixHex(accent, "#C9A96E", 0.45)];
  const base = bases[index % bases.length]!;
  return [
    mixHex(base, "#FFFFFF", 0.6),
    mixHex(base, "#FFFFFF", 0.38),
    mixHex(base, "#FFFFFF", 0.86),
  ];
}

/**
 * Every ticket is a game that hints at what's under it, like a real scratch-card rack:
 * a letter is Lucky Letter (match three hearts), a photo is Photo Finish (film), a song
 * is Top of the Charts (equaliser), a voice note is Say It Again (a sound wave), and the
 * rest are Golden Tickets.
 */
type Game = {
  name: string;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, ink: string) => void;
};
const GAMES: Record<string, Game> = {
  letter: {
    name: "Lucky Letter",
    draw(ctx, w, h, ink) {
      ctx.fillStyle = ink;
      ctx.font = `600 ${Math.round(h * 0.15)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cols = 3;
      const cw = Math.min(w * 0.18, h * 0.24);
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < cols; c++)
          ctx.fillText(r * 3 + c === 4 ? "♥" : "♡", w / 2 + (c - 1) * cw, h * 0.32 + r * cw * 0.82);
      ctx.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`;
      ctx.fillText("MATCH 3 HEARTS", w / 2, h * 0.88);
    },
  },
  photo: {
    name: "Photo Finish",
    draw(ctx, w, h, ink) {
      ctx.fillStyle = ink;
      // A strip of film across the middle, with perforations.
      const y = h * 0.3;
      const fh = h * 0.36;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(w * 0.08, y, w * 0.84, fh);
      ctx.globalAlpha = 1;
      // Printed holes and frames (never cut through: the photo must stay hidden until it's scratched).
      ctx.fillStyle = "rgba(255,255,255,.7)";
      for (let x = w * 0.1; x < w * 0.9; x += w * 0.06) {
        ctx.fillRect(x, y + fh * 0.07, w * 0.03, fh * 0.12);
        ctx.fillRect(x, y + fh * 0.81, w * 0.03, fh * 0.12);
      }
      ctx.fillStyle = "rgba(255,255,255,.35)";
      for (let i = 0; i < 3; i++)
        ctx.fillRect(w * (0.14 + i * 0.255), y + fh * 0.26, w * 0.21, fh * 0.48);
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("FIND THE PICTURE", w / 2, h * 0.86);
    },
  },
  song: {
    name: "Top of the Charts",
    draw(ctx, w, h, ink) {
      ctx.fillStyle = ink;
      const bars = 13;
      const bw = (w * 0.7) / bars;
      for (let i = 0; i < bars; i++) {
        const bh = h * (0.12 + 0.42 * Math.abs(Math.sin(i * 1.7 + 0.6)));
        ctx.globalAlpha = 0.55;
        ctx.fillRect(w * 0.15 + i * bw + bw * 0.15, h * 0.68 - bh, bw * 0.7, bh);
      }
      ctx.globalAlpha = 1;
      ctx.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("NUMBER ONE HIT", w / 2, h * 0.86);
    },
  },
  voice: {
    name: "Say It Again",
    draw(ctx, w, h, ink) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(2, h * 0.02);
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      for (let x = 0; x <= w * 0.76; x += 2) {
        const k = x / (w * 0.76);
        const amp = h * 0.2 * Math.sin(Math.PI * k) * (0.6 + 0.4 * Math.sin(k * 31));
        ctx.lineTo(w * 0.12 + x, h * 0.45 + Math.sin(k * 46) * amp);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("PRESS TO LISTEN", w / 2, h * 0.86);
    },
  },
  default: {
    name: "Golden Ticket",
    draw(ctx, w, h, ink) {
      ctx.fillStyle = ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${Math.round(h * 0.36)}px system-ui, sans-serif`;
      ctx.globalAlpha = 0.6;
      ctx.fillText("★", w / 2, h * 0.45);
      ctx.globalAlpha = 1;
      ctx.font = `700 ${Math.round(h * 0.075)}px system-ui, sans-serif`;
      ctx.fillText("SCRATCH TO WIN", w / 2, h * 0.86);
    },
  },
};
const gameFor = (p: Piece) => GAMES[p.kind] ?? GAMES["default"]!;

/** The silver foil, drawn on a canvas you can scratch away. */
function Foil({
  piece,
  index,
  onDone,
  reduce,
  colors,
  host,
}: {
  piece: Piece;
  index: number;
  onDone: () => void;
  reduce: boolean;
  colors: string[];
  host: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const finished = useRef(false);
  const lastSound = useRef(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    // Layout size, not the on-screen size, so scaled previews stay crisp and aligned.
    const r = { width: c.offsetWidth, height: c.offsetHeight };
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const [a, b, hi] = foilFor(index, colors);
    const g = ctx.createLinearGradient(0, 0, r.width, r.height);
    g.addColorStop(0, a);
    g.addColorStop(0.45, hi);
    g.addColorStop(0.55, b);
    g.addColorStop(1, a);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    // Glittery speckle and a little pattern so it reads as foil.
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.15 + ((i * 37) % 10) / 25})`;
      ctx.fillRect(
        (((i * 97) % 1000) / 1000) * r.width,
        (((i * 53) % 997) / 997) * r.height,
        1.4,
        1.4,
      );
    }
    // The game printed on the foil.
    gameFor(piece).draw(ctx, r.width, r.height, "rgba(60,50,70,.55)");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function finish() {
    if (finished.current) return;
    finished.current = true;
    setGone(true);
    onDone();
    const r = canvasRef.current?.getBoundingClientRect();
    if (r)
      burst(host.current, r.left + r.width / 2, r.top + r.height / 2, {
        shape: "sparkles",
        colors,
        count: 18,
        spread: 1.1,
      });
    chime("sparkle");
    buzz([8, 30, 12]);
  }

  function scratch(x: number, y: number) {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const r = c.getBoundingClientRect();
    const px = ((x - r.left) / r.width) * c.offsetWidth;
    const py = ((y - r.top) / r.height) * c.offsetHeight;
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 30;
    ctx.beginPath();
    const from = last.current ?? { x: px, y: py };
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(px, py);
    ctx.stroke();
    last.current = { x: px, y: py };
    const now = performance.now();
    if (now - lastSound.current > 120) {
      lastSound.current = now;
      material("scratch", { pan: (px / Math.max(1, canvasRef.current?.width ?? 1) - 0.5) * 1.2 });
      buzz(3);
    }
  }

  function measure() {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const img = ctx.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    let n = 0;
    for (let i = 3; i < img.length; i += 4 * 24) {
      n++;
      if (img[i] === 0) clear++;
    }
    if (n && clear / n > 0.5) finish();
  }

  if (gone) return null;
  return (
    <>
      <canvas
        ref={canvasRef}
        className={`scr-foil ${reduce ? "" : "is-live"}`}
        aria-hidden="true"
        onPointerDown={(e) => {
          if (piece.sealed) return;
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          last.current = null;
          scratch(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 0 && e.pointerType === "mouse") return;
          if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
          scratch(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          last.current = null;
          measure();
        }}
      />
      <button type="button" className="scr-reveal" onClick={finish} disabled={piece.sealed}>
        {piece.sealed ? "Sealed" : "Reveal"}
      </button>
    </>
  );
}

function Card({
  piece,
  index,
  revealed,
  onReveal,
  onOpen,
  reduce,
  colors,
  host,
  accent,
}: {
  piece: Piece;
  index: number;
  revealed: boolean;
  onReveal: () => void;
  onOpen: () => void;
  reduce: boolean;
  colors: string[];
  host: React.RefObject<HTMLDivElement | null>;
  accent: string;
}) {
  const media = useMediaUrl(piece.kind === "photo" ? piece.media : null);
  const locked = piece.kind === "calendar" && !!piece.date && piece.date > giftToday();
  const tilt = (seed(piece.id) - 0.5) * 4;
  return (
    <article
      className={`scr-card ${revealed ? "is-revealed" : ""}`}
      style={{ "--tilt": `${tilt}deg` } as React.CSSProperties}
    >
      <header className="scr-head">
        <span className="scr-no">No. {String(index + 1).padStart(2, "0")}</span>
        <span className="scr-from">From {piece.author || "a friend"}</span>
      </header>
      <p className="scr-game" data-game={piece.kind in GAMES ? piece.kind : "default"}>
        {gameFor(piece).name}
      </p>
      <div className="scr-window">
        <button
          type="button"
          className="scr-prize"
          onClick={revealed ? onOpen : undefined}
          tabIndex={revealed ? 0 : -1}
          aria-label={revealed ? `Open the note from ${piece.author}` : undefined}
        >
          {piece.sealed || locked ? (
            <span className="scr-lock">
              <Lock className="size-5" />
              {locked ? `Opens ${piece.date}` : "Only for the recipient"}
            </span>
          ) : piece.kind === "photo" && media ? (
            <img
              {...photoProps(media, piece.thumb, "(max-width: 640px) 85vw, 380px")}
              alt={piece.text ?? ""}
              loading="lazy"
              decoding="async"
              data-framed={piece.framed || undefined}
            />
          ) : (
            <span className="scr-text">
              {piece.kind === "song" ? (
                <Music2 className="mb-1 size-5" style={{ color: accent }} />
              ) : null}
              {piece.kind === "voice" ? (
                <Mic className="mb-1 size-5" style={{ color: accent }} />
              ) : null}
              {piece.text || (piece.kind === "song" ? "A song for you" : "A little something")}
            </span>
          )}
        </button>
        {!revealed && !locked ? (
          <Foil
            piece={piece}
            index={index}
            onDone={onReveal}
            reduce={reduce}
            colors={colors}
            host={host}
          />
        ) : null}
      </div>
    </article>
  );
}

/**
 * Scratch Cards: every note hides under silver foil. Scratch it off with a
 * finger (or press Reveal). Progress is remembered on this device.
 */
export function ScratchView({
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
  const { done, add } = useScratched(site.id, !!sample);
  const [sheet, setSheet] = useState<Piece | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cards = data.notes;
  const count = cards.filter((c) => done.has(c.id)).length;
  const all = cards.length > 0 && count === cards.length;
  const colors = [palette.accent, palette.primary, "#FFD166", "#FFFFFF"];
  const ink = readableInk(palette.background);

  useEffect(() => {
    if (!all || reduce) return;
    const r = hostRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = r.left + r.width / 2;
    const y = Math.max(r.top, 0) + 160;
    burst(hostRef.current, x, y, { shape: "confetti", colors, count: 50, spread: 2.4 });
    chime("tada");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  return (
    <div
      ref={hostRef}
      className="scr-root relative min-h-screen"
      data-play-host
      style={
        {
          "--scr-accent": palette.accent,
          "--scr-primary": palette.primary,
          "--scr-surface": surfaceColor(palette.background),
          "--scr-bg": palette.background,
          background: palette.background,
          color: ink,
          fontFamily: fonts.body,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-4xl px-4 pt-10 pb-16">
        <header className="text-center">
          <p className="scr-kicker">
            Lucky you{data.named ? ", " : ""}
            {data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : null}
          </p>
          <h1 className="scr-title" style={{ fontFamily: fonts.heading }}>
            {giftHeading(site.custom_text, theme, site.occasion)}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed opacity-80">
            {site.custom_text.intro_message?.trim() ||
              `${cards.length} cards, ${cards.length} winners. Scratch the foil to see what's underneath.`}
          </p>
          <div className="scr-progress" role="status" aria-live="polite">
            <Sparkles className="size-4" style={{ color: palette.accent }} />
            {all
              ? "Every card revealed. You won them all."
              : `${count} of ${cards.length} scratched`}
          </div>
        </header>

        <div className="scr-grid">
          {cards.map((p, i) => (
            <Card
              key={p.id}
              piece={p}
              index={i}
              revealed={done.has(p.id)}
              onReveal={() => add(p.id)}
              onOpen={() => setSheet(p)}
              reduce={reduce}
              colors={colors}
              host={hostRef}
              accent={palette.accent}
            />
          ))}
        </div>

        {data.words.length ? (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {data.words.map((w) => (
              <span key={w.id} className="scr-word">
                {w.text}
              </span>
            ))}
          </div>
        ) : null}

        {extras ? <div className="fmt-extras is-scratch">{extras}</div> : null}

        <footer className="mt-12 text-center text-sm opacity-80">
          {data.friends.length ? <p>With love from {data.friends.join(", ")}.</p> : null}
          {site.custom_text.footer_note ? (
            <p className="mt-2">{site.custom_text.footer_note}</p>
          ) : null}
          {data.isSample ? <p className="mt-2 opacity-70">{voice.sample}</p> : null}
          {showShare ? (
            <button
              type="button"
              className="mt-5 rounded-full px-5 py-2.5 font-medium"
              style={{ background: palette.accent, color: readableInk(palette.accent) }}
              onClick={() => shareGift(site)}
            >
              Share the gift
            </button>
          ) : null}
        </footer>
      </div>
      {sheet ? (
        <PieceSheet piece={sheet} palette={palette} onClose={() => setSheet(null)} sound="flip" />
      ) : null}
    </div>
  );
}
