import { useEffect, useMemo, useRef, useState } from "react";
import { manilaMidnight } from "@/lib/giftPieces";
import {
  FONT_PAIRINGS,
  backgroundCss,
  defaultTitles,
  resolvePalette,
  signedMediaUrl,
  toEmbedUrl,
  type CalendarEntry,
  type Contribution,
  type ViewContribution,
  type CustomText,
  type GiftSite,
  type SiteModule,
} from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import { readableInk, readableOn, surfaceColor, surfaceBorder } from "@/lib/palettes";
import Bo from "@/components/Bo";
import { GiftTree } from "@/components/GiftTree";

function useMediaUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    signedMediaUrl(path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);
  return url;
}

function PhotoCard({ item, accent }: { item: Contribution; accent: string }) {
  const url = useMediaUrl(item.media_url);
  return (
    <figure className="rounded-2xl bg-[var(--gift-surface)] p-3 shadow-sm ring-1 ring-black/5">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-black/5">
        {url ? (
          <img src={url} alt={item.text_content ?? "Contributed photo"} className="size-full object-cover" />
        ) : null}
      </div>
      <figcaption className="pt-3 text-sm">
        {item.text_content ? <p className="leading-snug">{item.text_content}</p> : null}
        <p className="mt-1 text-xs opacity-70" style={{ color: accent }}>
          {item.author_name}
        </p>
      </figcaption>
    </figure>
  );
}

function VoiceCard({ item, accent }: { item: Contribution; accent: string }) {
  const url = useMediaUrl(item.media_url);
  return (
    <div className="rounded-2xl bg-[var(--gift-surface)] p-4 shadow-sm ring-1 ring-black/5">
      {item.text_content ? <p className="mb-2 text-sm leading-snug">{item.text_content}</p> : null}
      {url ? <audio controls src={url} className="w-full" /> : <p className="text-sm opacity-60">Loading audio…</p>}
      <p className="mt-2 text-sm" style={{ color: accent }}>
        {item.author_name}
      </p>
    </div>
  );
}

