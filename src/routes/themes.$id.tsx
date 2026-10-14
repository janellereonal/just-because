import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";
import { themeFont } from "@/components/ThemeMiniPreview";
import { GiftSiteView } from "@/components/GiftSiteView";
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

type View = "gift" | "opening";

function ThemeDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [view, setView] = useState<View>("gift");
  const [openingKey, setOpeningKey] = useState(0);
  const { data: allPalettes = [] } = usePalettes();

  const { data: theme, isLoading, error, refetch } = useQuery({
    queryKey: ["theme", id],
    queryFn: () => fetchThemeById(id),
  });

  const palettes = useMemo(() => (theme ? themePalettes(theme, allPalettes) : []), [theme, allPalettes]);
  const palette = palettes[paletteIndex] ?? palettes[0];
  const site = useMemo(() => (theme ? buildPreviewSite(theme, palette) : null), [theme, palette]);
  const modules = useMemo(() => (theme && site ? previewModules(theme, site.id) : []), [theme, site]);

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
  const included = MODULES.filter((m) => theme.default_modules.includes(m.type));
  const sample = sampleFor(theme);

  function use() {
    if (!user) {
      toast.info("Sign in first, then you can start your gift.");
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/create", search: { theme: id } });
  }

  function watchOpening() {
    setView("opening");
    setOpeningKey((k) => k + 1);
  }

  const tab = (value: View, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={view === value}
      className={`min-h-11 flex-1 rounded-full px-4 text-sm font-medium transition-colors ${
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
          <div className="relative overflow-hidden rounded-[36px] px-4 pt-5 pb-0 sm:px-8" style={{ backgroundColor: stageColorFor(theme) }}>
            <span aria-hidden="true" className="absolute -top-20 -right-16 size-64 rounded-full bg-white/40" />
            <span aria-hidden="true" className="absolute bottom-10 -left-20 size-56 rounded-full bg-white/30" />

            <div className="relative mx-auto flex max-w-[420px] gap-1 rounded-full bg-white/45 p-1 backdrop-blur">
              {tab("gift", "The gift", () => setView("gift"))}
              {tab("opening", "The opening", watchOpening)}
            </div>

            <div className="relative mx-auto mt-5 w-full max-w-[390px]">
              <div className="overflow-hidden rounded-t-[40px] border-[8px] border-b-0 border-ink bg-ink shadow-[0_30px_60px_-30px_rgba(43,37,34,0.6)]">
                <div className="relative h-[min(720px,72vh)] overflow-hidden rounded-t-[32px]">
                  {view === "gift" ? (
                    <div className="absolute inset-0 overflow-y-auto overscroll-contain" tabIndex={0} aria-label={`${theme.name} sample gift, scrollable`}>
                      <GiftSiteView site={site} theme={theme} modules={modules} contributions={[]} sample />
                    </div>
                  ) : (
                    <GiftIntro
                      key={openingKey}
                      contained
                      style={introStyleForTheme(theme.name)}
                      palette={palette}
                      fonts={fonts}
                      backgroundStyle={backgroundFor(theme)}
                      recipientName={sample.name}
                      onOpen={() => setView("gift")}
                      onSkip={() => setView("gift")}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details and choices */}
          <aside className="flex flex-col gap-4">
            <div className="card-paper p-5">
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{theme.category}</p>
              <h1 className="mt-1 font-display text-4xl leading-none font-semibold tracking-tight">{theme.name}</h1>
              {theme.description ? <p className="mt-3 text-muted">{theme.description}</p> : null}
              <p className="mt-3 text-sm text-muted">
                This is a sample for {sample.name}. Scroll inside the phone to see it all.
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

            {included.length > 0 ? (
              <div className="card-paper p-5">
                <h2 className="font-display text-lg font-semibold">What friends can add</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {included.map((m) => (
                    <li key={m.type} className="rounded-full bg-mint px-3 py-1.5 text-sm font-medium" title={m.blurb}>
                      {m.label}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted">Every section can be turned on or off once you start.</p>
              </div>
            ) : null}

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
