import { useEffect, useRef, useState } from "react";
import { Lock, Mic, Music2, Play, Share2, Sparkles } from "lucide-react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import {
  manilaToday,
  meshGradient,
  useCountdown,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, pieceLabel, seed } from "@/components/formats/PieceSheet";

function span(p: Piece) {
  if (p.kind === "photo") return seed(p.id) > 0.45 ? "bento-tall" : "";
  if (p.kind === "letter" && (p.text?.length ?? 0) > 140) return "bento-wide";
  if (p.kind === "song") return "bento-wide";
  return "";
}

/** Tilts toward the pointer. Transform only, and off for reduced motion. */
function useTilt(reduce: boolean) {
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduce || !window.matchMedia("(hover: hover)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg) translateY(-3px)`;
        el.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(0)}%`);
        el.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(0)}%`);
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);
  return ref;
}

function Tile({
  className = "",
  style,
  onOpen,
  label,
  children,
  reduce,
  index,
}: {
  className?: string;
  style?: React.CSSProperties;
  onOpen?: (() => void) | undefined;
  label: string;
  children: React.ReactNode;
  reduce: boolean;
  index: number;
}) {
  const ref = useTilt(reduce);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={label}
      className={`bento-tile group ${className}`}
      style={{ ...style, animationDelay: reduce ? undefined : `${Math.min(index, 14) * 55}ms` }}
    >
      <span className="bento-shine" aria-hidden />
      {children}
    </button>
  );
}

function PhotoFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  const url = useMediaUrl(piece.media);
  return (
    <>
      {url ? (
        <img
          src={url}
          alt={piece.text ?? `Photo from ${piece.author}`}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <span
          className="absolute inset-0"
          aria-hidden
          style={{
            background: `linear-gradient(135deg, ${palette.accent}55, ${palette.primary}33), ${surfaceColor(palette.background)}`,
          }}
        />
      )}
      <span className="bento-photo-cap">
        <span className="line-clamp-1">{piece.text || "A favorite moment"}</span>
        <span className="opacity-75">{piece.author}</span>
      </span>
    </>
  );
}

function Face({ piece, palette, name }: { piece: Piece; palette: Palette; name: string }) {
  const ink = readableInk(palette.background);
  if (piece.sealed)
    return (
      <span className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Lock className="size-6 opacity-70" />
        <span className="text-sm font-medium">Only {name} can open this</span>
        <span className="text-xs opacity-60">From {piece.author}</span>
      </span>
    );
  switch (piece.kind) {
    case "photo":
      return <PhotoFace piece={piece} palette={palette} />;
    case "song":
      return (
        <span className="flex h-full items-center gap-4">
          <span
            className="bento-vinyl"
            style={{ "--vinyl": palette.accent } as React.CSSProperties}
            aria-hidden
          >
            <Music2 className="size-5" style={{ color: readableInk(palette.accent) }} />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
              Song pick
            </span>
            <span className="mt-1 line-clamp-2 block text-base font-medium">
              {piece.text || "Press play on this one."}
            </span>
            <span className="mt-1 block text-sm opacity-70">{piece.author}</span>
          </span>
          <span
            className="ml-auto grid size-11 shrink-0 place-items-center rounded-full"
            style={{ background: ink, color: palette.background }}
          >
            <Play className="size-4 translate-x-px" />
          </span>
        </span>
      );
    case "voice":
      return (
        <span className="flex h-full flex-col justify-between text-left">
          <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
            <Mic className="size-3.5" /> Voice note
          </span>
          <span className="bento-wave" aria-hidden>
            {Array.from({ length: 18 }, (_, i) => (
              <i
                key={i}
                style={{
                  height: `${22 + Math.abs(Math.sin(i * 1.7 + seed(piece.id) * 9)) * 70}%`,
                  background: palette.accent,
                }}
              />
            ))}
          </span>
          <span className="text-sm">From {piece.author}</span>
        </span>
      );
    case "ornament":
      return (
        <span className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <Sparkles className="size-6" style={{ color: palette.accent }} />
          <span className="line-clamp-3 text-sm">{piece.text}</span>
          <span className="text-xs opacity-60">{piece.author}</span>
        </span>
      );
    case "calendar": {
      const locked = !!piece.date && piece.date > manilaToday();
      const d = piece.date ? new Date(`${piece.date}T00:00:00+08:00`) : null;
      return (
        <span className="flex h-full flex-col justify-between text-left">
          <span className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
            {d
              ? d.toLocaleDateString("en-PH", { month: "short", timeZone: "Asia/Manila" })
              : "Surprise"}
          </span>
          <span className="text-5xl leading-none font-semibold" style={{ color: palette.accent }}>
            {d ? d.toLocaleDateString("en-PH", { day: "numeric", timeZone: "Asia/Manila" }) : "?"}
          </span>
          <span className="flex items-center gap-1.5 text-sm opacity-80">
            {locked ? (
              <>
                <Lock className="size-3.5" /> Opens that day
              </>
            ) : (
              "Open today's surprise"
            )}
          </span>
        </span>
      );
    }
    default:
      return (
        <span className="flex h-full flex-col text-left">
          <span className="bento-quote" style={{ color: palette.accent }} aria-hidden>
            &ldquo;
          </span>
          <span className="line-clamp-5 text-[15px] leading-relaxed whitespace-pre-line">
            {piece.text}
          </span>
          <span className="mt-auto pt-3 text-sm font-medium opacity-75">{piece.author}</span>
        </span>
      );
  }
}

