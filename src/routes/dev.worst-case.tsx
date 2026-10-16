import { useMemo } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchThemes } from "@/lib/themes";
import { themeKindOf } from "@/lib/themeKind";
import { themePalettes, usePalettes } from "@/hooks/usePalettes";
import { FormatView } from "@/components/formats/FormatView";
import { GiftIntro } from "@/components/GiftIntro";
import { buildPreviewSite } from "@/components/ThemeLivePreview";
import { showcaseSections } from "@/components/SampleGift";
import { sampleNotes } from "@/lib/sampleSections";
import { FONT_PAIRINGS, type SiteModule } from "@/lib/gift";
import { introStyleForTheme } from "@/lib/intro";
import { LIMITS } from "@/lib/limits";
import type { GiftFormat } from "@/lib/formats";
import { ENGINE_THEMES } from "@/themes/engine/registry";
import { WORST_SLOTS } from "@/themes/engine/slots";

/**
 * Dev only: every field at its limit, to see where layouts break.
 * /dev/worst-case?kind=wedding&format=storybook  (add &intro=1 for the opening)
 */
export const Route = createFileRoute("/dev/worst-case")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  // Dev only: the route is a 404 in production, so it never needs a robots tag.
  validateSearch: (s: Record<string, unknown>) => ({
    kind: typeof s["kind"] === "string" ? s["kind"] : "birthday",
    format: (typeof s["format"] === "string" ? s["format"] : "scrapbook") as GiftFormat,
    intro: s["intro"] === 1 || s["intro"] === "1" || s["intro"] === true,
    cover: s["cover"] === 1 || s["cover"] === "1" || s["cover"] === true,
    /** An engine theme's id (winter-cabin, parol...): its opening at the limits. Use with intro=1. */
    engine: typeof s["engine"] === "string" ? s["engine"] : "",
  }),
  component: WorstCase,
});

/** 40 characters with an apostrophe, an ampersand, an accent and an emoji. */
export const WORST_NAME = "Anne-Marie O'Brien & Zoë 🎉 dela Cruz-Lim";
const fill = (seed: string, max: number) => {
  let out = "";
  while (out.length < max) out += (out ? " " : "") + seed;
  return out.slice(0, max).trimEnd();
};
const WORST = {
  heading: fill("A very long heading that keeps going so we see where it wraps & breaks", LIMITS.heading),
  intro: fill("Everyone who loves you put something in here, so take your time & read slowly.", LIMITS.introMessage),
  footer: fill("With love, from all of us, every single one, near & far.", LIMITS.footer),
  greeting: fill("For you, from all of us who couldn't be there in person.", LIMITS.greeting),
  letter: fill(
    "I keep thinking about the summer we drove to the coast with no plan & a full tank. You sang every song wrong & I never told you. Thank you for every late call, every early coffee, and every time you said it would be okay.",
    LIMITS.letter,
  ),
  caption: fill("The picnic where the wind took the napkins & we laughed until it rained", LIMITS.caption),
  words: fill("kind, funny, unstoppable, brave, generous, loud, warm, honest", LIMITS.words),
  ornament: fill("Merry everything. You make the whole year brighter & warmer than it has any right to be.", LIMITS.ornament),
};

function WorstCase() {
  const { kind, format, intro, cover, engine } = Route.useSearch();
  const engineDef = ENGINE_THEMES.find((x) => x.id === engine);
  const { data: themes = [] } = useQuery({ queryKey: ["themes", false], queryFn: () => fetchThemes(false) });
  const { data: all = [] } = usePalettes();
  const theme = themes.find((t) => themeKindOf(t) === kind);
  const pal = theme ? themePalettes(theme, all)[0] : undefined;
  const palette = pal ? { background: pal.background, primary: pal.primary, accent: pal.accent } : undefined;
  const site = useMemo(() => {
    if (!theme) return null;
    const base = buildPreviewSite(theme, palette);
    return {
      ...base,
      format,
      intro_text: WORST.greeting,
      custom_text: { heading: WORST.heading, recipient_name: WORST_NAME, intro_message: WORST.intro, footer_note: WORST.footer },
    };
  }, [theme, palette, format]);
  const modules: SiteModule[] = useMemo(
    () => (theme && site ? showcaseSections(theme).map((type, i) => ({ id: `wc-${i}`, site_id: site.id, module_type: type, price: 0, enabled: true })) : []),
    [theme, site],
  );
  const notes = useMemo(() => {
    if (!site) return [];
    const seen = new Set<string>();
    return sampleNotes(WORST_NAME, site.id).map((n) => {
      const first = !seen.has(n.module_type);
      seen.add(n.module_type);
      if (!first) return n;
      const long =
        n.module_type === "letters" || n.module_type === "openwhen" || n.module_type === "capsule"
          ? WORST.letter
          : n.module_type === "wordcloud"
            ? WORST.words
            : n.module_type === "tree"
              ? WORST.ornament
              : n.text_content
                ? WORST.caption
                : n.text_content;
      return { ...n, author_name: WORST_NAME, text_content: long };
    });
  }, [site]);
  if (!theme || !site || !palette) return <p className="p-6">Loading…</p>;
  if (intro) {
    const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;
    return (
      <GiftIntro
        style={introStyleForTheme(theme.name)}
        kind={kind as never}
        palette={palette}
        fonts={fonts}
        backgroundStyle={site.background_style ?? "paper"}
        recipientName={WORST_NAME}
        introText={WORST.greeting}
        settings={{ badge_text: fill("A little something for you", LIMITS.openingLine), button_text: fill("Open it whenever you like", LIMITS.button) }}
        character={null}
        iconSet={null}
        contributors={[WORST_NAME, "Jo", "Mika"]}
        {...(engineDef
          ? {
              themeName: engineDef.dbName,
              slots: WORST_SLOTS,
              notes: notes.map((n) => ({ id: n.id, author: n.author_name, text: n.text_content, media: null, kind: n.module_type })),
              themeOptions: { simbang: true, now: "2026-12-24T08:00:00", year: 2026 },
            }
          : {})}
        onOpen={() => {}}
        onSkip={() => {}}
      />
    );
  }
  return (
    <div className="min-h-dvh [container:gift/inline-size]">
      <FormatView site={site} theme={theme} palette={palette} modules={modules} contributions={notes} sample showCover={cover} />
    </div>
  );
}
