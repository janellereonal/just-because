/**
 * The shared kit for style bodies (src/components/bodies/<style>.tsx).
 *
 * A body is how a style's notes are read once its opening is done. Every theme
 * style has its own (Love Letter is a bundle of envelopes, Cake a party table...),
 * so no two styles read alike. The kit only does the plumbing every body needs:
 * the notes as one list of pieces, which ones were opened on this device, the
 * full-size reader, a note's content, the countdown and the footer. Each body
 * draws everything else itself.
 */
// Shared body styles load with the first body a gift shows.
import "@/styles/bodies/kit.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lock, Mic, Music2, Camera, X } from "lucide-react";
import { FONT_PAIRINGS, toEmbedUrl } from "@/lib/gift";
import { isDark, readableInk, surfaceColor } from "@/lib/palettes";
import { photoProps } from "@/lib/media";
import { giftVoice } from "@/lib/giftVoice";
import { giftHeading } from "@/lib/themeKind";
import { shareGift } from "@/lib/track";
import { formatDay } from "@/lib/time";
import { mixHex } from "@/themes/_shared/iconSets";
import { t } from "@/i18n";
import {
  giftToday,
  useCountdown,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { seed } from "@/components/formats/PieceSheet";

export { seed };
export type { Piece };

export type BodyProps = FormatViewProps;

/** A color that is a valid #rrggbb, else the fallback (palettes from old gifts can be odd). */
export function hex(c: string | undefined | null, fallback: string) {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : fallback;
}

/** Notes opened on this device (kept in localStorage, never on the server). Samples forget. */
export function useOpened(key: string, siteId: string, sample: boolean) {
  const storageKey = `jb-${key}-${siteId}`;
  const [opened, setOpened] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (sample) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setOpened(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* private mode: start fresh */
    }
  }, [storageKey, sample]);
  const open = useCallback(
    (id: string) =>
      setOpened((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev).add(id);
        if (!sample)
          try {
            window.localStorage.setItem(storageKey, JSON.stringify([...next]));
          } catch {
            /* fine */
          }
        return next;
      }),
    [storageKey, sample],
  );
  return { opened, open };
}

/** Everything a body needs, worked out once. */
export function useBody(props: BodyProps) {
  const { site, modules, contributions, calendarEntries, palette, sample, theme } = props;
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const reduce = useReducedMotion();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [reading, setReading] = useState<Piece | null>(null);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.theme;
  const bg = hex(palette.background, "#FBF8F2");
  const primary = hex(palette.primary, "#B5623E");
  const accent = hex(palette.accent, "#E9C9B6");
  const ink = readableInk(bg);
  const dark = isDark(bg);
  const colors = useMemo(
    () => ({
      bg,
      primary,
      accent,
      ink,
      dark,
      surface: surfaceColor(bg),
      /** Soft mixes for materials: paper, card stock, shadows. */
      mix: (a: string, b: string, k: number) => mixHex(hex(a, bg), hex(b, bg), k),
      onPrimary: readableInk(primary),
      onAccent: readableInk(accent),
    }),
    [bg, primary, accent, ink, dark],
  );
  return {
    data,
    site,
    theme,
    reduce,
    hostRef,
    fonts,
    colors,
    voice: giftVoice(site.solo),
    heading: giftHeading(site.custom_text, theme, site.occasion),
    intro: site.custom_text.intro_message?.trim() || "",
    reading,
    read: setReading,
    closeReader: () => setReading(null),
    showShare: !!props.showShare,
    sample: !!sample,
  };
}

/** A calendar surprise that hasn't reached its day (in the viewer's time zone). */
export function isLocked(p: Piece) {
  return p.kind === "calendar" && !!p.date && p.date > giftToday();
}

/** Short words for what a piece is, for labels ("A song from Lia"). */
export function pieceWhat(p: Piece) {
  if (p.sealed) return t("body.what.sealed");
  return t(`body.what.${p.kind}`);
}

export function pieceLabel(p: Piece) {
  const from = p.author ? t("body.from", { name: p.author }) : "";
  return `${pieceWhat(p)}${from ? ` ${from}` : ""}`;
}

