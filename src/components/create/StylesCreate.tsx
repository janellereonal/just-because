/**
 * /create with styles (flag `styles`): Who's it from → Who's it for → What's it for
 * (optional) → Pick a style (sorted for the occasion) → Sections.
 * The word "theme" never shows. The server picks the layout and look for the style.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import { t } from "@/i18n";
import { GUIDE_COPY } from "@/copy/strings";
import { ConciergeOffer } from "@/components/ConciergeOffer";
import { NewUserGuide, guideSeen } from "@/components/NewUserGuide";
import { SiteHeader } from "@/components/SiteHeader";
import { BoBuddy } from "@/components/BoBuddy";
import { SectionPreview } from "@/components/SectionPreview";
import { OccasionChips } from "@/components/styles/OccasionChips";
import { StylePicker } from "@/components/styles/StylePicker";
import { createSite, listMySites } from "@/lib/api";
import { isFlagOn } from "@/config/flags";
import { LIMITS } from "@/lib/limits";
import { fetchThemes, type Theme } from "@/lib/themes";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";
import { MODULES, normalizeSite, type ModuleType } from "@/lib/gift";
import { PRESETS } from "@/lib/presets";
import { occasionTitle, themeKindOf, type ThemeKind } from "@/lib/themeKind";
import { occasionInfo, occasionName, type OccasionId } from "@/lib/occasions";
import { STYLES, lookFor, styleForLegacy, styleInfo, styleTitle, type StyleId, type StyleInfo } from "@/lib/styles";
import type { GiftFormat } from "@/lib/formats";
import { accessoryForTheme } from "@/lib/bo3d/accessories";
import { boAccessory, boSay, markGiftCreated } from "@/lib/mascot/bus";
import { engineThemeForName } from "@/themes/engine/registry";

/** A theme-like name for Bo's outfit, from an occasion's kind. */
const KIND_NAME: Partial<Record<ThemeKind, string>> = {
  birthday: "birthday",
  valentine: "valentine",
  voyage: "voyage",
  christmas: "christmas",
  pets: "pets",
  newyear: "new year",
  anniversary: "anniversary",
  wedding: "wedding",
  bridal: "bridal",
  baby: "baby shower",
};

const CORE: ModuleType[] = ["letters", "photobooth", "songs", "voice", "wordcloud"];

