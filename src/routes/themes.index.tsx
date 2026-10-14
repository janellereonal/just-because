import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { Bo3D } from "@/components/Bo3D";
import { fetchThemes, type Theme } from "@/lib/themes";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/themes/")({
  head: () => ({
    meta: [
      { title: "Themes | Just Because" },
      { name: "description", content: "Browse gift themes and see each one play, before you pick." },
      { property: "og:title", content: "Themes | Just Because" },
      { property: "og:description", content: "Browse gift themes and see each one play, before you pick." },
    ],
  }),
  component: ThemesPage,
});

/** Friendly occasion groups for the filter chips. */
const GROUPS: { id: string; label: string; match: (key: string) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "birthday", label: "Birthdays", match: (k) => k.includes("birthday") },
  { id: "love", label: "Love", match: (k) => /valentine|romance|anniversar/.test(k) },
  { id: "wedding", label: "Weddings & showers", match: (k) => /wedding|bridal|shower/.test(k) },
  { id: "holiday", label: "Holidays", match: (k) => /christmas|new year|season/.test(k) },
  { id: "goodbye", label: "Send-offs", match: (k) => /voyage|farewell|despidida/.test(k) },
  { id: "pets", label: "Pets", match: (k) => /pet|companion/.test(k) },
];

const keyOf = (t: Theme) => `${t.category} ${t.name}`.toLowerCase();

function ThemesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState("all");
  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  const groups = useMemo(() => GROUPS.filter((g) => g.id === "all" || themes.some((t) => g.match(keyOf(t)))), [themes]);
  const shown = useMemo(() => {
    const g = GROUPS.find((x) => x.id === group) ?? GROUPS[0]!;
    return themes.filter((t) => g.match(keyOf(t)));
  }, [themes, group]);

  function openTheme(id: string) {
    navigate({ to: "/themes/$id", params: { id } });
  }

  function useTheme(id: string, name: string) {
    if (!user) {
      toast.info("Sign in first, then you can start your gift.");
      navigate({ to: "/auth" });
      return;
    }
    toast.success(`${name} it is. Now let's name your gift.`);
    navigate({ to: "/create", search: { theme: id } });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-3 pt-6 sm:px-5">
        <div className="relative grid overflow-hidden rounded-[36px] bg-lilac px-6 py-10 sm:px-10 md:grid-cols-[1fr_300px] md:items-center">
          <span aria-hidden="true" className="absolute -top-16 left-1/3 size-48 rounded-full bg-white/40" />
          <span aria-hidden="true" className="absolute -bottom-20 -left-10 size-56 rounded-full bg-pink/70" />
          <div className="relative">
            <p className="font-mono text-[11px] tracking-[0.18em] text-ink/70 uppercase">Theme library</p>
            <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              Find the one that feels like them
            </h1>
            <p className="mt-3 max-w-[46ch] text-lg text-ink/75">
              Hover a theme (or scroll to it on your phone) to watch it play. Tap it to try the colors and see the opening.
            </p>
          </div>
          <Bo3D className="relative mx-auto h-[220px] w-full max-w-[300px] md:h-[280px]" mood="wave" label="Bo waving hello" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 pt-8 pb-16 sm:px-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by occasion">
          {groups.map((g) => {
            const active = g.id === group;
            const count = themes.filter((t) => g.match(keyOf(t))).length;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                aria-pressed={active}
                className={`squish min-h-11 rounded-full px-4 text-sm font-medium ring-1 transition-colors ${
                  active ? "bg-ink text-cream ring-ink" : "bg-glass text-ink ring-ink/10 hover:bg-pink/50"
                }`}
              >
                {g.label}
                <span className={`ml-1.5 text-xs ${active ? "text-cream/70" : "text-muted"}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card-paper h-[520px] animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-10 text-muted">No themes here yet. Try another occasion.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                onSelect={() => openTheme(theme.id)}
                footer={
                  <>
                    {theme.description ? <p className="mt-1.5 text-sm text-muted">{theme.description}</p> : null}
                    <div className="mt-auto flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => openTheme(theme.id)}
                        className="squish min-h-11 flex-1 rounded-full bg-glass px-4 text-sm font-medium ring-1 ring-ink/12 hover:bg-pink/40"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => useTheme(theme.id, theme.name)}
                        className="squish min-h-11 flex-1 rounded-full bg-accent px-4 text-sm font-medium text-cream hover:bg-accent/90"
                      >
                        Use this theme
                      </button>
                    </div>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
