/**
 * Comic Issue: the gift as a one-off comic book. A proper cover (masthead,
 * issue number, the gift's character on a burst, cover blurbs, barcode), then
 * pages of panels: letters as speech bubbles with real tails, photos with
 * caption boxes, songs on a tape, voice notes as transmissions. Pages turn
 * like paper (drag, swipe, arrows or the keyboard).
 *
 * Everything is sized with container queries, so it reads the same in a
 * phone preview on a laptop as on a real phone.
 */
import { shareGift } from "@/lib/track";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronLeft, ChevronRight, List, Repeat2, Share2, X } from "lucide-react";
import { giftMoment } from "@/lib/giftPieces";
import { countdownTarget, formatDay } from "@/lib/time";
import { NEW_SECTION_TYPES, isNewSection, sectionAsText } from "@/lib/sections";
import { signedMediaUrl, toEmbedUrl, type CalendarEntry, type GiftSite, type ModuleType, type SiteModule, type ViewContribution } from "@/lib/gift";
import { COMIC_CHAPTERS, comicSettingDefaults, normalizeComicSettings, orderedComicIds } from "@/lib/comic";
import { readableInk } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";
import type { ThemeKind } from "@/lib/themeKind";
import { castFor } from "@/themes/_shared/design";
import { Character } from "@/themes/_shared/cast/Character";
import { COMIC_COPY } from "@/copy/strings";

type Props = {
  site: GiftSite;
  modules: SiteModule[];
  contributions: ViewContribution[];
  calendarEntries?: CalendarEntry[];
  palette: Palette;
  showCover?: boolean;
  showShare?: boolean;
  onReplayCover?: () => void;
  onClose?: () => void;
  sample?: boolean;
  /** The occasion, for default cover words and the cover star. */
  kind?: string;
};

const SFX = ["POW!", "WOW!", "ZAP!", "BAM!", "AWW!", "YAY!", "WHOA!", "KAPOW!"];
const ease = [0.22, 1, 0.36, 1] as const;

