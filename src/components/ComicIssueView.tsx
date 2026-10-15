import { useEffect, useMemo, useRef, useState } from "react";
import { giftMoment } from "@/lib/giftPieces";
import { countdownTarget, formatDay } from "@/lib/time";
import { NEW_SECTION_TYPES, isNewSection, sectionAsText } from "@/lib/sections";
import { ChevronLeft, ChevronRight, List, Repeat2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signedMediaUrl, toEmbedUrl, type CalendarEntry, type GiftSite, type ModuleType, type SiteModule, type ViewContribution } from "@/lib/gift";
import { COMIC_CHAPTERS, comicSettingDefaults, normalizeComicSettings, orderedComicIds } from "@/lib/comic";
import { readableInk } from "@/lib/palettes";
import type { Palette } from "@/lib/themes";

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
  /** The occasion, for default cover words. */
  kind?: string;
};

function useMedia(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void signedMediaUrl(path).then((next) => alive && setUrl(next));
    return () => { alive = false; };
  }, [path]);
  return url;
}

function Avatar({ item, accent }: { item: ViewContribution; accent: string }) {
  const url = useMedia(item.sealed ? null : item.media_url);
  if (item.sealed) return <div className="comic-silhouette" aria-hidden />;
  if (url) return <img src={url} alt="" className="size-full object-cover" />;
  return <span className="grid size-full place-items-center text-4xl font-black" style={{ color: accent }}>{item.author_name.trim().charAt(0).toUpperCase()}</span>;
}