function Countdown({ date, accent, heading }: { date: string; accent: string; heading: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = manilaMidnight(date);
  const diff = target - now;
  const past = diff <= 0;
  const s = Math.max(0, Math.floor(diff / 1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  return (
    <div
      className="rounded-3xl px-6 py-8 text-center shadow-sm ring-1 ring-black/5"
      style={{ backgroundColor: "var(--gift-surface)" }}
    >
      {past ? (
        <p className="text-2xl" style={{ color: accent }}>
          The day is here 🎉
        </p>
      ) : (
        <>
          <p className="text-4xl font-semibold" style={{ color: accent }}>
            {days}
          </p>
          <p className="mt-1 text-sm tracking-[0.18em] uppercase opacity-70">
            {days === 1 ? "day" : "days"} until {heading}
          </p>
          <p className="mt-3 font-mono text-sm opacity-70" suppressHydrationWarning>
            {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:
            {String(secs).padStart(2, "0")}
          </p>
        </>
      )}
    </div>
  );
}

function CalendarEntryBody({ entry, accent }: { entry: CalendarEntry; accent: string }) {
  const url = useMediaUrl(entry.media_url);
  const embed = toEmbedUrl(entry.external_link ?? "");
  return (
    <div className="space-y-3">
      {entry.type === "photo" && url ? (
        <img src={url} alt="" className="w-full rounded-xl object-cover" />
      ) : null}
      {entry.type === "song" ? (
        embed ? (
          <iframe
            src={embed}
            title="Surprise song"
            loading="lazy"
            allow="encrypted-media; clipboard-write; picture-in-picture"
            className="h-[152px] w-full rounded-xl border-0"
          />
        ) : entry.external_link ? (
          <a href={entry.external_link} target="_blank" rel="noreferrer" className="underline" style={{ color: accent }}>
            Listen
          </a>
        ) : null
      ) : null}
      {entry.text_content ? (
        <p className="leading-relaxed whitespace-pre-line">{entry.text_content}</p>
      ) : null}
    </div>
  );
}

function CalendarGrid({
  entries,
  locked,
  palette,
  headingFont,
}: {
  entries: CalendarEntry[];
  locked: boolean;
  palette: Palette;
  headingFont: string;
}) {
  const accentText = readableOn(palette.background, palette.accent);
  const [open, setOpen] = useState<CalendarEntry | null>(null);

  const days = useMemo(() => {
    if (entries.length === 0) return [];
    const dates = entries.map((e) => new Date(`${e.entry_date}T00:00:00`).getTime());
    const start = new Date(Math.min(...dates));
    const end = new Date(Math.max(...dates));
    const out: { date: string; entry: CalendarEntry | undefined }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10);
      out.push({ date: iso, entry: entries.find((e) => e.entry_date === iso) });
    }
    return out;
  }, [entries]);

  const today = new Date().toISOString().slice(0, 10);

  if (days.length === 0) {
    return <p className="text-sm opacity-60">No surprises added yet.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map(({ date, entry }) => {
          const sealed = locked && date > today;
          const has = !!entry && !sealed;
          return (
            <button
              key={date}
              type="button"
              disabled={!has}
              onClick={() => entry && setOpen(entry)}
              className="aspect-square rounded-xl text-sm font-medium transition-transform disabled:cursor-default"
              style={{
                backgroundColor: has ? palette.accent : "var(--gift-surface)",
                color: has ? readableInk(palette.accent) : "inherit",
                opacity: entry || sealed ? 1 : 0.5,
              }}
            >
              <span>{Number(date.slice(8, 10))}</span>
              {sealed ? <span className="block text-[10px]">🔒</span> : null}
            </button>
          );
        })}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-5"
          onClick={() => setOpen(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-xl"
            style={{ backgroundColor: palette.background, color: readableInk(palette.background) }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xl" style={{ fontFamily: headingFont, color: accentText }}>
              {new Date(`${open.entry_date}T00:00:00`).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="mt-4">
              <CalendarEntryBody entry={open} accent={accentText} />
            </div>
            <button
              onClick={() => setOpen(null)}
              className="mt-6 w-full rounded-full px-5 py-2.5 text-sm font-medium"
              style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SampleNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-xs opacity-50 italic">{children}</p>;
}

function SealedLetter({ item, palette }: { item: ViewContribution; palette: Palette }) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl bg-[var(--gift-surface)] p-5 shadow-sm ring-1 ring-black/5"
      style={{ borderColor: "var(--gift-border)" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-12 w-16 shrink-0 place-items-center rounded-md"
          style={{ backgroundColor: `${palette.accent}26`, border: `1px solid ${palette.accent}55` }}
        >
          <span
            className="size-4 rounded-full"
            style={{ backgroundColor: palette.accent }}
            aria-hidden
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">From {item.author_name}</p>
          <p className="text-xs opacity-70">Sealed until it's opened</p>
        </div>
      </div>
    </article>
  );
}

function SealedPhoto({ item, palette }: { item: ViewContribution; palette: Palette }) {
  return (
    <figure className="rounded-2xl bg-[var(--gift-surface)] p-3 shadow-sm ring-1 ring-black/5">
      <div
        className="grid aspect-square w-full place-items-center rounded-xl"
        style={{
          background: `repeating-linear-gradient(135deg, ${palette.accent}22 0 12px, ${palette.accent}12 12px 24px)`,
          filter: "blur(1px)",
        }}
      >
        <span className="text-xl" aria-hidden>
          🔒
        </span>
      </div>
      <figcaption className="pt-3 text-xs opacity-70">{item.author_name}</figcaption>
    </figure>
  );
}

function SealedMedia({
  item,
  palette,
  recipient,
}: {
  item: ViewContribution;
  palette: Palette;
  recipient: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-[var(--gift-surface)] p-4 shadow-sm ring-1 ring-black/5">
      <span
        className="grid size-12 shrink-0 place-items-center rounded-xl text-lg"
        style={{ backgroundColor: `${palette.accent}26` }}
        aria-hidden
      >
        🔒
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.author_name}</span>
        <span className="block text-xs opacity-70">Sealed until {recipient} opens it</span>
      </span>
    </div>
  );
}

type Props = {
  site: GiftSite;
  theme: Theme | null;
  modules: SiteModule[];
  contributions: ViewContribution[];
  calendarEntries?: CalendarEntry[];
  showShare?: boolean;
  /** Fill empty sections with sample content (editor preview). */
  sample?: boolean;
  /** Makes text elements clickable so the editor can focus the matching field. */
  onEditField?: (field: keyof CustomText) => void;
  highlightField?: keyof CustomText | null;
  /** Shows a "Replay intro" link in the footer (published gift page). */
  onReplayIntro?: () => void;
};

export function GiftSiteView({
  site,
  theme,
  modules,
  contributions,
  calendarEntries = [],
  showShare,
  sample,
  onEditField,
  highlightField,
  onReplayIntro,
}: Props) {
  const palette = resolvePalette(theme, site.custom_colors);
  // Small text always uses a legible colour; the accent is only kept when it passes contrast.
  const accentText = readableOn(palette.background, palette.accent);
  const accentDeco = readableOn(palette.background, palette.accent, 3);

  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
  const text: CustomText = site.custom_text ?? {};
  const titles = defaultTitles(text);
  const enabled = new Set(modules.filter((m) => m.enabled).map((m) => m.module_type));
  const byType = (type: string) => contributions.filter((c) => c.module_type === type);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightField || !rootRef.current) return;
    const el = rootRef.current.querySelector(`[data-field="${highlightField}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightField]);

  function fp(field: keyof CustomText, extra = "") {
    if (!onEditField) return { className: extra };
    return {
      "data-field": field,
      "data-active": highlightField === field ? "true" : "false",
      title: "Click to edit",
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditField(field);
      },
      className: `editable-field ${extra}`.trim(),
    };
  }

  const letters = byType("letters");
  const photos = byType("photobooth");
  const songs = byType("songs");
  const words = byType("wordcloud");
  const voices = byType("voice");
  const tree = byType("tree");

  const cloud = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of words) {
      for (const raw of (w.text_content ?? "").split(/[,\n]/)) {
        const term = raw.trim();
        if (!term) continue;
        const key = term.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()].map(([word, count]) => ({
      word,
      size: 1 + (count / max) * 1.8,
    }));
  }, [words]);

  const sectionTitle = "text-2xl font-semibold";
  const recipient = text.recipient_name?.trim();
  const sampleName = recipient || "Maya";

  /** Wraps the visitor's own contribution with a soft outline and a "Yours" tag. */
  function Mine({ item, children }: { item: ViewContribution; children: React.ReactNode }) {
    if (!item.mine) return <>{children}</>;
    return (
      <div
        data-mine="true"
        className="relative rounded-2xl"
        style={{ outline: `2px solid ${palette.accent}`, outlineOffset: 3 }}
      >
        <span
          className="absolute -top-2 right-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}
        >
          Yours
        </span>
        {children}
      </div>
    );
  }

  function share() {
    const url = window.location.href;
    if (navigator.share) {
      void navigator.share({ title: site.title, url });
    } else {
      void navigator.clipboard.writeText(url);
    }
  }

  const hasContent =
    contributions.length > 0 ||
    (enabled.has("countdown") && site.countdown_date) ||
    (enabled.has("calendar") && calendarEntries.length > 0) ||
    (enabled.has("tree") && tree.length > 0);

  const sampleCalendar: CalendarEntry[] = useMemo(() => {
    const base = new Date();
    return [0, 2, 5].map((offset, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + offset);
      return {
        id: `sample-${i}`,
        site_id: site.id,
        entry_date: d.toISOString().slice(0, 10),
        type: "message" as const,
        text_content: "A little surprise for today.",
        media_url: null,
        external_link: null,
      };
    });
  }, [site.id]);

  return (
    <div
      ref={rootRef}
      style={
        {
          ...backgroundCss(site.background_style ?? "paper", palette),
          color: readableInk(palette.background),
          fontFamily: fonts.body,
          "--gift-surface": surfaceColor(palette.background),
          "--gift-border": surfaceBorder(palette.background),
        } as React.CSSProperties
      }
      className="min-h-screen"
    >
      <div className="mx-auto max-w-3xl px-5 py-14">
        <header className="text-center">
          <p className="text-xs tracking-[0.22em] uppercase" style={{ color: accentText }}>
            {theme?.category ?? "A gift"}
          </p>
          <h1
            {...fp("heading", "mt-3 text-[clamp(2rem,6vw,3.4rem)] leading-tight font-semibold text-balance")}
            style={{ fontFamily: fonts.heading }}
          >
            {text.heading || (sample ? <span className="opacity-40">{titles.heading}</span> : site.title)}
          </h1>
          <p {...fp("recipient_name", "mt-2 text-lg")} style={{ color: accentText }}>
            {recipient ? (
              `for ${recipient}`
            ) : sample ? (
              <span className="opacity-40">for {sampleName}</span>
            ) : null}
          </p>
          {text.intro_message || sample ? (
            <p {...fp("intro_message", "mx-auto mt-5 max-w-[46ch] leading-relaxed opacity-80 text-pretty")}>
              {text.intro_message || (
                <span className="opacity-50">
                  Everyone who loves you put something in here. Take your time.
                </span>
              )}
            </p>
          ) : null}
          {sample && contributions.length === 0 ? (
            <SampleNote>Sample, replaced when friends add theirs</SampleNote>
          ) : null}
        </header>

        {enabled.has("countdown") && (site.countdown_date || sample) ? (
          <section className="mt-12">
            <Countdown
              date={site.countdown_date ?? new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)}
              accent={accentText}
              heading={text.countdown_title || titles.countdown_title}
            />
          </section>
        ) : null}

        {enabled.has("calendar") && (calendarEntries.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("calendar_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.calendar_title || titles.calendar_title}
            </h2>
            <div className="mt-5">
              <CalendarGrid
                entries={calendarEntries.length > 0 ? calendarEntries : sampleCalendar}
                locked={site.calendar_locked}
                palette={palette}
                headingFont={fonts.heading}
              />
            </div>
          </section>
        )}

        {enabled.has("tree") && (tree.length > 0 || sample) ? (
          <section className="mt-14">
            <h2
              {...fp("tree_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.tree_title || titles.tree_title}
            </h2>
            <div className="mt-5">
              <GiftTree
                contributions={tree}
                palette={palette}
                revealDate={site.tree_reveal_date}
                sample={sample === true}
              />
            </div>
            {tree.length === 0 && sample ? <SampleNote>Sample, replaced when friends add theirs</SampleNote> : null}
          </section>
        ) : null}

        {enabled.has("letters") && (letters.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("letters_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.letters_title || titles.letters_title}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {letters.length > 0
                ? letters.map((item) =>
                    item.sealed ? (
                      <SealedLetter key={item.id} item={item} palette={palette} />
                    ) : (
                      <Mine key={item.id} item={item}>
                        <article className="rounded-2xl bg-[var(--gift-surface)] p-5 shadow-sm ring-1 ring-black/5">
                          <p className="leading-relaxed whitespace-pre-line">{item.text_content}</p>
                          <p className="mt-3 text-sm" style={{ color: accentText }}>
                            {item.author_name}
                          </p>
                        </article>
                      </Mine>
                    ),
                  )
                : [
                    { t: `So lucky to know you, ${sampleName}. Love, Sam`, a: "Sam" },
                    { t: "You make every room warmer. Can't wait to celebrate.", a: "Alex" },
                  ].map((s) => (
                    <article
                      key={s.a}
                      className="rounded-2xl bg-[var(--gift-surface)] p-5 shadow-sm ring-1 ring-black/5 opacity-80"
                    >
                      <p className="leading-relaxed">{s.t}</p>
                      <p className="mt-3 text-sm" style={{ color: accentText }}>
                        {s.a}
                      </p>
                    </article>
                  ))}
            </div>
            {letters.length === 0 && sample ? (
              <SampleNote>Sample, replaced when friends add theirs</SampleNote>
            ) : null}
          </section>
        )}

        {enabled.has("photobooth") && (photos.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("photobooth_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.photobooth_title || titles.photobooth_title}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.length > 0
                ? photos.map((item) =>
                    item.sealed ? (
                      <SealedPhoto key={item.id} item={item} palette={palette} />
                    ) : (
                      <Mine key={item.id} item={item}>
                        <PhotoCard item={item} accent={accentText} />
                      </Mine>
                    ),
                  )
                : [1, 2, 3].map((i) => (
                    <figure
                      key={i}
                      className="rounded-2xl bg-[var(--gift-surface)] p-3 opacity-80 shadow-sm ring-1 ring-black/5"
                    >
                      <div className="grid aspect-square w-full place-items-center rounded-xl bg-black/5 text-2xl opacity-50">
                        ✦
                      </div>
                      <figcaption className="pt-3 text-xs opacity-70">A photo of us</figcaption>
                    </figure>
                  ))}
            </div>
            {photos.length === 0 && sample ? (
              <SampleNote>Sample, replaced when friends add theirs</SampleNote>
            ) : null}
          </section>
        )}

        {enabled.has("wordcloud") && (cloud.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("wordcloud_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.wordcloud_title || titles.wordcloud_title}
            </h2>
            <div className="mt-5 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-2 rounded-3xl bg-[var(--gift-surface)] px-6 py-8">
              {(cloud.length > 0
                ? cloud
                : [
                    { word: "kind", size: 2.4 },
                    { word: "funny", size: 1.6 },
                    { word: "brave", size: 1.2 },
                    { word: "warm", size: 2 },
                    { word: "loyal", size: 1.4 },
                  ]
              ).map(({ word, size }, i) => (
                <span
                  key={word}
                  style={{
                    fontSize: `${size}rem`,
                    fontFamily: fonts.heading,
                    color: i % 3 === 0 ? accentDeco : readableInk(palette.background),
                    opacity: 0.6 + size / 6,
                  }}
                >
                  {word}
                </span>
              ))}
              {words
                .filter((w) => w.sealed)
                .map((w, i) => (
                  <span
                    key={w.id}
                    title={`${w.author_name}'s words are sealed`}
                    className="inline-block rounded-full"
                    style={{
                      width: 54 + ((i * 17) % 40),
                      height: 16 + ((i * 7) % 10),
                      backgroundColor: `${palette.accent}44`,
                      filter: "blur(3px)",
                    }}
                  />
                ))}
            </div>
            {cloud.length === 0 && sample ? (
              <SampleNote>Sample, replaced when friends add theirs</SampleNote>
            ) : null}
          </section>
        )}

        {enabled.has("voice") && (voices.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("voice_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.voice_title || titles.voice_title}
            </h2>
            <div className="mt-5 space-y-4">
              {voices.length > 0 ? (
                voices.map((item) =>
                  item.sealed ? (
                    <SealedMedia key={item.id} item={item} palette={palette} recipient={sampleName} />
                  ) : (
                    <Mine key={item.id} item={item}>
                      <VoiceCard item={item} accent={accentText} />
                    </Mine>
                  ),
                )
              ) : (
                <div className="flex items-center gap-3 rounded-2xl bg-[var(--gift-surface)] p-4 opacity-80 shadow-sm ring-1 ring-black/5">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-full text-sm"
                    style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}
                  >
                    ▶
                  </span>
                  <span className="flex h-8 flex-1 items-end gap-1">
                    {[6, 14, 9, 20, 12, 24, 10, 16, 8, 18, 11, 7].map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-full"
                        style={{ height: h, backgroundColor: `${palette.accent}66` }}
                      />
                    ))}
                  </span>
                  <span className="text-xs opacity-70">Sam</span>
                </div>
              )}
            </div>
            {voices.length === 0 && sample ? (
              <SampleNote>Sample, replaced when friends add theirs</SampleNote>
            ) : null}
          </section>
        )}

        {enabled.has("songs") && (songs.length > 0 || sample) && (
          <section className="mt-14">
            <h2
              {...fp("songs_title", sectionTitle)}
              style={{ fontFamily: fonts.heading, color: accentText }}
            >
              {text.songs_title || titles.songs_title}
            </h2>
            <div className="mt-5 space-y-4">
              {songs.length > 0 ? (
                songs.map((item) => {
                  if (item.sealed)
                    return (
                      <SealedMedia key={item.id} item={item} palette={palette} recipient={sampleName} />
                    );
                  const embed = toEmbedUrl(item.external_link ?? "");
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-[var(--gift-surface)] p-4 shadow-sm ring-1 ring-black/5"
                    >
                      {item.text_content ? (
                        <p className="mb-3 leading-snug">{item.text_content}</p>
                      ) : null}
                      {embed ? (
                        <iframe
                          src={embed}
                          title={`Song from ${item.author_name}`}
                          loading="lazy"
                          allow="encrypted-media; clipboard-write; picture-in-picture"
                          className="h-[152px] w-full rounded-xl border-0"
                        />
                      ) : (
                        <a
                          href={item.external_link ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                          style={{ color: accentText }}
                        >
                          Listen to this song
                        </a>
                      )}
                      <p className="mt-3 text-sm" style={{ color: accentText }}>
                        {item.author_name}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-4 rounded-2xl bg-[var(--gift-surface)] p-4 opacity-80 shadow-sm ring-1 ring-black/5">
                  <span
                    className="grid size-14 shrink-0 place-items-center rounded-xl text-xl"
                    style={{ backgroundColor: `${palette.accent}33` }}
                  >
                    ♫
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">Our song</span>
                    <span className="block text-xs opacity-70">Added by Sam</span>
                  </span>
                  <span
                    className="grid size-10 place-items-center rounded-full text-sm"
                    style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}
                  >
                    ▶
                  </span>
                </div>
              )}
            </div>
            {songs.length === 0 && sample ? (
              <SampleNote>Sample, replaced when friends add theirs</SampleNote>
            ) : null}
          </section>
        )}

        {!hasContent && !sample && (
          <p className="mt-14 text-center opacity-60">
            Contributions will appear here once they're approved.
          </p>
        )}

        <footer className="mt-16 border-t pt-8 text-center" style={{ borderColor: `${palette.accent}33` }}>
          {text.footer_note || sample ? (
            <p {...fp("footer_note", "mb-3 opacity-80")}>
              {text.footer_note || (
                <span className="opacity-50">With love, from all of us</span>
              )}
            </p>
          ) : null}
          <div className="flex items-center justify-center gap-2">
            <Bo pose="idle" size={32} title="Bo" />
            <p className="text-sm">Made with Just Because</p>
          </div>
          <p className="mt-1 text-xs opacity-70">Tag us and use #justbecause</p>
          {onReplayIntro ? (
            <button
              type="button"
              onClick={onReplayIntro}
              className="mt-4 block w-full text-xs underline"
              style={{ color: accentText }}
            >
              Replay intro
            </button>
          ) : null}
          {showShare ? (
            <button
              onClick={share}
              className="mt-4 rounded-full px-5 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: palette.accent,
                color: readableInk(palette.accent),
              }}
            >
              Share this page
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