function useMedia(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void signedMediaUrl(path).then((next) => alive && setUrl(next));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

/* ---------- small pieces ---------- */

function Portrait({ item, size = "md" }: { item: ViewContribution; size?: "sm" | "md" }) {
  const url = useMedia(item.sealed ? null : item.media_url && item.module_type === "photobooth" ? item.media_url : null);
  return (
    <span className={`cx-portrait cx-portrait-${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : <b>{item.author_name.trim().charAt(0).toUpperCase() || "?"}</b>}
    </span>
  );
}

/** A speech bubble with a tail that points down-left at the speaker. */
function Bubble({ children, tail = "left", thought = false }: { children: React.ReactNode; tail?: "left" | "right" | "none"; thought?: boolean }) {
  return (
    <div className={`cx-bubble ${thought ? "cx-thought" : ""} cx-tail-${tail}`}>
      <div className="cx-bubble-text">{children}</div>
      {tail !== "none" && !thought ? (
        <svg className="cx-tail" viewBox="0 0 30 24" aria-hidden="true">
          <path d="M3 0 L4 22 L22 0" />
          <rect x="4.5" y="-3" width="16" height="4.4" />
        </svg>
      ) : null}
      {thought ? (
        <span className="cx-thought-dots" aria-hidden="true">
          <i />
          <i />
        </span>
      ) : null}
    </div>
  );
}

function Caption({ children, tone = "yellow" }: { children: React.ReactNode; tone?: "yellow" | "white" | "ink" }) {
  return <p className={`cx-caption cx-caption-${tone}`}>{children}</p>;
}

function Mine({ show }: { show?: boolean | undefined }) {
  return show ? <span className="cx-mine">{COMIC_COPY.mine}</span> : null;
}

function Classified({ name }: { name: string }) {
  return (
    <article className="cx-panel cx-classified">
      <div className="cx-silhouette" aria-hidden="true" />
      <span className="cx-stamp">{COMIC_COPY.classified}</span>
      <Caption tone="white">{COMIC_COPY.filedBy(name)}</Caption>
    </article>
  );
}

/* ---------- panels ---------- */

function Panel({ item, type, index }: { item: ViewContribution; type: ModuleType; index: number }) {
  const media = useMedia(item.sealed ? null : item.media_url);
  if (item.sealed) return <Classified name={item.author_name} />;
  const flip = index % 2 === 1;

  if (type === "photobooth")
    return (
      <article className="cx-panel cx-photo">
        <div className="cx-photo-frame">{media ? <img src={media} alt={item.text_content ?? COMIC_COPY.photoAlt} data-framed={item.data?.["framed"] === true || undefined} /> : <div className="cx-photo-empty" aria-hidden="true" />}</div>
        <div className="cx-photo-cap">
          <Caption>{item.text_content || COMIC_COPY.legendary}</Caption>
        </div>
        <span className="cx-credit">{item.author_name}</span>
        {index === 0 ? <span className="cx-sfx cx-sfx-snap">{COMIC_COPY.snap}</span> : null}
        <Mine show={item.mine} />
      </article>
    );

  if (type === "songs") {
    const embed = toEmbedUrl(item.external_link ?? "");
    return (
      <article className="cx-panel cx-scene cx-song">
        <Caption>{COMIC_COPY.nowPlaying(item.author_name)}</Caption>
        <div className="cx-tape" aria-hidden="true">
          <span className="cx-reel" />
          <span className="cx-tape-label">{item.text_content?.slice(0, 26) || COMIC_COPY.track}</span>
          <span className="cx-reel" />
        </div>
        {embed ? (
          <iframe src={embed} title={COMIC_COPY.songFrom(item.author_name)} loading="lazy" allow="encrypted-media; clipboard-write; picture-in-picture" className="cx-embed" />
        ) : item.external_link ? (
          <a className="cx-link" href={item.external_link} target="_blank" rel="noreferrer">
            {COMIC_COPY.listen}
          </a>
        ) : null}
        <Mine show={item.mine} />
      </article>
    );
  }

  if (type === "voice")
    return (
      <article className="cx-panel cx-scene cx-voice">
        <Caption tone="ink">{COMIC_COPY.transmission}</Caption>
        <div className="cx-waves" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${(i % 7) * 0.09}s`, height: `${30 + ((i * 37) % 60)}%` }} />
          ))}
        </div>
        {media ? <audio controls src={media} className="cx-audio" /> : null}
        <div className="cx-speaker">
          <Portrait item={item} size="sm" />
          <Bubble tail="left">{item.text_content || COMIC_COPY.voiceFallback}</Bubble>
        </div>
        <Mine show={item.mine} />
      </article>
    );

  if (type === "video")
    return (
      <article className="cx-panel cx-photo">
        <div className="cx-photo-frame cx-video">{media ? <video controls playsInline preload="metadata" src={media} /> : <div className="cx-photo-empty" aria-hidden="true" />}</div>
        <div className="cx-photo-cap">
          <Caption>{item.text_content || COMIC_COPY.footage}</Caption>
        </div>
        <span className="cx-credit">{item.author_name}</span>
        <Mine show={item.mine} />
      </article>
    );

  if (type === "doodle")
    return (
      <article className="cx-panel cx-photo cx-doodle">
        <div className="cx-photo-frame">{media ? <img src={media} alt={COMIC_COPY.drawingBy(item.author_name)} /> : <div className="cx-photo-empty" aria-hidden="true" />}</div>
        <span className="cx-credit">{COMIC_COPY.fanArt(item.author_name)}</span>
        <Mine show={item.mine} />
      </article>
    );

  if (type === "tree")
    return (
      <article className="cx-panel cx-scene cx-center">
        <span className="cx-ornament" aria-hidden="true" />
        <Bubble tail="none">{item.text_content || COMIC_COPY.ornament}</Bubble>
        <Caption tone="white">{COMIC_COPY.hungBy(item.author_name)}</Caption>
      </article>
    );

  // Letters and every other section: someone speaking.
  let body: React.ReactNode = item.text_content;
  if (isNewSection(type)) {
    const d = (item.data ?? {}) as Record<string, unknown>;
    body =
      type === "quiz" ? (
        <>
          <strong>{String(d["question"] ?? "")}</strong>
          <span className="cx-answer">{String(d["answer"] ?? "")}</span>
        </>
      ) : (
        sectionAsText(type, item.data, item.text_content, (iso) => formatDay(iso))
      );
  }
  const thought = type === "openwhen" || type === "capsule";
  return (
    <article className={`cx-panel cx-scene cx-letter ${flip ? "cx-flip" : ""}`}>
      <Caption>{type === "letters" ? COMIC_COPY.says(item.author_name) : `${COMIC_CHAPTERS[type] ?? ""} · ${item.author_name}`}</Caption>
      <div className="cx-speaker">
        <Portrait item={item} />
        <Bubble tail={flip ? "right" : "left"} thought={thought}>
          <span className="cx-lettering">{body}</span>
        </Bubble>
      </div>
      <Mine show={item.mine} />
    </article>
  );
}

