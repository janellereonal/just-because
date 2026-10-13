import { useEffect, useMemo, useRef, useState } from "react";
import {Link, useParams} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { GiftSiteView } from "@/components/GiftSiteView";
import { ComicIssueView } from "@/components/ComicIssueView";
import {
  deleteCalendarEntry,
  setContributionStatus,
  setModuleEnabled,
  updateSite,
  upsertCalendarEntry,
} from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { GiftIntro } from "@/components/GiftIntro";
import { introStyleForTheme } from "@/lib/intro";
import {
  BACKGROUND_STYLES,
  FONT_PAIRINGS,
  MODULES,
  backgroundCss,
  defaultTitles,
  resolvePalette,
  type BackgroundStyle,
  fetchCalendarEntries,
  fetchContributions,
  fetchModules,
  fetchSiteById,
  fetchTheme,
  signedMediaUrl,
  type CalendarEntry,
  type Contribution,
  type CustomText,
  type FontChoice,
  type GiftSite,
  type ModuleType,
} from "@/lib/gift";
import type { Palette } from "@/lib/themes";
import Bo from "@/components/Bo";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";
import { PalettePicker, paletteNameFor } from "@/components/PalettePicker";
import { usePalettes } from "@/hooks/usePalettes";
import { Button } from "@/components/ui/button";
import { normalizeComicSettings, orderedComicIds, type ComicSettings } from "@/lib/comic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LinkNameDialog,
  PlanBanner,
  PlanPickerDialog,
  canRenameLink,
  planSummary,
  useBilling,
} from "@/components/PlanControls";
import {
  CalendarDays,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Gift,
  Inbox,
  LayoutGrid,
  LayoutTemplate,
  Link as LinkIcon,
  Mail,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  PanelsTopLeft,
  Palette as PaletteIcon,
  Pencil,
  Send,
  Type,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

const FRIEND_TINTS = ["#F7D9C4", "#D8E4DC", "#E6DCF2", "#F5E3B3", "#D9E6F2"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}



type SectionKey =
  | "words"
  | "colors"
  | "fonts"
  | "background"
  | "sections"
  | "surprises"
  | "intro"
  | "comic"
  | "review";

const MODULE_TITLE_FIELD: Record<ModuleType, keyof CustomText | null> = {
  letters: "letters_title",
  photobooth: "photobooth_title",
  songs: "songs_title",
  wordcloud: "wordcloud_title",
  voice: "voice_title",
  countdown: "countdown_title",
  calendar: "calendar_title",
  tree: "tree_title",
};

const FIELD_GROUP: Record<string, SectionKey> = {
  heading: "words",
  recipient_name: "words",
  intro_message: "words",
  footer_note: "words",
  letters_title: "sections",
  photobooth_title: "sections",
  songs_title: "sections",
  wordcloud_title: "sections",
  voice_title: "sections",
  countdown_title: "sections",
  calendar_title: "sections",
  tree_title: "sections",
};

const SECTION_TITLES: Record<SectionKey, string> = {
  words: "Words",
  colors: "Colors",
  fonts: "Fonts",
  background: "Background",
  sections: "Sections",
  surprises: "Surprises",
  intro: "Intro",
  comic: "Comic",
  review: "Review",
};

const SECTION_ICONS: Record<SectionKey, LucideIcon> = {
  words: Type,
  colors: PaletteIcon,
  fonts: CaseSensitive,
  background: LayoutTemplate,
  sections: LayoutGrid,
  surprises: CalendarDays,
  intro: Mail,
  comic: PanelsTopLeft,
  review: Inbox,
};

function SiteDashboard() {
  const { id } = useParams({ from: "/_authenticated/sites/$id" });
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GiftSite | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [introPreview, setIntroPreview] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [planPicker, setPlanPicker] = useState<"publish" | "upgrade" | null>(null);
  const [linkNameOpen, setLinkNameOpen] = useState(false);
  // The rail remembers the section this gift was last edited in.
  const [section, setSection] = useState<SectionKey>("words");
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusField, setFocusField] = useState<keyof CustomText | null>(null);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [panelWidth, setPanelWidth] = useState(340);
  const [zoom, setZoom] = useState<number | null>(null); // null = Fit
  const [selected, setSelected] = useState<{ field: keyof CustomText; top: number; left: number } | null>(
    null,
  );
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const {
    data: site,
    isLoading: siteLoading,
    error: siteError,
    refetch: refetchSite,
  } = useQuery({ queryKey: ["site", id], queryFn: () => fetchSiteById(id) });
  const palettesQuery = usePalettes();
  const { data: theme = null } = useQuery({
    queryKey: ["theme", site?.theme_id],
    queryFn: () => fetchTheme(site?.theme_id ?? null),
    enabled: !!site,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", id],
    queryFn: () => fetchModules(id),
  });
  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", id],
    queryFn: () => fetchContributions(id, false),
  });
  const { data: calendarEntries = [] } = useQuery({
    queryKey: ["calendar", id],
    queryFn: () => fetchCalendarEntries(id),
  });
  const { data: billing } = useBilling(id);
  /** Paid (or legacy) and not ended: the gift can go live without paying again. */
  const hasPlan = !!billing?.tier && !billing.ended;

  useEffect(() => {
    if (site && !draft) setDraft(site);
  }, [site, draft]);

  // Restore the last open rail section for this gift.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(`jb:editor-section:${id}`);
    if (saved) setSection(saved as SectionKey);
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`jb:editor-section:${id}`, section);
  }, [id, section]);

  // Friends' photos feed the "Photo colors" swatches in the Colors panel.
  const photoPathKey = contributions
    .filter((c) => c.module_type === "photobooth" && c.media_url)
    .slice(0, 3)
    .map((c) => c.media_url as string)
    .join("|");
  useEffect(() => {
    const paths = photoPathKey ? photoPathKey.split("|") : [];
    if (paths.length === 0) {
      setPhotoUrls((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    let alive = true;
    void Promise.all(paths.map((p) => signedMediaUrl(p))).then((urls) => {
      if (alive) setPhotoUrls(urls.filter((u): u is string => !!u));
    });
    return () => {
      alive = false;
    };
  }, [photoPathKey]);

  // Esc clears the preview selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The panel width is a personal preference, remembered across gifts.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(window.localStorage.getItem("jb:editor-panel-width"));
    if (saved >= 280 && saved <= 520) setPanelWidth(saved);
  }, []);

  function startPanelResize(e: React.PointerEvent) {
    e.preventDefault();
    let last = panelWidth;
    const move = (ev: PointerEvent) => {
      last = Math.min(520, Math.max(280, ev.clientX - 72));
      setPanelWidth(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.localStorage.setItem("jb:editor-panel-width", String(last));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const approved = useMemo(
    () => contributions.filter((c) => c.status === "approved"),
    [contributions],
  );
  const pending = useMemo(
    () => contributions.filter((c) => c.status === "pending"),
    [contributions],
  );
  const friends = useMemo(() => {
    const names: string[] = [];
    for (const c of contributions) {
      const name = (c.author_name ?? "").trim();
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  }, [contributions]);


  const enabledTypes = useMemo(
    () => new Set(modules.filter((m) => m.enabled).map((m) => m.module_type)),
    [modules],
  );

  // Quiet autosave
  useEffect(() => {
    if (!dirty || !draft) return;
    const t = setTimeout(() => {
      void persist(draft, true);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty]);

  // Keep the matching field focused after a preview click re-renders the panel
  useEffect(() => {
    if (!focusField) return;
    const el = fieldRefs.current[focusField] as HTMLInputElement | null;
    if (el && document.activeElement !== el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusField, section]);

  useEffect(() => {
    if (!fullPreview) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullPreview(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [fullPreview]);

  /** Saves the gift. `status` is only sent for an explicit publish/unpublish, so autosave never changes it. */
  async function persist(next: GiftSite, quiet: boolean, withStatus = false) {
    setSaving(true);
    let error: unknown = null;
    try {
      await updateSite({
        data: {
          id: next.id,
          patch: {
            title: next.title.trim() || "Untitled gift",
            custom_text: next.custom_text as Record<string, string>,
            custom_colors: next.custom_colors,
            font_choice: next.font_choice,
            countdown_date: next.countdown_date || null,
            calendar_locked: next.calendar_locked,
            intro_text: next.intro_text,
            background_style: next.background_style,
            tree_reveal_date: next.tree_reveal_date || null,
            palette_id: next.palette_id,
            share_notes: next.share_notes,
            ...(withStatus ? { status: next.status } : {}),
            format: next.format,
            format_settings: next.format_settings as unknown as Record<string, never>,
          },
        },
      });
    } catch (e) {
      error = e;
    }
    setSaving(false);
    setDirty(false);
    if (error) {
      const msg = error instanceof Error && error.message.length < 160 ? error.message : "";
      toast.error(msg || "Couldn't save your changes.");
      return false;
    }
    setSavedAt(Date.now());
    queryClient.invalidateQueries({ queryKey: ["site", id] });
    if (!quiet && next.status === "published") setPublishSuccess(true);
    return true;
  }

  if (siteError) {
    return (
      <PageError
        message="We couldn't load this gift just now. Please try again."
        onRetry={() => void refetchSite()}
      />
    );
  }
  if (!site && !siteLoading) {
    return (
      <PageNotFound
        message="We couldn't find that gift. It may have been deleted, or the link may be from an older version."
        actionLabel="My gifts"
        actionTo="/dashboard"
      />
    );
  }
  if (!site || !draft) {
    return <PageLoading label="Loading your gift…" />;
  }

  const contributeUrl = `${typeof window === "undefined" ? "" : window.location.origin}/contribute/${site.slug}`;
  const liveUrl = `${typeof window === "undefined" ? "" : window.location.origin}/g/${site.slug}`;
  const titles = defaultTitles(draft.custom_text);
  const shareMessage = `Add something to ${draft.custom_text.recipient_name || "our"}'s gift: ${contributeUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(contributeUrl)}&redirect_uri=${encodeURIComponent(contributeUrl)}&app_id=291494419107518`;


  function patch(update: Partial<GiftSite>) {
    setDraft((prev) => (prev ? { ...prev, ...update } : prev));
    setDirty(true);
  }

  function patchText(key: keyof CustomText, value: string) {
    setDraft((prev) =>
      prev ? { ...prev, custom_text: { ...prev.custom_text, [key]: value } } : prev,
    );
    setDirty(true);
  }

  function patchComic(update: Partial<ComicSettings>) {
    setDraft((prev) => prev ? { ...prev, format_settings: { ...normalizeComicSettings(prev.format_settings), ...update } } : prev);
    setDirty(true);
  }

  function moveComicPanel(itemId: string, direction: -1 | 1) {
    if (!draft) return;
    const settings = normalizeComicSettings(draft.format_settings);
    const current = orderedComicIds(contributions.map((item) => item.id), settings.panel_order);
    const index = current.indexOf(itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target]!, current[index]!];
    patchComic({ panel_order: current });
  }

  /** Already paid: open it again. Not paid yet: pick a plan first (it goes live after payment). */
  async function publish() {
    if (!draft) return;
    if (!hasPlan) {
      setPlanPicker("publish");
      return;
    }
    const next = { ...draft, status: "published" as const };
    const ok = await persist(next, false, true);
    if (ok) setDraft(next);
  }

  async function unpublish() {
    if (!draft) return;
    const next = { ...draft, status: "draft" as const };
    const ok = await persist(next, true, true);
    if (!ok) return;
    setDraft(next);
    toast.success("Gift unpublished. Your plan stays, so you can open it again any time.");
  }

  function copyContributeLink() {
    void navigator.clipboard.writeText(contributeUrl);
    toast.success(
      `Link copied. Send it to ${draft?.custom_text.recipient_name || "their"}'s friends!`,
    );

  }

  function copyLiveLink() {
    void navigator.clipboard.writeText(liveUrl);
    toast.success("Live link copied.");
  }

  async function setStatus(contributionId: string, status: Contribution["status"]) {
    const ok = await setContributionStatus({ data: { ids: [contributionId], status } })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      toast.error("Couldn't update that contribution.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["contributions", id] });
  }

  async function toggleModule(moduleType: string, enabled: boolean) {
    await setModuleEnabled({
      data: { siteId: id, moduleType: moduleType as ModuleType, enabled },
    }).catch(() => toast.error("Couldn't update that section."));
    queryClient.invalidateQueries({ queryKey: ["modules", id] });
  }

  const daysToGo = (() => {
    const date = draft.countdown_date;
    if (!date) return null;
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
    if (diff < 0) return null;
    if (diff === 0) return "today";
    return `${diff} day${diff === 1 ? "" : "s"} to go`;
  })();

  function selectInPreview(field: keyof CustomText) {
    const host = canvasRef.current;
    if (!host) return;
    const el = host.querySelector(`[data-field="${field}"]`) as HTMLElement | null;
    if (!el) return setSelected(null);
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    setSelected({ field, top: a.top - b.top, left: a.left - b.left + a.width / 2 });
  }

  function selectionActions(field: keyof CustomText): { label: string; run: () => void }[] {
    const go = (target: SectionKey, f?: keyof CustomText) => () => {
      setSection(target);
      setPanelOpen(true);
      if (typeof window !== "undefined" && window.innerWidth < 900) setSheetOpen(true);
      if (f) openField(f);
    };
    if (field === "countdown_title") {
      return [{ label: "Change date", run: go("sections") }];
    }
    if (field.endsWith("_title")) {
      return [
        { label: "Rename", run: go("sections", field) },
        { label: "Section settings", run: go("sections") },
      ];
    }
    return [
      { label: "Edit text", run: go(FIELD_GROUP[field] ?? "words", field) },
      { label: "Font", run: go("fonts") },
      { label: "Color", run: go("colors") },
    ];
  }

  function openField(field: keyof CustomText) {
    const target = FIELD_GROUP[field] ?? "words";
    setSection(target);
    setPanelOpen(true);
    setFocusField(field);
    if (typeof window !== "undefined" && window.innerWidth < 900) setSheetOpen(true);
    setTimeout(() => {
      const el = fieldRefs.current[field];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLInputElement | null)?.focus?.();
    }, 220);
  }

  const paletteNow = resolvePalette(theme, draft.custom_colors);
  const allPalettes = palettesQuery.data ?? [];

  if (publishSuccess) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper px-5 text-center text-ink">
        <div className="w-full max-w-xl">
          <Bo pose="published" size={200} />
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
            Your gift is ready to open
          </h1>
          <div className="mt-7 flex items-center gap-2 rounded-xl border border-line bg-cream p-2 pl-4">
            <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted">
              {liveUrl}
            </span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(liveUrl);
                toast.success("Public link copied.");
              }}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream"
            >
              Copy
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) void navigator.share({ title: draft.title, url: liveUrl });
                else {
                  void navigator.clipboard.writeText(liveUrl);
                  toast.success("Public link copied.");
                }
              }}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-cream"
            >
              Share
            </button>
            <a href={liveUrl} className="rounded-full border border-line bg-cream px-6 py-3 text-sm font-medium">
              Open gift
            </a>
            <button onClick={() => setPublishSuccess(false)} className="rounded-full border border-line bg-cream px-6 py-3 text-sm font-medium">
              Back to editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const railSections: SectionKey[] = [
    "words",
    "colors",
    "fonts",
    "background",
    "sections",
    ...(enabledTypes.has("calendar") ? (["surprises"] as SectionKey[]) : []),
    "intro",
    "comic",
    "review",
  ];

  const fieldInput = (
    key: keyof CustomText,
    label: string,
    opts: { long?: boolean; placeholder?: string } = {},
  ) => (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      {opts.long ? (
        <textarea
          ref={(el) => {
            if (el && el.getClientRects().length === 0) return;
            fieldRefs.current[key] = el;
          }}
          rows={3}
          value={draft.custom_text[key] ?? ""}
          placeholder={opts.placeholder ?? label}
          onFocus={() => setFocusField(key)}
          onChange={(e) => patchText(key, e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      ) : (
        <input
          ref={(el) => {
            if (el && el.getClientRects().length === 0) return;
            fieldRefs.current[key] = el;
          }}
          value={draft.custom_text[key] ?? ""}
          placeholder={opts.placeholder ?? label}
          onFocus={() => setFocusField(key)}
          onChange={(e) => patchText(key, e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      )}
    </label>
  );

  const sectionBody: Record<SectionKey, React.ReactNode> = {
    words: (
      <div className="space-y-3">
        {fieldInput("heading", "Heading", { placeholder: titles.heading })}
        {fieldInput("recipient_name", "Recipient name", { placeholder: "Maya" })}
        {fieldInput("intro_message", "Intro message", { long: true })}
        {fieldInput("footer_note", "Footer note", { long: true })}
      </div>
    ),
    colors: (
      <PalettePicker
        theme={theme}
        value={{ palette_id: draft.palette_id, colors: paletteNow }}
        onChange={(next) => patch({ palette_id: next.palette_id, custom_colors: next.colors })}
        photoUrls={photoUrls}
      />
    ),
    fonts: (
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(FONT_PAIRINGS) as FontChoice[]).map((fk) => (
          <button
            key={fk}
            onClick={() => patch({ font_choice: fk })}
            style={{ fontFamily: FONT_PAIRINGS[fk].heading }}
            className={`rounded-xl border px-3 py-3 text-base transition-colors ${
              draft.font_choice === fk ? "border-accent bg-accent/8" : "border-line bg-cream"
            }`}
          >
            {FONT_PAIRINGS[fk].label}
          </button>
        ))}
      </div>
    ),
    background: (
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(BACKGROUND_STYLES) as BackgroundStyle[]).map((bk) => (
          <button
            key={bk}
            onClick={() => patch({ background_style: bk })}
            className={`rounded-xl border p-2 text-left transition-colors ${
              draft.background_style === bk ? "border-accent bg-accent/8" : "border-line bg-cream"
            }`}
          >
            <span
              className="block h-10 w-full rounded-lg ring-1 ring-ink/10"
              style={backgroundCss(bk, paletteNow)}
            />
            <span className="mt-2 block text-xs font-medium">{BACKGROUND_STYLES[bk].label}</span>
            <span className="block text-[11px] text-muted">{BACKGROUND_STYLES[bk].hint}</span>
          </button>
        ))}
      </div>
    ),
    sections: (
      <div className="space-y-3">
        {MODULES.map((mod) => {
          const on = modules.find((m) => m.module_type === mod.type)?.enabled ?? false;
          const titleField = MODULE_TITLE_FIELD[mod.type];
          return (
            <div
              key={mod.type}
              className={`rounded-xl border p-3 transition-colors ${
                on ? "border-accent bg-accent/8" : "border-line bg-cream"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{mod.label}</span>
                <button
                  onClick={() => void toggleModule(mod.type, !on)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase ${
                    on ? "bg-ink text-cream" : "border border-line bg-paper text-muted"
                  }`}
                >
                  {on ? "On · Free" : "Add"}
                </button>
              </div>
              {on && titleField ? (
                <div className="mt-3 space-y-3">
                  {fieldInput(
                    titleField,
                    mod.type === "countdown" ? "Counting down to" : "Section title",
                    {
                      placeholder: (titles as Record<string, string>)[titleField] ?? mod.label,
                    },
                  )}
                  {mod.type === "countdown" ? (
                    <label className="block">
                      <span className="text-xs text-muted">Date</span>
                      <input
                        type="date"
                        value={draft.countdown_date ?? ""}
                        onChange={(e) => patch({ countdown_date: e.target.value || null })}
                        className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                      />
                    </label>
                  ) : null}
                  {mod.type === "tree" ? (
                    <label className="block">
                      <span className="text-xs text-muted">Reveal date</span>
                      <input
                        type="date"
                        value={draft.tree_reveal_date ?? ""}
                        onChange={(e) => patch({ tree_reveal_date: e.target.value || null })}
                        className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        <label className="flex items-start gap-3 rounded-xl border border-line bg-cream p-3">
          <input
            type="checkbox"
            checked={draft.share_notes}
            onChange={(e) => patch({ share_notes: e.target.checked })}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium">Let friends read each other's notes</span>
            <span className="block text-xs text-muted">
              Off by default. Notes marked "Only{" "}
              {draft.custom_text.recipient_name || "the recipient"}" always stay sealed.
            </span>
          </span>
        </label>
      </div>
    ),
    surprises: (
      <CalendarEditor
        siteId={id}
        entries={calendarEntries}
        locked={draft.calendar_locked}
        onToggleLock={(v) => patch({ calendar_locked: v })}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ["calendar", id] })}
      />
    ),
    intro: (
      <div>
        <p className="text-xs text-muted">
          The first screen people see when they open your link. Its style comes from the theme.
        </p>
        <textarea
          rows={2}
          value={draft.intro_text ?? ""}
          placeholder="For Maya, from everyone who loves her"
          onChange={(e) => patch({ intro_text: e.target.value })}
          className="mt-3 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={() => setIntroPreview(true)}
          className="mt-2 w-full rounded-full border border-line bg-cream px-4 py-2.5 text-sm font-medium hover:bg-glass/80"
        >
          Preview the reveal
        </button>
      </div>
    ),
    comic: (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-cream p-1">
          {(["scrapbook", "comic"] as const).map((format) => (
            <Button key={format} type="button" variant={draft.format === format ? "default" : "ghost"} onClick={() => patch({ format })} className="capitalize">
              {format === "comic" ? "Comic Issue" : "Scrapbook"}
            </Button>
          ))}
        </div>
        {draft.format === "comic" ? (
          <>
            <label className="block"><span className="text-xs text-muted">Cover title</span><input value={normalizeComicSettings(draft.format_settings).cover_title ?? ""} onChange={(event) => patchComic({ cover_title: event.target.value })} placeholder={`THE AMAZING ${(draft.custom_text.recipient_name || "YOU").toUpperCase()}`} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
            <label className="block"><span className="text-xs text-muted">Cover subtitle</span><input value={normalizeComicSettings(draft.format_settings).cover_subtitle ?? ""} onChange={(event) => patchComic({ cover_subtitle: event.target.value })} placeholder="SPECIAL BIRTHDAY ISSUE" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
            <label className="flex items-start gap-3 rounded-xl border border-line bg-cream p-3"><input type="checkbox" checked={normalizeComicSettings(draft.format_settings).two_worlds === true} onChange={(event) => patchComic({ two_worlds: event.target.checked })} className="mt-0.5" /><span><span className="block text-sm font-medium">Two Worlds</span><span className="block text-xs text-muted">Let readers switch between two comic backdrops.</span></span></label>
            {normalizeComicSettings(draft.format_settings).two_worlds ? <div className="grid gap-3"><label><span className="text-xs text-muted">First world</span><input value={normalizeComicSettings(draft.format_settings).world_one ?? ""} onChange={(event) => patchComic({ world_one: event.target.value })} placeholder="HERO WORLD" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm" /></label><label><span className="text-xs text-muted">Second world</span><input value={normalizeComicSettings(draft.format_settings).world_two ?? ""} onChange={(event) => patchComic({ world_two: event.target.value })} placeholder="OHANA WORLD" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm" /></label></div> : null}
            <div><p className="text-sm font-medium">Panel organizer</p><p className="mt-1 text-xs text-muted">Reorder panels or move one into another chapter.</p><div className="mt-3 space-y-2">{orderedComicIds(contributions.map((item) => item.id), normalizeComicSettings(draft.format_settings).panel_order).map((itemId, index, orderedIds) => { const item = contributions.find((entry) => entry.id === itemId); if (!item) return null; const settings = normalizeComicSettings(draft.format_settings); const chapter = settings.chapter_overrides?.[item.id] ?? item.module_type; return <div key={item.id} className="rounded-xl border border-line bg-cream p-3"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.author_name}</span><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveComicPanel(item.id, -1)} aria-label="Move panel up">↑</Button><Button type="button" size="icon" variant="ghost" disabled={index === orderedIds.length - 1} onClick={() => moveComicPanel(item.id, 1)} aria-label="Move panel down">↓</Button></div><select value={chapter} onChange={(event) => patchComic({ chapter_overrides: { ...settings.chapter_overrides, [item.id]: event.target.value } })} className="mt-2 w-full rounded-lg border border-line bg-paper px-2 py-2 text-xs">{MODULES.map((module) => <option key={module.type} value={module.type}>{module.label}</option>)}</select></div>; })}</div></div>
          </>
        ) : <p className="text-xs text-muted">The original scrolling gift stays exactly as it is.</p>}
      </div>
    ),
    review: (
      <div className="space-y-3">
        {contributions.length === 0 ? (
          <div className="card-paper p-5 text-sm text-muted">
            Nothing yet. Share the contribute link to get started.
          </div>
        ) : null}
        {contributions.map((item) => (
          <ReviewCard
            key={item.id}
            item={item}
            onApprove={() => void setStatus(item.id, "approved")}
            onHide={() => void setStatus(item.id, "hidden")}
          />
        ))}
      </div>
    ),
  };

  const rail = (vertical: boolean) => (
    <nav
      className={
        vertical
          ? "flex w-[72px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-cream/70 py-3"
          : "flex gap-1 overflow-x-auto border-t border-line bg-cream/90 px-2 py-2"
      }
    >
      {railSections.map((key) => {
        const Icon = SECTION_ICONS[key];
        const active = section === key && (vertical ? panelOpen : sheetOpen);
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (vertical) {
                if (section === key && panelOpen) setPanelOpen(false);
                else {
                  setSection(key);
                  setPanelOpen(true);
                }
              } else {
                setSection(key);
                setSheetOpen(true);
              }
            }}
            className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
              vertical ? "mx-2" : "min-w-[68px]"
            } ${active ? "bg-accent/15 text-ink" : "text-muted hover:bg-glass/70 hover:text-ink"}`}
          >
            <Icon className="size-5" />
            <span className={`text-[10px] ${active ? "font-semibold text-ink" : ""}`}>
              {SECTION_TITLES[key]}
            </span>
            {key === "review" && pending.length > 0 ? (
              <span className="absolute top-1 right-2 rounded-full bg-accent px-1.5 text-[10px] font-medium text-cream">
                {pending.length}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  const panel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="font-display text-lg">{SECTION_TITLES[section]}</span>
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setPanelOpen(false)}
          className="ml-auto text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
        {section === "review" && pending.length > 0 ? (
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-cream">
            {pending.length} waiting
          </span>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{sectionBody[section]}</div>
    </div>
  );


  const canvas = (
    <div className="relative flex min-w-0 flex-1 flex-col bg-ink/10">
      <div
        ref={canvasRef}
        className="relative min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        <div className="flex h-full justify-center">
          <div
            className={
              device === "phone"
                ? "h-full w-full max-w-[390px] overflow-hidden rounded-[28px] border border-line bg-cream shadow-xl"
                : "h-full w-full overflow-hidden rounded-xl border border-line bg-cream shadow-sm"
            }
            style={
              zoom
                ? { transform: `scale(${zoom / 100})`, transformOrigin: "top center" }
                : undefined
            }
          >
            <div className="h-full overflow-y-auto overscroll-contain">
               {draft.format === "comic" ? <ComicIssueView site={draft} modules={modules} contributions={approved} calendarEntries={calendarEntries} palette={paletteNow} sample /> : <GiftSiteView site={draft} theme={theme} modules={modules} contributions={approved} calendarEntries={calendarEntries} sample highlightField={focusField} onEditField={(field) => { openField(field); selectInPreview(field); }} />}
            </div>
          </div>
        </div>
        {selected ? (
          <div
            className="pointer-events-auto absolute z-30 -translate-x-1/2 -translate-y-full pb-2"
            style={{ top: selected.top, left: selected.left }}
          >
            <div className="flex items-center gap-1 rounded-full border border-line bg-cream px-1.5 py-1 text-[11px] shadow-lg">
              {selectionActions(selected.field).map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.run}
                  className="rounded-full px-2 py-1 font-medium text-muted hover:bg-accent/15 hover:text-ink"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {/* Canvas bottom bar, Canva-style */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line bg-cream/95 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full border border-line bg-paper p-0.5 text-[11px]">
            {(["phone", "desktop"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={`rounded-full px-2.5 py-1 font-medium capitalize ${
                  device === d ? "bg-ink text-cream" : "text-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIntroPreview(true)}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink"
          >
            Replay intro
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            aria-label="Zoom"
            min={25}
            max={200}
            step={5}
            value={zoom ?? 100}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="hidden w-28 accent-[#B5623E] min-[900px]:block"
          />
          <span className="hidden w-10 text-[11px] text-muted min-[900px]:block">
            {zoom ? `${zoom}%` : "Fit"}
          </span>
          <button
            type="button"
            onClick={() => setZoom(null)}
            className="hidden rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink min-[900px]:block"
          >
            Fit
          </button>
          <button
            type="button"
            aria-label="Full screen preview"
            onClick={() => {
              setPreviewOpened(false);
              setFullPreview(true);
            }}
            className="flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-cream"
          >
            <Maximize2 className="size-3" />
            Full screen
          </button>
        </div>
      </div>
    </div>
  );


  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-paper text-ink">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-paper px-3 sm:px-4">
        <div className="flex min-w-0 flex-col justify-center gap-0.5">
        <div className="group flex min-w-0 items-center gap-2">
          <Link to="/dashboard" className="shrink-0 text-xs text-muted hover:text-ink">
            ← All gifts
          </Link>
          <span className="text-line">·</span>
          {renaming ? (
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") setRenaming(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-accent bg-cream px-2 py-1 font-display text-base outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              title="Click to rename"
              className="flex min-w-0 items-center gap-1 truncate font-display text-base font-medium hover:text-accent sm:text-lg"
            >
              <span className="truncate">{draft.title}</span>
              <Pencil className="size-3.5 shrink-0 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
          <span className="hidden shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted uppercase sm:inline">
            {saving || dirty ? "Saving…" : "Saved"}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted">
          {theme?.name ? (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 font-medium"
              style={{ background: paletteNow.accent + "33", color: "#2B2522" }}
            >
              {theme.name}
            </span>
          ) : null}
          {draft.custom_text.recipient_name ? (
            <span className="truncate">for {draft.custom_text.recipient_name}</span>
          ) : null}
          {daysToGo !== null ? <span className="shrink-0">· {daysToGo}</span> : null}
        </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSection("review");
              if (typeof window !== "undefined" && window.innerWidth < 900) setSheetOpen(true);
              else setPanelOpen(true);
            }}
            className="hidden h-10 items-center gap-2 rounded-full border border-line bg-cream px-3 text-xs text-muted transition-colors hover:text-ink min-[900px]:flex"
          >
            {friends.length > 0 ? (
              <span className="flex -space-x-2">
                {friends.slice(0, 3).map((name, i) => (
                  <span
                    key={name}
                    className="grid size-6 place-items-center rounded-full border border-cream text-[10px] font-semibold text-ink/80"
                    style={{ background: FRIEND_TINTS[i % FRIEND_TINTS.length] }}
                  >
                    {initials(name)}
                  </span>
                ))}
              </span>
            ) : null}
            <span>
              {friends.length > 0
                ? `${friends.length} friend${friends.length === 1 ? "" : "s"} added notes`
                : "No notes yet"}
            </span>
          </button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="hidden h-10 rounded-full min-[900px]:inline-flex">
                <UserPlus />
                Invite friends
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              <p className="text-sm text-muted">
                Send this link so friends can add their notes, photos and songs.
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={contributeUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-cream px-2 py-1.5 font-mono text-[11px]"
                />
                <Button size="sm" onClick={copyContributeLink}>
                  Copy
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={messengerUrl} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    Messenger
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    <Send />
                    WhatsApp
                  </a>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="hidden h-10 rounded-full min-[900px]:inline-flex"
            onClick={() => {
              setPreviewOpened(false);
              setFullPreview(true);
            }}
          >
            <Eye />
            Preview
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full min-[900px]:hidden"
                aria-label="More gift actions"
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => {
                  setSection("review");
                  setSheetOpen(true);
                }}
              >
                <Inbox />
                {friends.length > 0
                  ? `${friends.length} friend${friends.length === 1 ? "" : "s"} added notes`
                  : "No notes yet"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={copyContributeLink}>
                <UserPlus />
                Invite friends
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setPreviewOpened(false);
                  setFullPreview(true);
                }}
              >
                <Eye />
                Preview
              </DropdownMenuItem>
              {draft.status === "published" ? (
                <DropdownMenuItem onSelect={copyLiveLink}>
                  <LinkIcon />
                  Copy gift link
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {draft.status === "published" ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 rounded-full">
                  <Check />
                  Sent
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={liveUrl} target="_blank" rel="noreferrer">
                    View live gift
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={copyLiveLink}>Copy gift link</DropdownMenuItem>
                {canRenameLink(billing?.tier ?? null) ? (
                  <DropdownMenuItem onSelect={() => setLinkNameOpen(true)}>Change link name</DropdownMenuItem>
                ) : null}
                {billing && billing.upgrades.length > 0 && !billing.ended ? (
                  <DropdownMenuItem onSelect={() => setPlanPicker("upgrade")}>Upgrade plan</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => void unpublish()}>Unpublish</DropdownMenuItem>
                {planSummary(billing) ? (
                  <p className="px-2 pt-1.5 pb-1 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                    {planSummary(billing)}
                  </p>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !hasPlan ? (
            <Button className="h-10 rounded-full" disabled={saving || !billing} onClick={() => void publish()}>
              <Gift />
              Wrap it up
            </Button>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button className="h-10 rounded-full" disabled={saving}>
                  <Gift />
                  Wrap it up
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                <p className="font-display text-base">
                  Ready to send this to {draft.custom_text.recipient_name || "them"}?
                </p>
                <p className="text-xs text-muted">
                  It's already paid for ({planSummary(billing)}). Friends can still add notes, and you
                  can unpublish any time.
                </p>
                <Button className="w-full" onClick={() => void publish()} disabled={saving}>
                  Yes, wrap it up
                </Button>
              </PopoverContent>
            </Popover>
          )}
        </div>

      </header>
      <PlanBanner billing={billing} onUpgrade={() => setPlanPicker("upgrade")} />
      <PlanPickerDialog
        siteId={id}
        recipient={draft.custom_text.recipient_name || "them"}
        mode={planPicker ?? "publish"}
        open={planPicker !== null}
        onOpenChange={(open) => !open && setPlanPicker(null)}
      />
      <LinkNameDialog
        key={site.slug}
        siteId={id}
        slug={site.slug}
        open={linkNameOpen}
        onOpenChange={setLinkNameOpen}
        onSaved={(slug) => setDraft((prev) => (prev ? { ...prev, slug } : prev))}
      />

      {/* Desktop: icon rail + flyout panel + canvas */}
      <div className="flex min-h-0 flex-1">
        <div className="hidden min-[900px]:flex">{rail(true)}</div>
        {panelOpen ? (
          <aside
            className="relative hidden shrink-0 border-r border-line bg-paper min-[900px]:block"
            style={{ width: panelWidth }}
          >
            {panel}
            <div
              role="separator"
              aria-label="Resize panel"
              onPointerDown={startPanelResize}
              className="absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize hover:bg-accent/40"
            />
            <button
              type="button"
              aria-label="Collapse panel"
              onClick={() => setPanelOpen(false)}
              className="absolute top-1/2 -right-3 z-30 grid size-6 -translate-y-1/2 place-items-center rounded-full border border-line bg-cream text-muted shadow-sm hover:text-ink"
            >
              <ChevronLeft className="size-3.5" />
            </button>
          </aside>
        ) : null}
        {canvas}
      </div>

      {/* Small screens: canvas fills, rail becomes a bottom toolbar with a sheet */}
      <div className="min-[900px]:hidden">{rail(false)}</div>
      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/40 min-[900px]:hidden"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="flex h-[70dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2">
              <span className="h-1 w-10 rounded-full bg-line" />
            </div>
            <div className="flex items-center justify-between px-5 pt-2">
              <span className="font-display text-lg">{SECTION_TITLES[section]}</span>
              <button onClick={() => setSheetOpen(false)} className="text-sm text-muted">
                Done
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{sectionBody[section]}</div>
          </div>
        </div>
      ) : null}


      {introPreview && draft.format === "comic" ? (
        <ComicIssueView key="comic-cover-preview" site={draft} modules={modules} contributions={approved} calendarEntries={calendarEntries} palette={paletteNow} showCover sample onClose={() => setIntroPreview(false)} />
      ) : introPreview ? (
        <GiftIntro
          style={introStyleForTheme(theme?.name)}
          palette={paletteNow}
          fonts={FONT_PAIRINGS[draft.font_choice] ?? FONT_PAIRINGS.romantic}
          backgroundStyle={draft.background_style}
          recipientName={draft.custom_text.recipient_name}
          introText={draft.intro_text ?? undefined}
          onOpen={() => setIntroPreview(false)}
        />
      ) : null}
      {fullPreview ? (
        <div className="fixed inset-0 z-[70] bg-paper text-ink">
          <div className="absolute inset-x-0 top-0 z-[80] border-b border-line bg-cream/95 px-3 py-2 shadow-sm backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">Previewing as <strong>{draft.custom_text.recipient_name || "Maya"}</strong></span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-line bg-paper p-0.5 text-xs">
                  {(["phone", "desktop"] as const).map((view) => <button key={view} onClick={() => setDevice(view)} className={`rounded-full px-3 py-1.5 capitalize ${device === view ? "bg-ink text-cream" : "text-muted"}`}>{view}</button>)}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpened(false)}>Replay intro</Button>
                <Button size="sm" onClick={() => setFullPreview(false)}>Back to editing</Button>
              </div>
            </div>
          </div>
          <div className="h-full overflow-auto pt-24 sm:pt-[62px]">
            <div className={device === "phone" ? "relative mx-auto h-[calc(100vh-78px)] w-full max-w-[390px] overflow-y-auto rounded-[28px] border border-line shadow-xl" : "relative min-h-[calc(100vh-62px)]"}>
              {!previewOpened && draft.format !== "comic" ? (
                <GiftIntro
                  contained
                  style={introStyleForTheme(theme?.name)}
                  palette={paletteNow}
                  fonts={FONT_PAIRINGS[draft.font_choice] ?? FONT_PAIRINGS.romantic}
                  backgroundStyle={draft.background_style}
                  recipientName={draft.custom_text.recipient_name}
                  introText={draft.intro_text ?? undefined}
                  onOpen={() => setPreviewOpened(true)}
                />
              ) : draft.format === "comic" ? (
                <ComicIssueView key={previewOpened ? "comic-reader" : "comic-cover"} site={draft} modules={modules} contributions={approved} calendarEntries={calendarEntries} palette={paletteNow} showCover={!previewOpened} sample showShare />
              ) : (
                <GiftSiteView site={draft} theme={theme} modules={modules} contributions={approved} calendarEntries={calendarEntries} sample showShare />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReviewCard({
  item,
  onApprove,
  onHide,
}: {
  item: Contribution;
  onApprove: () => void;
  onHide: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    signedMediaUrl(item.media_url).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [item.media_url]);

  return (
    <div className="card-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{item.author_name}</p>
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
          {item.module_type} · {item.status}
        </span>
      </div>
      {url && item.module_type === "voice" ? (
        <audio controls src={url} className="mt-3 w-full" />
      ) : url ? (
        <img src={url} alt="" className="mt-3 aspect-square w-full rounded-xl object-cover" />
      ) : null}
      {item.text_content ? (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{item.text_content}</p>
      ) : null}
      {item.module_type === "tree" ? (
        <p className="mt-2 text-xs text-muted">
          Ornament: {item.ornament_key?.replace("-", " ") ?? "bauble"} · {item.visibility === "recipient" ? "Only the recipient" : "Anyone can read"}
        </p>
      ) : null}
      {item.external_link ? (
        <a
          href={item.external_link}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs break-all text-accent underline"
        >
          {item.external_link}
        </a>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onApprove}
          disabled={item.status === "approved"}
          className="flex-1 rounded-full bg-accent px-3 py-2 text-xs font-medium text-cream disabled:opacity-40"
        >
          Approve
        </button>
        <button
          onClick={onHide}
          disabled={item.status === "hidden"}
          className="flex-1 rounded-full border border-line bg-cream px-3 py-2 text-xs font-medium disabled:opacity-40"
        >
          Hide
        </button>
      </div>
    </div>
  );
}

function monthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= last.getDate(); d++) {
    const iso = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(iso);
  }
  return cells;
}

function CalendarEditor({
  siteId,
  entries,
  locked,
  onToggleLock,
  onChanged,
}: {
  siteId: string;
  entries: CalendarEntry[];
  locked: boolean;
  onToggleLock: (value: boolean) => void;
  onChanged: () => void;
}) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [date, setDate] = useState<string | null>(null);
  const [type, setType] = useState<CalendarEntry["type"]>("message");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const cells = monthDays(anchor);
  const filled = new Map(entries.map((e) => [e.entry_date, e]));

  function selectDate(iso: string) {
    setDate(iso);
    const existing = filled.get(iso);
    setType(existing?.type ?? "message");
    setText(existing?.text_content ?? "");
    setLink(existing?.external_link ?? "");
    setFile(null);
  }

  async function addEntry() {
    if (!date) {
      toast.error("Pick a date for this surprise.");
      return;
    }
    setBusy(true);
    let mediaPath: string | null = null;
    if (type === "photo" && file) {
      try {
        mediaPath = await uploadFile(file, "calendar", siteId);
      } catch {
        setBusy(false);
        toast.error("That photo couldn't be uploaded.");
        return;
      }
    }
    const ok = await upsertCalendarEntry({
      data: {
        siteId,
        entryDate: date,
        type,
        textContent: text.trim() || null,
        mediaUrl: mediaPath,
        externalLink: link.trim() || null,
      },
    })
      .then(() => true)
      .catch(() => false);
    setBusy(false);
    if (!ok) {
      toast.error("Couldn't save that surprise.");
      return;
    }
    setText("");
    setLink("");
    setFile(null);
    setDate(null);
    onChanged();
    toast.success("Surprise saved.");
  }

  async function remove(entryId: string) {
    const ok = await deleteCalendarEntry({ data: { id: entryId } })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      toast.error("Couldn't remove that one.");
      return;
    }
    setDate(null);
    onChanged();
  }

  const selectedEntry = date ? filled.get(date) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
          className="px-2 text-sm text-muted hover:text-ink"
        >
          ←
        </button>
        <p className="text-sm font-medium">
          {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
          className="px-2 text-sm text-muted hover:text-ink"
        >
          →
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="pb-1 text-center font-mono text-[10px] text-muted">
            {d}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              onClick={() => selectDate(iso)}
              className={`grid aspect-square place-items-center rounded-lg border text-xs transition-colors ${
                date === iso ? "border-accent bg-accent/12" : "border-line bg-cream hover:bg-glass/70"
              }`}
            >
              <span>{Number(iso.slice(8, 10))}</span>
              {filled.has(iso) ? <span className="mt-0.5 block size-1.5 rounded-full bg-accent" /> : null}
            </button>
          ) : (
            <span key={`empty-${i}`} />
          ),
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs text-muted">
        <input type="checkbox" checked={locked} onChange={(e) => onToggleLock(e.target.checked)} />
        Lock future dates until their day
      </label>

      {date ? (
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-cream p-3">
          <p className="text-xs font-medium">
            {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CalendarEntry["type"])}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="message">Message</option>
            <option value="photo">Photo</option>
            <option value="song">Song</option>
          </select>
          {type === "photo" ? (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          ) : null}
          {type === "song" ? (
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Spotify or YouTube link"
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            />
          ) : null}
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message for this day"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => void addEntry()}
              disabled={busy}
              className="flex-1 rounded-full bg-ink px-4 py-2 text-xs font-medium text-cream disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save this day"}
            </button>
            {selectedEntry ? (
              <button
                onClick={() => void remove(selectedEntry.id)}
                className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-medium"
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Tap a date to hide a message, photo or song behind it.
        </p>
      )}
    </div>
  );
}

export default SiteDashboard;
