import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { fetchThemes } from "@/lib/themes";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/themes/")({
  head: () => ({
    meta: [
      { title: "Themes — Just Because" },
      {
        name: "description",
        content: "Browse ready-made gift site templates and their colour palettes.",
      },
      { property: "og:title", content: "Themes — Just Because" },
      {
        property: "og:description",
        content: "Browse ready-made gift site templates and their colour palettes.",
      },
    ],
  }),
  component: ThemesPage,
});

function ThemesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  function openTheme(id: string) {
    navigate({ to: "/themes/$id", params: { id } });
  }

  function useTheme(id: string, name: string) {
    if (!user) {
      toast.info("Sign in first, then you can start your gift site.");
      navigate({ to: "/auth" });
      return;
    }
    toast.success(`${name} picked — let's name your gift site.`);
    navigate({ to: "/create", search: { theme: id } });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
          Theme library
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Pick the mood of the moment
        </h1>
        <p className="mt-3 max-w-[52ch] text-muted">
          Every theme is a fixed layout with its own curated palettes. Contributions flow into its
          slots automatically.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted">Loading themes…</p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {themes.map((theme, i) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                tiltRight={i % 2 === 1}
                onSelect={() => openTheme(theme.id)}
                footer={
                  <div className="px-1 pt-2">
                    {theme.description ? (
                      <p className="text-xs text-muted">{theme.description}</p>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => openTheme(theme.id)}
                        className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-glass/60"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => useTheme(theme.id, theme.name)}
                        className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-cream hover:bg-accent/90"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
