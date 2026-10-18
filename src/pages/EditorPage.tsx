import { useEffect, useMemo, useRef, useState } from "react";
import { OCCASION_NAMES } from "@/copy/strings";
import { bodyFor, lookFor, resolveStyle, styleForLegacy, styleInfo, styleTitle, type StyleId } from "@/lib/styles";
import { isQuietOccasion, occasionName, type OccasionId } from "@/lib/occasions";
import { OccasionChips } from "@/components/styles/OccasionChips";
import { StyleArt, StylePicker } from "@/components/styles/StylePicker";
import { fetchThemes } from "@/lib/themes";
import { ConciergeOffer } from "@/components/ConciergeOffer";
import { trackEvent } from "@/lib/track";
import { countNotes, inGiftLabel, noteSummary, waitingLabel } from "@/lib/noteCounts";
import { ExportGift } from "@/components/ExportGift";
import { isFlagOn } from "@/config/flags";
import { engineThemeForName } from "@/themes/engine/registry";
import { t } from "@/i18n";
import { engineIntroProps } from "@/lib/engineGift";
import { CharCount } from "@/components/ui/CharCount";
import { LIMITS, customTextLimit } from "@/lib/limits";
import { themeKindOf } from "@/lib/themeKind";
import {Link, useParams} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { ComicIssueView } from "@/components/ComicIssueView";
import { FormatPicker } from "@/components/FormatPicker";
import { FormatView } from "@/components/formats/FormatView";
import { FORMATS, formatInfo } from "@/lib/formats";
import {
  deleteCalendarEntry,
  deleteContributions,
  setContributionStatus,
  setModuleEnabled,
  updateIntroSettings,
  updateCast,
  updateSite,
  upsertCalendarEntry,
} from "@/lib/api";
import { IntroDesigner } from "@/components/IntroDesigner";
import { CastPanel, type Cast } from "@/components/CastPanel";
import { countdownTarget, momentOf, toLocalInput, viewerZone } from "@/lib/time";
import { OwnNotes } from "@/components/OwnNotes";
import { useAuth } from "@/hooks/useAuth";
import { useMinWidth } from "@/hooks/use-mobile";
import { centerInScroller } from "@/lib/scroll";
import { DevicePreview, DeviceToggle, type PreviewDevice } from "@/components/DevicePreview";
import type { IntroSettings, IntroSticker } from "@/lib/intro";
import { uploadFile } from "@/lib/upload";
import { GiftIntro } from "@/components/GiftIntro";
import { BoBuddy } from "@/components/BoBuddy";
import { boReact, boSay, boWrap } from "@/lib/mascot/bus";
import { introStyleForTheme } from "@/lib/intro";
import {
  BACKGROUND_STYLES,
  FONT_PAIRINGS,
  FONT_CHOICES,
  loadPairingFonts,
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
import { comicSettingDefaults, normalizeComicSettings, orderedComicIds, type ComicSettings } from "@/lib/comic";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExtendDialog,
  GiftPasswordSetting,
  LinkNameDialog,
  PlanBanner,
  PlanPickerDialog,
  canRenameLink,
  planSummary,
  useBilling,
} from "@/components/PlanControls";
import { getTier, tierAllowsLook } from "@/config/pricing";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Eye,
  Gift,
  Inbox,
  Link as LinkIcon,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Settings2,
  Trash2,
  Pencil,
  Send,
  X,
} from "lucide-react";

const FRIEND_TINTS = ["#F7D9C4", "#D8E4DC", "#E6DCF2", "#F5E3B3", "#D9E6F2"];


/** The opening's settings with a new sticker list (no list at all when it's empty). */
function withStickers(settings: IntroSettings, stickers: IntroSticker[]): IntroSettings {
  const { stickers: _old, ...rest } = settings;
  return stickers.length ? { ...rest, stickers } : rest;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}



/** The editor's four steps, plus Gift settings (format, sections, who it's from). */
type SectionKey = "words" | "look" | "notes" | "wrap" | "settings";
const STEPS = ["words", "look", "notes", "wrap"] as const;

/** Older saved rail sections land on the step that holds them now. */
const LEGACY_SECTION: Record<string, SectionKey> = {
  words: "words",
  intro: "words",
  colors: "look",
  fonts: "look",
  background: "look",
  cast: "look",
  notes: "notes",
  review: "notes",
  surprises: "notes",
  sections: "settings",
  comic: "settings",
  look: "look",
  wrap: "wrap",
  settings: "settings",
};

const MODULE_TITLE_FIELD: Record<ModuleType, keyof CustomText | null> = {
  letters: "letters_title",
  photobooth: "photobooth_title",
  songs: "songs_title",
  wordcloud: "wordcloud_title",
  voice: "voice_title",
  countdown: "countdown_title",
  calendar: "calendar_title",
  tree: "tree_title",
  openwhen: "openwhen_title",
  capsule: "capsule_title",
  superlatives: "superlatives_title",
  quiz: "quiz_title",
  map: "map_title",
  coupons: "coupons_title",
  video: "video_title",
  doodle: "doodle_title",
};

const SECTION_TITLES: Record<SectionKey, string> = {
  words: "Words",
  look: "Look",
  notes: "Notes",
  wrap: "Wrap it up",
  settings: "Gift settings",
};


