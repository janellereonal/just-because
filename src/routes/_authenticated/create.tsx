import { useEffect, useMemo, useRef, useState } from "react";
import { OCCASION_NAMES } from "@/copy/strings";
import { ConciergeOffer } from "@/components/ConciergeOffer";
import { engineThemeForName } from "@/themes/engine/registry";
import { themeFont } from "@/components/ThemeMiniPreview";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { createSite, getVisitorCountry, listMySites } from "@/lib/api";
import { isFlagOn } from "@/config/flags";
import { GUIDE_COPY } from "@/copy/strings";
import { NewUserGuide, guideSeen } from "@/components/NewUserGuide";
import { AnimatePresence } from "motion/react";
import { needsCountry, orderThemes } from "@/lib/themeOrder";
import { LIMITS } from "@/lib/limits";
import { fetchThemes } from "@/lib/themes";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";
import { MODULES, normalizeSite, type ModuleType } from "@/lib/gift";
import { PRESETS } from "@/lib/presets";
import { occasionTitle, themeKindOf } from "@/lib/themeKind";
import { SectionPreview } from "@/components/SectionPreview";
import { FormatPicker } from "@/components/FormatPicker";
import { stageColorFor } from "@/components/ThemeCard";
import { formatInfo, isGiftFormat, type GiftFormat } from "@/lib/formats";
import { BoBuddy } from "@/components/BoBuddy";
import { accessoryForTheme, type BoAccessory } from "@/lib/bo3d/accessories";
import { boAccessory, boReact, boSay, markGiftCreated } from "@/lib/mascot/bus";

/** What Bo says when he tries on each theme's accessory. */
const THEME_LINES: Record<BoAccessory, string> = {
  party_hat: "Party hat on. Let's celebrate.",
  heart: "Aww, a love note.",
  suitcase: "Packed and ready to wave goodbye.",
  santa_hat: "Ho ho ho. Cozy season.",
  paw: "For the fluffy ones.",
  sparkler: "A sparkly fresh start.",
  rosette: "Another year together. Sweet.",
  flower: "Flowers for the big day.",
};