function CountdownPage({ site, palette }: { site: GiftSite; palette: Palette }) {
  const [now, setNow] = useState(() => Date.now());
  const previousSeconds = useRef<number | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const end = countdownTarget(site);
  const target = end ? giftMoment(end) : now + 86400000;
  const seconds = Math.max(0, Math.floor((target - now) / 1000));
  const done = seconds <= 0;
  useEffect(() => {
    const justReachedZero = previousSeconds.current !== null && previousSeconds.current > 0 && seconds === 0;
    previousSeconds.current = seconds;
    if (!justReachedZero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(170, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(55, audio.currentTime + 0.22);
      gain.gain.setValueAtTime(0.12, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.25);
      oscillator.addEventListener("ended", () => void audio.close(), { once: true });
    } catch {
      /* Browsers may block audio until the reader interacts. */
    }
  }, [seconds]);
  const parts = [Math.floor(seconds / 86400), Math.floor((seconds % 86400) / 3600), Math.floor((seconds % 3600) / 60), seconds % 60];
  return (
    <div className="comic-splash-page">
      <div className="comic-burst" style={{ backgroundColor: palette.accent, color: readableInk(palette.accent) }}>
        <p className="comic-title text-xl @2xl:text-3xl">{done ? `HAPPY BIRTHDAY, ${(site.custom_text.recipient_name || "HERO").toUpperCase()}!` : "NEXT ISSUE DROPS IN…"}</p>
        {!done ? <p className="comic-title mt-4 text-4xl @2xl:text-6xl" suppressHydrationWarning>{parts.map((part) => String(part).padStart(2, "0")).join(":")}</p> : <p className="comic-title mt-3 text-5xl">KAPOW!</p>}
      </div>
      {done ? <div className="comic-confetti" aria-hidden>★ ✦ ◆ ● ★ ✦ ◆</div> : null}
    </div>
  );
}

function Classified({ name, kind }: { name: string; kind: "photo" | "letter" | "media" }) {
  return (
    <article className="comic-panel relative grid min-h-64 place-items-center overflow-hidden p-5 text-center">
      <div className={kind === "photo" ? "comic-blur-photo" : "comic-silhouette"} aria-hidden />
      <div className="comic-stamp">CLASSIFIED</div>
      <div className="comic-bubble mt-3">████ ███████ ████</div>
      <p className="comic-caption">Filed by {name}</p>
    </article>
  );
}

function ComicPanel({ item, palette, type }: { item: ViewContribution; palette: Palette; type: ModuleType }) {
  const media = useMedia(item.sealed ? null : item.media_url);
  if (item.sealed) return <Classified name={item.author_name} kind={type === "photobooth" ? "photo" : type === "letters" ? "letter" : "media"} />;
  if (type === "photobooth") return (
    <article className="comic-panel overflow-hidden">
      <div className="aspect-[4/3] bg-ink/10">{media ? <img src={media} alt={item.text_content ?? "Origin story"} className="size-full object-cover" /> : <Avatar item={item} accent={palette.accent} />}</div>
      <p className="comic-caption">{item.text_content || "A legendary moment"} · {item.author_name}</p>
      {item.mine ? <span className="comic-yours">YOU'RE IN THE ISSUE!</span> : null}
    </article>
  );
  if (type === "letters") return (
    <article className="comic-panel grid min-h-72 grid-cols-[90px_1fr] items-end gap-3 p-4">
      <div className="h-40 overflow-hidden border-4 border-ink bg-paper"><Avatar item={item} accent={palette.accent} /></div>
      <div><div className="comic-bubble whitespace-pre-line">{item.text_content}</div><p className="comic-caption mt-2">{item.author_name}</p>{item.mine ? <span className="comic-yours">YOU'RE IN THE ISSUE!</span> : null}</div>
    </article>
  );
  if (type === "songs") {
    const embed = toEmbedUrl(item.external_link ?? "");
    return <article className="comic-panel p-5"><div className="comic-cassette"><span>▶</span><span className="comic-title">TRACK</span></div><div className="comic-bubble mt-4">{item.text_content || "Press play on this one."}</div>{embed ? <iframe src={embed} title={`Song from ${item.author_name}`} loading="lazy" allow="encrypted-media; clipboard-write; picture-in-picture" className="mt-3 h-[152px] w-full border-4 border-ink" /> : item.external_link ? <a className="mt-3 block font-bold underline" href={item.external_link} target="_blank" rel="noreferrer">Listen to the track →</a> : null}<p className="comic-caption mt-2">Selected by {item.author_name}</p></article>;
  }
  if (type === "voice") return <article className="comic-panel p-5"><p className="comic-title text-2xl">INCOMING TRANSMISSION</p>{media ? <audio controls src={media} className="mt-4 w-full" /> : null}<div className="comic-bubble mt-4">{item.text_content || "Audio message"}</div><p className="comic-caption mt-2">From {item.author_name}</p></article>;
  if (isNewSection(type)) {
    if (type === "video") return <article className="comic-panel overflow-hidden">{media ? <video controls playsInline preload="metadata" src={media} className="aspect-video w-full bg-ink" /> : null}<p className="comic-caption">{item.text_content || "Live footage"} · {item.author_name}</p></article>;
    if (type === "doodle") return <article className="comic-panel overflow-hidden bg-white">{media ? <img src={media} alt={`A drawing by ${item.author_name}`} className="aspect-square w-full object-contain" /> : null}<p className="comic-caption">Fan art by {item.author_name}</p></article>;
    const d = (item.data ?? {}) as Record<string, unknown>;
    const body = type === "quiz" ? `${String(d["question"] ?? "")}\n\nAnswer: ${String(d["answer"] ?? "")}` : sectionAsText(type, item.data, item.text_content, (iso) => formatDay(iso));
    return <article className="comic-panel p-5"><div className="comic-bubble whitespace-pre-line">{body}</div><p className="comic-caption mt-2">{item.author_name}</p></article>;
  }
  if (type === "tree") return <article className="comic-panel grid min-h-56 place-items-center p-5 text-center"><span className="text-6xl">★</span><div className="comic-bubble">{item.text_content || "A secret ornament message"}</div><p className="comic-caption">Hung by {item.author_name}</p></article>;
  return <article className="comic-panel p-5"><p className="comic-title text-3xl">{item.text_content || "SECRET POWER"}</p><p className="comic-caption mt-4">From {item.author_name}</p></article>;
}

type ComicPage = { key: string; chapter: string; body: React.ReactNode };

export function ComicIssueView({ kind, site, modules, contributions, calendarEntries = [], palette, showCover = false, showShare, onReplayCover, onClose, sample }: Props) {
  const settings = normalizeComicSettings(site.format_settings);
  const defaults = comicSettingDefaults(site.custom_text.recipient_name, kind);
  const [coverOpen, setCoverOpen] = useState(!showCover);
  const [page, setPage] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [world, setWorld] = useState<0 | 1>(0);
  const [wiping, setWiping] = useState(false);
  const touchStart = useRef<number | null>(null);
  const enabled = new Set(modules.filter((module) => module.enabled).map((module) => module.module_type));
  const chapterFor = (item: ViewContribution) => settings.chapter_overrides?.[item.id] as ModuleType | undefined ?? item.module_type;
  const sorted = useMemo(() => {
    const ids = orderedComicIds(contributions.map((item) => item.id), settings.panel_order);
    const byId = new Map(contributions.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is ViewContribution => Boolean(item));
  }, [contributions, settings.panel_order]);
  const visible = useMemo(() => {
    const revealedMine = new Set(sorted.filter((item) => item.mine && !item.sealed).map((item) => item.id));
    return sorted.filter((item) => !item.sealed || ![...revealedMine].some((id) => item.id === `sealed-${id}`));
  }, [sorted]);

  const pages = useMemo<ComicPage[]>(() => {
    const out: ComicPage[] = [];
    if (enabled.has("countdown")) out.push({ key: "countdown", chapter: COMIC_CHAPTERS.countdown, body: <CountdownPage site={site} palette={palette} /> });
    const types: ModuleType[] = ["photobooth", "letters", "songs", "wordcloud", "voice", "calendar", "tree", ...NEW_SECTION_TYPES];
    for (const type of types) {
      if (!enabled.has(type)) continue;
      if (type === "calendar") {
        if (calendarEntries.length || sample) out.push({ key: type, chapter: COMIC_CHAPTERS[type], body: <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(calendarEntries.length ? calendarEntries : [{ id: "sample", entry_date: new Date().toISOString(), text_content: "A secret mission", type: "message", site_id: site.id, media_url: null, external_link: null }]).map((entry) => <article key={entry.id} className="comic-panel p-4"><p className="comic-title text-3xl">#{new Date(entry.entry_date).getDate()}</p><div className="comic-bubble mt-3">{entry.text_content || "Mission locked"}</div></article>)}</div> });
        continue;
      }
      let items = visible.filter((item) => chapterFor(item) === type);
      if (!items.length && sample) items = [{ id: `sample-${type}`, site_id: site.id, module_type: type, author_name: "Sam", text_content: type === "letters" ? "You make every day an adventure!" : "A legendary moment", media_url: null, external_link: null, status: "approved", ornament_key: null, visibility: "public", created_at: "" }];
      if (!items.length) continue;
      const perPage = type === "letters" ? 2 : type === "photobooth" ? 4 : 3;
      for (let index = 0; index < items.length; index += perPage) {
        const chunk = items.slice(index, index + perPage);
        const continuation = type === "letters" && index >= perPage;
        out.push({ key: `${type}-${index}`, chapter: continuation ? "Fan Mail" : COMIC_CHAPTERS[type], body: <div className={type === "photobooth" ? "grid grid-cols-2 gap-3" : "grid gap-3 sm:grid-cols-2"}>{chunk.map((item) => <ComicPanel key={item.id} item={item} palette={palette} type={type} />)}</div> });
      }
    }
    const names = [...new Set(contributions.map((item) => item.author_name))];
    out.push({ key: "back", chapter: "To be continued…", body: <div className="comic-back-cover"><p className="comic-title text-5xl @2xl:text-7xl">TO BE CONTINUED…</p><div className="comic-credits"><p className="comic-title text-2xl">THE CAST</p><p>{names.length ? names.join(" • ") : "The people who love you"}</p></div></div> });
    return out;
  }, [calendarEntries, contributions, enabled, palette, sample, site, visible]);

  const next = () => setPage((value) => Math.min(pages.length - 1, value + 1));
  const previous = () => setPage((value) => Math.max(0, value - 1));
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [pages.length]);

  function switchWorld() {
    setWiping(true);
    window.setTimeout(() => { setWorld((value) => value === 0 ? 1 : 0); setWiping(false); }, 280);
  }

  if (!coverOpen) return (
    <div className="comic-cover" style={{ "--comic-accent": palette.accent, "--comic-main": palette.primary, "--comic-paper": palette.background } as React.CSSProperties}>
      {onClose ? <Button className="absolute top-20 right-4 z-10" variant="outline" size="icon" aria-label="Close cover preview" onClick={onClose}><X /></Button> : null}
      <div className="comic-price">₱0<br /><small>PRICELESS</small></div><div className="comic-badge">COLLECTOR'S<br />EDITION</div>
      <div className="comic-web-lines" aria-hidden /><div className="comic-city" aria-hidden />
      <div className="comic-cover-copy"><div className="comic-kaboom">KA-BOOM!</div><p className="comic-title text-lg">{settings.cover_subtitle || defaults.cover_subtitle}</p><h1 className="comic-title comic-slam mt-3 text-[clamp(3.5rem,12cqi,8rem)] leading-[0.8]">{settings.cover_title || defaults.cover_title}</h1><Button className="mt-8 border-4 border-ink bg-paper px-7 py-6 font-bold text-ink shadow-[6px_6px_0_var(--comic-accent)] hover:bg-paper" onClick={() => setCoverOpen(true)}>Open the issue →</Button></div>
      <div className="comic-barcode" aria-label="Price: priceless"><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  );

  const worldName = world === 0 ? settings.world_one || defaults.world_one : settings.world_two || defaults.world_two;
  return (
    <div className={`comic-reader comic-world-${world}`} style={{ "--comic-accent": palette.accent, "--comic-main": palette.primary, "--comic-paper": palette.background } as React.CSSProperties}>
      <div className="comic-atmosphere" aria-hidden />
      {wiping ? <div className="comic-wipe"><span>Meanwhile, on the island…</span></div> : null}
      <header className="comic-reader-bar">
        <Button variant="outline" size="sm" onClick={() => setMenuOpen(true)}><List /> Chapters</Button>
        {settings.two_worlds ? <Button variant="outline" size="sm" onClick={switchWorld}><Repeat2 /> {worldName}</Button> : <span />}
        {showShare ? <Button variant="outline" size="icon" aria-label="Share this issue" onClick={() => navigator.share ? void navigator.share({ title: site.title, url: window.location.href }) : void navigator.clipboard.writeText(window.location.href)}><Share2 /></Button> : <span />}
      </header>
      <main className="comic-page-stage" onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { const end = event.changedTouches[0]?.clientX; if (touchStart.current === null || end === undefined) return; const delta = end - touchStart.current; if (delta < -55) next(); if (delta > 55) previous(); touchStart.current = null; }}>
        <section key={pages[page]?.key} className="comic-page">
          <div className="comic-page-heading"><span>CHAPTER {page + 1}</span><h2 className="comic-title">{pages[page]?.chapter}</h2></div>
          <div className="comic-page-content">{pages[page]?.body}</div>
        </section>
      </main>
      <footer className="comic-controls"><Button variant="outline" size="icon" onClick={previous} disabled={page === 0} aria-label="Previous page"><ChevronLeft /></Button><span className="comic-title">PAGE {page + 1} OF {pages.length}</span><Button variant="outline" size="icon" onClick={next} disabled={page === pages.length - 1} aria-label="Next page"><ChevronRight /></Button></footer>
      {onReplayCover ? <button className="comic-replay" onClick={() => { setCoverOpen(false); onReplayCover(); }}>Replay cover</button> : null}
      {onClose ? <Button className="fixed right-4 bottom-4 z-20" onClick={onClose}>Back to editing</Button> : null}
      {menuOpen ? <div className="comic-menu-backdrop" onClick={() => setMenuOpen(false)}><nav className="comic-menu" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><p className="comic-title text-3xl">CHAPTERS</p><Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)}><X /></Button></div>{pages.map((item, index) => <button key={item.key} onClick={() => { setPage(index); setMenuOpen(false); }} className={page === index ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span>{item.chapter}</button>)}</nav></div> : null}
    </div>
  );
}