/** A titled group inside a step. Touching it can switch what the preview shows. */
function StepGroup({
  title,
  hint,
  aside,
  onActivate,
  children,
}: {
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  onActivate?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className="border-t border-line pt-4 first:border-t-0 first:pt-0"
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SiteDashboard() {
  const { id } = useParams({ from: "/_authenticated/sites/$id" });
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<GiftSite | null>(null);
  // Bo says something sweet once the recipient's name is filled in (not for the saved name on load).
  const recipientName = draft?.custom_text.recipient_name?.trim() ?? "";
  const lastNameSaid = useRef<string | null>(null);
  useEffect(() => {
    if (!draft) return;
    if (lastNameSaid.current === null) {
      lastNameSaid.current = recipientName;
      return;
    }
    if (recipientName.length < 2 || recipientName === lastNameSaid.current) return;
    const t = window.setTimeout(() => {
      lastNameSaid.current = recipientName;
      boSay(`${recipientName} is so lucky.`, "love");
    }, 1100);
    return () => window.clearTimeout(t);
  }, [recipientName, draft]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [introPreview, setIntroPreview] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [planPicker, setPlanPicker] = useState<"publish" | "upgrade" | null>(null);
  const [linkNameOpen, setLinkNameOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  // The rail remembers the section this gift was last edited in.
  const [section, setSection] = useState<SectionKey>("words");
  /** Steps the organiser has worked on (changed something, or tapped Next). Only these get a check. */
  const [touched, setTouched] = useState<ReadonlySet<SectionKey>>(() => new Set());
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(`jb:touched:${id}`) ?? "[]") as SectionKey[];
      if (Array.isArray(saved) && saved.length) setTouched(new Set(saved));
    } catch {
      /* private mode: start fresh */
    }
  }, [id]);
  const touch = (step: SectionKey) =>
    setTouched((prev) => {
      if (prev.has(step)) return prev;
      const next = new Set(prev).add(step);
      try {
        window.localStorage.setItem(`jb:touched:${id}`, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  /** What the canvas shows while editing: the opening screen or the gift itself. */
  const [canvasView, setCanvasView] = useState<"intro" | "gift">("intro");
  const [customizeLook, setCustomizeLook] = useState(false);
  const [formatAsk, setFormatAsk] = useState<GiftSite["format"] | null>(null);
  const [styleAsk, setStyleAsk] = useState<StyleId | null>(null);
  const [occasionRow, setOccasionRow] = useState<OccasionId | null | undefined>(undefined);
  /** A section with notes in it that the organiser asked to turn off. */
  const [offAsk, setOffAsk] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [focusField, setFocusField] = useState<keyof CustomText | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("phone");
  /** Bumped to replay the opening in the canvas while the Intro panel is open. */
  const [introCanvasKey, setIntroCanvasKey] = useState(0);
  const introSaveTimer = useRef<number | null>(null);
  const castSaveTimer = useRef<number | null>(null);
  const [moreSections, setMoreSections] = useState(false);
  const castLatest = useRef<Cast | null>(null);
  const introLatest = useRef<IntroSettings | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Phone sheet height in % of the screen. Opens at 45 so the preview stays in view; drag the handle for more. */
  const [sheetH, setSheetH] = useState(45);
  const [sheetDragging, setSheetDragging] = useState(false);
  function dragSheet(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = sheetH;
    let h = startH;
    setSheetDragging(true);
    const move = (ev: PointerEvent) => {
      h = Math.min(92, Math.max(20, startH + ((startY - ev.clientY) / window.innerHeight) * 100));
      setSheetH(h);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setSheetDragging(false);
      // A tap on the handle toggles between half and tall; a drag snaps to the nearest.
      if (Math.abs(h - startH) < 2) setSheetH(startH > 60 ? 45 : 88);
      else if (h < 28) {
        setSheetOpen(false);
        setSheetH(45);
      } else setSheetH(h > 66 ? 88 : 45);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  const [renaming, setRenaming] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [previewOpened, setPreviewOpened] = useState(false);
  const [panelWidth, setPanelWidth] = useState(340);
  const [zoom, setZoom] = useState<number | null>(null); // null = Fit
  // On phones the preview fills the screen, so Bo sits this one out instead of covering it.
  const roomForBo = useMinWidth(900);
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
  const { data: savedTheme = null } = useQuery({
    queryKey: ["theme", site?.theme_id],
    queryFn: () => fetchTheme(site?.theme_id ?? null),
    enabled: !!site,
  });
  // Styles (flag `styles`): a style picked here shows its look straight away, before the save
  // brings back the new theme row. Older gifts (no style) keep their saved theme.
  const stylesOn = isFlagOn("styles");
  const { data: publishedThemes = [] } = useQuery({ queryKey: ["themes", "published"], queryFn: () => fetchThemes(false), enabled: stylesOn });
  const draftLook = stylesOn && draft?.style ? lookFor(styleInfo(draft.style), draft.occasion) : null;
  const theme =
    stylesOn && draft?.style
      ? draftLook
        ? (publishedThemes.find((x) => x.name === draftLook.theme) ?? (savedTheme?.name === draftLook.theme ? savedTheme : null))
        : null
      : savedTheme;
  const engineTheme = engineThemeForName(theme?.name);
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
  const { user: authUser } = useAuth();
  /** Paid (or legacy) and not ended: the gift can go live without paying again. */
  const hasPlan = !!billing?.tier && !billing.ended;
  const planTier = getTier(billing?.tier);

  useEffect(() => {
    if (site && !draft) setDraft(site);
  }, [site, draft]);

  // Restore the last open rail section for this gift ("Your notes" first on a new Just me gift).
  const sectionRestored = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || !site || sectionRestored.current) return;
    sectionRestored.current = true;
    const saved = LEGACY_SECTION[window.localStorage.getItem(`jb:editor-section:${id}`) ?? ""];
    if (saved) setSection(saved);
  }, [id, site]);

  useEffect(() => {
    if (typeof window === "undefined" || !sectionRestored.current) return;
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


  // One set of numbers for the top bar, the Notes badge, Wrap it up and My gifts.
  const counts = countNotes(contributions);
  // Adding your own note in the Notes step counts as working on it.
  const inGiftBefore = useRef<number | null>(null);
  useEffect(() => {
    if (inGiftBefore.current !== null && counts.inGift > inGiftBefore.current && section === "notes") touch("notes");
    inGiftBefore.current = counts.inGift;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counts.inGift]);

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
      centerInScroller(el);
    }
  }, [focusField, section]);

  // Sticker undo: every change to the opening's stickers (from the preview or the panel) is a
  // step back. Compared by content, so a reload of the same gift isn't a step.
  const stickersNow = draft?.intro_settings.stickers;
  const stickerHistory = useRef<string[]>([]);
  const lastStickers = useRef<string | null>(null);
  const undoingStickers = useRef(false);
  const [stickerSteps, setStickerSteps] = useState(0);
  useEffect(() => {
    if (!draft) return;
    const now = JSON.stringify(stickersNow ?? []);
    const before = lastStickers.current;
    lastStickers.current = now;
    if (before === null || before === now) return;
    if (undoingStickers.current) {
      undoingStickers.current = false;
      return;
    }
    stickerHistory.current = [...stickerHistory.current, before].slice(-40);
    setStickerSteps(stickerHistory.current.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickersNow, !draft]);

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
            countdown_at: next.countdown_at || null,
            calendar_locked: next.calendar_locked,
            intro_text: next.intro_text,
            background_style: next.background_style,
            tree_reveal_date: next.tree_reveal_date || null,
            palette_id: next.palette_id,
            share_notes: next.share_notes,
            ...(withStatus ? { status: next.status } : {}),
            solo: next.solo,
            format: next.format,
            ...(stylesOn && next.style ? { style: next.style } : {}),
            ...(stylesOn ? { occasion: next.occasion } : {}),
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
  const titles = defaultTitles(draft.custom_text, themeKindOf(theme), draft.occasion);
  const shareMessage = `Add something to ${draft.custom_text.recipient_name || "our"}'s gift: ${contributeUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(contributeUrl)}&redirect_uri=${encodeURIComponent(contributeUrl)}&app_id=291494419107518`;


  function patch(update: Partial<GiftSite>) {
    setDraft((prev) => (prev ? { ...prev, ...update } : prev));
    setDirty(true);
    touch(section);
  }

  /** Intro designer changes: shown at once, saved on their own shortly after. */
  function patchIntro(update: (prev: IntroSettings) => IntroSettings) {
    touch(section);
    setDraft((prev) => {
      if (!prev) return prev;
      const next = update(prev.intro_settings);
      introLatest.current = next;
      return { ...prev, intro_settings: next };
    });
    if (introSaveTimer.current) window.clearTimeout(introSaveTimer.current);
    introSaveTimer.current = window.setTimeout(() => {
      const settings = introLatest.current;
      if (!settings) return;
      setSaving(true);
      updateIntroSettings({ data: { id, settings: settings as Record<string, never> } })
        .then(() => {
          setSavedAt(Date.now());
          void queryClient.invalidateQueries({ queryKey: ["site", id] });
        })
        .catch(() => toast.error("Couldn't save the opening. Try again in a moment."))
        .finally(() => setSaving(false));
    }, 600);
  }

  /** Cast changes: shown at once in the preview, saved shortly after. */
  function patchCast(next: Cast) {
    touch(section);
    castLatest.current = next;
    setDraft((prev) => (prev ? { ...prev, character: next.character, icon_set: next.icon_set } : prev));
    if (castSaveTimer.current) window.clearTimeout(castSaveTimer.current);
    castSaveTimer.current = window.setTimeout(() => {
      const c = castLatest.current;
      if (!c) return;
      setSaving(true);
      updateCast({ data: { id, character: (c.character as Record<string, never> | null) ?? null, iconSet: (c.icon_set as Record<string, never> | null) ?? null } })
        .then(() => {
          setSavedAt(Date.now());
          void queryClient.invalidateQueries({ queryKey: ["site", id] });
        })
        .catch(() => toast.error("Couldn't save the cast. Try again in a moment."))
        .finally(() => setSaving(false));
    }, 600);
  }

  /** Sticker changes from the preview canvas (move, resize, turn, delete, bring to front). */
  function changeIntroStickers(update: (prev: IntroSticker[]) => IntroSticker[]) {
    patchIntro((current) => withStickers(current, update(current.stickers ?? [])));
  }

  function undoIntroStickers() {
    const prev = stickerHistory.current.pop();
    setStickerSteps(stickerHistory.current.length);
    if (prev === undefined) return;
    undoingStickers.current = true;
    patchIntro((current) => withStickers(current, JSON.parse(prev) as IntroSticker[]));
  }

  function patchText(key: keyof CustomText, value: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, custom_text: { ...prev.custom_text, [key]: value } };
      // The heading is the gift's name: the top bar, My gifts and emails all follow it.
      if (key === "heading" && value.trim()) next.title = value;
      return next;
    });
    setDirty(true);
    touch(section);
  }

  /** Renaming in the top bar changes the heading too, so there's one name. */
  function rename(value: string) {
    setDraft((prev) => (prev ? { ...prev, title: value, custom_text: { ...prev.custom_text, heading: value } } : prev));
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
    boReact("wave");
    trackEvent("invite_shared", id, { channel: "copy" });
    void navigator.clipboard.writeText(contributeUrl);
    const who = draft?.custom_text.recipient_name?.trim();
    toast.success(who ? `Invite link copied. Send it to ${who}'s friends.` : "Invite link copied. Send it to friends.");

  }

  function copyLiveLink() {
    void navigator.clipboard.writeText(liveUrl);
    toast.success("Live link copied.");
  }

  /**
   * Approve or hide one or more notes. A toast offers Undo, which puts each note back where it was.
   * `undoing` skips the toast for the undo itself.
   */
  async function setStatus(ids: string | string[], status: Contribution["status"], undoing = false) {
    const list = Array.isArray(ids) ? ids : [ids];
    const before = new Map(contributions.filter((c) => list.includes(c.id)).map((c) => [c.id, c.status]));
    const ok = await setContributionStatus({ data: { ids: list, status } })
      .then(() => true)
      .catch((err: unknown) => {
        toast.error(err instanceof Error && err.message.length < 160 ? err.message : "Couldn't update that note.");
        return false;
      });
    if (!ok) return;
    touch("notes");
    await queryClient.invalidateQueries({ queryKey: ["contributions", id] });
    if (undoing) return;
    const what = list.length === 1 ? "Note" : `${list.length} notes`;
    toast.success(status === "approved" ? `${what} added to the gift.` : status === "hidden" ? `${what} hidden.` : `${what} moved back.`, {
      action: {
        label: "Undo",
        onClick: () => {
          const groups = new Map<Contribution["status"], string[]>();
          for (const [cid, prev] of before) groups.set(prev, [...(groups.get(prev) ?? []), cid]);
          for (const [prev, gids] of groups) void setStatus(gids, prev, true);
        },
      },
    });
  }

  async function removeNote(contributionId: string) {
    const ok = await deleteContributions({ data: { ids: [contributionId] } })
      .then(() => true)
      .catch(() => false);
    if (!ok) {
      toast.error("Couldn't delete that note.");
      return;
    }
    touch("notes");
    toast.success("Note deleted.");
    await queryClient.invalidateQueries({ queryKey: ["contributions", id] });
  }

  async function toggleModule(moduleType: string, enabled: boolean, confirmed = false) {
    if (!enabled) {
      const onCount = modules.filter((m) => m.enabled).length;
      if (onCount <= 1) {
        toast.error("A gift needs at least one section. Turn another one on first.");
        return;
      }
      const inIt = contributions.filter((c) => c.module_type === moduleType && c.status !== "hidden").length;
      if (inIt > 0 && !confirmed) {
        setOffAsk(moduleType);
        return;
      }
    }
    setOffAsk(null);
    await setModuleEnabled({
      data: { siteId: id, moduleType: moduleType as ModuleType, enabled },
    }).catch((err: unknown) =>
      toast.error(err instanceof Error && err.message.length < 160 ? err.message : "Couldn't update that section."),
    );
    queryClient.invalidateQueries({ queryKey: ["modules", id] });
  }

  const daysToGo = (() => {
    const date = countdownTarget(draft);
    if (!date) return null;
    const diff = Math.ceil((momentOf(date) - Date.now()) / 86400000);
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
      return [{ label: "Change date", run: go("words", field) }];
    }
    if (field.endsWith("_title")) {
      return [
        { label: "Rename", run: go("words", field) },
        { label: "Turn sections on or off", run: go("settings") },
      ];
    }
    return [
      { label: "Edit text", run: go("words", field) },
      { label: "Font", run: go("look") },
      { label: "Color", run: go("look") },
    ];
  }

  function openField(field: keyof CustomText) {
    setSection("words");
    setCanvasView("gift");
    setPanelOpen(true);
    setFocusField(field);
    if (typeof window !== "undefined" && window.innerWidth < 900) setSheetOpen(true);
    setTimeout(() => {
      const el = fieldRefs.current[field];
      if (el) centerInScroller(el);
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

  const solo = draft.solo;
  const usesIntro = formatInfo(draft.format).usesIntro;
  const isOn = (type: string) => modules.find((m) => m.module_type === type)?.enabled ?? false;
  /** Notes the recipient will see (yours count too). */
  const shownNotes = counts.inGift;
  const stepDone: Record<SectionKey, boolean> = {
    words: !!draft.custom_text.recipient_name?.trim(),
    look: true,
    notes: shownNotes > 0,
    wrap: draft.status === "published",
    settings: false,
  };
  const readyToWrap = stepDone.words && stepDone.notes;
  /** The rail's checks: done, and the organiser has actually been there. A sent gift is done everywhere. */
  const railDone = (key: SectionKey) => stepDone[key] && (draft.status === "published" || touched.has(key));
  const titledModules = MODULES.filter((mod) => isOn(mod.type) && MODULE_TITLE_FIELD[mod.type]);
  const friendNotes = contributions.filter((c) => !c.by_owner);

  function goTo(next: SectionKey) {
    setSection(next);
    if (next === "words") setCanvasView("intro");
    if (next === "look" || next === "notes" || next === "wrap") setCanvasView("gift");
    if (typeof window !== "undefined" && window.innerWidth < 900) setSheetOpen(true);
    else setPanelOpen(true);
  }

  /** Switching style: its own layout, and its colors when it brings a look. Notes and words stay. */
  function switchStyle(next: StyleId) {
    const info = styleInfo(next);
    const look = lookFor(info, draft?.occasion ?? null);
    const lookTheme = look ? publishedThemes.find((x) => x.name === look.theme) : undefined;
    const pal = lookTheme ? palettesQuery.data?.find((p) => p.id === lookTheme.suggested_palette_ids[0]) : undefined;
    patch({
      style: next,
      format: bodyFor(info),
      ...(pal ? { palette_id: pal.id, custom_colors: { background: pal.background, primary: pal.primary, accent: pal.accent } } : {}),
    });
    setStyleAsk(null);
    boSay(`${styleTitle(next)}. Lovely.`, "wink");
  }

  function chooseFormat(next: GiftSite["format"]) {
    if (next === draft?.format) return;
    setFormatAsk(next);
  }

  const fieldInput = (
    key: keyof CustomText,
    label: string,
    opts: { long?: boolean; placeholder?: string; hint?: string; numeric?: boolean } = {},
  ) => (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        <CharCount value={draft.custom_text[key]} max={customTextLimit(key)} />
      </span>
      {opts.long ? (
        <textarea
          ref={(el) => {
            if (el && el.getClientRects().length === 0) return;
            fieldRefs.current[key] = el;
          }}
          rows={3}
          maxLength={customTextLimit(key)}
          {...(opts.numeric ? { inputMode: "numeric" as const, pattern: "[0-9]*" } : {})}
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
          maxLength={customTextLimit(key)}
          value={draft.custom_text[key] ?? ""}
          placeholder={opts.placeholder ?? label}
          onFocus={() => setFocusField(key)}
          onChange={(e) => patchText(key, e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      )}
      {opts.hint ? <span className="mt-1.5 block text-xs text-muted">{opts.hint}</span> : null}
    </label>
  );

  const sectionBody: Record<SectionKey, React.ReactNode> = {
    words: (
      <div className="space-y-5">
        {usesIntro ? (
          <StepGroup title="Opening screen" hint="The first thing they see." onActivate={() => setCanvasView("intro")}>
            <IntroDesigner
              siteId={id}
              settings={draft.intro_settings}
              onChange={patchIntro}
              onUndoStickers={stickerSteps > 0 ? undoIntroStickers : undefined}
              palette={paletteNow}
              kind={resolveStyle(draft, theme).introKind}
              introStyle={introStyleForTheme(theme?.name)}
              offers={engineTheme?.offers}
              badgeHint={draft.occasion ? occasionName(draft.occasion) : undefined}
              greeting={
                <label className="block">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-muted">Greeting</span>
                    <CharCount value={draft.intro_text} max={LIMITS.greeting} />
                  </span>
                  <textarea
                    rows={2}
                    maxLength={LIMITS.greeting}
                    value={draft.intro_text ?? ""}
                    placeholder={
                      solo
                        ? `For ${draft.custom_text.recipient_name || "you"}, with love`
                        : `For ${draft.custom_text.recipient_name || "you"}, from all of us`
                    }
                    onChange={(e) => patch({ intro_text: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>
              }
            />
          </StepGroup>
        ) : null}
        <StepGroup
          title="Main page"
          {...(usesIntro ? { hint: "Right after the opening." } : {})}
          onActivate={() => setCanvasView("gift")}
        >
          <div className="space-y-3">
            {fieldInput("heading", "Heading", { placeholder: titles.heading })}
            {fieldInput("recipient_name", "Who it's for", { placeholder: "Their name" })}
            {themeKindOf(theme) === "birthday" && !engineTheme && isFlagOn("birthdayAge")
              ? fieldInput("turning", t("birthday.turning"), { placeholder: "30", hint: t("birthday.turningHint"), numeric: true })
              : null}
            {engineTheme?.slots.includes("place") ? fieldInput("to_place", t("editor.toPlace"), { placeholder: "Lisbon, Portugal", hint: t("editor.toPlaceHint") }) : null}
            {engineTheme?.slots.includes("senderPlace") ? fieldInput("from_place", t("editor.fromPlace"), { placeholder: "Manila, Philippines", hint: t("editor.fromPlaceHint") }) : null}
            {fieldInput("intro_message", "Message under the title", {
              long: true,
              placeholder: solo ? "I made this just for you. Take your time." : "We all got together to make you something.",
            })}
          </div>
        </StepGroup>
        {titledModules.length > 0 ? (
          <StepGroup title="Section titles" onActivate={() => setCanvasView("gift")}>
            <div className="space-y-3">
              {titledModules.map((mod) => {
                const titleField = MODULE_TITLE_FIELD[mod.type]!;
                return (
                  <div key={mod.type} className="space-y-3">
                    {fieldInput(titleField, mod.type === "countdown" ? "Counting down to" : mod.label, {
                      placeholder: (titles as Record<string, string>)[titleField] ?? mod.label,
                    })}
                  </div>
                );
              })}
            </div>
          </StepGroup>
        ) : null}
        {isOn("countdown") || isOn("tree") || isOn("capsule") ? (
          <StepGroup title="Dates" onActivate={() => setCanvasView("gift")}>
            <div className="space-y-3">
                  {isOn("countdown") ? (
                    <label className="block">
                      <span className="text-xs text-muted">Countdown: date and time</span>
                      <input
                        type="datetime-local"
                        value={toLocalInput(countdownTarget(draft))}
                        onChange={(e) => {
                          const v = e.target.value;
                          patch(v ? { countdown_at: new Date(v).toISOString(), countdown_date: v.slice(0, 10) } : { countdown_at: null, countdown_date: null });
                        }}
                        className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                      />
                      <span className="mt-1 block text-[11px] text-muted">
                        In your time ({viewerZone().replace(/_/g, " ")}). Everyone sees it in their own.
                      </span>
                    </label>
                  ) : null}
                  {isOn("tree") ? (
                    <label className="block">
                      <span className="text-xs text-muted">Tree: the day the ornaments open</span>
                      <input
                        type="date"
                        value={draft.tree_reveal_date ?? ""}
                        onChange={(e) => patch({ tree_reveal_date: e.target.value || null })}
                        className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent"
                      />
                    </label>
                  ) : null}
                  {isOn("capsule") ? (
                    <p className="rounded-xl bg-cream px-3 py-2.5 text-xs text-muted">
                      Time capsule: each friend picks when their own note opens, from an hour to 25 years away.
                    </p>
                  ) : null}
            </div>
          </StepGroup>
        ) : null}
        <StepGroup title="Footer" onActivate={() => setCanvasView("gift")}>
          {fieldInput("footer_note", "Footer note", {
            long: true,
            placeholder: solo ? "With love, always." : "With love, from all of us.",
            hint: "A short sign-off at the very end of the gift, after the last note.",
          })}
        </StepGroup>
      </div>
    ),
    look: (
      <div className="space-y-5">
        <StepGroup title="Palette" onActivate={() => setCanvasView("gift")}>
          <PalettePicker
            {...(stylesOn ? { suggestedLabel: draft.style ? t("picker.style.paletteFor", { style: styleTitle(draft.style) }) : t("picker.style.paletteDefault") } : {})}
            theme={theme}
            part="suggested"
            value={{ palette_id: draft.palette_id, colors: paletteNow }}
            onChange={(next) => patch({ palette_id: next.palette_id, custom_colors: next.colors })}
          />
        </StepGroup>
        <StepGroup title="Background" onActivate={() => setCanvasView("gift")}>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(BACKGROUND_STYLES) as BackgroundStyle[]).map((bk) => (
              <button
                key={bk}
                type="button"
                onClick={() => patch({ background_style: bk })}
                aria-pressed={draft.background_style === bk}
                title={BACKGROUND_STYLES[bk].hint}
                className={`squish rounded-xl border p-1.5 text-center transition-colors ${
                  draft.background_style === bk ? "border-accent bg-accent/8" : "border-line bg-cream"
                }`}
              >
                <span className="block h-9 w-full rounded-lg ring-1 ring-ink/10" style={backgroundCss(bk, paletteNow)} />
                <span className="mt-1.5 block truncate text-[11px] font-medium">{BACKGROUND_STYLES[bk].label}</span>
              </button>
            ))}
          </div>
        </StepGroup>
        <StepGroup
          title="Font"
          onActivate={() => {
            setCanvasView("gift");
            loadPairingFonts(...FONT_CHOICES);
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {FONT_CHOICES.map((fk) => (
              <button
                key={fk}
                type="button"
                onClick={() => patch({ font_choice: fk })}
                onPointerEnter={() => loadPairingFonts(...FONT_CHOICES)}
                aria-pressed={draft.font_choice === fk}
                className={`squish grid min-w-0 justify-items-center gap-0.5 rounded-xl border px-1.5 pt-2 pb-1.5 transition-colors ${
                  draft.font_choice === fk ? "border-accent bg-accent/8" : "border-line bg-cream hover:bg-glass/80"
                }`}
              >
                <span className="text-xl leading-none" style={{ fontFamily: FONT_PAIRINGS[fk].heading }} aria-hidden="true">
                  Aa
                </span>
                <span className="w-full truncate text-center text-[11px] text-ink/75" style={{ fontFamily: FONT_PAIRINGS[fk].body }}>
                  {FONT_PAIRINGS[fk].label}
                </span>
              </button>
            ))}
          </div>
        </StepGroup>
        <StepGroup
          title="Characters"
          hint="Who opens the gift with them."
          onActivate={() => {
            if (usesIntro) setCanvasView("intro");
          }}
        >
          <CastPanel
            simple
            siteId={id}
            kind={resolveStyle(draft, theme).introKind}
            recipient={draft.custom_text.recipient_name ?? ""}
            value={{ character: draft.character ?? null, icon_set: draft.icon_set ?? null }}
            onChange={patchCast}
          />
        </StepGroup>
        <button
          type="button"
          onClick={() => setCustomizeLook((v) => !v)}
          aria-expanded={customizeLook}
          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-ink/20 px-3 py-2.5 text-left hover:bg-cream"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{customizeLook ? "Fewer options" : "Customize"}</span>
            {customizeLook ? null : (
              <span className="block text-xs text-muted">Any color, more characters, your own picture, sprinkles, a wanderer</span>
            )}
          </span>
          <ChevronDown className={`size-4 shrink-0 transition-transform ${customizeLook ? "rotate-180" : ""}`} />
        </button>
        {customizeLook ? (
          <>
            <StepGroup title="Colors" onActivate={() => setCanvasView("gift")}>
              <PalettePicker
                {...(stylesOn ? { suggestedLabel: draft.style ? t("picker.style.paletteFor", { style: styleTitle(draft.style) }) : t("picker.style.paletteDefault") } : {})}
                theme={theme}
                part="more"
                value={{ palette_id: draft.palette_id, colors: paletteNow }}
                onChange={(next) => patch({ palette_id: next.palette_id, custom_colors: next.colors })}
                photoUrls={photoUrls}
              />
            </StepGroup>
            <StepGroup
              title="Characters and sprinkles"
              onActivate={() => {
                if (usesIntro) setCanvasView("intro");
              }}
            >
              <CastPanel
                siteId={id}
                kind={resolveStyle(draft, theme).introKind}
                recipient={draft.custom_text.recipient_name ?? ""}
                value={{ character: draft.character ?? null, icon_set: draft.icon_set ?? null }}
                onChange={patchCast}
              />
            </StepGroup>
          </>
        ) : null}
      </div>
    ),
    notes: (
      <div className="space-y-5">
        {!solo ? (
          <StepGroup title="Invite friends" hint="Friends add their notes, photos and songs through this link. No account needed.">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={contributeUrl}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Invite link"
                className="min-w-0 flex-1 rounded-lg border border-line bg-cream px-2 py-2 font-mono text-[11px]"
              />
              <Button size="sm" className="rounded-full" onClick={copyContributeLink}>
                <LinkIcon />
                Copy
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-full" asChild>
                <a href={messengerUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("invite_shared", id, { channel: "messenger" })}>
                  <MessageCircle />
                  Messenger
                </a>
              </Button>
              <Button variant="outline" size="sm" className="flex-1 rounded-full" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("invite_shared", id, { channel: "whatsapp" })}>
                  <Send />
                  WhatsApp
                </a>
              </Button>
            </div>
          </StepGroup>
        ) : null}
        {!solo ? (
          <ConciergeOffer
            compact
            siteId={id}
            recipient={draft.custom_text.recipient_name?.trim() ?? ""}
            occasion={stylesOn && draft.occasion ? occasionName(draft.occasion) : (OCCASION_NAMES[themeKindOf(theme)] ?? "")}
          />
        ) : null}
        <StepGroup
          title={solo ? "Your notes" : "Add your own"}
          {...(solo ? { hint: "Every page is from you. Add as many as you like." } : {})}
        >
          <OwnNotes
            siteId={id}
            solo={draft.solo}
            onSoloChange={(next) => patch({ solo: next })}
            showSolo={false}
            contributions={contributions}
            recipient={draft.custom_text.recipient_name ?? ""}
            defaultName={authUser?.name ?? ""}
          />
        </StepGroup>
        {enabledTypes.has("calendar") ? (
          <StepGroup title="Advent surprises" hint="Plan what opens on each day.">
            <CalendarEditor
              siteId={id}
              entries={calendarEntries}
              locked={draft.calendar_locked}
              onToggleLock={(v) => patch({ calendar_locked: v })}
              onChanged={() => queryClient.invalidateQueries({ queryKey: ["calendar", id] })}
            />
          </StepGroup>
        ) : null}
        {!solo ? (
          <StepGroup
            title="From friends"
            hint="New notes wait here until you add them to the gift."
            aside={
              pending.length > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-cream">{waitingLabel(counts.waiting)}</span>
                  {pending.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => void setStatus(pending.map((p) => p.id), "approved")}
                      className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] font-medium hover:bg-cream"
                    >
                      Approve all
                    </button>
                  ) : null}
                </span>
              ) : null
            }
          >
            <div className="space-y-3">
              {friendNotes.length === 0 ? (
                <div className="card-paper p-4 text-center text-sm text-muted">
                  Nothing yet. Send the invite link above and their notes show up here.
                </div>
              ) : null}
              {friendNotes.map((item) => (
                <ReviewCard
                  key={item.id}
                  item={item}
                  onApprove={() => void setStatus(item.id, "approved")}
                  onHide={() => void setStatus(item.id, "hidden")}
                  onDelete={() => removeNote(item.id)}
                />
              ))}
            </div>
          </StepGroup>
        ) : null}
      </div>
    ),
    wrap: (
      <div className="space-y-5">
        <StepGroup title="Before you send it">
          <ul className="space-y-2">
            {[
              {
                key: "who",
                done: stepDone.words,
                label: draft.custom_text.recipient_name?.trim() ? `For ${draft.custom_text.recipient_name.trim()}` : "Who it's for",
                fix: "Add their name",
                run: () => openField("recipient_name"),
              },
              {
                key: "notes",
                done: stepDone.notes,
                label: shownNotes > 0 ? inGiftLabel(shownNotes) : "At least one note",
                fix: counts.waiting > 0 ? `Check ${waitingLabel(counts.waiting)}` : "Add a note",
                run: () => goTo("notes"),
              },
            ].map((row) => (
              <li key={row.key} className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2.5">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full ${row.done ? "bg-[#4E8A62] text-cream" : "border border-dashed border-ink/30"}`}
                  aria-hidden="true"
                >
                  {row.done ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{row.label}</span>
                {row.done ? null : (
                  <button type="button" onClick={row.run} className="shrink-0 text-xs font-medium text-accent underline underline-offset-2">
                    {row.fix}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Everything else is optional. Friends can keep adding notes after it's sent.</p>
        </StepGroup>
        <GiftPasswordSetting
          siteId={id}
          tier={billing?.tier ?? null}
          passwordSet={site?.password_set ?? false}
          canUpgrade={draft.status === "published" && !!billing && billing.upgrades.length > 0 && !billing.ended}
          onUpgrade={() => setPlanPicker("upgrade")}
        />
        {draft.status === "published" ? (
          <div className="rounded-2xl bg-[#4E8A62]/10 p-4 text-sm">
            <p className="font-medium">It's sent.</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="rounded-full" onClick={copyLiveLink}>
                <LinkIcon />
                Copy gift link
              </Button>
              <Button size="sm" variant="outline" className="rounded-full" asChild>
                <a href={liveUrl} target="_blank" rel="noreferrer">
                  Open it
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              className="h-12 w-full rounded-full text-base"
              disabled={saving || !billing || !readyToWrap}
              onClick={() => {
                if (hasPlan) void boWrap();
                else boReact("cheer");
                void publish();
              }}
            >
              <Gift />
              {hasPlan ? `Send it to ${draft.custom_text.recipient_name?.trim() || "them"}` : "Wrap it up"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              {!readyToWrap
                ? "Tick the two things above first."
                : hasPlan
                  ? `Already paid for (${planSummary(billing)}). You can unpublish any time.`
                  : "Next you pick a plan. It opens for them once it's paid."}
            </p>
          </div>
        )}
        <StepGroup title="Keep a copy" hint="Every note, photo and voice note, as a zip.">
          <ExportGift siteId={id} title={draft.title} />
        </StepGroup>
      </div>
    ),
    settings: (
      <div className="space-y-5">
        <StepGroup title="Who's it from?">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-cream p-1 ring-1 ring-line" role="radiogroup" aria-label="Who's it from">
            {(
              [
                [false, "Me and friends"],
                [true, "Just me"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={solo === v}
                onClick={() => {
                  patch({ solo: v });
                  boSay(v ? "Just from you. Sweet." : "Friends can join in now.", v ? "love" : "happy");
                }}
                className={`rounded-full py-2 text-xs font-semibold transition-colors ${solo === v ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            {solo ? "You make every page. There's no invite link." : "Friends add theirs through the invite link. You can add yours too."}
          </p>
        </StepGroup>
        <StepGroup title={stylesOn ? t("picker.style.label") : "How it opens"} hint={stylesOn ? t("picker.style.hint") : "Same notes, a different way to open them."}>
          {stylesOn ? (
            <>
              <p className="text-xs font-medium text-muted">{t("picker.occasion.title")}</p>
              <div className="mt-2">
                <OccasionChips
                  value={draft.occasion}
                  onChange={(next) => {
                    patch({ occasion: next });
                    if (next) boSay(`${occasionName(next)}. I'll put the best styles first.`, "happy");
                  }}
                  {...(occasionRow !== undefined ? { open: occasionRow } : {})}
                  onOpen={setOccasionRow}
                />
              </div>
              {styleAsk ? (
                <div className="sticky top-0 z-10 mt-4 rounded-xl border border-accent/40 bg-[#FBEDE6] p-3 shadow-sm" role="alertdialog" aria-label={t("picker.style.label")}>
                  <p className="text-sm font-medium">{t("picker.style.switchTitle", { style: styleTitle(styleAsk) })}</p>
                  <p className="mt-1 text-xs text-muted">{t("picker.style.switchBody")}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="rounded-full" onClick={() => switchStyle(styleAsk)}>
                      {t("picker.style.switch")}
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStyleAsk(null)}>
                      {t("picker.style.keep")}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <StylePicker
                  value={draft.style}
                  occasion={draft.occasion}
                  onChange={(next) => {
                    if (next !== draft.style) setStyleAsk(next);
                  }}
                  available={(s) => s.id === draft.style || s.looks.length === 0 || s.looks.some((l) => publishedThemes.some((x) => x.name === l.theme))}
                  isAllowed={(s) => !planTier || tierAllowsLook(planTier, bodyFor(s), s.id)}
                  current={
                    draft.style
                      ? null
                      : (() => {
                          const match = styleForLegacy(savedTheme, draft.format);
                          const layout = styleInfo(draft.format === "handwritten" ? "handwritten" : draft.format);
                          return {
                            title: match ? styleTitle(match.id) : `${savedTheme?.name ? `${savedTheme.name} · ` : ""}${formatInfo(draft.format).title}`,
                            art: <StyleArt style={match ?? layout} occasion={draft.occasion} />,
                          };
                        })()
                  }
                />
              </div>
              {draft.style ? null : <p className="mt-2 text-xs text-muted">{t("picker.style.currentHint")}</p>}
              {planTier && planTier.formats.length < FORMATS.length ? (
                <p className="mt-3 text-xs text-muted">
                  {t("picker.style.planNote")}{" "}
                  {billing && billing.upgrades.length > 0 ? (
                    <button type="button" className="text-accent underline underline-offset-2" onClick={() => setPlanPicker("upgrade")}>
                      {t("picker.style.upgrade")}
                    </button>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <>
          {formatAsk ? (
            <div className="sticky top-0 z-10 mb-3 rounded-xl border border-accent/40 bg-[#FBEDE6] p-3 shadow-sm" role="alertdialog" aria-label="Switch format">
              <p className="text-sm font-medium">Switch to {formatInfo(formatAsk).title}?</p>
              <p className="mt-1 text-xs text-muted">
                Your notes, words and colors stay. Only the way it opens changes
                {draft.format === "comic" ? ". The comic's cover and panel order are kept in case you switch back." : "."}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    patch({ format: formatAsk });
                    setFormatAsk(null);
                    if (formatAsk === "comic") {
                      boReact("bam");
                      boSay("BAM.", "surprised");
                    }
                  }}
                >
                  Switch
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setFormatAsk(null)}>
                  Keep {formatInfo(draft.format).title}
                </Button>
              </div>
            </div>
          ) : null}
          <FormatPicker
            value={draft.format}
            onChange={chooseFormat}
            isAllowed={(format) => !planTier || planTier.formats.includes(format)}
            compact
          />
          {planTier && planTier.formats.length < FORMATS.length ? (
            <p className="mt-3 text-xs text-muted">
              {planTier.name} includes {planTier.formats.map((f) => formatInfo(f).title).join(" and ")}.{" "}
              {billing && billing.upgrades.length > 0 ? (
                <button type="button" className="text-accent underline underline-offset-2" onClick={() => setPlanPicker("upgrade")}>
                  Upgrade for every format.
                </button>
              ) : null}
            </p>
          ) : null}
            </>
          )}
          <div className="mt-4 space-y-4">
        {draft.format === "comic" ? (
          <>
            <label className="block"><span className="text-xs text-muted">Cover title</span><input value={normalizeComicSettings(draft.format_settings).cover_title ?? ""} maxLength={LIMITS.comicCover} onChange={(event) => patchComic({ cover_title: event.target.value })} placeholder={`THE AMAZING ${(draft.custom_text.recipient_name || "YOU").toUpperCase()}`} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
            <label className="block"><span className="text-xs text-muted">Cover subtitle</span><input value={normalizeComicSettings(draft.format_settings).cover_subtitle ?? ""} maxLength={LIMITS.comicCover} onChange={(event) => patchComic({ cover_subtitle: event.target.value })} placeholder={comicSettingDefaults(draft.custom_text.recipient_name, themeKindOf(theme)).cover_subtitle} className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-accent" /></label>
            <label className="flex items-start gap-3 rounded-xl border border-line bg-cream p-3"><input type="checkbox" checked={normalizeComicSettings(draft.format_settings).two_worlds === true} onChange={(event) => patchComic({ two_worlds: event.target.checked })} className="mt-0.5" /><span><span className="block text-sm font-medium">Two Worlds</span><span className="block text-xs text-muted">Let readers switch between two comic backdrops.</span></span></label>
            {normalizeComicSettings(draft.format_settings).two_worlds ? <div className="grid gap-3"><label><span className="text-xs text-muted">First world</span><input value={normalizeComicSettings(draft.format_settings).world_one ?? ""} maxLength={LIMITS.sectionTitle} onChange={(event) => patchComic({ world_one: event.target.value })} placeholder="HERO WORLD" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm" /></label><label><span className="text-xs text-muted">Second world</span><input value={normalizeComicSettings(draft.format_settings).world_two ?? ""} maxLength={LIMITS.sectionTitle} onChange={(event) => patchComic({ world_two: event.target.value })} placeholder="OHANA WORLD" className="mt-1 w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-sm" /></label></div> : null}
            <div><p className="text-sm font-medium">Panel organizer</p><p className="mt-1 text-xs text-muted">Reorder panels or move one into another chapter.</p><div className="mt-3 space-y-2">{orderedComicIds(contributions.map((item) => item.id), normalizeComicSettings(draft.format_settings).panel_order).map((itemId, index, orderedIds) => { const item = contributions.find((entry) => entry.id === itemId); if (!item) return null; const settings = normalizeComicSettings(draft.format_settings); const chapter = settings.chapter_overrides?.[item.id] ?? item.module_type; return <div key={item.id} className="rounded-xl border border-line bg-cream p-3"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm font-medium">{item.author_name}</span><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveComicPanel(item.id, -1)} aria-label="Move panel up">↑</Button><Button type="button" size="icon" variant="ghost" disabled={index === orderedIds.length - 1} onClick={() => moveComicPanel(item.id, 1)} aria-label="Move panel down">↓</Button></div><select value={chapter} onChange={(event) => patchComic({ chapter_overrides: { ...settings.chapter_overrides, [item.id]: event.target.value } })} className="mt-2 w-full rounded-lg border border-line bg-paper px-2 py-2 text-xs">{MODULES.map((module) => <option key={module.type} value={module.type}>{module.label}</option>)}</select></div>; })}</div></div>
          </>
        ) : stylesOn ? null : <p className="text-xs text-muted">{formatInfo(draft.format).about}</p>}
          </div>
        </StepGroup>
        <StepGroup title="Sections" hint="What friends can add, and what the gift shows.">
          <div className="space-y-2">
            {[...MODULES]
              .filter((mod) => moreSections || isOn(mod.type))
              .sort((a, b) => Number(isOn(b.type)) - Number(isOn(a.type)))
              .map((mod) => {
                const on = isOn(mod.type);
                const inIt = contributions.filter((c) => c.module_type === mod.type && c.status !== "hidden").length;
                return (
                  <div key={mod.type}>
                  <div
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      on ? "border-accent bg-accent/8" : "border-line bg-cream"
                    }`}
                  >
                    <span className="text-sm font-medium">{mod.label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={mod.label}
                      onClick={() => void toggleModule(mod.type, !on)}
                      className={`rounded-full px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase ${
                        on ? "bg-ink text-cream" : "border border-line bg-paper text-muted"
                      }`}
                    >
                      {on ? "On" : "Add"}
                    </button>
                  </div>
                  {offAsk === mod.type ? (
                    <div role="alert" className="mt-1.5 rounded-xl border border-line bg-paper p-3">
                      <p className="text-sm font-medium">
                        Turn off {mod.label}? It has {inIt} {inIt === 1 ? "note" : "notes"}.
                      </p>
                      <p className="mt-1 text-xs text-muted">They're kept, just not shown. Turn it back on any time to bring them back.</p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleModule(mod.type, false, true)}
                          className="rounded-full bg-ink px-3.5 py-1.5 text-xs font-medium text-cream"
                        >
                          Turn it off
                        </button>
                        <button
                          type="button"
                          onClick={() => setOffAsk(null)}
                          className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium"
                        >
                          Keep it on
                        </button>
                      </div>
                    </div>
                  ) : null}
                  </div>
                );
              })}
            <button
              type="button"
              onClick={() => setMoreSections((v) => !v)}
              className="w-full rounded-xl border border-dashed border-line px-3 py-2.5 text-left text-sm font-medium hover:bg-cream"
            >
              {moreSections ? "Show only the ones that are on" : `Add more (${MODULES.filter((mod) => !isOn(mod.type)).length})`}
            </button>
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
                  Off by default. Notes marked "Only {draft.custom_text.recipient_name || "the recipient"}" always stay sealed.
                </span>
              </span>
            </label>
          </div>
        </StepGroup>
      </div>
    ),
  };

  const stepIndex = (STEPS as readonly SectionKey[]).indexOf(section);
  const nextStep = stepIndex >= 0 && stepIndex < STEPS.length - 1 ? STEPS[stepIndex + 1]! : null;

  const rail = (vertical: boolean) => (
    <nav
      aria-label="Steps"
      className={
        vertical
          ? "flex w-[84px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-cream/70 py-3"
          : "flex items-stretch gap-1 border-t border-line bg-cream/90 px-2 py-2"
      }
    >
      {STEPS.map((key, i) => {
        const active = section === key && (vertical ? panelOpen : sheetOpen);
        const done = railDone(key);
        return (
          <button
            key={key}
            type="button"
            aria-current={section === key ? "step" : undefined}
            onClick={() => {
              if (vertical && section === key && panelOpen) setPanelOpen(false);
              else goTo(key);
            }}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 transition-colors ${
              vertical ? "mx-2" : "min-w-0 flex-1"
            } ${active ? "bg-accent/15 text-ink" : "text-muted hover:bg-glass/70 hover:text-ink"}`}
          >
            <span
              className={`grid size-7 place-items-center rounded-full text-[12px] font-semibold transition-colors ${
                done
                  ? "bg-[#4E8A62] text-cream"
                  : section === key
                    ? "bg-ink text-cream"
                    : "border border-ink/20 bg-paper text-ink/70"
              }`}
            >
              {done ? <Check className="size-4" aria-label="done" /> : i + 1}
            </span>
            <span className={`text-[11px] leading-tight whitespace-nowrap ${active ? "font-semibold text-ink" : ""}`}>
              {SECTION_TITLES[key]}
            </span>
            {key === "notes" && counts.waiting > 0 ? (
              <span
                className="absolute top-1 right-2 rounded-full bg-accent px-1.5 text-[10px] font-medium text-cream"
                aria-label={waitingLabel(counts.waiting)}
              >
                {counts.waiting}
              </span>
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          if (vertical && section === "settings" && panelOpen) setPanelOpen(false);
          else goTo("settings");
        }}
        className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-muted transition-colors hover:text-ink ${
          vertical ? "mx-2 mt-auto" : "min-w-0 shrink-0"
        } ${section === "settings" && (vertical ? panelOpen : sheetOpen) ? "bg-accent/15 text-ink" : ""}`}
      >
        <Settings2 className="size-5" />
        <span className="text-[10px] leading-tight">{vertical ? "Gift settings" : "Settings"}</span>
      </button>
    </nav>
  );

  const stepHeader = (
    <div className="min-w-0">
      {stepIndex >= 0 ? (
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
      ) : (
        <p className="font-mono text-[10px] tracking-[0.14em] text-muted uppercase">Set up once</p>
      )}
      <span className="font-display text-lg">{SECTION_TITLES[section]}</span>
    </div>
  );
  const nextButton = nextStep ? (
    <div className="border-t border-line px-4 py-3">
      <Button
        variant="outline"
        className="w-full rounded-full"
        onClick={() => {
          touch(section);
          goTo(nextStep);
        }}
      >
        Next: {SECTION_TITLES[nextStep]}
      </Button>
    </div>
  ) : null;

  const panel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        {stepHeader}
        <button
          type="button"
          aria-label="Close panel"
          onClick={() => setPanelOpen(false)}
          className="ml-auto text-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{sectionBody[section]}</div>
      {nextButton}
    </div>
  );

  const fullScreenIntro = (
    <GiftIntro
      contained
      style={introStyleForTheme(theme?.name)}
      kind={resolveStyle(draft, theme).introKind}
      occasionBadge={draft.occasion ? occasionName(draft.occasion) : undefined}
      calm={isQuietOccasion(draft.occasion)}
      palette={paletteNow}
      fonts={FONT_PAIRINGS[draft.font_choice] ?? FONT_PAIRINGS.romantic}
      backgroundStyle={draft.background_style}
      recipientName={draft.custom_text.recipient_name}
      introText={draft.intro_text ?? undefined}
      settings={draft.intro_settings}
      character={draft.character}
      iconSet={draft.icon_set}
      contributors={friends}
      {...engineIntroProps(theme?.name, draft, approved)}
      onOpen={() => setPreviewOpened(true)}
    />
  );
  const fullScreenGift = (
    <FormatView key={draft.format === "comic" ? (previewOpened ? "comic-reader" : "comic-cover") : draft.format} site={draft} theme={theme} palette={paletteNow} modules={modules} contributions={approved} calendarEntries={calendarEntries} showCover={!previewOpened} sample showShare />
  );

  const showIntroInCanvas = canvasView === "intro" && (section === "words" || section === "look") && usesIntro;
  const canvasIntro = (
    <GiftIntro
      key={`canvas-intro-${introCanvasKey}`}
      contained
      style={introStyleForTheme(theme?.name)}
      kind={resolveStyle(draft, theme).introKind}
      occasionBadge={draft.occasion ? occasionName(draft.occasion) : undefined}
      calm={isQuietOccasion(draft.occasion)}
      palette={paletteNow}
      fonts={FONT_PAIRINGS[draft.font_choice] ?? FONT_PAIRINGS.romantic}
      backgroundStyle={draft.background_style}
      recipientName={draft.custom_text.recipient_name}
      introText={draft.intro_text ?? undefined}
      settings={draft.intro_settings}
      character={draft.character}
      iconSet={draft.icon_set}
      contributors={friends}
      {...engineIntroProps(theme?.name, draft, approved)}
      onStickersChange={changeIntroStickers}
      onStickersUndo={undoIntroStickers}
      canUndoStickers={stickerSteps > 0}
      onOpen={() => window.setTimeout(() => setIntroCanvasKey((k) => k + 1), 900)}
      // Skip shows the gift, like it does for the recipient. (It used to restart the opening.)
      onSkip={() => setCanvasView("gift")}
    />
  );

  const canvas = (
    <div className="editor-canvas relative flex min-w-0 flex-1 flex-col">
      <div
        ref={canvasRef}
        className="relative min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelected(null);
        }}
      >
        {/* Bo's spot: the bottom corner of the preview canvas. */}
        <div
          aria-hidden="true"
          data-bo-perch
          data-bo-always
          data-bo-say="I'll wait right here."
          className="pointer-events-none absolute right-6 bottom-5 h-px w-10"
        />
        {device === "laptop" ? (
          // Side room so Bo stands next to the laptop, never on top of its frame.
          <div className="flex h-full items-center justify-center min-[900px]:px-20">
            <DevicePreview device="laptop" fit="contain" overlay={showIntroInCanvas ? canvasIntro : null}>
              <FormatView site={draft} theme={theme} palette={paletteNow} modules={modules} contributions={approved} calendarEntries={calendarEntries} sample placeholderName highlightField={focusField} onEditField={(field) => { openField(field); selectInPreview(field); }} />
            </DevicePreview>
          </div>
        ) : (
          <div className="flex h-full justify-center min-[900px]:px-20">
            <div
              className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[28px] border border-line bg-cream shadow-xl"
              style={{
                contain: "layout paint",
                ...(zoom ? { transform: `scale(${zoom / 100})`, transformOrigin: "top center" } : {}),
              }}
            >
              <div className="h-full overflow-y-auto overscroll-contain">
                 <FormatView site={draft} theme={theme} palette={paletteNow} modules={modules} contributions={approved} calendarEntries={calendarEntries} sample placeholderName highlightField={focusField} onEditField={(field) => { openField(field); selectInPreview(field); }} />
              </div>
              {showIntroInCanvas ? canvasIntro : null}
            </div>
          </div>
        )}
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
          <DeviceToggle value={device} onChange={setDevice} size="sm" />
          <button
            type="button"
            onClick={() => {
              if (usesIntro && (section === "words" || section === "look")) {
                setCanvasView("intro");
                setIntroCanvasKey((k) => k + 1);
              } else setIntroPreview(true);
            }}
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
            className="hidden w-28 accent-[#C2366B] min-[900px]:block"
          />
          {zoom ? <span className="hidden w-9 text-right text-[11px] text-muted tabular-nums min-[900px]:block">{zoom}%</span> : null}
          <button
            type="button"
            onClick={() => setZoom(null)}
            aria-pressed={!zoom}
            className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors min-[900px]:block ${
              zoom ? "border-line text-muted hover:text-ink" : "border-ink/20 bg-ink/5 text-ink"
            }`}
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
      {roomForBo ? <BoBuddy followFocus celebrate intro={false} /> : null}
      <header data-bo-avoid className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-paper px-3 sm:px-4">
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
              maxLength={LIMITS.heading}
              aria-label="Gift name"
              onChange={(e) => rename(e.target.value)}
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
          {stylesOn ? (
            draft.style || draft.occasion ? (
              <span className="shrink-0 rounded-full px-2 py-0.5 font-medium" style={{ background: paletteNow.accent + "33", color: "#2B2522" }}>
                {draft.style ? styleTitle(draft.style) : occasionName(draft.occasion!)}
              </span>
            ) : null
          ) : theme?.name ? (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 font-medium"
              style={{ background: paletteNow.accent + "33", color: "#2B2522" }}
            >
              {theme.name}
            </span>
          ) : null}
          {draft.custom_text.recipient_name?.trim() ? (
            <span className="truncate">for {draft.custom_text.recipient_name}</span>
          ) : (
            <button
              type="button"
              onClick={() => openField("recipient_name")}
              className="truncate rounded-full bg-accent/12 px-2 py-0.5 font-medium text-accent hover:bg-accent/20"
            >
              Who's it for? Add their name
            </button>
          )}
          {daysToGo !== null ? <span className="shrink-0">· {daysToGo}</span> : null}
        </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            role="status"
            aria-live="polite"
            title={friends.length > 0 ? `From ${friends.join(", ")}` : "Friends' notes show up here"}
            className="hidden h-7 items-center gap-1.5 rounded-full bg-ink/[.05] pr-2.5 pl-1.5 text-[11px] font-medium text-muted min-[900px]:flex"
          >
            {friends.length > 0 ? (
              <span className="flex -space-x-1.5">
                {friends.slice(0, 3).map((name, i) => (
                  <span
                    key={name}
                    className="grid size-5 place-items-center rounded-full border border-paper text-[9px] font-semibold text-ink/80"
                    style={{ background: FRIEND_TINTS[i % FRIEND_TINTS.length] }}
                  >
                    {initials(name)}
                  </span>
                ))}
              </span>
            ) : (
              <span className="size-1.5 rounded-full bg-muted/50" aria-hidden="true" />
            )}
            <span className="tabular-nums">{noteSummary(counts)}</span>
          </span>


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
              <DropdownMenuItem onSelect={() => goTo("notes")}>
                <Inbox />
                Notes ({noteSummary(counts)})
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => goTo("settings")}>
                <Settings2 />
                Gift settings
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
                {billing?.extend ? (
                  <DropdownMenuItem onSelect={() => setExtendOpen(true)}>Extend this gift</DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => void unpublish()}>Unpublish</DropdownMenuItem>
                {planSummary(billing) ? (
                  <p className="px-2 pt-1.5 pb-1 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
                    {planSummary(billing)}
                  </p>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="h-10 rounded-full" onClick={() => goTo("wrap")}>
              <Gift />
              Wrap it up
            </Button>
          )}
        </div>

      </header>
      <PlanBanner billing={billing} onUpgrade={() => setPlanPicker("upgrade")} onExtend={() => setExtendOpen(true)} />
      <ExtendDialog siteId={id} open={extendOpen} onOpenChange={setExtendOpen} />
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
            data-bo-zone
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
      {/* Room under the preview for the sheet, so the phone preview shrinks to fit above it. */}
      {sheetOpen ? (
        <div aria-hidden="true" className="shrink-0 min-[900px]:hidden" style={{ height: `calc(${Math.min(sheetH, 60)}dvh - 64px)` }} />
      ) : null}
      {sheetOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex items-end min-[900px]:hidden">
          <div
            role="dialog"
            aria-label={SECTION_TITLES[section]}
            className={`pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-3xl border-t border-line bg-paper shadow-[0_-18px_40px_-24px_rgba(43,37,34,.45)] ${sheetDragging ? "" : "transition-[height] duration-200 ease-out"}`}
            style={{ height: `${sheetH}dvh` }}
          >
            <button
              type="button"
              aria-label={sheetH > 60 ? "Make the panel smaller" : "Make the panel bigger"}
              onPointerDown={dragSheet}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSheetH((h) => (h > 60 ? 45 : 88));
                }
              }}
              className="flex w-full touch-none justify-center pt-2.5 pb-1.5"
            >
              <span className="h-1.5 w-12 rounded-full bg-ink/20" />
            </button>
            <div className="flex items-center justify-between px-5 pt-2">
              {stepHeader}
              <button onClick={() => setSheetOpen(false)} className="text-sm text-muted">
                Done
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{sectionBody[section]}</div>
            {nextButton}
          </div>
        </div>
      ) : null}


      {introPreview && draft.format === "comic" ? (
        <ComicIssueView key="comic-cover-preview" site={draft} modules={modules} contributions={approved} calendarEntries={calendarEntries} palette={paletteNow} kind={themeKindOf(theme)} showCover sample onClose={() => setIntroPreview(false)} />
      ) : introPreview ? (
        <GiftIntro
          style={introStyleForTheme(theme?.name)}
          kind={resolveStyle(draft, theme).introKind}
          occasionBadge={draft.occasion ? occasionName(draft.occasion) : undefined}
          calm={isQuietOccasion(draft.occasion)}
          palette={paletteNow}
          fonts={FONT_PAIRINGS[draft.font_choice] ?? FONT_PAIRINGS.romantic}
          backgroundStyle={draft.background_style}
          recipientName={draft.custom_text.recipient_name}
          introText={draft.intro_text ?? undefined}
          settings={draft.intro_settings}
          character={draft.character}
          iconSet={draft.icon_set}
          contributors={friends}
          {...engineIntroProps(theme?.name, draft, approved)}
          onOpen={() => setIntroPreview(false)}
        />
      ) : null}
      {fullPreview ? (
        <div className="fixed inset-0 z-[70] bg-paper text-ink">
          <div className="absolute inset-x-0 top-0 z-[80] border-b border-line bg-cream/95 px-3 py-2 shadow-sm backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{draft.custom_text.recipient_name?.trim() ? <>Previewing as <strong>{draft.custom_text.recipient_name.trim()}</strong></> : "Previewing the gift"}</span>
              <div className="flex items-center gap-2">
                <DeviceToggle value={device} onChange={setDevice} size="sm" />
                <Button variant="outline" size="sm" onClick={() => setPreviewOpened(false)}>Replay intro</Button>
                <Button size="sm" onClick={() => setFullPreview(false)}>Back to editing</Button>
              </div>
            </div>
          </div>
          <div className="h-full overflow-auto pt-24 sm:pt-[62px]">
            {device === "laptop" ? (
              <div className="mx-auto h-[calc(100%-16px)] max-w-[1400px] px-3 pt-3 sm:px-6">
                <DevicePreview
                  device="laptop"
                  fit="contain"
                  overlay={
                    !previewOpened && formatInfo(draft.format).usesIntro ? fullScreenIntro : null
                  }
                >
                  {fullScreenGift}
                </DevicePreview>
              </div>
            ) : (
              <div className="relative mx-auto h-[calc(100dvh-110px)] w-full max-w-[390px] overflow-hidden rounded-[28px] border border-line shadow-xl sm:h-[calc(100dvh-78px)]" style={{ contain: "layout paint" }}>
                <div className="absolute inset-0 overflow-y-auto overscroll-contain">{fullScreenGift}</div>
                {!previewOpened && formatInfo(draft.format).usesIntro ? fullScreenIntro : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const LONG_NOTE = 280;

function ReviewCard({
  item,
  onApprove,
  onHide,
  onDelete,
}: {
  item: Contribution;
  onApprove: () => void;
  onHide: () => void;
  onDelete: () => Promise<void>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const text = item.text_content ?? "";
  const long = [...text].length > LONG_NOTE;
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
      {text ? (
        <>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">
            {long && !expanded ? `${[...text].slice(0, LONG_NOTE).join("").trimEnd()}…` : text}
          </p>
          {long ? (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-1 text-xs font-medium text-accent underline">
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </>
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
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`Delete the note from ${item.author_name}`}
          className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-cream text-muted hover:text-[#B4322E]"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {confirmDelete ? (
        <div role="alert" className="mt-3 rounded-xl border border-line bg-paper p-3">
          <p className="text-sm font-medium">Delete this note from {item.author_name}?</p>
          <p className="mt-1 text-xs text-muted">It's gone for good, with any photo or voice note. Hide it instead if you might want it back.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setDeleting(true);
                void onDelete().finally(() => {
                  setDeleting(false);
                  setConfirmDelete(false);
                });
              }}
              className="rounded-full bg-[#B4322E] px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-3.5 py-1.5 text-xs font-medium"
            >
              Keep it
            </button>
          </div>
        </div>
      ) : null}
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
