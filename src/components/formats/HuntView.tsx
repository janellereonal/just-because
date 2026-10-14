import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, Mic, Music2, RotateCcw, Sparkles } from "lucide-react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import { manilaToday, meshGradient, useCountdown, usePieces, useReducedMotion, type Piece } from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, pieceLabel, seed } from "@/components/formats/PieceSheet";

/** Unwrapped boxes are remembered on this device only. */
function useOpened(siteId: string, sample: boolean) {
  const key = `jb-hunt-${siteId}`;
  const [opened, setOpened] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (sample) return;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setOpened(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* storage can be blocked; the hunt still works for this visit */
    }
  }, [key, sample]);
  const add = useCallback(
    (id: string) =>
      setOpened((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        if (!sample)
          try {
            window.localStorage.setItem(key, JSON.stringify([...next]));
          } catch {
            /* ignore */
          }
        return next;
      }),
    [key, sample],
  );
  const reset = useCallback(() => {
    setOpened(new Set());
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);
  return { opened, add, reset };
}

const STICKERS = [
  { at: 1, label: "First unwrap" },
  { at: 0.5, label: "Halfway there" },
  { at: 1.0001, label: "All unwrapped" },
] as const;

function Confetti({ colors }: { colors: string[] }) {
  return (
    <div className="hunt-confetti" aria-hidden>
      {Array.from({ length: 36 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 12) * 70}ms`,
            animationDuration: `${1400 + ((i * 53) % 900)}ms`,
            transform: `rotate(${(i * 47) % 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function Box({
  piece,
  open,
  locked,
  tint,
  ribbon,
  onOpen,
  reduce,
  index,
}: {
  piece: Piece;
  open: boolean;
  locked: boolean;
  tint: string;
  ribbon: string;
  onOpen: () => void;
  reduce: boolean;
  index: number;
}) {
  const [shaking, setShaking] = useState(false);
  const tilt = (seed(piece.id) - 0.5) * 6;
  const icon =
    piece.kind === "song" ? <Music2 className="size-4" /> : piece.kind === "voice" ? <Mic className="size-4" /> : piece.kind === "ornament" ? <Sparkles className="size-4" /> : null;
  function click() {
    if (locked) {
      setShaking(true);
      window.setTimeout(() => setShaking(false), 450);
      return;
    }
    onOpen();
  }
  return (
    <button
      type="button"
      onClick={click}
      aria-label={locked ? `Locked until ${piece.date}` : open ? `Opened. ${pieceLabel(piece)}` : `Wrapped gift. Unwrap it.`}
      className={`hunt-box ${open ? "is-open" : ""} ${shaking ? "is-shaking" : ""} ${locked ? "is-locked" : ""}`}
      style={{ "--tint": tint, "--ribbon": ribbon, "--tilt": `${tilt}deg`, animationDelay: reduce ? undefined : `${Math.min(index, 16) * 45}ms` } as React.CSSProperties}
    >
      <span className="hunt-lid" aria-hidden>
        <span className="hunt-bow" />
      </span>
      <span className="hunt-body" aria-hidden />
      <span className="hunt-tag">
        {open ? (
          <>
            <span className="flex items-center gap-1 font-medium">{icon}{piece.author || "Surprise"}</span>
            <span className="line-clamp-2 opacity-75">{piece.kind === "photo" ? piece.text || "A photo" : piece.text}</span>
          </>
        ) : locked ? (
          <span className="flex items-center gap-1"><Lock className="size-3.5" /> {piece.date}</span>
        ) : (
          <span>{piece.sealed ? "For your eyes only" : `From ${piece.author || "us"}`}</span>
        )}
      </span>
    </button>
  );
}

export function HuntView({ site, modules, contributions, calendarEntries, palette, sample, showShare }: FormatViewProps) {
  const reduce = useReducedMotion();
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.playful;
  const cd = useCountdown(data.countdownDate);
  const ink = readableInk(palette.background);
  const { opened, add, reset } = useOpened(site.id, !!sample);
  const [sheet, setSheet] = useState<Piece | null>(null);
  const [burst, setBurst] = useState(0);
  const [sticker, setSticker] = useState<string | null>(null);
  const today = manilaToday();
  const boxes = useMemo(() => data.notes.filter((p) => !p.sealed || p.kind !== "word"), [data.notes]);
  const openable = boxes.filter((p) => !(p.kind === "calendar" && p.date && p.date > today) && !p.sealed);
  const done = openable.filter((p) => opened.has(p.id)).length;
  const total = openable.length;
  const pct = total ? done / total : 0;
  const finished = total > 0 && done === total;
  const finaleRef = useRef<HTMLDivElement | null>(null);
  const tints = [surfaceColor(palette.background), `${palette.accent}22`, `${palette.primary}18`];

  function unwrap(p: Piece) {
    const before = opened.has(p.id);
    add(p.id);
    // Let the lid fly first, then show what's inside.
    window.setTimeout(() => setSheet(p), reduce || before ? 0 : 420);
    if (before) return;
    const nextDone = done + (openable.some((o) => o.id === p.id) ? 1 : 0);
    const label =
      nextDone === total && total > 0 ? STICKERS[2].label : nextDone === 1 ? STICKERS[0].label : total >= 4 && nextDone === Math.ceil(total / 2) ? STICKERS[1].label : null;
    if (label) {
      setSticker(label);
      window.setTimeout(() => setSticker(null), 2400);
    }
    if (nextDone === total && total > 0) {
      setBurst((b) => b + 1);
    }
  }

  function closeSheet() {
    setSheet(null);
    if (finished) window.setTimeout(() => finaleRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }), 120);
  }

  return (
    <div
      className="hunt-root min-h-screen"
      style={{ background: meshGradient(palette.primary, palette.accent, palette.background), color: ink, fontFamily: fonts.body } as React.CSSProperties}
    >
      <div className="mx-auto max-w-4xl px-4 py-10 @2xl:px-6 @2xl:py-14">
        <header className="text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">A gift hunt for {data.name}</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-[clamp(2.1rem,6cqi,3.75rem)] leading-[1] font-semibold tracking-tight" style={{ fontFamily: fonts.heading }}>
            {site.custom_text.heading?.trim() || site.title}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed opacity-80">
            {site.custom_text.intro_message?.trim() || `There are ${boxes.length} little gifts in here. Tap each one to unwrap it.`}
          </p>
          {cd && !cd.done ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm" style={{ background: surfaceColor(palette.background) }}>
              <span className="font-semibold tabular-nums" style={{ color: palette.accent }}>{cd.days}</span> {cd.days === 1 ? "day" : "days"} until the big day
            </p>
          ) : null}
        </header>

        <div className="hunt-progress sticky top-3 z-10 mx-auto mt-8 max-w-md" style={{ background: surfaceColor(palette.background) }} role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{finished ? "You found them all" : `${done} of ${total} unwrapped`}</span>
            {done > 0 ? (
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-xs opacity-60 hover:opacity-100" aria-label="Wrap them all again">
                <RotateCcw className="size-3" /> Rewrap
              </button>
            ) : null}
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/8">
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct * 100}%`, background: `linear-gradient(90deg, ${palette.accent}, ${palette.primary})` }} />
          </div>
        </div>

        <div className="hunt-grid mt-8">
          {boxes.map((p, n) => (
            <Box
              key={p.id}
              index={n}
              reduce={reduce}
              piece={p}
              open={opened.has(p.id)}
              locked={(p.kind === "calendar" && !!p.date && p.date > today) || p.sealed}
              tint={tints[n % tints.length]!}
              ribbon={n % 2 ? palette.primary : palette.accent}
              onOpen={() => unwrap(p)}
            />
          ))}
        </div>

        {boxes.length === 0 ? <p className="mt-10 text-center opacity-70">Notes from friends will show up here as little wrapped gifts.</p> : null}

        {data.words.length ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {data.words.map((w) => (
              <span key={w.id} className="rounded-full px-3 py-1 text-sm font-medium" style={{ background: surfaceColor(palette.background) }}>
                {w.text}
              </span>
            ))}
          </div>
        ) : null}

        <div ref={finaleRef} className={`hunt-finale mt-12 ${finished ? "is-done" : ""}`} style={{ background: surfaceColor(palette.background) }}>
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-60">{finished ? "Hunt complete" : "Keep going"}</p>
          <p className="mt-2 text-2xl font-semibold" style={{ fontFamily: fonts.heading }}>
            {finished ? `That's every gift, ${data.name}.` : `${Math.max(0, total - done)} more to find.`}
          </p>
          {finished && data.friends.length ? <p className="mt-3 leading-relaxed opacity-80">With love from {data.friends.join(", ")}.</p> : null}
          {finished && site.custom_text.footer_note ? <p className="mt-3 text-sm opacity-70">{site.custom_text.footer_note}</p> : null}
          {finished && showShare ? (
            <button
              type="button"
              className="mt-5 rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ background: palette.accent, color: readableInk(palette.accent) }}
              onClick={() => (navigator.share ? void navigator.share({ title: site.title, url: location.href }) : void navigator.clipboard.writeText(location.href))}
            >
              Share the gift
            </button>
          ) : null}
        </div>
      </div>

      {sticker ? (
        <div className="hunt-sticker" role="status" style={{ background: palette.accent, color: readableInk(palette.accent) }}>
          {sticker}
        </div>
      ) : null}
      {burst && !reduce ? <Confetti key={burst} colors={[palette.accent, palette.primary, "#FFD66B", "#9EE3C8", "#B9D3FF"]} /> : null}
      {sheet ? <PieceSheet piece={sheet} palette={palette} onClose={closeSheet} /> : null}
    </div>
  );
}