/** A photo, or a soft placeholder for sample photos (they have no picture). */
export function PhotoFace({
  piece,
  sizes = "(max-width: 640px) 80vw, 360px",
  className = "",
  tint,
}: {
  piece: Piece;
  sizes?: string;
  className?: string;
  tint: string;
}) {
  const url = useMediaUrl(piece.kind === "photo" ? piece.media : null);
  if (url)
    return (
      <img
        {...photoProps(url, piece.thumb, sizes)}
        alt={piece.text ?? ""}
        loading="lazy"
        decoding="async"
        data-framed={piece.framed || undefined}
        className={`block size-full ${piece.framed ? "object-contain" : "object-cover"} ${className}`}
      />
    );
  return (
    <span
      className={`grid size-full place-items-center ${className}`}
      style={{
        background: `linear-gradient(135deg, ${mixHex(tint, "#FFFFFF", 0.55)}, ${mixHex(tint, "#FFFFFF", 0.25)})`,
      }}
      aria-label={piece.text ?? t("body.what.photo")}
    >
      <Camera className="size-7 opacity-50" style={{ color: mixHex(tint, "#000000", 0.35) }} />
    </span>
  );
}

/**
 * The inside of a note, sized to sit in whatever a body wraps it in (an envelope,
 * a place card, a record sleeve). Photos fill, songs and voice notes get their icon.
 */