export const Route = createFileRoute("/_authenticated/create")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    theme?: string | undefined;
    format?: GiftFormat | undefined;
    from?: "me" | undefined;
    sections?: string | undefined;
  } => ({
    theme: typeof search["theme"] === "string" ? search["theme"] : undefined,
    format: isGiftFormat(search["format"]) ? search["format"] : undefined,
    /** `from=me` starts on "Just me" (a gift from one person). */
    from: search["from"] === "me" ? ("me" as const) : undefined,
    /** Sections tried on the theme page, comma separated. */
    sections: typeof search["sections"] === "string" ? search["sections"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create a gift | Just Because" },
      { name: "description", content: "Name your gift and choose what friends can add." },
      { property: "og:title", content: "Create a gift | Just Because" },
      {
        property: "og:description",
        content: "Name your gift and choose what friends can add.",
      },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const { theme: themeFromUrl, format: formatFromUrl, from: fromUrl, sections: sectionsFromUrl } = Route.useSearch();
  const { data: rawThemes = [] } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });
  const { data: country = null } = useQuery({ queryKey: ["visitor-country"], queryFn: () => getVisitorCountry(), staleTime: Infinity, enabled: needsCountry(rawThemes) });
  const themes = useMemo(() => orderThemes(rawThemes, country), [rawThemes, country]);

  // New organisers (no gifts yet) see a short guide first, once. Shares the dashboard's cache.
  const guideOn = isFlagOn("newUserGuide");
  const { data: mySites } = useQuery({
    queryKey: ["my-sites"],
    queryFn: async () => (await listMySites()).map((row) => normalizeSite(row as Record<string, unknown>)),
    enabled: guideOn,
  });
  const [guide, setGuide] = useState(false);
  useEffect(() => {
    if (guideOn && mySites && mySites.length === 0 && !guideSeen()) setGuide(true);
  }, [guideOn, mySites]);

  const [recipient, setRecipient] = useState("");
  const [solo, setSolo] = useState(fromUrl === "me");
  const [themeId, setThemeId] = useState<string | undefined>(themeFromUrl);
  const [format, setFormat] = useState<GiftFormat>(formatFromUrl ?? "scrapbook");
  // Sections tried on the theme page come along and count as the creator's own pick.
  const fromThemePage = (sectionsFromUrl ?? "").split(",").filter((t): t is ModuleType => MODULES.some((m) => m.type === t));
  const [selected, setSelected] = useState<ModuleType[]>(fromThemePage.length ? fromThemePage : ["letters", "photobooth"]);
  const [touched, setTouched] = useState(fromThemePage.length > 0);
  const [previewed, setPreviewed] = useState<ModuleType>("letters");
  const [busy, setBusy] = useState(false);

  const activeTheme = themes.find((t) => t.id === (themeId ?? themeFromUrl));

  // Bo reacts as the form fills in.
  const accessory = accessoryForTheme(activeTheme);
  useEffect(() => {
    boAccessory(accessory);
    return () => boAccessory(null);
  }, [accessory]);
  const nameSaid = useRef(false);
  useEffect(() => {
    if (nameSaid.current || recipient.trim().length < 2) return;
    const t = window.setTimeout(() => {
      nameSaid.current = true;
      boSay(`${recipient.trim()} is so lucky.`, "love");
    }, 900);
    return () => window.clearTimeout(t);
  }, [recipient]);
  function pickTheme(id: string | undefined) {
    setThemeId(id);
    // Engine themes suggest a format (Debut reads best as a storybook) unless one was picked in the link.
    const occ = engineThemeForName(themes.find((x) => x.id === id)?.name)?.occasion;
    if (occ && !formatFromUrl) setFormat(occ.defaultFormat);
    const acc = accessoryForTheme(themes.find((t) => t.id === id));
    if (acc) boSay(THEME_LINES[acc], "wink");
  }
  function pickFormat(next: GiftFormat) {
    setFormat(next);
    if (next === "comic") {
      boReact("bam");
      boSay("BAM.", "surprised");
    } else {
      boReact("hug");
      boSay("I love a good scrapbook.", "love");
    }
  }
  const { data: allPalettes = [] } = usePalettes();
  // A new gift starts on the theme's first suggested palette so it already looks good.
  const defaultPalette = suggestedPalettes(activeTheme ?? null, allPalettes)[0] ?? null;
  // Themes on the theme engine bring their own starting sections (their occasion template).
  const engineOccasion = engineThemeForName(activeTheme?.name)?.occasion;
  const suggested: ModuleType[] = activeTheme
    ? engineOccasion
      ? (engineOccasion.sections.filter((x) => MODULES.some((m) => m.type === x)) as ModuleType[])
      : PRESETS[themeKindOf(activeTheme)]
    : [];
  const [showMore, setShowMore] = useState(false);
  const pool = MODULES.filter((mod) => !(solo && mod.type === "tree"));
  // Five rows to start: the theme's picks, topped up with the everyday ones. "More" shows the rest.
  const CORE: ModuleType[] = ["letters", "photobooth", "songs", "voice", "wordcloud"];
  const ordered = [...new Set<ModuleType>([...suggested, ...CORE, ...pool.map((m) => m.type)])]
    .map((t) => pool.find((m) => m.type === t))
    .filter((m): m is (typeof pool)[number] => !!m);
  const firstFive = ordered.slice(0, 5).map((m) => m.type);
  const listed = showMore ? ordered : ordered.filter((m) => firstFive.includes(m.type) || selected.includes(m.type));
  const hidden = ordered.filter((m) => !listed.includes(m));

  // Pre-select the theme's suggested modules until the creator edits the list.
  useEffect(() => {
    if (touched || suggested.length === 0) return;
    setSelected(suggested);
  }, [activeTheme?.id, touched]);

  function toggle(type: ModuleType) {
    setTouched(true);
    setSelected((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  const creating = useRef(false);
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating.current) return;
    if (!recipient.trim()) {
      toast.error("Add the name of who it's for.");
      document.getElementById("gift-for")?.focus();
      return;
    }
    if ((solo ? selected.filter((t) => t !== "tree") : selected).length === 0) {
      toast.error(solo ? "Pick at least one thing you'll add." : "Pick at least one thing friends can add.");
      return;
    }
    creating.current = true;
    setBusy(true);
    let data: { id: string };
    try {
      data = await createSite({
        data: {
          title: occasionTitle(activeTheme, recipient),
          recipientName: recipient.trim(),
          themeId: themeId ?? themeFromUrl ?? null,
          format,
          paletteId: defaultPalette?.id ?? null,
          customColors: defaultPalette
            ? {
                background: defaultPalette.background,
                primary: defaultPalette.primary,
                accent: defaultPalette.accent,
              }
            : {},
          treeRevealDate: activeTheme?.name.toLowerCase().includes("christmas")
            ? `${new Date().getFullYear()}-12-25`
            : null,
          modules: solo ? selected.filter((t) => t !== "tree") : selected,
          solo,
          ...(activeTheme ? { fontChoice: themeFont(activeTheme) } : {}),
        },
      });
    } catch (error) {
      creating.current = false;
      setBusy(false);
      const msg = error instanceof Error ? error.message : "";
      toast.error(msg && msg.length < 160 && !/fetch|network/i.test(msg) ? msg : "Couldn't create that gift. Please try again.");
      return;
    }
    creating.current = false;
    setBusy(false);
    markGiftCreated();
    navigate({ to: "/sites/$id", params: { id: data.id } });
  }

  const step = (n: number, title: string, hint?: string) => (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-pink font-display text-base font-semibold">
        {n}
      </span>
      <div>
        <h2 className="font-display text-xl leading-tight font-semibold">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-ink/60">{hint}</p> : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <BoBuddy followFocus intro={false} />
      <AnimatePresence>{guide ? <NewUserGuide onClose={() => setGuide(false)} /> : null}</AnimatePresence>
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-28 sm:px-5">
        <div className="relative pr-24 sm:pr-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">New gift</p>
          {/* Bo's spot: beside the heading, clear of the header and the text. */}
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-px w-20 sm:right-2 sm:w-24"
            data-bo-perch
            data-bo-always
            data-bo-say="Hi, I'm Bo. Let's make something nice."
          />
          <h1 className="mt-2 max-w-xl font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            Let's set up the gift
          </h1>
          <p className="mt-3 max-w-lg text-ink/65">
            {solo
              ? "Takes a minute. You can change everything later, and add your notes whenever you're ready."
              : "Takes a minute. You can change everything later, even after friends start adding notes."}
          </p>
          {guideOn ? (
            <button type="button" onClick={() => setGuide(true)} className="mt-2 text-sm font-medium text-accent underline underline-offset-4">
              {GUIDE_COPY.reopen}
            </button>
          ) : null}
        </div>

        <form onSubmit={handleCreate} className="mt-10 space-y-5" data-bo-zone>
          <div className="card-paper relative p-5 sm:p-7">
            {step(1, "Who's it from?", "You can switch this later.")}
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Who's it from">
              {(
                [
                  {
                    value: false,
                    title: "Me and friends",
                    copy: "Share one link. Friends add their notes, photos and songs.",
                    art: "👯",
                    tint: "bg-butter/70",
                  },
                  {
                    value: true,
                    title: "Just me",
                    copy: "For your partner, best friend or mom. You make every page yourself.",
                    art: "💌",
                    tint: "bg-pink/70",
                  },
                ] as const
              ).map((o) => {
                const on = solo === o.value;
                return (
                  <button
                    key={o.title}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setSolo(o.value);
                      if (o.value) boSay("Aww, just from you. They're lucky.", "love");
                      else boSay("The more, the merrier.", "happy");
                    }}
                    className={`squish relative flex items-start gap-3.5 rounded-2xl p-4 text-left transition-shadow ${o.tint} ${on ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1px_var(--accent)]"}`}
                  >
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl">
                      {o.art}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-lg leading-tight font-semibold">{o.title}</span>
                      <span className="mt-1 block text-sm text-ink/65">{o.copy}</span>
                    </span>
                    {on ? (
                      <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-ink text-[12px] text-cream">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -right-36 hidden w-24 xl:block"
            >
              <span className="sticky top-[46vh] block h-px w-24" data-bo-perch data-bo-x="0.5" />
            </span>
            {step(2, "Who's it for?", "Their first name, or what you call them. Two names work too.")}
            <label htmlFor="gift-for" className="sr-only">
              Who's it for
            </label>
            <input
              id="gift-for"
              required
              maxLength={LIMITS.recipientName}
              autoComplete="off"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={solo ? "Sam" : "Ana"}
              className="mt-5 w-full rounded-2xl border border-line bg-paper px-5 py-4 font-display text-lg outline-none transition-colors focus:border-accent focus:bg-white"
            />
            <p className="mt-3 text-sm text-muted">
              The gift opens with{" "}
              <span className="font-display text-base text-ink">
                {occasionTitle(activeTheme, recipient.trim() || (solo ? "Sam" : "Ana"))}
              </span>
              {recipient.trim() ? null : <span className="ml-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">(example)</span>}
              . You can change it later.
            </p>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -right-36 hidden w-24 xl:block"
            >
              <span
                className="sticky top-[46vh] block h-px w-24"
                data-bo-perch
                data-bo-x="0.5"
                data-bo-say="Pick a mood. I'll dress up for it."
              />
            </span>
            {step(3, "Pick a theme", "Sets the colors, the opening and Bo's outfit.")}
            <div
              className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Theme"
            >
              {themes.map((t) => {
                const on = (themeId ?? themeFromUrl) === t.id;
                const pals = suggestedPalettes(t, allPalettes);
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => pickTheme(on ? undefined : t.id)}
                    className={`squish relative overflow-hidden rounded-2xl p-3.5 text-left transition-shadow ${on ? "shadow-[0_0_0_2px_var(--accent)]" : "shadow-[0_0_0_1px_var(--line)] hover:shadow-[0_0_0_1px_var(--accent)]"}`}
                    style={{ backgroundColor: stageColorFor(t) }}
                  >
                    <span
                      aria-hidden
                      className="absolute -top-6 -right-6 size-16 rounded-full bg-white/45"
                    />
                    <span className="relative block font-mono text-[10px] tracking-[0.14em] text-ink/60 uppercase">
                      {t.category}
                    </span>
                    <span className="relative mt-0.5 block font-display text-base leading-tight font-semibold">
                      {t.name}
                    </span>
                    <span className="relative mt-3 flex -space-x-1.5" aria-hidden>
                      {pals.slice(0, 3).map((p, i) => (
                        <span
                          key={i}
                          className="size-5 rounded-full ring-2 ring-white"
                          style={{
                            background: `conic-gradient(${p.background} 0 50%, ${p.accent} 50% 75%, ${p.primary} 75%)`,
                          }}
                        />
                      ))}
                    </span>
                    {on ? (
                      <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-ink text-[12px] text-cream">
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {activeTheme?.description ? (
              <p className="mt-3 text-sm text-ink/60">{activeTheme.description}</p>
            ) : null}
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -right-36 hidden w-24 xl:block"
            >
              <span
                className="sticky top-[46vh] block h-px w-24"
                data-bo-perch
                data-bo-x="0.5"
                data-bo-say="How should it open?"
              />
            </span>
            {step(
              4,
              "Choose how it opens",
              "Same notes, different way to open them. Switch any time.",
            )}
            <div className="mt-4">
              <FormatPicker value={format} onChange={pickFormat} bare />
            </div>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -right-36 hidden w-24 xl:block"
            >
              <span
                className="sticky top-[46vh] block h-px w-24"
                data-bo-perch
                data-bo-x="0.5"
                data-bo-say={solo ? "What's going in?" : "The more, the merrier."}
              />
            </span>
            {step(
              5,
              solo ? "What will you add?" : "What can friends add?",
              activeTheme && suggested.length > 0
                ? `We picked a few for ${activeTheme.name}. Turn on anything else.`
                : "Turn on as many as you like.",
            )}

            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_minmax(280px,340px)] md:items-start">
              <div className="space-y-2">
                {listed.map((mod) => {
                  const on = selected.includes(mod.type);
                  const active = previewed === mod.type;
                  return (
                    <div key={mod.type}>
                      <div
                        onMouseEnter={() => setPreviewed(mod.type)}
                        onFocus={() => setPreviewed(mod.type)}
                        className={`flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors ${on ? "bg-pink/45" : "bg-paper"} ${active ? "ring-1 ring-accent/40" : ""}`}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => setPreviewed(mod.type)}
                        >
                          <span className="flex items-center gap-2 text-[15px] font-medium">
                            {mod.label}
                            {suggested.includes(mod.type) ? (
                              <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-accent uppercase">
                                Suggested
                              </span>
                            ) : null}
                          </span>
                          <span className="block text-xs text-ink/60">
                            {mod.blurb}
                            {mod.source === "creator" && !solo ? " You set this one up yourself." : ""}
                          </span>
                        </button>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={`${mod.label}: ${on ? "on" : "off"}`}
                          onClick={() => toggle(mod.type)}
                          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-ink/15"}`}
                        >
                          <span
                            className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-300 ${on ? "translate-x-5" : ""}`}
                          />
                        </button>
                      </div>
                      {active ? (
                        <div className="mt-2 md:hidden">
                          <SectionPreview type={mod.type} theme={activeTheme} palette={defaultPalette} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!showMore && hidden.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowMore(true)}
                    className="w-full rounded-2xl border border-dashed border-ink/20 px-4 py-3 text-left text-[15px] font-medium hover:bg-paper"
                  >
                    More
                    <span className="block text-xs font-normal text-ink/60">
                      {hidden.length} more sections: {hidden.slice(0, 4).map((m) => m.label.toLowerCase()).join(", ")}…
                    </span>
                  </button>
                ) : null}
              </div>

              <div className="hidden md:sticky md:top-24 md:block">
                <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                  Preview
                </p>
                <p className="mt-2 font-display text-base font-semibold">
                  {MODULES.find((m) => m.type === previewed)?.label}
                </p>
                <div className="mt-3">
                  <SectionPreview type={previewed} theme={activeTheme} palette={defaultPalette} />
                </div>
                <p className="mt-3 text-xs text-ink/55">
                  {activeTheme ? `How it looks in ${activeTheme.name}, with sample notes. Try it, it works.` : "How it looks on the finished gift, with sample notes. Try it, it works."}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <ConciergeOffer recipient={recipient.trim()} occasion={OCCASION_NAMES[themeKindOf(activeTheme)] ?? ""} />
          </div>

          <div className="sticky bottom-4 z-20">
            <div className="flex items-center justify-between gap-4 rounded-full bg-ink/95 py-2 pr-2 pl-6 text-cream shadow-[0_20px_50px_-20px_rgba(43,37,34,.6)] backdrop-blur">
              <span className="min-w-0 leading-tight">
                {activeTheme ? <span className="block truncate text-[11px] text-cream/70">{activeTheme.name}{solo ? " · Just me" : ""}</span> : null}
                <span className="block truncate text-sm">
                  {formatInfo(format).title} · {selected.length} {selected.length === 1 ? "section" : "sections"}
                  {!activeTheme && solo ? " · Just me" : ""}
                </span>
              </span>
              <button
                type="submit"
                disabled={busy}
                className="squish shrink-0 rounded-full bg-pink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
              >
                {busy ? "Creating…" : "Create the gift"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