export function BentoView({
  site,
  modules,
  contributions,
  calendarEntries,
  palette,
  sample,
  showShare,
}: FormatViewProps) {
  const reduce = useReducedMotion();
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.playful;
  const cd = useCountdown(data.countdownDate);
  const [open, setOpen] = useState<Piece | null>(null);
  const ink = readableInk(palette.background);
  const heading = site.custom_text.heading?.trim() || site.title || `For ${data.name}`;
  const intro =
    site.custom_text.intro_message?.trim() ||
    site.intro_text ||
    `Everyone who loves you put something in here, ${data.name}. Take your time.`;
  let i = 0;

  return (
    <div
      className="bento-root min-h-screen"
      style={
        {
          background: meshGradient(palette.primary, palette.accent, palette.background),
          color: ink,
          fontFamily: fonts.body,
          "--tile": surfaceColor(palette.background),
          "--accent": palette.accent,
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10 @2xl:px-6 @2xl:py-14">
        <div className="bento-grid">
          <div
            className="bento-tile bento-hero"
            style={{
              background: `linear-gradient(145deg, ${palette.accent}, ${palette.primary})`,
              color: readableInk(palette.accent),
            }}
          >
            <span className="bento-orb" aria-hidden />
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80">
              A gift for {data.name}
            </p>
            <h1
              className="mt-3 text-[clamp(2.2rem,5.5cqi,4.25rem)] leading-[0.95] font-semibold tracking-tight"
              style={{ fontFamily: fonts.heading }}
            >
              {heading}
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed opacity-90">{intro}</p>
            {showShare ? (
              <button
                type="button"
                onClick={() =>
                  navigator.share
                    ? void navigator.share({ title: site.title, url: location.href })
                    : void navigator.clipboard.writeText(location.href)
                }
                className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur hover:bg-white/30"
              >
                <Share2 className="size-4" /> Share
              </button>
            ) : null}
          </div>

          {cd ? (
            <div className="bento-tile flex flex-col justify-between text-left">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
                {cd.done ? "It's the day" : "Countdown"}
              </p>
              <p
                className="text-6xl leading-none font-semibold tabular-nums"
                style={{ color: palette.accent, fontFamily: fonts.heading }}
              >
                {cd.done ? "Today" : cd.days}
              </p>
              <p className="text-sm opacity-75" suppressHydrationWarning>
                {cd.done
                  ? `Happy day, ${data.name}.`
                  : `${cd.days === 1 ? "day" : "days"} to go · ${String(cd.hours).padStart(2, "0")}:${String(cd.mins).padStart(2, "0")}:${String(cd.secs).padStart(2, "0")}`}
              </p>
            </div>
          ) : null}

          <div className="bento-tile flex flex-col justify-between text-left">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
              Made by
            </p>
            <p
              className="text-5xl leading-none font-semibold"
              style={{ fontFamily: fonts.heading }}
            >
              {data.friends.length || (data.isSample ? 6 : 0)}
            </p>
            <p className="text-sm opacity-75">
              {data.friends.length === 1 ? "friend" : "friends"} · {data.notes.length}{" "}
              {data.notes.length === 1 ? "piece" : "pieces"}
            </p>
          </div>

          {data.notes.map((p) => (
            <Tile
              key={p.id}
              index={i++}
              reduce={reduce}
              label={pieceLabel(p)}
              className={`${span(p)} ${p.kind === "photo" ? "bento-photo" : ""} ${p.mine ? "bento-mine" : ""}`}
              onOpen={p.sealed ? undefined : () => setOpen(p)}
            >
              <Face piece={p} palette={palette} name={data.name} />
              {p.mine ? <span className="bento-yours">Yours</span> : null}
            </Tile>
          ))}

          {data.words.length ? (
            <div className="bento-tile bento-wide flex flex-wrap content-center items-center justify-center gap-x-4 gap-y-1">
              {data.words.map((w, n) => (
                <span
                  key={w.id}
                  className="font-semibold"
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: `${1 + seed(w.id) * 1.4}rem`,
                    color: n % 3 === 0 ? palette.accent : undefined,
                    opacity: 0.6 + seed(w.id + "o") * 0.4,
                  }}
                >
                  {w.text}
                </span>
              ))}
            </div>
          ) : null}

          {data.notes.length === 0 && !data.words.length ? (
            <div className="bento-tile bento-wide grid place-items-center text-center">
              <p className="max-w-xs text-base opacity-80">
                Notes from friends will show up here as tiles.
              </p>
            </div>
          ) : null}

          {data.friends.length ? (
            <div
              className={`bento-tile text-left ${data.words.length ? "bento-wide" : "bento-full"}`}
            >
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase opacity-60">
                With love from
              </p>
              <p className="mt-2 text-lg leading-relaxed">{data.friends.join(", ")}</p>
              {site.custom_text.footer_note ? (
                <p className="mt-3 text-sm opacity-70">{site.custom_text.footer_note}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {open ? <PieceSheet piece={open} palette={palette} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
