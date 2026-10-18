import { useEffect, useMemo, useState } from "react";
import { NEW_THEME_NAMES, PH_THEME_NAMES, needsCountry, orderThemes } from "@/lib/themeOrder";
import { getVisitorCountry } from "@/lib/api";
import { engineThemeForName } from "@/themes/engine/registry";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { isFlagOn } from "@/config/flags";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OpeningCard, OpeningPreviewModal } from "@/components/OpeningCard";
import { normalizeCharacter, type CharacterSetting } from "@/themes/_shared/cast/types";
import { SPRING } from "@/themes/_shared/stage";
import { TalkingBo } from "@/components/TalkingBo";
import { fetchThemes, type Theme } from "@/lib/themes";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/themes/")({
  // With styles on, the gallery lives at /styles.
  beforeLoad: () => {
    if (isFlagOn("styles")) throw redirect({ to: "/styles", search: { occasion: undefined }, statusCode: 301 });
  },
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
  { id: "new", label: "New", match: (k) => NEW_THEME_NAMES.some((n) => k.includes(n)) },
  { id: "christmas", label: "Christmas", match: (k) => /christmas|parol|simbang/.test(k) },
  { id: "birthday", label: "Birthdays", match: (k) => k.includes("birthday") },
  { id: "love", label: "Love", match: (k) => /valentine|romance|anniversar/.test(k) },
  { id: "wedding", label: "Weddings & showers", match: (k) => /wedding|bridal|shower/.test(k) },
  { id: "holiday", label: "Holidays", match: (k) => /christmas|new year|season/.test(k) },
  { id: "goodbye", label: "Send-offs", match: (k) => /voyage|farewell|despidida/.test(k) },
  { id: "pets", label: "Pets", match: (k) => /pet|companion/.test(k) },
  { id: "style", label: "Any occasion", match: (k) => /handwritten|game|pixel|style/.test(k) },
  { id: "family", label: "Family and far away", match: (k) => /care package|balikbayan|family/.test(k) },
  { id: "philippines", label: "Philippines", match: (k) => PH_THEME_NAMES.some((n) => k.includes(n)) },
];

const ENGINE_GROUPS = new Set(["new", "christmas", "family", "philippines"]);

const keyOf = (t: Theme) => `${t.category} ${t.name}`.toLowerCase();

function ThemesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState("all");
  const [full, setFull] = useState<Theme | null>(null);
  // If you're halfway through casting a gift, the previews star your character.
  const [character, setCharacter] = useState<CharacterSetting | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("jb-cast-draft");
      if (raw) setCharacter(normalizeCharacter(JSON.parse(raw)));
    } catch {
      /* no saved cast */
    }
  }, []);
  const { data: rawThemes = [], isLoading } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });
  const { data: country = null } = useQuery({ queryKey: ["visitor-country"], queryFn: () => getVisitorCountry(), staleTime: Infinity, enabled: needsCountry(rawThemes) });
  const themes = useMemo(() => orderThemes(rawThemes, country), [rawThemes, country]);

  // The newer groups only show once one of the engine themes is in them (they're drafts until published).
  const groups = useMemo(
    () =>
      GROUPS.filter(
        (g) => g.id === "all" || themes.some((t) => g.match(keyOf(t)) && (!ENGINE_GROUPS.has(g.id) || !!engineThemeForName(t.name))),
      ),
    [themes],
  );
  const shown = useMemo(() => {
    const g = GROUPS.find((x) => x.id === group) ?? GROUPS[0]!;
    return themes.filter((t) => g.match(keyOf(t)));
  }, [themes, group]);

  function openTheme(id: string) {
    navigate({ to: "/themes/$id", params: { id } });
  }

  function useTheme(id: string, name: string) {
    // Signed out, the /create guard sends them to sign in and brings them back here with the theme.
    if (!user) toast.info("Sign in first, then you can start your gift.");
    else toast.success(`${name} it is. Now, who's it for?`);
    navigate({ to: "/create", search: { theme: id, format: undefined, from: undefined, sections: undefined } });
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
              Every theme opens like something real: a letter, a record, a cake. Hover one to watch it, tap it to open it yourself.
            </p>
          </div>
          <TalkingBo
            className="mx-auto h-[220px] w-full max-w-[300px] md:h-[280px]"
            label="Bo waving hello"
            hoverAccessories
            intro={[{ text: "Pick one you like.", face: "wink" }]}
            onTap={[
              { text: "I look good in all of them.", face: "happy" },
              { text: "Boop.", face: "blep" },
            ]}
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 pt-8 pb-16 sm:px-5">
        <LayoutGroup>
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
                  className={`squish relative min-h-11 rounded-full px-4 text-sm font-medium ring-1 transition-colors ${
                    active ? "text-cream ring-ink" : "bg-glass text-ink ring-ink/10 hover:bg-pink/50"
                  }`}
                >
                  {active ? <motion.span layoutId="theme-filter" className="absolute inset-0 rounded-full bg-ink" transition={SPRING.snappy} /> : null}
                  <span className="relative">
                    {g.label}
                    <span className={`ml-1.5 text-xs ${active ? "text-cream/70" : "text-muted"}`}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        {isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card-paper h-[520px] animate-pulse" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-10 text-muted">No themes here yet. Try another occasion.</p>
        ) : (
          <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((theme, i) => (
                <OpeningCard
                  key={theme.id}
                  theme={theme}
                  index={i}
                  character={character}
                  onOpen={() => setFull(theme)}
                  onUse={() => useTheme(theme.id, theme.name)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
      <SiteFooter />

      <OpeningPreviewModal
        theme={full}
        character={character}
        onClose={() => setFull(null)}
        onUse={(t) => useTheme(t.id, t.name)}
        onSample={(t) => openTheme(t.id)}
      />
    </div>
  );
}
