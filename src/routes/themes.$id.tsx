import { useEffect, useMemo, useState } from "react";
import { previewEngineProps } from "@/lib/engineGift";
import { sampleNotes } from "@/lib/sampleSections";
import { DEMO_GIFTS, DEMO_ORDER } from "@/lib/demoGifts";
import type { ModuleType, SiteModule } from "@/lib/gift";
import { Pause, Play } from "lucide-react";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import { useGiftTour } from "@/hooks/useGiftTour";
import { Pause3DContext } from "@/components/Theme3D";
import { themeKindOf } from "@/lib/themeKind";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";
import { themeFont } from "@/components/ThemeMiniPreview";
import { FormatView } from "@/components/formats/FormatView";
import { FORMATS, offeredFormats, type GiftFormat } from "@/lib/formats";
import { GiftIntro } from "@/components/GiftIntro";
import { backgroundFor, buildPreviewSite, previewModules, sampleFor } from "@/components/ThemeLivePreview";
import { stageColorFor } from "@/components/ThemeCard";
import { useAuth } from "@/hooks/useAuth";
import { fetchThemeById } from "@/lib/themes";
import { introStyleForTheme } from "@/lib/intro";
import { usePalettes, themePalettes } from "@/hooks/usePalettes";
import { FONT_PAIRINGS, MODULES } from "@/lib/gift";

