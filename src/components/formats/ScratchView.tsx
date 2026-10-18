import { giftVoice } from "@/lib/giftVoice";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { mixHex } from "@/themes/_shared/iconSets";
import { SampleText } from "@/components/SampleMark";
import { giftHeading } from "@/lib/themeKind";
import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Mic, Music2, Sparkles } from "lucide-react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import {
  giftToday,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
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
  return [mixHex(base, "#FFFFFF", 0.6), mixHex(base, "#FFFFFF", 0.38), mixHex(base, "#FFFFFF", 0.86)];
}

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
    ctx.fillStyle = "rgba(60,50,70,.55)";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCRATCH ME", r.width / 2, r.height / 2 - 4);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("✦ ✦ ✦", r.width / 2, r.height / 2 + 22);
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
            <img {...photoProps(media, piece.thumb, "(max-width: 640px) 85vw, 380px")} alt={piece.text ?? ""} loading="lazy" decoding="async" data-framed={piece.framed || undefined} />
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
          <p className="scr-kicker">Lucky you{data.named ? ", " : ""}{data.named ? <SampleText on={data.nameIsSample}>{data.name}</SampleText> : null}</p>
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

        <footer className="mt-12 text-center text-sm opacity-80">
          {data.friends.length ? <p>With love from {data.friends.join(", ")}.</p> : null}
          {site.custom_text.footer_note ? (
            <p className="mt-2">{site.custom_text.footer_note}</p>
          ) : null}
          {data.isSample ? (
            <p className="mt-2 opacity-70">{voice.sample}</p>
          ) : null}
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
      {sheet ? <PieceSheet piece={sheet} palette={palette} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
