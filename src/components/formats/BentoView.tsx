import { giftVoice } from "@/lib/giftVoice";
import { photoProps } from "@/lib/media";
import { shareGift } from "@/lib/track";
import { localDate } from "@/lib/time";
import { useMemo, useState } from "react";
import { Theme3D } from "@/components/Theme3D";
import { SampleText } from "@/components/SampleMark";
import { themeKindOf, giftHeading } from "@/lib/themeKind";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  ChevronRight,
  Clapperboard,
  Hourglass,
  Lock,
  Mail,
  MailOpen,
  MapPin,
  Mic,
  Music2,
  PenLine,
  Play,
  Share2,
  Sparkles,
  Ticket,
  Trophy,
  Type,
  CircleHelp,
  type LucideIcon,
} from "lucide-react";
import { FONT_PAIRINGS } from "@/lib/gift";
import { readableInk, surfaceColor } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import { BENTO_COPY } from "@/copy/strings";
import {
  giftToday,
  meshGradient,
  useCountdown,
  useMediaUrl,
  usePieces,
  useReducedMotion,
  type Piece,
} from "@/lib/giftPieces";
import type { FormatViewProps } from "@/components/formats/FormatView";
import { PieceSheet, pieceLabel, seed } from "@/components/formats/PieceSheet";

/**
 * Bento Board: the gift as an organised board. A hero and a summary up top, then
 * one labelled section per kind of thing friends added, each with cards made for
 * what's in them (letters read like letters, coupons look like tickets, awards
 * are grouped with their votes). Video and quiz come in as `extras`, in the same
 * section style, so the page never changes look halfway down.
 */

type SectionKey =
  | "letters"
  | "photobooth"
  | "songs"
  | "voice"
  | "openwhen"
  | "superlatives"
  | "map"
  | "coupons"
  | "capsule"
  | "doodle"
  | "calendar"
  | "tree";

const ORDER: SectionKey[] = [
  "letters",
  "photobooth",
  "songs",
  "voice",
  "openwhen",
  "superlatives",
  "map",
  "coupons",
  "capsule",
  "doodle",
  "calendar",
  "tree",
];

const ICONS: Record<SectionKey | "words" | "quiz" | "video", LucideIcon> = {
  letters: Mail,
  photobooth: Camera,
  songs: Music2,
  voice: Mic,
  openwhen: MailOpen,
  superlatives: Trophy,
  map: MapPin,
  coupons: Ticket,
  capsule: Hourglass,
  doodle: PenLine,
  calendar: CalendarDays,
  tree: Sparkles,
  words: Type,
  quiz: CircleHelp,
  video: Clapperboard,
};

/** Sample pieces carry no section; place them by kind. */
const BY_KIND: Record<Piece["kind"], SectionKey | null> = {
  letter: "letters",
  photo: "photobooth",
  song: "songs",
  voice: "voice",
  ornament: "tree",
  calendar: "calendar",
  word: null,
};

function sectionOf(p: Piece): SectionKey | null {
  const s = p.section as SectionKey | undefined;
  return s && ORDER.includes(s) ? s : BY_KIND[p.kind];
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** The note's own words, without the label line `sectionAsText` puts in front. */
function bodyOf(p: Piece): string {
  const text = p.text ?? "";
  if (!p.data) return text;
  const parts = text.split("\n\n");
  return parts.length > 1 ? parts.slice(1).join("\n\n").trim() : "";
}

const ids = (key: string) => `bento-${key}`;

function scrollToSection(key: string, reduce: boolean) {
  const el =
    document.getElementById(ids(key)) ??
    document.querySelector(`.bento-extras [data-section="${key}"]`);
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

/* ---------------- small parts ---------------- */

function Avatar({ name, palette, size = 28 }: { name: string; palette: Palette; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className="bento-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `${palette.accent}${seed(name) > 0.5 ? "1f" : "2e"}`,
        color: palette.accent,
      }}
    >
      {initials || "♥"}
    </span>
  );
}

