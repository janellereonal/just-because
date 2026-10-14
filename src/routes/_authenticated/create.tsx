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
      { title: "Create a gift — Just Because" },
      { name: "description", content: "Name your gift site and choose what people can add." },
      { property: "og:title", content: "Create a gift — Just Because" },
      {
        property: "og:description",
        content: "Name your gift site and choose what people can add.",
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
      toast.error("Pick at least one thing people can add.");
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
      toast.error("Couldn't create that gift site. Please try again.");
      return;
    }
    setBusy(false);
    markGiftCreated();
    navigate({ to: "/sites/$id", params: { id: data.id } });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <BoBuddy followFocus intro={false} />
      <section className="mx-auto max-w-2xl px-5 py-14">
        <p
          className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase"
          data-bo-perch
          data-bo-always
          data-bo-x="0.92"
          data-bo-say="Hi, I'm Bo. Let's make something nice."
        >
          New gift site
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
          Name it and pick the sections
        </h1>

        <form onSubmit={handleCreate} className="mt-8 space-y-6" data-bo-zone>
          <div className="card-paper p-5">
            <label className="block text-sm font-medium">Gift site name</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Happy 30th, Maya!"
              className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
            />
            <label className="mt-5 block text-sm font-medium">Theme</label>
            <select
              value={themeId ?? themeFromUrl ?? ""}
              onChange={(e) => pickTheme(e.target.value || undefined)}
              className="mt-2 w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
            >
              <option value="">Choose a theme…</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {activeTheme?.description ? (
              <p className="mt-2 text-xs text-muted">{activeTheme.description}</p>
            ) : null}
            <div className="mt-6 border-t border-line pt-5">
              <FormatPicker value={format} onChange={pickFormat} />
            </div>
          </div>

          <div className="card-paper p-5">
            <p className="text-sm font-medium">What can people add?</p>
            {activeTheme && suggested.length > 0 ? (
              <p className="mt-1 text-xs text-muted">Suggested for {activeTheme.name}</p>
            ) : null}

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_260px] md:items-start">
              <div className="space-y-2">
                {MODULES.map((mod) => {
                  const on = selected.includes(mod.type);
                  const active = previewed === mod.type;
                  return (
                    <div key={mod.type}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setPreviewed(mod.type)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setPreviewed(mod.type);
                        }}
                        className={`cursor-pointer rounded-xl border px-4 py-3 transition-colors ${
                          on ? "border-accent bg-accent/8" : "border-line bg-cream"
                        } ${active ? "ring-2 ring-accent/40" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <span>
                            <span className="block text-sm font-medium">
                              {mod.label}
                              {suggested.includes(mod.type) ? (
                                <span className="ml-2 font-mono text-[10px] tracking-[0.12em] text-accent uppercase">
                                  suggested
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-xs text-muted">{mod.blurb}</span>
                            {mod.source === "creator" ? (
                              <span className="block text-xs text-muted">
                                You set this one up yourself.
                              </span>
                            ) : null}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggle(mod.type);
                            }}
                            className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase hover:text-ink"
                          >
                            {on ? "Added · Free" : "Add"}
                          </button>
                        </div>
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

              <div className="hidden md:sticky md:top-6 md:block">
                <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">
                  Preview
                </p>
                <p className="mt-2 text-sm font-medium">
                  {MODULES.find((m) => m.type === previewed)?.label}
                </p>
                <div className="mt-3">
                  <ModuleExample type={previewed} />
                </div>
                <p className="mt-3 text-xs text-muted">
                  This is how the section will look on the finished page.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-muted">Total</span>
              <span className="font-medium">Free</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-accent px-5 py-3.5 font-medium text-cream transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create gift site"}
          </button>
        </form>
      </section>
    </div>
  );
}
