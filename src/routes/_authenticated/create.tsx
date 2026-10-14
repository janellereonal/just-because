import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { createSite } from "@/lib/api";
import { fetchThemes } from "@/lib/themes";
import { usePalettes, suggestedPalettes } from "@/hooks/usePalettes";
import { MODULES, type ModuleType } from "@/lib/gift";
import { ModuleExample } from "@/components/ModuleExample";
import { FormatPicker } from "@/components/FormatPicker";
import { stageColorFor } from "@/components/ThemeCard";
import type { GiftFormat } from "@/lib/comic";
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
  validateSearch: (search: Record<string, unknown>) => ({
    theme: typeof search["theme"] === "string" ? search["theme"] : undefined,
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
  const { theme: themeFromUrl } = Route.useSearch();
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  const [title, setTitle] = useState("");
  const [themeId, setThemeId] = useState<string | undefined>(themeFromUrl);
  const [format, setFormat] = useState<GiftFormat>("scrapbook");
  const [selected, setSelected] = useState<ModuleType[]>(["letters", "photobooth"]);
  const [touched, setTouched] = useState(false);
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
    if (nameSaid.current || title.trim().length < 3) return;
    const t = window.setTimeout(() => {
      nameSaid.current = true;
      boSay("Ooh, cute name.", "love");
    }, 900);
    return () => window.clearTimeout(t);
  }, [title]);
  function pickTheme(id: string | undefined) {
    setThemeId(id);
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
  const suggested = (activeTheme?.default_modules ?? []) as ModuleType[];

  // Pre-select the theme's suggested modules until the creator edits the list.
  useEffect(() => {
    if (touched || suggested.length === 0) return;
    setSelected(suggested);
  }, [activeTheme?.id, touched]);

  function toggle(type: ModuleType) {
    setTouched(true);
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error("Pick at least one thing friends can add.");
      return;
    }
    setBusy(true);
    let data: { id: string };
    try {
      data = await createSite({
        data: {
          title: title.trim(),
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
          modules: selected,
        },
      });
    } catch {
      setBusy(false);
      toast.error("Couldn't create that gift. Please try again.");
      return;
    }
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <BoBuddy followFocus intro={false} />
      <section className="mx-auto max-w-3xl px-4 pt-14 pb-28 sm:px-5">
        <div className="relative">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">New gift</p>
          {/* Bo's spot: beside the heading, clear of the header and the text. */}
          <span
            aria-hidden
            className="absolute right-2 bottom-0 hidden h-px w-24 sm:block"
            data-bo-perch
            data-bo-always
            data-bo-say="Hi, I'm Bo. Let's make something nice."
          />
          <h1 className="mt-2 max-w-xl font-display text-[clamp(2rem,5vw,3rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            Let's set up the gift
          </h1>
          <p className="mt-3 max-w-lg text-ink/65">Takes a minute. You can change everything later, even after friends start adding notes.</p>
        </div>

        <form onSubmit={handleCreate} className="mt-10 space-y-5" data-bo-zone>
          <div className="card-paper p-5 sm:p-7">
            {step(1, "Give it a name", "This is the big title they'll see first.")}
            <label htmlFor="gift-name" className="sr-only">
              Gift name
            </label>
            <input
              id="gift-name"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Happy 30th, Maya!"
              className="mt-5 w-full rounded-2xl border border-line bg-paper px-5 py-4 font-display text-lg outline-none transition-colors focus:border-accent focus:bg-white"
            />
          </div>

          <div className="card-paper p-5 sm:p-7">
            {step(2, "Pick a theme", "Sets the colors, the opening and Bo's outfit.")}
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
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
                    <span aria-hidden className="absolute -top-6 -right-6 size-16 rounded-full bg-white/45" />
                    <span className="relative block font-mono text-[10px] tracking-[0.14em] text-ink/60 uppercase">{t.category}</span>
                    <span className="relative mt-0.5 block font-display text-base leading-tight font-semibold">{t.name}</span>
                    <span className="relative mt-3 flex -space-x-1.5" aria-hidden>
                      {pals.slice(0, 3).map((p, i) => (
                        <span key={i} className="size-5 rounded-full ring-2 ring-white" style={{ background: `conic-gradient(${p.background} 0 50%, ${p.accent} 50% 75%, ${p.primary} 75%)` }} />
                      ))}
                    </span>
                    {on ? <span className="absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full bg-ink text-[12px] text-cream">✓</span> : null}
                  </button>
                );
              })}
            </div>
            {activeTheme?.description ? <p className="mt-3 text-sm text-ink/60">{activeTheme.description}</p> : null}
          </div>

          <div className="card-paper p-5 sm:p-7">
            {step(3, "Choose how it opens", "Same notes, different way to open them. Switch any time.")}
            <div className="mt-4">
              <FormatPicker value={format} onChange={pickFormat} bare />
            </div>
          </div>

          <div className="card-paper p-5 sm:p-7">
            {step(4, "What can friends add?", activeTheme && suggested.length > 0 ? `We picked a few for ${activeTheme.name}. Turn on anything else.` : "Turn on as many as you like. Each one is free.")}

            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_250px] md:items-start">
              <div className="space-y-2">
                {MODULES.map((mod) => {
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
                            {mod.source === "creator" ? " You set this one up yourself." : ""}
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
                          <ModuleExample type={mod.type} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="hidden md:sticky md:top-24 md:block">
                <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">Preview</p>
                <p className="mt-2 font-display text-base font-semibold">{MODULES.find((m) => m.type === previewed)?.label}</p>
                <div className="mt-3">
                  <ModuleExample type={previewed} />
                </div>
                <p className="mt-3 text-xs text-ink/55">This is how the section looks on the finished gift.</p>
              </div>
            </div>
          </div>

          <div className="sticky bottom-4 z-20">
            <div className="flex items-center justify-between gap-4 rounded-full bg-ink/95 py-2 pr-2 pl-6 text-cream shadow-[0_20px_50px_-20px_rgba(43,37,34,.6)] backdrop-blur">
              <span className="min-w-0 truncate text-sm">
                {selected.length} {selected.length === 1 ? "section" : "sections"} · Free to make
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