export function PieceContent({
  piece,
  accent,
  clamp,
  showAuthor = false,
}: {
  piece: Piece;
  accent: string;
  /** Lines of text before it fades (the full note opens in the reader). */
  clamp?: number;
  showAuthor?: boolean;
}) {
  if (piece.sealed)
    return (
      <span className="flex flex-col items-center gap-1.5 text-center text-sm opacity-80">
        <Lock className="size-5" />
        {t("body.sealed")}
      </span>
    );
  if (isLocked(piece))
    return (
      <span className="flex flex-col items-center gap-1.5 text-center text-sm opacity-80">
        <Lock className="size-5" />
        {t("body.opensOn", { day: formatDay(piece.date!) })}
      </span>
    );
  const text =
    piece.text?.trim() ||
    (piece.kind === "song"
      ? t("body.songFallback")
      : piece.kind === "voice"
        ? t("body.voiceFallback")
        : "");
  return (
    <span className="block">
      {piece.kind === "song" || piece.kind === "voice" ? (
        <span
          className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase"
          style={{ color: accent }}
        >
          {piece.kind === "song" ? <Music2 className="size-3.5" /> : <Mic className="size-3.5" />}
          {pieceWhat(piece)}
        </span>
      ) : null}
      {text ? (
        <span
          className="block leading-relaxed whitespace-pre-line"
          style={
            clamp
              ? {
                  display: "-webkit-box",
                  WebkitLineClamp: clamp,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }
              : undefined
          }
        >
          {text}
        </span>
      ) : null}
      {showAuthor && piece.author ? (
        <span className="mt-2 block text-sm font-medium" style={{ color: accent }}>
          {piece.author}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The full note, read up close. Bodies pass their own paper (className and style)
 * so a letter reads on letter paper and a place card on card stock.
 */
export function Reader({
  piece,
  onClose,
  accent,
  className = "",
  style,
  children,
  label,
}: {
  piece: Piece;
  onClose: () => void;
  accent: string;
  className?: string;
  style?: React.CSSProperties;
  /** Extra things drawn on the paper (a stamp, a ribbon). */
  children?: React.ReactNode;
  label?: string;
}) {
  const media = useMediaUrl(piece.kind === "photo" || piece.kind === "voice" ? piece.media : null);
  const embed = piece.link ? toEmbedUrl(piece.link) : null;
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    closeRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  const locked = isLocked(piece);
  return (
    <div className="body-reader-backdrop" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label ?? pieceLabel(piece)}
        className={`body-reader ${className}`}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="body-reader-close"
          aria-label={t("body.close")}
        >
          <X className="size-4" />
        </button>
        {children}
        {piece.sealed ? (
          <p className="py-10 text-center text-lg">{t("body.sealed")}</p>
        ) : locked ? (
          <p className="py-10 text-center text-lg">
            {t("body.lockedLong", { day: formatDay(piece.date!) })}
          </p>
        ) : (
          <>
            {piece.kind === "photo" ? (
              <div className="body-reader-photo">
                {media ? (
                  <img
                    src={media}
                    alt={piece.text ?? ""}
                    className="max-h-[58vh] w-full rounded-xl object-contain"
                  />
                ) : (
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-xl">
                    <PhotoFace piece={piece} tint={accent} />
                  </div>
                )}
              </div>
            ) : null}
            {piece.kind === "voice" && media ? (
              <audio controls autoPlay src={media} className="mb-5 w-full" />
            ) : null}
            {embed ? (
              <iframe
                src={embed}
                title={pieceLabel(piece)}
                loading="lazy"
                allow="encrypted-media; clipboard-write; picture-in-picture; autoplay"
                className="mb-5 h-[152px] w-full rounded-2xl border-0"
              />
            ) : piece.link ? (
              <a
                href={piece.link}
                target="_blank"
                rel="noreferrer"
                className="mb-5 inline-block underline underline-offset-4"
                style={{ color: accent }}
              >
                {t("body.openSong")}
              </a>
            ) : null}
            {piece.text ? <p className="body-reader-text">{piece.text}</p> : null}
            {piece.author ? (
              <p className="body-reader-from" style={{ color: accent }}>
                {piece.author}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** "12 days, 3 hours" until the countdown moment, or null when there isn't one. */
export function CountdownLine({
  date,
  className = "",
  style,
}: {
  date: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const c = useCountdown(date);
  if (!c) return null;
  return (
    <p className={className} style={style} role="timer">
      {c.done
        ? t("body.countdown.done")
        : t("body.countdown.left", { days: c.days, hours: c.hours, mins: c.mins })}
    </p>
  );
}

/** Friends' names, the footer note, the sample line and Share. Bodies style the wrapper. */
export function BodyFooter({
  body,
  className = "",
  buttonStyle,
}: {
  body: ReturnType<typeof useBody>;
  className?: string;
  buttonStyle?: React.CSSProperties;
}) {
  const { data, site, voice, colors } = body;
  return (
    <footer className={`text-center text-sm ${className}`}>
      {data.friends.length ? <p>{t("body.withLove", { names: listNames(data.friends) })}</p> : null}
      {site.custom_text.footer_note ? <p className="mt-2">{site.custom_text.footer_note}</p> : null}
      {data.isSample ? <p className="mt-2 opacity-70">{voice.sample}</p> : null}
      {body.showShare ? (
        <button
          type="button"
          className="mt-5 rounded-full px-5 py-2.5 font-medium"
          style={buttonStyle ?? { background: colors.primary, color: colors.onPrimary }}
          onClick={() => shareGift(site)}
        >
          {t("body.share")}
        </button>
      ) : null}
    </footer>
  );
}

/** "Mia, Leo and Priya" (a long list ends with "and 9 more"). */
export function listNames(names: string[], max = 8) {
  if (names.length <= 1) return names.join("");
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} ${t("body.andMore", { n: rest })}`;
  return `${shown.slice(0, -1).join(", ")} ${t("body.and")} ${shown[shown.length - 1]}`;
}

/** First letter of a name, for monograms and stamps. */
export function initial(name: string) {
  return (name.trim()[0] ?? "♡").toUpperCase();
}

/** Root wrapper every body uses: its colors as CSS variables, the burst host, the body font. */
export function BodyRoot({
  body,
  className,
  style,
  children,
}: {
  body: ReturnType<typeof useBody>;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { colors, fonts } = body;
  return (
    <div
      ref={body.hostRef}
      data-play-host
      className={`body-root relative min-h-screen overflow-x-clip ${className}`}
      style={
        {
          "--b-bg": colors.bg,
          "--b-primary": colors.primary,
          "--b-accent": colors.accent,
          "--b-ink": colors.ink,
          "--b-surface": colors.surface,
          "--b-heading": fonts.heading,
          background: colors.bg,
          color: colors.ink,
          fontFamily: fonts.body,
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
