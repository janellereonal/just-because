import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { t } from "@/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TalkingBo } from "@/components/TalkingBo";
import { OpeningCard, OpeningPreviewModal } from "@/components/OpeningCard";
import { LayoutStyleCard, LayoutStyleModal } from "@/components/styles/LayoutStyleCard";
import { OccasionChips } from "@/components/styles/OccasionChips";
import { normalizeCharacter, type CharacterSetting } from "@/themes/_shared/cast/types";
import { fetchThemes, type Theme } from "@/lib/themes";
import { useAuth } from "@/hooks/useAuth";
import { isFlagOn } from "@/config/flags";
import { isOccasionId, occasionInfo, occasionName, type OccasionId } from "@/lib/occasions";
import { STYLES, isRecommended, lookFor, splitForOccasion, styleCopy, styleTitle, type StyleInfo } from "@/lib/styles";

export const Route = createFileRoute("/styles/")({
  validateSearch: (search: Record<string, unknown>): { occasion?: OccasionId | undefined } => ({
    occasion: isOccasionId(search["occasion"]) && !occasionInfo(search["occasion"]).groupOnly ? search["occasion"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: t("gallery.title") },
      { name: "description", content: t("gallery.description") },
      { property: "og:title", content: t("gallery.title") },
      { property: "og:description", content: t("gallery.description") },
    ],
  }),
  component: StylesPage,
});

function StylesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { occasion: fromUrl } = Route.useSearch();
  const [occasion, setOccasion] = useState<OccasionId | null>(fromUrl ?? null);
  const [row, setRow] = useState<OccasionId | null | undefined>(undefined);
  const [fullTheme, setFullTheme] = useState<{ style: StyleInfo; theme: Theme } | null>(null);
  const [fullLayout, setFullLayout] = useState<StyleInfo | null>(null);
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
  const { data: themes = [], isLoading } = useQuery({ queryKey: ["themes", "published"], queryFn: () => fetchThemes(false) });
  const byName = useMemo(() => new Map(themes.map((x) => [x.name, x])), [themes]);

  // Styles whose theme is still a draft stay hidden until it's published in /admin.
  const split = useMemo(
    () => splitForOccasion(occasion, STYLES.filter((s) => s.looks.length === 0 || s.looks.some((l) => byName.has(l.theme)))),
    [occasion, byName],
  );
  // Picking what it's for shows only the styles for it; the rest stay one tap away.
  const [showOthers, setShowOthers] = useState(false);
  useEffect(() => setShowOthers(false), [occasion]);
  const shown = showOthers ? [...split.fits, ...split.others] : split.fits;

  function pick(next: OccasionId | null) {
    setOccasion(next);
    void navigate({ to: "/styles", search: { occasion: next ?? undefined }, replace: true, resetScroll: false });
  }

  function useStyle(style: StyleInfo) {
    // Signed out, the /create guard sends them to sign in and brings them back with the style
    // (or, with guestStart, starts them as a guest right there).
    if (!user && !isFlagOn("guestStart")) toast.info("Sign in first, then you can start your gift.");
    else toast.success(`${styleTitle(style.id)} it is. Now, who's it for?`);
    navigate({
      to: "/create",
      search: { style: style.id, occasion: occasion ?? undefined, theme: undefined, format: undefined, from: undefined, sections: undefined },
    });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-3 pt-6 sm:px-5">
        <div className="relative grid overflow-hidden rounded-[36px] bg-lilac px-6 py-10 sm:px-10 md:grid-cols-[1fr_300px] md:items-center">
          <span aria-hidden="true" className="absolute -top-16 left-1/3 size-48 rounded-full bg-white/40" />
          <span aria-hidden="true" className="absolute -bottom-20 -left-10 size-56 rounded-full bg-pink/70" />
          <div className="relative">
            <p className="font-mono text-[11px] tracking-[0.18em] text-ink/70 uppercase">{t("gallery.kicker")}</p>
            <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] font-semibold tracking-tight text-balance">{t("gallery.heading")}</h1>
            <p className="mt-3 max-w-[46ch] text-lg text-ink/75">{t("gallery.body")}</p>
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
        <p className="mb-3 font-display text-lg font-semibold">{t("gallery.filter")}</p>
        <OccasionChips value={occasion} onChange={pick} {...(row !== undefined ? { open: row } : {})} onOpen={setRow} />

        {isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card-paper h-[520px] animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {shown.map((style, i) => {
                const tag = isRecommended(style.id, occasion) ? t("picker.style.recommended") : undefined;
                const look = lookFor(style, occasion);
                const theme = look ? byName.get(look.theme) : undefined;
                if (theme) {
                  return (
                    <OpeningCard
                      key={style.id}
                      theme={theme}
                      index={i}
                      character={character}
                      title={styleTitle(style.id)}
                      line={styleCopy(style.id)}
                      useLabel={t("gallery.use")}
                      tag={tag}
                      onOpen={() => setFullTheme({ style, theme })}
                      onUse={() => useStyle(style)}
                    />
                  );
                }
                return <LayoutStyleCard key={style.id} style={style} index={i} tag={tag} onOpen={() => setFullLayout(style)} onUse={() => useStyle(style)} />;
              })}
            </AnimatePresence>
          </motion.div>
        )}
        {occasion && split.others.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowOthers((v) => !v)}
              className="rounded-full border border-dashed border-ink/25 px-5 py-2.5 text-sm font-medium hover:bg-cream"
            >
              {showOthers ? t("picker.style.hideOthers") : t("picker.style.showOthers", { n: split.others.length })}
            </button>
            <p className="text-sm text-muted">{t("gallery.filteredFor", { occasion: occasionName(occasion).toLowerCase() })}</p>
          </div>
        ) : null}
      </section>
      <SiteFooter />

      <OpeningPreviewModal
        theme={fullTheme?.theme ?? null}
        character={character}
        onClose={() => setFullTheme(null)}
        onUse={() => fullTheme && useStyle(fullTheme.style)}
        useLabel={t("gallery.use")}
        format={fullTheme?.style.body}
      />
      <LayoutStyleModal style={fullLayout} onClose={() => setFullLayout(null)} onUse={useStyle} />
    </div>
  );
}