export const Route = createFileRoute("/themes/$id")({
  head: () => ({
    meta: [
      { title: "Theme preview | Just Because" },
      { name: "description", content: "See a gift theme play for real, try its colors, and watch the opening." },
      { property: "og:title", content: "Theme preview | Just Because" },
      { property: "og:description", content: "See a gift theme play for real, try its colors, and watch the opening." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThemeDetailPage,
});

function ThemeDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [device, setDevice] = useState<PreviewDevice>("phone");
  const tour = useGiftTour();
  const [format, setFormat] = useState<GiftFormat>("scrapbook");
  const { data: allPalettes = [] } = usePalettes();

  const { data: theme, isLoading, error, refetch } = useQuery({
    queryKey: ["theme", id],
    queryFn: () => fetchThemeById(id),
  });

  const palettes = useMemo(() => (theme ? themePalettes(theme, allPalettes) : []), [theme, allPalettes]);
  const palette = palettes[paletteIndex] ?? palettes[0];
  const site = useMemo(() => (theme ? buildPreviewSite(theme, palette) : null), [theme, palette]);
  const defaults = useMemo(() => (theme && site ? previewModules(theme, site.id).map((m) => m.module_type) : []), [theme, site]);
  // Which sections the visitor is trying out. Starts on the theme's own picks.
  const [tried, setTried] = useState<ModuleType[] | null>(null);
  const on = tried ?? defaults;
  const [justAdded, setJustAdded] = useState<ModuleType | null>(null);
  const modules: SiteModule[] = useMemo(
    () => (site ? MODULES.filter((m) => on.includes(m.type)).map((m, i) => ({ id: `try-${i}-${m.type}`, site_id: site.id, module_type: m.type, price: 0, enabled: true })) : []),
    [site, on],
  );
  // Real content where we have an example gift for this occasion (Ana, Sam,
  // Milo, Nora & James), topped up with samples for any section it lacks.
  const notes = useMemo(() => {
    if (!theme || !site) return [];
    const base = sampleNotes(sampleFor(theme).name, site.id);
    const kind = themeKindOf(theme);
    const demo = DEMO_ORDER.map((d) => DEMO_GIFTS[d]).find((g) => g.kind === kind);
    if (!demo) return base;
    const have = new Set(demo.notes.map((n) => n.module_type));
    return [...demo.notes, ...base.filter((n) => !have.has(n.module_type))];
  }, [theme, site]);
  const calendar = useMemo(() => {
    if (!theme) return undefined;
    const kind = themeKindOf(theme);
    return DEMO_ORDER.map((d) => DEMO_GIFTS[d]).find((g) => g.kind === kind)?.calendar;
  }, [theme]);
  // Glide the phone to a section the moment it's switched on.
  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => {
      const box = tour.scrollRef.current;
      const el = box?.querySelector<HTMLElement>(`[data-section="${justAdded}"]`);
      if (!box || !el) return;
      // Small screens: the chips sit under the gift, so bring the gift back into view first.
      if (window.innerWidth < 1024) box.scrollIntoView({ block: "center", behavior: "smooth" });
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 16;
      box.scrollTo({ top, behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [justAdded, tour.scrollRef]);

  if (isLoading) return <PageLoading label="Loading this theme…" />;
  if (error) return <PageError message="We couldn't load this theme just now." onRetry={() => void refetch()} />;
  if (!theme) {
    return <PageNotFound message="That theme link is no longer available. Have a look at the ones we have now." />;
  }
  if (!palette || !site) {
    return (
      <PageNotFound
        title="This theme isn't ready yet"
        message="Its colors are still being set up. Try another theme for now."
      />
    );
  }

  const fonts = FONT_PAIRINGS[themeFont(theme)];
  function toggleSection(type: ModuleType) {
    const next = on.includes(type) ? on.filter((t) => t !== type) : [...on, type];
    setTried(next);
    tour.pause();
    tour.showGift();
    setJustAdded(on.includes(type) ? null : type);
  }
  const sample = sampleFor(theme);

  function use() {
    // Signed out, the /create guard sends them to sign in and brings them back with these picks.
    if (!user) toast.info("Sign in first, then you can start your gift.");
    navigate({ to: "/create", search: { theme: id, format, from: undefined, sections: tried ? on.join(",") : undefined } });
  }

  const view = tour.phase === "intro" ? "opening" : "gift";
  function watchOpening() {
    tour.showOpening();
  }

  const tab = (value: "gift" | "opening", label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={view === value}
      className={`min-h-11 flex-1 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors sm:px-4 ${
        view === value ? "bg-ink text-cream" : "text-ink/75 hover:bg-white/60"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-3 pt-6 pb-16 sm:px-5">
        <Link to="/themes" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-muted hover:text-ink">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All themes
        </Link>

        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* The stage: a phone playing the real gift */}
          <div className="relative overflow-hidden rounded-[36px] px-3 pt-5 pb-6 sm:px-8 lg:sticky lg:top-24 lg:self-start" style={{ backgroundColor: stageColorFor(theme) }}>
            <span aria-hidden="true" className="absolute -top-20 -right-16 size-64 rounded-full bg-white/40" />
            <span aria-hidden="true" className="absolute bottom-10 -left-20 size-56 rounded-full bg-white/30" />

            <div className="relative mx-auto flex max-w-[420px] gap-1 rounded-full bg-white/45 p-1 backdrop-blur">
              {tab("gift", "The gift", () => {
                tour.pause();
                tour.showGift();
              })}
              {tab("opening", "The opening", watchOpening)}
            </div>
            <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
              <DeviceToggle value={device} onChange={setDevice} size="sm" />
              {!tour.reduced ? (
                <button
                  type="button"
                  onClick={() => (tour.playing ? tour.pause() : tour.play())}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-white/60 px-3 text-[11px] font-medium ring-1 ring-ink/10 backdrop-blur hover:bg-white/80"
                >
                  {tour.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {tour.playing ? "Pause the tour" : "Play the tour"}
                </button>
              ) : null}
            </div>

            <div className={`relative mx-auto mt-4 w-full ${device === "phone" ? "max-w-[406px]" : ""}`}>
              <DevicePreview
                device={device}
                
                phoneHeight="min(720px, 72svh)"
                scrollRef={tour.scrollRef}
                scrollLabel={`${theme.name} sample gift, scrollable`}
                overlay={
                  tour.phase === "intro" ? (
                    <div key={tour.introKey} className="absolute inset-0 animate-[jb-fade-in_.45s_ease_both]">
                      <GiftIntro
                        contained
                        style={introStyleForTheme(theme.name)}
                        kind={themeKindOf(theme)}
                        palette={palette}
                        fonts={fonts}
                        backgroundStyle={backgroundFor(theme)}
                        recipientName={sample.name}
                        {...previewEngineProps(theme.name, sample.name)}
                        autoOpenAfter={tour.autoOpenAfter}
                        onOpen={tour.onOpen}
                        onSkip={tour.onOpen}
                      />
                    </div>
                  ) : null
                }
              >
                {/* One live 3D scene at a time: the gift's waits behind the opening. */}
                <Pause3DContext.Provider value={tour.phase !== "gift"}>
                  <FormatView key={format} site={{ ...site, format }} theme={theme} palette={palette} modules={modules} contributions={notes} calendarEntries={calendar} sample />
                </Pause3DContext.Provider>
              </DevicePreview>
            </div>
          </div>

          {/* Details and choices */}
          <aside className="flex flex-col gap-4">
            <div className="card-paper p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{theme.category}</p>
              <h1 className="mt-1 font-display text-4xl leading-none font-semibold tracking-tight">{theme.name}</h1>
              {theme.description ? <p className="mt-3 text-muted">{theme.description}</p> : null}
              <p className="mt-3 text-sm text-muted">
                This is a sample for {sample.name}. It plays on its own. Touch it any time to take over.
              </p>
            </div>

            {palettes.length > 1 ? (
              <div className="card-paper p-5">
                <h2 className="font-display text-lg font-semibold">Pick a color mood</h2>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {palettes.map((p, i) => {
                    const active = i === paletteIndex;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPaletteIndex(i)}
                        aria-pressed={active}
                        aria-label={`Color mood ${i + 1}`}
                        className={`squish flex min-h-16 flex-col overflow-hidden rounded-2xl ring-2 transition-shadow ${
                          active ? "ring-ink" : "ring-transparent hover:ring-ink/20"
                        }`}
                      >
                        <span className="h-9 w-full" style={{ backgroundColor: p.background }} />
                        <span className="flex h-7 w-full">
                          <span className="flex-1" style={{ backgroundColor: p.primary }} />
                          <span className="flex-1" style={{ backgroundColor: p.accent }} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">You can change colors and fonts later too.</p>
              </div>
            ) : null}

            <div className="card-paper p-5">
              <h2 className="font-display text-lg font-semibold">See it as</h2>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Format">
                {offeredFormats().map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={format === f.id}
                    onClick={() => {
                      setFormat(f.id);
                      tour.showGift();
                    }}
                    className={`squish rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      format === f.id ? "bg-ink text-cream" : "bg-paper ring-1 ring-ink/10 hover:bg-pink/40"
                    }`}
                  >
                    {f.title}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{FORMATS.find((f) => f.id === format)?.about}</p>
            </div>

            <div className="card-paper p-5">
              <h2 className="font-display text-lg font-semibold">Try the sections</h2>
              <p className="mt-1 text-sm text-muted">Switch any on and the gift fills in with sample notes, in this theme.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {MODULES.map((m) => {
                  const active = on.includes(m.type);
                  return (
                    <li key={m.type}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSection(m.type)}
                        title={m.blurb}
                        className={`squish inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors ${
                          active ? "bg-ink text-cream" : "bg-paper ring-1 ring-ink/12 hover:bg-pink/40"
                        }`}
                      >
                        <span aria-hidden="true" className="text-[13px]">{active ? "✓" : "+"}</span>
                        {m.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex items-center gap-3 text-xs">
                <button type="button" onClick={() => { setTried(MODULES.map((m) => m.type)); tour.showGift(); }} className="font-medium underline underline-offset-2">
                  Turn them all on
                </button>
                {tried ? (
                  <button type="button" onClick={() => setTried(null)} className="text-muted underline underline-offset-2">
                    Back to the theme's picks
                  </button>
                ) : null}
              </div>
            </div>

            <div className="sticky bottom-3 mt-auto flex flex-col gap-2 lg:static">
              <button
                type="button"
                onClick={use}
                className="squish min-h-14 w-full rounded-full bg-accent px-6 text-base font-semibold text-cream shadow-[0_12px_30px_-12px_rgba(194,54,107,0.7)] hover:bg-accent/90"
              >
                Use this theme
              </button>
              <button
                type="button"
                onClick={watchOpening}
                className="squish min-h-12 w-full rounded-full bg-glass px-6 text-sm font-medium ring-1 ring-ink/12 hover:bg-pink/40"
              >
                Watch the opening again
              </button>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