/* ---------- special pages ---------- */

function CountdownSplash({ site }: { site: GiftSite }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const end = countdownTarget(site);
  const target = end ? giftMoment(end) : now + 86400000;
  const s = Math.max(0, Math.floor((target - now) / 1000));
  const parts = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  return (
    <div className="cx-splash">
      <div className="cx-burst">
        <p className="cx-title cx-burst-kicker">{s ? COMIC_COPY.bigDay : COMIC_COPY.itsHere}</p>
        {s ? (
          <div className="cx-clock" suppressHydrationWarning>
            {parts.map((p, i) => (
              <span key={i}>
                <b>{String(p).padStart(2, "0")}</b>
                <small>{COMIC_COPY.clock[i]}</small>
              </span>
            ))}
          </div>
        ) : (
          <p className="cx-title cx-burst-big">{COMIC_COPY.kapow}</p>
        )}
      </div>
    </div>
  );
}

function PowerWords({ items }: { items: ViewContribution[] }) {
  const words = items.flatMap((i) => (i.text_content ?? "").split(/[,\n]/)).map((w) => w.trim()).filter(Boolean).slice(0, 18);
  return (
    <div className="cx-words">
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="cx-word" style={{ fontSize: `${1.1 + ((i * 7) % 5) * 0.32}rem`, transform: `rotate(${((i * 13) % 11) - 5}deg)` }}>
          {w}
        </span>
      ))}
    </div>
  );
}

function CalendarPage({ entries, siteId }: { entries: CalendarEntry[]; siteId: string }) {
  const list = entries.length ? entries : [{ id: "sample", entry_date: new Date().toISOString(), text_content: COMIC_COPY.mission, type: "message" as const, site_id: siteId, media_url: null, external_link: null }];
  return (
    <div className="cx-missions">
      {list.slice(0, 12).map((e) => (
        <article key={e.id} className="cx-panel cx-mission">
          <span className="cx-title cx-mission-day">#{new Date(e.entry_date).getDate()}</span>
          <p className="cx-lettering">{e.text_content || COMIC_COPY.locked}</p>
        </article>
      ))}
    </div>
  );
}

function BackCover({ names, recipient }: { names: string[]; recipient: string }) {
  return (
    <div className="cx-back">
      <p className="cx-title cx-the-end">{COMIC_COPY.theEnd}</p>
      <p className="cx-title cx-or-is-it">{COMIC_COPY.orIsIt}</p>
      <div className="cx-credits">
        <p className="cx-credits-row">
          <span>{COMIC_COPY.starring}</span>
          <b className="cx-title">{recipient}</b>
        </p>
        <p className="cx-credits-row">
          <span>{COMIC_COPY.writtenBy}</span>
          <b>{names.length ? names.join(" · ") : COMIC_COPY.everyone}</b>
        </p>
        <p className="cx-credits-row">
          <span>{COMIC_COPY.lettering}</span>
          <b>{COMIC_COPY.byHand}</b>
        </p>
      </div>
    </div>
  );
}

/* ---------- the book ---------- */

type Page = { key: string; chapter: string; type: ModuleType | "back" | "countdown"; n: number; body: React.ReactNode };

