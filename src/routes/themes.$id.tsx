import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";
import { themeFont } from "@/components/ThemeMiniPreview";
import { useAuth } from "@/hooks/useAuth";
import { fetchThemeById } from "@/lib/themes";
import { usePalettes, themePalettes } from "@/hooks/usePalettes";
import { FONT_PAIRINGS, MODULES } from "@/lib/gift";

export const Route = createFileRoute("/themes/$id")({
  head: () => ({
    meta: [
      { title: "Theme preview — Just Because" },
      {
        name: "description",
        content: "See how a gift site theme looks before you use it, palettes and all.",
      },
      { property: "og:title", content: "Theme preview — Just Because" },
      {
        property: "og:description",
        content: "See how a gift site theme looks before you use it, palettes and all.",
      },
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
  const { data: allPalettes = [] } = usePalettes();

  const { data: theme, isLoading, error, refetch } = useQuery({
    queryKey: ["theme", id],
    queryFn: () => fetchThemeById(id),
  });

  if (isLoading) return <PageLoading label="Loading this theme…" />;
  if (error) {
    return (
      <PageError message="We couldn't load this theme just now." onRetry={() => void refetch()} />
    );
  }
  if (!theme) {
    return (
      <PageNotFound message="That theme link is no longer available. Have a look at the ones we have now." />
    );
  }

  const palettes = themePalettes(theme, allPalettes);
  const palette = palettes[paletteIndex] ?? palettes[0];
  const fonts = FONT_PAIRINGS[themeFont(theme)];
  const defaults = MODULES.filter((m) => theme.default_modules.includes(m.type));

  function use() {
    if (!user) {
      toast.info("Sign in first, then you can start your gift site.");
      navigate({ to: "/auth" });
      return;
    }
    navigate({ to: "/create", search: { theme: id } });
  }

  if (!palette) {
    return <PageNotFound title="This theme isn't ready yet" message="Its colours are still being set up. Try another theme for now." />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-5xl px-5 py-12">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
          {theme.category}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {theme.name}
        </h1>
        {theme.description ? (
          <p className="mt-3 max-w-[54ch] text-muted">{theme.description}</p>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Large placeholder preview */}
          <div
            className="overflow-hidden rounded-3xl p-8 shadow-sm ring-1 ring-ink/5"
            style={{
              backgroundColor: palette.background,
              color: palette.primary,
              fontFamily: fonts.body,
            }}
          >
            <div className="text-center">
              <p className="text-[11px] tracking-[0.22em] uppercase" style={{ color: palette.accent }}>
                {theme.category}
              </p>
              <p className="mt-3 text-4xl leading-tight" style={{ fontFamily: fonts.heading }}>
                Happy birthday, Maya
              </p>
              <p className="mt-2 text-sm opacity-75">
                Everyone who loves you added something here.
              </p>
            </div>

            {theme.default_modules.includes("countdown") ? (
              <div
                className="mx-auto mt-8 w-full max-w-xs rounded-2xl py-5 text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
              >
                <p className="text-3xl font-semibold" style={{ color: palette.accent }}>
                  12
                </p>
                <p className="text-xs tracking-[0.18em] uppercase opacity-70">days to go</p>
              </div>
            ) : null}

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl"
                  style={{ backgroundColor: `${palette.primary}1a` }}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {["“You made every Tuesday feel like a holiday.”", "“Here's to twenty more years.”"].map(
                (quote) => (
                  <div
                    key={quote}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "rgba(255,255,255,0.65)" }}
                  >
                    <p className="text-sm leading-relaxed">{quote}</p>
                    <p className="mt-2 text-xs" style={{ color: palette.accent }}>
                      — Sam
                    </p>
                  </div>
                ),
              )}
            </div>

            <div
              className="mt-4 flex items-center gap-3 rounded-2xl p-4"
              style={{ backgroundColor: "rgba(255,255,255,0.65)" }}
            >
              <span
                className="size-12 rounded-xl"
                style={{ backgroundColor: `${palette.primary}1a` }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">Our song</p>
                <p className="text-xs opacity-60">added by Alex</p>
              </div>
              <span
                className="grid size-9 place-items-center rounded-full text-xs"
                style={{ backgroundColor: palette.accent, color: palette.background }}
              >
                ▶
              </span>
            </div>

            <p className="mt-8 text-center text-xs opacity-70">
              Made with Just Because 💛
            </p>
          </div>

          {/* Side panel */}
          <aside className="space-y-6">
            <div className="card-paper p-5">
              <p className="text-sm font-medium">Palettes</p>
              <div className="mt-3 space-y-2">
                {palettes.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPaletteIndex(i)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                      i === paletteIndex ? "border-accent bg-accent/8" : "border-line hover:bg-glass/60"
                    }`}
                  >
                    {[p.background, p.primary, p.accent].map((c) => (
                      <span
                        key={c}
                        className="size-5 rounded-full ring-1 ring-ink/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <span className="ml-auto font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
                      {i === paletteIndex ? "In preview" : "Try"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card-paper p-5">
              <p className="text-sm font-medium">This theme includes</p>
              <ul className="mt-3 space-y-2">
                {defaults.map((m) => (
                  <li key={m.type} className="text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="block text-xs text-muted">{m.blurb}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">
                All seven sections stay available — these are just the suggested ones.
              </p>
            </div>

            <button
              onClick={use}
              className="w-full rounded-full bg-accent px-5 py-3.5 font-medium text-cream transition-colors hover:bg-accent/90"
            >
              Use this theme
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
}