function Byline({
  who,
  palette,
  extra,
}: {
  who: string;
  palette: Palette;
  extra?: React.ReactNode;
}) {
  if (!who) return extra ? <span className="bento-byline">{extra}</span> : null;
  return (
    <span className="bento-byline">
      <Avatar name={who} palette={palette} />
      <span className="truncate font-medium">{who}</span>
      {extra ? <span className="ml-auto shrink-0">{extra}</span> : null}
    </span>
  );
}

function Label({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="bento-label">
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

function Tile({
  className = "",
  style,
  onOpen,
  label,
  children,
  index,
  reduce,
}: {
  className?: string;
  style?: React.CSSProperties;
  onOpen?: (() => void) | undefined;
  label: string;
  children: React.ReactNode;
  index: number;
  reduce: boolean;
}) {
  const delay = reduce ? undefined : `${Math.min(index, 10) * 45}ms`;
  if (!onOpen)
    return (
      <div
        className={`bento-tile ${className}`}
        style={{ ...style, animationDelay: delay }}
        aria-label={label}
        role="group"
      >
        {children}
      </div>
    );
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={`bento-tile group ${className}`}
      style={{ ...style, animationDelay: delay }}
    >
      {children}
    </button>
  );
}

function Yours() {
  return <span className="bento-yours">Yours</span>;
}

/* ---------------- card faces ---------------- */

function SealedFace({ piece, name, palette }: { piece: Piece; name: string; palette: Palette }) {
  return (
    <span className="flex h-full flex-col">
      <Label icon={Lock}>{BENTO_COPY.onlyThem(name)}</Label>
      <span className="bento-sealed-mark" aria-hidden style={{ color: palette.accent }}>
        <Lock className="size-6" />
      </span>
      <Byline who={piece.author} palette={palette} />
    </span>
  );
}

function LetterFace({ piece, palette, label }: { piece: Piece; palette: Palette; label?: string }) {
  const text = label ? bodyOf(piece) : (piece.text ?? "");
  return (
    <span className="flex h-full flex-col">
      {label ? <Label icon={Hourglass}>{label}</Label> : null}
      <span className={`bento-letter-text ${label ? "mt-3" : ""}`}>{text}</span>
      <Byline
        who={piece.author}
        palette={palette}
        extra={
          <span className="bento-read" style={{ color: palette.accent }}>
            {BENTO_COPY.read} <ArrowRight className="size-3.5" />
          </span>
        }
      />
    </span>
  );
}

function PhotoFace({
  piece,
  palette,
  contain,
}: {
  piece: Piece;
  palette: Palette;
  contain?: boolean;
}) {
  const url = useMediaUrl(piece.media);
  return (
    <>
      {url ? (
        <img
          data-framed={piece.framed || undefined}
          {...photoProps(url, piece.thumb, "(max-width: 640px) 50vw, 420px")}
          alt={piece.text ?? `Photo from ${piece.author}`}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 size-full transition-transform duration-500 group-hover:scale-[1.03] ${
            contain || piece.framed ? "object-contain p-3" : "object-cover"
          }`}
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
        {piece.text ? <span className="line-clamp-2 font-medium">{piece.text}</span> : null}
        <span className="opacity-80">{piece.author}</span>
      </span>
    </>
  );
}

function SongFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  const ink = readableInk(palette.background);
  return (
    <span className="flex h-full items-center gap-4">
      <span
        className="bento-vinyl"
        style={{ "--vinyl": palette.accent } as React.CSSProperties}
        aria-hidden
      >
        <Music2 className="size-5" style={{ color: readableInk(palette.accent) }} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <Label>{BENTO_COPY.songPick}</Label>
        <span className="mt-1.5 line-clamp-2 block text-[15px] leading-snug font-medium">
          {piece.text || "Press play on this one."}
        </span>
        <span className="mt-1 block truncate text-[13px] opacity-65">{piece.author}</span>
      </span>
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full"
        style={{ background: ink, color: palette.background }}
        aria-hidden
      >
        <Play className="size-4 translate-x-px" />
      </span>
    </span>
  );
}

function VoiceFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  return (
    <span className="flex h-full flex-col">
      <Label icon={Mic}>{BENTO_COPY.voiceNote}</Label>
      <span className="bento-wave" aria-hidden>
        {Array.from({ length: 24 }, (_, i) => (
          <i
            key={i}
            style={{
              height: `${18 + Math.abs(Math.sin(i * 1.7 + seed(piece.id) * 9)) * 74}%`,
              background: palette.accent,
            }}
          />
        ))}
      </span>
      <Byline
        who={piece.author}
        palette={palette}
        extra={
          <span
            className="grid size-8 place-items-center rounded-full"
            style={{ background: palette.accent, color: readableInk(palette.accent) }}
          >
            <Play className="size-3.5 translate-x-px" />
          </span>
        }
      />
    </span>
  );
}

function OpenWhenFace({
  piece,
  palette,
  headingFont,
}: {
  piece: Piece;
  palette: Palette;
  headingFont: string;
}) {
  const when =
    str(piece.data?.["when"]) || (piece.text ?? "").split("\n")[0]!.replace(/^open when\s*/i, "");
  return (
    <span className="bento-envelope flex h-full flex-col">
      <span
        className="bento-envelope-flap"
        aria-hidden
        style={{ background: `${palette.accent}1c` }}
      />
      <Label icon={MailOpen}>{BENTO_COPY.openWhen}</Label>
      <span
        className="mt-2 line-clamp-3 text-[19px] leading-tight font-semibold"
        style={{ fontFamily: headingFont }}
      >
        {when}
      </span>
      <Byline
        who={piece.author}
        palette={palette}
        extra={
          <span className="bento-read" style={{ color: palette.accent }}>
            {BENTO_COPY.open}
          </span>
        }
      />
    </span>
  );
}

function PlaceFace({
  piece,
  palette,
  headingFont,
}: {
  piece: Piece;
  palette: Palette;
  headingFont: string;
}) {
  const place = str(piece.data?.["place"]) || (piece.text ?? "").split("\n")[0]!;
  const memory = bodyOf(piece);
  return (
    <span className="flex h-full flex-col">
      <span className="flex items-center gap-2">
        <span
          className="bento-pin"
          style={{ background: palette.accent, color: readableInk(palette.accent) }}
          aria-hidden
        >
          <MapPin className="size-3.5" />
        </span>
        <span
          className="line-clamp-2 text-[17px] leading-tight font-semibold"
          style={{ fontFamily: headingFont }}
        >
          {place}
        </span>
      </span>
      {memory ? (
        <span className="mt-3 line-clamp-3 text-[14px] leading-relaxed opacity-85">{memory}</span>
      ) : null}
      <Byline who={piece.author} palette={palette} />
    </span>
  );
}

function CouponFace({
  piece,
  palette,
  headingFont,
}: {
  piece: Piece;
  palette: Palette;
  headingFont: string;
}) {
  const title =
    str(piece.data?.["title"]) || (piece.text ?? "").replace(/^coupon:\s*/i, "").split("\n")[0]!;
  const fine = str(piece.data?.["fine_print"]);
  return (
    <span
      className="bento-ticket flex h-full flex-col"
      style={{ "--ticket": palette.accent } as React.CSSProperties}
    >
      <span className="flex items-center justify-between">
        <Label icon={Ticket}>{BENTO_COPY.coupon}</Label>
        <span className="bento-ticket-no" aria-hidden>
          No. {String(Math.floor(seed(piece.id) * 900) + 100)}
        </span>
      </span>
      <span
        className="mt-2 line-clamp-2 text-[19px] leading-tight font-semibold"
        style={{ fontFamily: headingFont, color: palette.accent }}
      >
        {title}
      </span>
      {fine ? (
        <span className="mt-1.5 line-clamp-2 text-[13px] leading-snug opacity-75">{fine}</span>
      ) : null}
      <Byline who={piece.author} palette={palette} />
    </span>
  );
}

function CapsuleFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  const locked = piece.data?.["locked"] === true;
  if (!locked) return <LetterFace piece={piece} palette={palette} label={BENTO_COPY.capsuleFrom} />;
  const at = str(piece.data?.["unlock_at"]);
  const when = at
    ? new Date(at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  return (
    <span className="flex h-full flex-col">
      <Label icon={Hourglass}>{BENTO_COPY.short.capsule}</Label>
      <span className="bento-sealed-mark" aria-hidden style={{ color: palette.accent }}>
        <Lock className="size-6" />
      </span>
      <span className="text-[15px] font-semibold" suppressHydrationWarning>
        {BENTO_COPY.capsuleOpens} {when}
      </span>
      <Byline who={piece.author} palette={palette} />
    </span>
  );
}

function CalendarFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  const locked = !!piece.date && piece.date > giftToday();
  const d = piece.date ? localDate(piece.date) : null;
  return (
    <span className="flex h-full flex-col">
      <Label icon={CalendarDays}>
        {d ? d.toLocaleDateString(undefined, { month: "long" }) : "Surprise"}
      </Label>
      <span
        className="my-auto text-5xl leading-none font-semibold tabular-nums"
        style={{ color: palette.accent }}
      >
        {d ? d.toLocaleDateString(undefined, { day: "numeric" }) : "?"}
      </span>
      <span className="flex items-center gap-1.5 text-[13px] opacity-75">
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

function OrnamentFace({ piece, palette }: { piece: Piece; palette: Palette }) {
  return (
    <span className="flex h-full flex-col">
      <Sparkles className="size-5" style={{ color: palette.accent }} aria-hidden />
      <span className="mt-2 line-clamp-4 text-[14px] leading-relaxed">{piece.text}</span>
      <Byline who={piece.author} palette={palette} />
    </span>
  );
}

/* ---------------- awards ---------------- */

type Award = {
  key: string;
  award: string;
  voters: string[];
  reasons: { who: string; text: string }[];
  mine: boolean;
};

function groupAwards(pieces: Piece[]): Award[] {
  const groups = new Map<string, Award>();
  for (const p of pieces) {
    const award = str(p.data?.["award"]) || (p.text ?? "").split("\n")[0]!.trim();
    if (!award) continue;
    const key = award
      .toLowerCase()
      .replace(/[^\p{L}\p{N} ]/gu, "")
      .replace(/\s+/g, " ");
    const g = groups.get(key) ?? { key, award, voters: [], reasons: [], mine: false };
    if (p.author && !g.voters.includes(p.author)) g.voters.push(p.author);
    const reason = bodyOf(p);
    if (reason) g.reasons.push({ who: p.author, text: reason });
    g.mine ||= p.mine;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.voters.length - a.voters.length);
}

function AwardFace({
  award,
  palette,
  headingFont,
  rank,
}: {
  award: Award;
  palette: Palette;
  headingFont: string;
  rank: number;
}) {
  return (
    <span className="flex h-full flex-col">
      <span className="flex items-start justify-between gap-3">
        <span
          className="bento-medal"
          aria-hidden
          style={{
            background: rank === 0 ? palette.accent : `${palette.accent}26`,
            color: rank === 0 ? readableInk(palette.accent) : palette.accent,
          }}
        >
          <Trophy className="size-4" />
        </span>
        <span
          className="bento-pill"
          style={{ background: `${palette.accent}1a`, color: palette.accent }}
        >
          {BENTO_COPY.votes(award.voters.length)}
        </span>
      </span>
      <span
        className="mt-3 line-clamp-2 text-[19px] leading-tight font-semibold"
        style={{ fontFamily: headingFont }}
      >
        {award.award}
      </span>
      {award.reasons[0] ? (
        <span className="mt-2 line-clamp-2 text-[13.5px] leading-snug opacity-80">
          “{award.reasons[0].text}” <span className="opacity-70">({award.reasons[0].who})</span>
        </span>
      ) : null}
      <span className="bento-byline">
        <span className="flex -space-x-1.5">
          {award.voters.slice(0, 5).map((v) => (
            <Avatar key={v} name={v} palette={palette} size={24} />
          ))}
        </span>
        <span className="truncate text-[13px] opacity-70">{award.voters.join(", ")}</span>
      </span>
    </span>
  );
}

/* ---------------- the board ---------------- */

type Extras = { node: React.ReactNode; keys: ("quiz" | "video")[] } | null;

export function BentoView({
  theme,
  site,
  modules,
  contributions,
  calendarEntries,
  palette,
  sample,
  showShare,
  extras = null,
}: FormatViewProps & { extras?: Extras }) {
  const reduce = useReducedMotion();
  const data = usePieces({ site, modules, contributions, calendarEntries, sample });
  const voice = giftVoice(site.solo);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.playful;
  const cd = useCountdown(data.countdownDate);
  const [open, setOpen] = useState<Piece | null>(null);
  const ink = readableInk(palette.background);
  const heading = giftHeading(site.custom_text, theme, site.occasion);
  const intro =
    site.custom_text.intro_message?.trim() ||
    site.intro_text ||
    voice.intro(data.named ? data.name : "");
  const titles = data.titles as Record<string, string | undefined>;

  const sections = useMemo(() => {
    const by = new Map<SectionKey, Piece[]>();
    for (const p of data.notes) {
      const key = sectionOf(p);
      if (!key) continue;
      by.set(key, [...(by.get(key) ?? []), p]);
    }
    return ORDER.filter((k) => by.get(k)?.length).map((key) => ({ key, pieces: by.get(key)! }));
  }, [data.notes]);

  const summary = [
    ...sections.map((s) => ({
      key: s.key as string,
      label: BENTO_COPY.short[s.key],
      count: s.key === "superlatives" ? groupAwards(s.pieces).length : s.pieces.length,
      icon: ICONS[s.key],
    })),
    ...(data.words.length
      ? [
          {
            key: "words",
            label: BENTO_COPY.short.words,
            count: data.words.length,
            icon: ICONS.words,
          },
        ]
      : []),
    ...(extras?.keys ?? []).map((k) => ({
      key: k as string,
      label: BENTO_COPY.short[k],
      count: 0,
      icon: ICONS[k],
    })),
  ];

  const title = (key: string) =>
    titles[`${key === "words" ? "wordcloud" : key}_title`]?.trim() ||
    BENTO_COPY.short[key as keyof typeof BENTO_COPY.short];
  const pieceCount = data.notes.length + (data.words.length ? 1 : 0);

  return (
    <div
      className="bento-root relative min-h-screen"
      data-play-host
      style={
        {
          background: meshGradient(palette.primary, palette.accent, palette.background),
          color: ink,
          fontFamily: fonts.body,
          "--tile": surfaceColor(palette.background),
          "--accent": palette.accent,
          "--ink": ink,
        } as React.CSSProperties
      }
    >
      <div className="bento-wrap">
        {/* Top: the hero, the countdown, who made it, and what's inside. */}
        <div className="bento-grid bento-top">
          <div
            className="bento-tile bento-hero"
            style={{
              background: `linear-gradient(145deg, ${palette.accent}, ${palette.primary})`,
              color: readableInk(palette.accent),
            }}
          >
            <span className="bento-orb" aria-hidden />
            {theme ? (
              <Theme3D
                kind={themeKindOf(theme)}
                palette={palette}
                className="!absolute top-2 right-2 h-[170px] w-[72%] @md:h-[220px] @md:w-[62%] @2xl:top-4 @2xl:right-4"
                interactive
                burstColors={[palette.accent, palette.primary, "#FFD166", "#FFFFFF"]}
              />
            ) : null}
            {theme ? <span aria-hidden className="block h-[150px] shrink-0 @md:h-[196px]" /> : null}
            <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80">
              A gift for <SampleText on={data.nameIsSample}>{data.name}</SampleText>
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
                onClick={() => shareGift(site)}
                className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur hover:bg-white/30"
              >
                <Share2 className="size-4" /> Share
              </button>
            ) : null}
          </div>

          {cd ? (
            <div className="bento-tile bento-stat">
              <Label>{cd.done ? BENTO_COPY.itsTheDay : BENTO_COPY.countdown}</Label>
              <p
                className="bento-stat-num tabular-nums"
                style={{ color: palette.accent, fontFamily: fonts.heading }}
              >
                {cd.done ? "Today" : cd.days}
              </p>
              <p className="text-[13px] opacity-70" suppressHydrationWarning>
                {cd.done
                  ? `Happy day${data.named ? `, ${data.name}` : ""}.`
                  : `${cd.days === 1 ? "day" : "days"} to go · ${String(cd.hours).padStart(2, "0")}:${String(cd.mins).padStart(2, "0")}:${String(cd.secs).padStart(2, "0")}`}
              </p>
            </div>
          ) : null}

          <div className={`bento-tile bento-stat ${cd ? "" : "bento-wide"}`}>
            <Label>{BENTO_COPY.madeBy}</Label>
            <p className="bento-stat-num" style={{ fontFamily: fonts.heading }}>
              {voice.solo ? "♥" : data.friends.length || (data.isSample ? 6 : 0)}
            </p>
            <p className="text-[13px] opacity-70">
              {voice.solo
                ? (data.friends[0] ?? "me")
                : data.friends.length === 1
                  ? "friend"
                  : "friends"}{" "}
              · {BENTO_COPY.pieces(pieceCount)}
            </p>
          </div>

          {summary.length ? (
            <nav className="bento-tile bento-wide bento-summary" aria-label={BENTO_COPY.inside}>
              <Label>{BENTO_COPY.inside}</Label>
              <ul className="bento-summary-list">
                {summary.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.key}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(s.key, reduce)}
                        className="bento-summary-row"
                      >
                        <span
                          className="bento-summary-icon"
                          style={{ background: `${palette.accent}1a`, color: palette.accent }}
                          aria-hidden
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="truncate">{s.label}</span>
                        {s.count ? (
                          <span className="ml-auto tabular-nums opacity-60">{s.count}</span>
                        ) : (
                          <span className="ml-auto" />
                        )}
                        <ChevronRight className="size-3.5 opacity-40" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}
        </div>

        {sections.length === 0 && !data.words.length ? (
          <div className="bento-grid mt-4">
            <div className="bento-tile bento-full grid min-h-[160px] place-items-center text-center">
              <p className="max-w-xs text-base opacity-80">{voice.empty("tiles")}</p>
            </div>
          </div>
        ) : null}

        {sections.map(({ key, pieces }) => {
          const Icon = ICONS[key];
          let index = 0;
          const awards = key === "superlatives" ? groupAwards(pieces) : [];
          const count = key === "superlatives" ? awards.length : pieces.length;
          const boxes =
            key === "superlatives"
              ? layout(
                  key,
                  awards.map(() => null),
                  !!awards[0]?.reasons.length,
                )
              : layout(key, pieces);
          return (
            <section
              key={key}
              id={ids(key)}
              className="bento-section"
              aria-labelledby={`${ids(key)}-h`}
            >
              <header className="bento-section-head">
                <span
                  className="bento-section-icon"
                  style={{ background: palette.accent, color: readableInk(palette.accent) }}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <h2 id={`${ids(key)}-h`} style={{ fontFamily: fonts.heading }}>
                  {title(key)}
                </h2>
                <span className="bento-count">{count}</span>
              </header>
              <div className={`bento-grid bento-grid-${key}`}>
                {key === "superlatives"
                  ? awards.map((a, n) => (
                      <Tile
                        key={a.key}
                        index={index++}
                        reduce={reduce}
                        label={`${a.award}, ${BENTO_COPY.votes(a.voters.length)}`}
                        className={`${sizeClass(key, boxes[n])} ${a.mine ? "bento-mine" : ""}`}
                        style={boxStyle(boxes[n])}
                        onOpen={() =>
                          setOpen({
                            id: `award-${a.key}`,
                            kind: "letter",
                            author: a.voters.join(", "),
                            text: [a.award, ...a.reasons.map((r) => `${r.who}: ${r.text}`)].join(
                              "\n\n",
                            ),
                            media: null,
                            link: null,
                            sealed: false,
                            mine: a.mine,
                          })
                        }
                      >
                        <AwardFace
                          award={a}
                          palette={palette}
                          headingFont={fonts.heading}
                          rank={n}
                        />
                        {a.mine ? <Yours /> : null}
                      </Tile>
                    ))
                  : pieces.map((p, n) => (
                      <Tile
                        key={p.id}
                        index={index++}
                        reduce={reduce}
                        label={pieceLabel(p)}
                        className={`${sizeClass(key, boxes[n])} ${p.mine ? "bento-mine" : ""}`}
                        style={boxStyle(boxes[n])}
                        onOpen={
                          p.sealed || (key === "capsule" && p.data?.["locked"] === true)
                            ? undefined
                            : () => setOpen(p)
                        }
                      >
                        {p.sealed ? (
                          <SealedFace piece={p} name={data.name} palette={palette} />
                        ) : (
                          <Face
                            sectionKey={key}
                            piece={p}
                            palette={palette}
                            headingFont={fonts.heading}
                          />
                        )}
                        {p.mine ? <Yours /> : null}
                      </Tile>
                    ))}
              </div>
            </section>
          );
        })}

        {data.words.length ? (
          <section
            id={ids("words")}
            className="bento-section"
            aria-labelledby={`${ids("words")}-h`}
          >
            <header className="bento-section-head">
              <span
                className="bento-section-icon"
                style={{ background: palette.accent, color: readableInk(palette.accent) }}
                aria-hidden
              >
                <Type className="size-4" />
              </span>
              <h2 id={`${ids("words")}-h`} style={{ fontFamily: fonts.heading }}>
                {title("words")}
              </h2>
              <span className="bento-count">{data.words.length}</span>
            </header>
            <div className="bento-tile bento-cloud">
              {data.words.map((w, n) => (
                <span
                  key={w.id}
                  className="font-semibold"
                  title={w.author}
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: `${1 + seed(w.id) * 1.3}rem`,
                    color: n % 3 === 0 ? palette.accent : undefined,
                    opacity: 0.62 + seed(w.id + "o") * 0.38,
                  }}
                >
                  {w.text}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {extras?.node ? <div className="bento-extras">{extras.node}</div> : null}

        {data.friends.length ? (
          <section className="bento-section">
            <div className="bento-tile bento-credits">
              <Label>{BENTO_COPY.withLove}</Label>
              <ul className="bento-credit-list">
                {data.friends.map((f) => (
                  <li key={f}>
                    <Avatar name={f} palette={palette} size={26} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {site.custom_text.footer_note ? (
                <p className="mt-4 text-sm opacity-70">{site.custom_text.footer_note}</p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
      {open ? (
        <PieceSheet piece={open} palette={palette} onClose={() => setOpen(null)} sound="lid" />
      ) : null}
    </div>
  );
}

/** A card's size: columns on laptops (of 4), columns on phones (of 2), and rows. */
type Box = { lg: number; sm: number; rows: number };

function baseBox(
  key: SectionKey,
  p: Piece | null,
  n: number,
  total: number,
  wideFirst = false,
): Box {
  const long = (p?.text?.length ?? 0) > 220;
  switch (key) {
    case "letters":
      return { lg: long || (n === 0 && total > 2) ? 2 : 1, sm: 2, rows: 1 };
    case "photobooth":
      return n === 0 && total > 2 ? { lg: 2, sm: 2, rows: 2 } : { lg: 1, sm: 1, rows: 1 };
    case "songs":
      return { lg: 2, sm: 2, rows: 1 };
    case "superlatives":
      return { lg: n === 0 && wideFirst ? 2 : 1, sm: 2, rows: 1 };
    case "map":
    case "coupons":
      return { lg: 1, sm: 2, rows: 1 };
    case "capsule":
      return p?.data?.["locked"] === true ? { lg: 1, sm: 1, rows: 1 } : { lg: 2, sm: 2, rows: 1 };
    default:
      return { lg: 1, sm: 1, rows: 1 };
  }
}

/**
 * Sizes for every card in a section, with the last row filled: if the cards
 * don't add up to whole rows, the last card stretches to close the gap.
 */
function layout(key: SectionKey, items: (Piece | null)[], wideFirst = false): Box[] {
  const boxes = items.map((p, n) => baseBox(key, p, n, items.length, wideFirst));
  // Photos: a lone last photo would stretch across the whole row, so widen the second one instead.
  if (
    key === "photobooth" &&
    boxes.length > 3 &&
    boxes.reduce((sum, b) => sum + b.lg * b.rows, 0) % 4 === 1
  )
    boxes[1]!.lg = 2;
  for (const [prop, cols] of [
    ["lg", 4],
    ["sm", 2],
  ] as const) {
    const cells = boxes.reduce((sum, b) => sum + b[prop] * b.rows, 0);
    const rest = cells % cols;
    if (!rest) continue;
    // The cards on the short last row share the whole row (2+2, 2+1+1) instead of one card stretching.
    let used = 0;
    let k = 0;
    for (let i = boxes.length - 1; i >= 0 && used < rest; i--) {
      if (boxes[i]!.rows > 1) break;
      used += boxes[i]![prop];
      k++;
    }
    if (used === rest && k > 0) {
      const tail = boxes.slice(-k);
      const each = Math.floor(cols / k);
      let extra = cols - each * k;
      for (const b of tail) b[prop] = each + (extra-- > 0 ? 1 : 0);
    } else {
      const last = boxes[boxes.length - 1];
      if (last && last.rows === 1) last[prop] = Math.min(cols, last[prop] + (cols - rest));
    }
  }
  return boxes;
}

const boxStyle = (b: Box | undefined) =>
  ({ "--lg": b?.lg ?? 1, "--sm": b?.sm ?? 1, "--rows": b?.rows ?? 1 }) as React.CSSProperties;

function sizeClass(key: SectionKey, b: Box | undefined): string {
  const photo = key === "photobooth" || key === "doodle";
  return [
    "bento-cell",
    photo ? "bento-photo" : "",
    key === "doodle" ? "bento-doodle" : "",
    photo && (b?.rows ?? 1) > 1 ? "bento-feature" : "",
    (b?.lg ?? 1) > 1 ? "is-wide" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function Face({
  sectionKey,
  piece,
  palette,
  headingFont,
}: {
  sectionKey: SectionKey;
  piece: Piece;
  palette: Palette;
  headingFont: string;
}) {
  switch (sectionKey) {
    case "photobooth":
      return <PhotoFace piece={piece} palette={palette} />;
    case "doodle":
      return <PhotoFace piece={piece} palette={palette} contain />;
    case "songs":
      return <SongFace piece={piece} palette={palette} />;
    case "voice":
      return <VoiceFace piece={piece} palette={palette} />;
    case "openwhen":
      return <OpenWhenFace piece={piece} palette={palette} headingFont={headingFont} />;
    case "map":
      return <PlaceFace piece={piece} palette={palette} headingFont={headingFont} />;
    case "coupons":
      return <CouponFace piece={piece} palette={palette} headingFont={headingFont} />;
    case "capsule":
      return <CapsuleFace piece={piece} palette={palette} />;
    case "calendar":
      return <CalendarFace piece={piece} palette={palette} />;
    case "tree":
      return <OrnamentFace piece={piece} palette={palette} />;
    default:
      return <LetterFace piece={piece} palette={palette} />;
  }
}