export function StylesCreate({
  fromUrl,
  sectionsFromUrl,
  styleFromUrl,
  occasionFromUrl,
  themeFromUrl,
  formatFromUrl,
}: {
  fromUrl?: "me" | undefined;
  sectionsFromUrl?: string | undefined;
  styleFromUrl?: StyleId | undefined;
  occasionFromUrl?: OccasionId | undefined;
  /** Old links: ?theme=<id>&format=<layout> still land on the matching style. */
  themeFromUrl?: string | undefined;
  formatFromUrl?: GiftFormat | undefined;
}) {
  const navigate = useNavigate();
  const { data: themes = [] } = useQuery({ queryKey: ["themes", "published"], queryFn: () => fetchThemes(false) });
  const byName = useMemo(() => new Map(themes.map((x) => [x.name.toLowerCase(), x])), [themes]);
  const themeRow = (name: string | undefined) => (name ? byName.get(name.toLowerCase()) : undefined);

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
  const [occasion, setOccasion] = useState<OccasionId | null>(occasionFromUrl ?? null);
  const [openRow, setOpenRow] = useState<OccasionId | null>(occasionFromUrl ? (occasionInfo(occasionFromUrl).parent ?? null) : null);
  const [style, setStyle] = useState<StyleId | null>(styleFromUrl ?? null);

  // Old ?theme= links pick the matching style once the themes have loaded.
  const legacyApplied = useRef(false);
  useEffect(() => {
    if (legacyApplied.current || style || !themeFromUrl || !themes.length) return;
    legacyApplied.current = true;
    const th = themes.find((x) => x.id === themeFromUrl);
    const match = styleForLegacy(th, formatFromUrl ?? "scrapbook") ?? STYLES.find((s) => s.looks.some((l) => l.theme === th?.name)) ?? null;
    if (match) setStyle(match.id);
  }, [themes, themeFromUrl, formatFromUrl, style]);

  // Styles whose look is a draft theme stay hidden (they appear once published in /admin).
  const available = (s: StyleInfo) => s.looks.length === 0 || s.looks.some((l) => !!themeRow(l.theme));
  const info = style ? styleInfo(style) : null;
  const look = info ? lookFor(info, occasion) : null;
  const lookTheme: Theme | null = (look && themeRow(look.theme)) || null;

  // Bo dresses for the occasion, or for the style when there isn't one.
  const boKind = occasion ? occasionInfo(occasion).bo : null;
  const accessory = accessoryForTheme(boKind && KIND_NAME[boKind] ? { name: KIND_NAME[boKind] } : lookTheme);
  useEffect(() => {
    boAccessory(accessory);
    return () => boAccessory(null);
  }, [accessory]);
  const nameSaid = useRef(false);
  useEffect(() => {
    if (nameSaid.current || recipient.trim().length < 2) return;
    const tm = window.setTimeout(() => {
      nameSaid.current = true;
      boSay(`${recipient.trim()} is so lucky.`, "love");
    }, 900);
    return () => window.clearTimeout(tm);
  }, [recipient]);

  // Colors: the style's own look; layout styles borrow the occasion's colors.
  const { data: allPalettes = [] } = usePalettes();
  const colorTheme: Theme | null = useMemo(() => {
    if (lookTheme) return lookTheme;
    if (!boKind || boKind === "default") return null;
    return themes.find((x) => themeKindOf(x) === boKind) ?? null;
  }, [lookTheme, boKind, themes]);
  const justBecause = allPalettes.find((p) => p.name === "Just Because") ?? null;
  const defaultPalette = suggestedPalettes(colorTheme, allPalettes)[0] ?? justBecause;

  // Sections: the occasion's picks, else the style's.
  const engineOccasion = engineThemeForName(lookTheme?.name)?.occasion;
  const suggested: ModuleType[] = occasion
    ? occasionInfo(occasion).sections
    : engineOccasion
      ? (engineOccasion.sections.filter((x) => MODULES.some((m) => m.type === x)) as ModuleType[])
      : lookTheme
        ? PRESETS[themeKindOf(lookTheme)]
        : [];
  const fromPage = (sectionsFromUrl ?? "").split(",").filter((x): x is ModuleType => MODULES.some((m) => m.type === x));
  const [selected, setSelected] = useState<ModuleType[]>(fromPage.length ? fromPage : ["letters", "photobooth"]);
  const [touched, setTouched] = useState(fromPage.length > 0);
  const [previewed, setPreviewed] = useState<ModuleType>("letters");
  const [showMore, setShowMore] = useState(false);
  const suggestedKey = suggested.join(",");
  useEffect(() => {
    if (touched || suggested.length === 0) return;
    setSelected(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedKey, touched]);
  const pool = MODULES.filter((mod) => !(solo && mod.type === "tree"));
  const ordered = [...new Set<ModuleType>([...suggested, ...CORE, ...pool.map((m) => m.type)])]
    .map((x) => pool.find((m) => m.type === x))
    .filter((m): m is (typeof pool)[number] => !!m);
  const firstFive = ordered.slice(0, 5).map((m) => m.type);
  const listed = showMore ? ordered : ordered.filter((m) => firstFive.includes(m.type) || selected.includes(m.type));
  const hidden = ordered.filter((m) => !listed.includes(m));
  function toggle(type: ModuleType) {
    setTouched(true);
    setSelected((prev) => (prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type]));
  }

  function pickOccasion(next: OccasionId | null) {
    setOccasion(next);
    if (next) boSay(`${occasionName(next)}. I'll put the best styles first.`, "happy");
  }
  function pickStyle(next: StyleId) {
    setStyle(next);
    boSay(`${styleTitle(next)}. Good pick.`, "wink");
  }

  const [busy, setBusy] = useState(false);
  const creating = useRef(false);
  const example = solo ? "Sam" : "Ana";
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating.current) return;
    if (!recipient.trim()) {
      toast.error("Add the name of who it's for.");
      document.getElementById("gift-for")?.focus();
      return;
    }
    if (!style) {
      toast.error("Pick a style for the gift.");
      document.getElementById("gift-style")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const modules = solo ? selected.filter((x) => x !== "tree") : selected;
    if (modules.length === 0) {
      toast.error(solo ? "Pick at least one thing you'll add." : "Pick at least one thing friends can add.");
      return;
    }
    creating.current = true;
    setBusy(true);
    let data: { id: string };
    try {
      data = await createSite({
        data: {
          title: occasionTitle(lookTheme, recipient, occasion),
          recipientName: recipient.trim(),
          themeId: null,
          format: styleInfo(style).body,
          style,
          ...(look ? { styleLook: look.id } : {}),
          occasion,
          paletteId: defaultPalette?.id ?? null,
          customColors: defaultPalette ? { background: defaultPalette.background, primary: defaultPalette.primary, accent: defaultPalette.accent } : {},
          treeRevealDate: occasion === "christmas" || themeKindOf(lookTheme) === "christmas" ? `${new Date().getFullYear()}-12-25` : null,
          modules,
          solo,
          ...(lookTheme ? { fontChoice: "theme" as const } : {}),
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
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-pink font-display text-base font-semibold">{n}</span>
      <div>
        <h2 className="font-display text-xl leading-tight font-semibold">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-ink/60">{hint}</p> : null}
      </div>
    </div>
  );
  const perch = (say?: string) => (
    <span aria-hidden className="pointer-events-none absolute inset-y-0 -right-36 hidden w-24 xl:block">
      <span className="sticky top-[46vh] block h-px w-24" data-bo-perch data-bo-x="0.5" {...(say ? { "data-bo-say": say } : {})} />
    </span>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <BoBuddy followFocus intro={false} />
      <AnimatePresence>{guide ? <NewUserGuide onClose={() => setGuide(false)} /> : null}</AnimatePresence>
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-28 sm:px-5">
        <div className="relative pr-24 sm:pr-0">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">New gift</p>
          <span aria-hidden className="absolute right-0 bottom-0 h-px w-20 sm:right-2 sm:w-24" data-bo-perch data-bo-always data-bo-say="Hi, I'm Bo. Let's make something nice." />
          <h1 className="mt-2 max-w-xl font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] font-semibold tracking-tight text-balance">Let's set up the gift</h1>
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
                  { value: false, title: "Me and friends", copy: "Share one link. Friends add their notes, photos and songs.", art: "👯", tint: "bg-butter/70" },
                  { value: true, title: "Just me", copy: "For your partner, best friend or mom. You make every page yourself.", art: "💌", tint: "bg-pink/70" },
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
                    <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/80 text-2xl">{o.art}</span>
                    <span className="min-w-0">
                      <span className="block font-display text-lg leading-tight font-semibold">{o.title}</span>
                      <span className="mt-1 block text-sm text-ink/65">{o.copy}</span>
                    </span>
                    {on ? <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-ink text-[12px] text-cream">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            {perch()}
            {step(2, "Who's it for?", "Their first name, or what you call them. Two names work too.")}
            <label htmlFor="gift-for" className="sr-only">Who's it for</label>
            <input
              id="gift-for"
              required
              maxLength={LIMITS.recipientName}
              autoComplete="off"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={example}
              className="mt-5 w-full rounded-2xl border border-line bg-paper px-5 py-4 font-display text-lg outline-none transition-colors focus:border-accent focus:bg-white"
            />
            <p className="mt-3 text-sm text-muted">
              The gift opens with <span className="font-display text-base text-ink">{occasionTitle(lookTheme, recipient.trim() || example, occasion)}</span>
              {recipient.trim() ? null : <span className="ml-1.5 font-mono text-[10px] tracking-[0.12em] uppercase">(example)</span>}. You can change it later.
            </p>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            {perch("What's the occasion?")}
            {step(3, t("picker.occasion.title"), t("picker.occasion.hint"))}
            <div className="mt-5">
              <OccasionChips value={occasion} onChange={pickOccasion} open={openRow} onOpen={setOpenRow} />
            </div>
          </div>

          <div id="gift-style" className="card-paper relative p-5 sm:p-7">
            {perch("Pick one. I'll dress up for it.")}
            {step(4, t("picker.style.title"), t("picker.style.hint"))}
            <div className="mt-5">
              <StylePicker value={style} onChange={pickStyle} occasion={occasion} available={available} />
            </div>
          </div>

          <div className="card-paper relative p-5 sm:p-7">
            {perch(solo ? "What's going in?" : "The more, the merrier.")}
            {step(
              5,
              solo ? "What will you add?" : "What can friends add?",
              suggested.length > 0
                ? `We picked a few${occasion ? ` for ${occasionName(occasion).toLowerCase()}` : ""}. Turn on anything else.`
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
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setPreviewed(mod.type)}>
                          <span className="flex items-center gap-2 text-[15px] font-medium">
                            {mod.label}
                            {suggested.includes(mod.type) ? (
                              <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-accent uppercase">Suggested</span>
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
                          <span className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-300 ${on ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                      {active ? (
                        <div className="mt-2 md:hidden">
                          <SectionPreview type={mod.type} theme={colorTheme ?? undefined} palette={defaultPalette} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {!showMore && hidden.length > 0 ? (
                  <button type="button" onClick={() => setShowMore(true)} className="w-full rounded-2xl border border-dashed border-ink/20 px-4 py-3 text-left text-[15px] font-medium hover:bg-paper">
                    More
                    <span className="block text-xs font-normal text-ink/60">
                      {hidden.length} more sections: {hidden.slice(0, 4).map((m) => m.label.toLowerCase()).join(", ")}…
                    </span>
                  </button>
                ) : null}
              </div>
              <div className="hidden md:sticky md:top-24 md:block">
                <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Preview</p>
                <p className="mt-2 font-display text-base font-semibold">{MODULES.find((m) => m.type === previewed)?.label}</p>
                <div className="mt-3">
                  <SectionPreview type={previewed} theme={colorTheme ?? undefined} palette={defaultPalette} />
                </div>
                <p className="mt-3 text-xs text-ink/55">How it looks on the finished gift, with sample notes. Try it, it works.</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <ConciergeOffer recipient={recipient.trim()} occasion={occasion ? occasionName(occasion) : ""} />
          </div>

          <div className="sticky bottom-4 z-20">
            <div className="flex items-center justify-between gap-4 rounded-full bg-ink/95 py-2 pr-2 pl-6 text-cream shadow-[0_20px_50px_-20px_rgba(43,37,34,.6)] backdrop-blur">
              <span className="min-w-0 leading-tight">
                {occasion ? <span className="block truncate text-[11px] text-cream/70">{occasionName(occasion)}{solo ? " · Just me" : ""}</span> : null}
                <span className="block truncate text-sm">
                  {style ? styleTitle(style) : "No style yet"} · {selected.length} {selected.length === 1 ? "section" : "sections"}
                  {!occasion && solo ? " · Just me" : ""}
                </span>
              </span>
              <button type="submit" disabled={busy} className="squish shrink-0 rounded-full bg-pink px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60">
                {busy ? "Creating…" : "Create the gift"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