export function ComicIssueView({ kind, site, modules, contributions, calendarEntries = [], palette, showCover = false, showShare, onReplayCover, onClose, sample }: Props) {
  const settings = normalizeComicSettings(site.format_settings);
  const defaults = comicSettingDefaults(site.custom_text.recipient_name, kind);
  const recipient = site.custom_text.recipient_name || COMIC_COPY.hero;
  const reduce = useReducedMotion();
  const [coverOpen, setCoverOpen] = useState(!showCover);
  const [[page, dir], setPage] = useState<[number, number]>([0, 0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [world, setWorld] = useState<0 | 1>(0);
  const [wiping, setWiping] = useState(false);
  const enabled = new Set(modules.filter((m) => m.enabled).map((m) => m.module_type));
  const chapterFor = (item: ViewContribution) => (settings.chapter_overrides?.[item.id] as ModuleType | undefined) ?? item.module_type;

  const sorted = useMemo(() => {
    const ids = orderedComicIds(contributions.map((i) => i.id), settings.panel_order);
    const byId = new Map(contributions.map((i) => [i.id, i]));
    return ids.map((id) => byId.get(id)).filter((i): i is ViewContribution => Boolean(i));
  }, [contributions, settings.panel_order]);
  const visible = useMemo(() => {
    const revealed = new Set(sorted.filter((i) => i.mine && !i.sealed).map((i) => i.id));
    return sorted.filter((i) => !i.sealed || ![...revealed].some((id) => i.id === `sealed-${id}`));
  }, [sorted]);

  const pages = useMemo<Page[]>(() => {
    const out: Page[] = [];
    if (enabled.has("countdown")) out.push({ key: "countdown", chapter: COMIC_CHAPTERS.countdown, type: "countdown", n: 1, body: <CountdownSplash site={site} /> });
    const types: ModuleType[] = ["letters", "photobooth", "songs", "voice", "wordcloud", "calendar", "tree", ...NEW_SECTION_TYPES];
    for (const type of types) {
      if (!enabled.has(type)) continue;
      if (type === "calendar") {
        if (calendarEntries.length || sample) out.push({ key: type, chapter: COMIC_CHAPTERS.calendar, type, n: 1, body: <CalendarPage entries={calendarEntries} siteId={site.id} /> });
        continue;
      }
      let items = visible.filter((i) => chapterFor(i) === type);
      if (!items.length && sample)
        items = [{ id: `sample-${type}`, site_id: site.id, module_type: type, author_name: "Sam", text_content: type === "letters" ? COMIC_COPY.sampleLetter : COMIC_COPY.legendary, media_url: null, external_link: null, status: "approved", ornament_key: null, visibility: "public", created_at: "" }];
      if (!items.length) continue;
      if (type === "wordcloud") {
        out.push({ key: type, chapter: COMIC_CHAPTERS.wordcloud, type, n: 1, body: <PowerWords items={items} /> });
        continue;
      }
      const per = type === "photobooth" ? 4 : type === "letters" ? 3 : 2;
      for (let i = 0; i < items.length; i += per) {
        const chunk = items.slice(i, i + per);
        out.push({
          key: `${type}-${i}`,
          chapter: i === 0 ? COMIC_CHAPTERS[type] : type === "letters" ? COMIC_COPY.fanMail : COMIC_COPY.continued(COMIC_CHAPTERS[type], i / per + 1),
          type,
          n: chunk.length,
          body: chunk.map((item, k) => <Panel key={item.id} item={item} type={type} index={k} />),
        });
      }
    }
    const names = [...new Set(contributions.map((i) => i.author_name))];
    out.push({ key: "back", chapter: COMIC_COPY.toBeContinued, type: "back", n: 1, body: <BackCover names={names} recipient={recipient} /> });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarEntries, contributions, modules, sample, site, visible, recipient]);

  const go = (to: number) => setPage(([p]) => [Math.max(0, Math.min(pages.length - 1, to)), to > p ? 1 : -1]);
  const next = () => go(page + 1);
  const prev = () => go(page - 1);
  useEffect(() => {
    if (!coverOpen) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  const stage = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    stage.current?.scrollTo({ top: 0 });
  }, [page]);

  function switchWorld() {
    setWiping(true);
    window.setTimeout(() => {
      setWorld((w) => (w === 0 ? 1 : 0));
      window.setTimeout(() => setWiping(false), 260);
    }, 380);
  }

  const vars = {
    "--cx-accent": palette.accent,
    "--cx-main": palette.primary,
    "--cx-paper": palette.background,
    "--cx-on-accent": readableInk(palette.accent),
  } as React.CSSProperties;

  const cast = castFor((kind ?? "default") as ThemeKind, site.character, site.icon_set);
  const counts = {
    friends: new Set(contributions.map((i) => i.author_name)).size,
    letters: contributions.filter((i) => i.module_type === "letters").length,
    photos: contributions.filter((i) => i.module_type === "photobooth").length,
  };
  const issueNo = (site.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 90) + 1;
  const month = new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" }).toUpperCase();

  const current = pages[page];
  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? "28%" : "-28%", rotateY: d >= 0 ? -16 : 16, scale: 0.97 }),
    center: { opacity: 1, x: "0%", rotateY: 0, scale: 1 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d >= 0 ? "-22%" : "22%", rotateY: d >= 0 ? 14 : -14, scale: 0.97 }),
  };

  return (
    <div className={`cx-root cx-world-${world}`} style={vars}>
      <AnimatePresence initial={false} mode="wait">
        {!coverOpen ? (
          <motion.div
            key="cover"
            className="cx-cover-stage"
            exit={reduce ? { opacity: 0 } : { rotateY: -96, opacity: 0.4, transition: { duration: 0.7, ease } }}
            style={{ transformOrigin: "0% 50%", transformPerspective: 1600 }}
          >
            <div className="cx-cover" role="img" aria-label={`${settings.cover_title || defaults.cover_title}. ${settings.cover_subtitle || defaults.cover_subtitle}.`}>
              <div className="cx-cover-rays" aria-hidden="true" />
              <div className="cx-cover-dots" aria-hidden="true" />
              <header className="cx-mast">
                <span className="cx-imprint">
                  <b>JB</b>
                  <small>{COMIC_COPY.imprint}</small>
                </span>
                <span className="cx-tagline">{COMIC_COPY.tagline}</span>
                <span className="cx-issue">
                  <small>{COMIC_COPY.no}</small>
                  <b>{issueNo}</b>
                  <small>{month}</small>
                </span>
              </header>
              <motion.p className="cx-cover-sub cx-title" initial={reduce ? false : { y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5, ease }}>
                {settings.cover_subtitle || defaults.cover_subtitle}
              </motion.p>
              <motion.h1
                className="cx-cover-title cx-title"
                initial={reduce ? false : { scale: 1.6, opacity: 0, rotate: -6 }}
                animate={{ scale: 1, opacity: 1, rotate: -3 }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.25 }}
              >
                {settings.cover_title || defaults.cover_title}
              </motion.h1>
              <div className="cx-cover-art">
                <span className="cx-cover-burst" aria-hidden="true" />
                {cast.character.type !== "none" ? (
                  <motion.div className="cx-cover-hero" initial={reduce ? false : { y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 15, delay: 0.5 }}>
                    <Character setting={cast.character} accessory={null} size={200} live follow showName={false} />
                  </motion.div>
                ) : null}
              </div>
              <motion.span className="cx-blurb cx-blurb-star cx-title" initial={reduce ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 12 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: 0.75 }}>
                {COMIC_COPY.featuring(counts.friends)}
              </motion.span>
              <motion.span className="cx-blurb cx-blurb-box" initial={reduce ? false : { x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.9, duration: 0.45, ease }}>
                {COMIC_COPY.inside(counts.letters, counts.photos)}
              </motion.span>
              <footer className="cx-cover-foot">
                <span className="cx-seal">
                  {COMIC_COPY.seal1}
                  <br />
                  {COMIC_COPY.seal2}
                </span>
                <motion.button
                  type="button"
                  className="cx-open"
                  onClick={() => setCoverOpen(true)}
                  {...(reduce ? {} : { whileHover: { rotate: -2, scale: 1.04 } })}
                  whileTap={{ scale: 0.95 }}
                  initial={reduce ? false : { y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.05, type: "spring", stiffness: 260, damping: 18 }}
                >
                  {COMIC_COPY.open}
                </motion.button>
                <span className="cx-barcode" aria-hidden="true">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} style={{ width: [2, 1, 3, 1, 2][i % 5] }} />
                  ))}
                  <small>{COMIC_COPY.priceless}</small>
                </span>
              </footer>
              {onClose ? (
                <button type="button" className="cx-icon cx-cover-close" aria-label={COMIC_COPY.closeCover} onClick={onClose}>
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.div key="reader" className="cx-reader" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <div className="cx-desk" aria-hidden="true" />
            <header className="cx-bar">
              <button type="button" className="cx-chip" onClick={() => setMenuOpen(true)}>
                <List className="size-4" aria-hidden="true" /> {COMIC_COPY.chapters}
              </button>
              <div className="cx-progress" aria-hidden="true">
                {pages.map((p, i) => (
                  <i key={p.key} className={i <= page ? "is-on" : ""} />
                ))}
              </div>
              {settings.two_worlds ? (
                <button type="button" className="cx-chip" onClick={switchWorld}>
                  <Repeat2 className="size-4" aria-hidden="true" /> {world === 0 ? settings.world_one || defaults.world_one : settings.world_two || defaults.world_two}
                </button>
              ) : showShare ? (
                <button
                  type="button"
                  className="cx-icon"
                  aria-label={COMIC_COPY.share}
                  onClick={() => shareGift(site)}
                >
                  <Share2 className="size-4" />
                </button>
              ) : (
                <span className="cx-bar-spacer" />
              )}
            </header>

            <div ref={stage} className="cx-stage">
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                {current ? (
                  <motion.section
                    key={current.key}
                    custom={dir}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: reduce ? 0.2 : 0.5, ease }}
                    drag={reduce ? false : "x"}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(_, info: PanInfo) => {
                      if (info.offset.x < -70 || info.velocity.x < -500) next();
                      else if (info.offset.x > 70 || info.velocity.x > 500) prev();
                    }}
                    className="cx-page"
                    style={{ transformPerspective: 1400 }}
                    aria-label={`${COMIC_COPY.page} ${page + 1}: ${current.chapter}`}
                  >
                    <div className="cx-page-head">
                      <span className="cx-chapter-box">
                        <small>{COMIC_COPY.chapter(page + 1)}</small>
                        <b className="cx-title">{current.chapter}</b>
                      </span>
                      {current.type !== "back" && current.type !== "countdown" ? <span className="cx-sfx cx-sfx-head">{SFX[page % SFX.length]}</span> : null}
                    </div>
                    <div className={`cx-grid cx-grid-${current.type} `} data-n={current.n}>
                      {current.body}
                    </div>
                    <span className="cx-folio">{page + 1}</span>
                  </motion.section>
                ) : null}
              </AnimatePresence>
            </div>

            <footer className="cx-controls">
              <button type="button" className="cx-turn" onClick={prev} disabled={page === 0} aria-label={COMIC_COPY.prev}>
                <ChevronLeft className="size-5" />
              </button>
              <span className="cx-count">
                <b>{page + 1}</b> / {pages.length}
              </span>
              <button type="button" className="cx-turn cx-turn-next" onClick={next} disabled={page === pages.length - 1} aria-label={COMIC_COPY.next}>
                <ChevronRight className="size-5" />
              </button>
            </footer>

            {onReplayCover ? (
              <button
                type="button"
                className="cx-replay"
                // The opening already played; the cover is there to look at, not a second opening.
                onClick={() => setCoverOpen(false)}
              >
                {COMIC_COPY.replay}
              </button>
            ) : null}
            {onClose ? (
              <button type="button" className="cx-back-to-edit" onClick={onClose}>
                {COMIC_COPY.backToEdit}
              </button>
            ) : null}

            <AnimatePresence>
              {wiping ? (
                <motion.div className="cx-wipe" initial={{ clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} exit={{ clipPath: "inset(0 0 0 100%)" }} transition={{ duration: 0.38, ease }}>
                  <span className="cx-caption cx-caption-yellow">{COMIC_COPY.meanwhile}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence>
              {menuOpen ? (
                <motion.div className="cx-menu-back" onClick={() => setMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.nav
                    className="cx-menu"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={{ duration: 0.4, ease }}
                    aria-label={COMIC_COPY.chapters}
                  >
                    <div className="cx-menu-head">
                      <p className="cx-title">{COMIC_COPY.contents}</p>
                      <button type="button" className="cx-icon" aria-label={COMIC_COPY.close} onClick={() => setMenuOpen(false)}>
                        <X className="size-4" />
                      </button>
                    </div>
                    {pages.map((p, i) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => {
                          go(i);
                          setMenuOpen(false);
                        }}
                        className={`cx-menu-item ${page === i ? "is-active" : ""}`}
                      >
                        <span className="cx-title">{String(i + 1).padStart(2, "0")}</span>
                        {p.chapter}
                      </button>
                    ))}
                  </motion.nav>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
