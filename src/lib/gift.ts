import {
  getSiteById,
  getSiteBySlug,
  getThemeById,
  listCalendarEntries,
  listContributions,
  listModules,
  listPublicTreeOrnaments,
  listSealedContributions,
} from "@/lib/api";
import type { Palette, Theme } from "@/lib/themes";
import { normalizeTheme } from "@/lib/themes";
import { normalizeComicSettings, type ComicSettings, type GiftFormat } from "@/lib/comic";

export type ModuleType =
  | "letters"
  | "photobooth"
  | "songs"
  | "wordcloud"
  | "voice"
  | "countdown"
  | "calendar"
  | "tree";

export const MODULES: {
  type: ModuleType;
  label: string;
  blurb: string;
  contributorPrompt: string;
  /** "guests" = filled in by contributors, "creator" = authored by the organiser. */
  source: "guests" | "creator";
}[] = [
  {
    type: "letters",
    label: "Letters",
    blurb: "Written notes and messages from everyone.",
    contributorPrompt: "Write a message",
    source: "guests",
  },
  {
    type: "photobooth",
    label: "Photobooth",
    blurb: "Photos with an optional caption.",
    contributorPrompt: "Add a photo",
    source: "guests",
  },
  {
    type: "songs",
    label: "Songs",
    blurb: "Spotify or YouTube links, playable on the page.",
    contributorPrompt: "Share a song",
    source: "guests",
  },
  {
    type: "wordcloud",
    label: "Word cloud",
    blurb: "A few words each, gathered into one cloud.",
    contributorPrompt: "Add a word",
    source: "guests",
  },
  {
    type: "voice",
    label: "Voice messages",
    blurb: "Short audio clips people upload.",
    contributorPrompt: "Upload a voice note",
    source: "guests",
  },
  {
    type: "countdown",
    label: "Countdown",
    blurb: "A live countdown to the big day. You set the date.",
    contributorPrompt: "",
    source: "creator",
  },
  {
    type: "calendar",
    label: "Calendar",
    blurb: "An advent-style grid. You hide a surprise behind each date.",
    contributorPrompt: "",
    source: "creator",
  },
  {
    type: "tree",
    label: "Tree",
    blurb: "Friends hang ornaments with messages on a shared tree.",
    contributorPrompt: "Add an ornament",
    source: "guests",
  },
];

export const GUEST_MODULES = MODULES.filter((m) => m.source === "guests");

export const FONT_PAIRINGS = {
  romantic: {
    label: "Romantic",
    heading: "'Playfair Display', serif",
    body: "'Lato', sans-serif",
  },
  playful: { label: "Playful", heading: "'Fredoka', sans-serif", body: "'Nunito', sans-serif" },
  modern: { label: "Modern", heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
  handwritten: { label: "Handwritten", heading: "'Caveat', cursive", body: "'Karla', sans-serif" },
} as const;

export type FontChoice = keyof typeof FONT_PAIRINGS;

export type CustomText = {
  heading?: string;
  recipient_name?: string;
  intro_message?: string;
  letters_title?: string;
  photobooth_title?: string;
  songs_title?: string;
  wordcloud_title?: string;
  voice_title?: string;
  countdown_title?: string;
  calendar_title?: string;
  tree_title?: string;
  footer_note?: string;
};

/** Sensible pre-filled section titles, based on who the gift is for. */
export function defaultTitles(text: CustomText) {
  const name = text.recipient_name?.trim() || "you";
  return {
    heading: `For ${name}`,
    letters_title: `Letters for ${name}`,
    photobooth_title: "Photobooth",
    songs_title: "Songs that remind us of you",
    wordcloud_title: "Words that describe you",
    voice_title: "Voice notes",
    countdown_title: "the big day",
    calendar_title: "Advent surprises",
    tree_title: "Our tree",
  };
}

export type CalendarEntry = {
  id: string;
  site_id: string;
  entry_date: string;
  type: "message" | "photo" | "song";
  text_content: string | null;
  media_url: string | null;
  external_link: string | null;
};

export const BACKGROUND_STYLES = {
  paper: { label: "Paper", hint: "Warm scrapbook texture" },
  clean: { label: "Clean", hint: "Plain and minimal" },
  formal: { label: "Formal", hint: "Subtle linen weave" },
  gradient: { label: "Soft gradient", hint: "Your palette, blended" },
} as const;

export type BackgroundStyle = keyof typeof BACKGROUND_STYLES;

/** CSS for a chosen background style, tinted with the site's palette. */
export function backgroundCss(
  style: BackgroundStyle,
  palette: Palette,
): React.CSSProperties {
  const tint = `${palette.accent}1f`;
  if (style === "clean") {
    return { backgroundColor: palette.background };
  }
  if (style === "formal") {
    return {
      backgroundColor: palette.background,
      backgroundImage: `repeating-linear-gradient(45deg, ${tint} 0 1px, transparent 1px 6px), repeating-linear-gradient(-45deg, ${tint} 0 1px, transparent 1px 6px)`,
    };
  }
  if (style === "gradient") {
    return {
      backgroundColor: palette.background,
      backgroundImage: `radial-gradient(120% 90% at 10% 0%, ${palette.accent}33 0%, transparent 60%), radial-gradient(100% 80% at 95% 100%, ${palette.primary}26 0%, transparent 65%)`,
    };
  }
  return {
    backgroundColor: palette.background,
    backgroundImage: `radial-gradient(${palette.primary}12 1px, transparent 1px), radial-gradient(${palette.accent}14 1px, transparent 1px)`,
    backgroundSize: "18px 18px, 26px 26px",
    backgroundPosition: "0 0, 9px 13px",
  };
}

export type GiftSite = {
  id: string;
  creator_id: string;
  title: string;
  theme_id: string | null;
  slug: string;
  status: "draft" | "published";
  format: GiftFormat;
  format_settings: ComicSettings;
  custom_text: CustomText;
  custom_colors: Partial<Palette>;
  palette_id: string | null;
  share_notes: boolean;
  font_choice: FontChoice;
  countdown_date: string | null;
  calendar_locked: boolean;
  intro_text: string | null;
  background_style: BackgroundStyle;
  tree_reveal_date: string | null;
  created_at: string;
};

export type SiteModule = {
  id: string;
  site_id: string;
  module_type: ModuleType;
  price: number;
  enabled: boolean;
};

export type Contribution = {
  id: string;
  site_id: string;
  module_type: ModuleType;
  author_name: string;
  text_content: string | null;
  media_url: string | null;
  external_link: string | null;
  status: "pending" | "approved" | "hidden";
  ornament_key: OrnamentKey | null;
  visibility: "public" | "recipient";
  created_at: string;
};

/**
 * A contribution as shown in a gift view. `sealed` items carry no content at
 * all (the browser never receives it); `mine` marks the visitor's own item.
 */
export type ViewContribution = Contribution & { sealed?: boolean; mine?: boolean };

/** Name, section and position only — never other people's words, photos or audio. */
export async function fetchSealedContributions(siteId: string): Promise<ViewContribution[]> {
  const data = await listSealedContributions({ data: { siteId } });
  return data.map((row) => ({
    ...normalizeContribution({ ...(row as Record<string, unknown>), text_content: null }),
    sealed: true,
  }));
}

export const CONTRIBUTION_BUCKET = "contributions";

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "gift"}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeSite(row: Record<string, unknown>): GiftSite {
  return {
    id: String(row["id"]),
    creator_id: String(row["creator_id"]),
    title: String(row["title"]),
    theme_id: (row["theme_id"] as string | null) ?? null,
    slug: String(row["slug"]),
    status: row["status"] === "published" ? "published" : "draft",
    format: row["format"] === "comic" ? "comic" : "scrapbook",
    format_settings: normalizeComicSettings(row["format_settings"]),
    custom_text: (row["custom_text"] as CustomText) ?? {},
    custom_colors: (row["custom_colors"] as Partial<Palette>) ?? {},
    palette_id: (row["palette_id"] as string | null) ?? null,
    share_notes: Boolean(row["share_notes"]),
    font_choice: (row["font_choice"] as FontChoice) ?? "romantic",
    countdown_date: (row["countdown_date"] as string | null) ?? null,
    calendar_locked: Boolean(row["calendar_locked"]),
    intro_text: (row["intro_text"] as string | null) ?? null,
    background_style: ((row["background_style"] as BackgroundStyle) ?? "paper") as BackgroundStyle,
    tree_reveal_date: (row["tree_reveal_date"] as string | null) ?? null,
    created_at: String(row["created_at"]),
  };
}

export function normalizeCalendarEntry(row: Record<string, unknown>): CalendarEntry {
  return {
    id: String(row["id"]),
    site_id: String(row["site_id"]),
    entry_date: String(row["entry_date"]),
    type: (row["type"] as CalendarEntry["type"]) ?? "message",
    text_content: (row["text_content"] as string | null) ?? null,
    media_url: (row["media_url"] as string | null) ?? null,
    external_link: (row["external_link"] as string | null) ?? null,
  };
}

export async function fetchCalendarEntries(siteId: string) {
  const data = await listCalendarEntries({ data: { siteId } });
  return data.map((row) => normalizeCalendarEntry(row as Record<string, unknown>));
}

export function normalizeModule(row: Record<string, unknown>): SiteModule {
  return {
    id: String(row["id"]),
    site_id: String(row["site_id"]),
    module_type: row["module_type"] as ModuleType,
    price: Number(row["price"] ?? 0),
    enabled: Boolean(row["enabled"]),
  };
}

export function normalizeContribution(row: Record<string, unknown>): Contribution {
  return {
    id: String(row["id"]),
    site_id: String(row["site_id"]),
    module_type: row["module_type"] as ModuleType,
    author_name: String(row["author_name"]),
    text_content: (row["text_content"] as string | null) ?? null,
    media_url: (row["media_url"] as string | null) ?? null,
    external_link: (row["external_link"] as string | null) ?? null,
    status: (row["status"] as Contribution["status"]) ?? "pending",
    ornament_key: (row["ornament_key"] as OrnamentKey | null) ?? null,
    visibility: row["visibility"] === "recipient" ? "recipient" : "public",
    created_at: String(row["created_at"]),
  };
}

export const ORNAMENTS = [
  ["bauble", "Bauble", "●"], ["star", "Star", "★"], ["stocking", "Stocking", "♩"],
  ["candy-cane", "Candy cane", "⌁"], ["snowman", "Snowman", "☃"],
  ["gingerbread", "Gingerbread", "♟"], ["bell", "Bell", "♢"], ["wreath", "Wreath", "◉"],
  ["mitten", "Mitten", "♧"], ["snow-globe", "Snow globe", "◍"], ["gift", "Gift", "▣"],
  ["heart", "Heart", "♥"], ["candy", "Candy", "◆"], ["cookie", "Cookie", "✿"],
  ["pinecone", "Pinecone", "♦"], ["angel", "Angel", "♛"],
] as const;

export type OrnamentKey = (typeof ORNAMENTS)[number][0];

export async function fetchPublicTreeOrnaments(siteId: string) {
  const data = await listPublicTreeOrnaments({ data: { siteId } });
  return data.map((row) => normalizeContribution({ ...row, module_type: "tree" }));
}

export async function fetchSiteBySlug(slug: string) {
  const data = await getSiteBySlug({ data: { slug } });
  return data ? normalizeSite(data as Record<string, unknown>) : null;
}

export async function fetchSiteById(id: string) {
  const data = await getSiteById({ data: { id } });
  return data ? normalizeSite(data as Record<string, unknown>) : null;
}

export async function fetchModules(siteId: string) {
  const data = await listModules({ data: { siteId } });
  return data.map((row) => normalizeModule(row as Record<string, unknown>));
}

export async function fetchContributions(siteId: string, onlyApproved: boolean) {
  const data = await listContributions({ data: { siteId, onlyApproved } });
  return data.map((row) => normalizeContribution(row as Record<string, unknown>));
}

export async function fetchTheme(id: string | null): Promise<Theme | null> {
  if (!id) return null;
  const data = await getThemeById({ data: { id } });
  return data ? normalizeTheme(data as Record<string, unknown>) : null;
}

export function resolvePalette(
  theme: Theme | null,
  custom: Partial<Palette> | undefined,
): Palette {
  const fallback: Palette = { background: "#faf7f2", primary: "#2b2724", accent: "#b4552f" };
  const base = theme?.palettes[0] ?? fallback;
  return {
    background: custom?.background ?? base.background,
    primary: custom?.primary ?? base.primary,
    accent: custom?.accent ?? base.accent,
  };
}

/** Turn a Spotify / YouTube link into an embeddable player URL. */
export function toEmbedUrl(link: string): string | null {
  try {
    const url = new URL(link);
    const host = url.hostname.replace("www.", "");
    if (host.endsWith("spotify.com")) {
      return `https://open.spotify.com/embed${url.pathname}`;
    }
    if (host === "youtu.be") {
      return `https://www.youtube.com/embed${url.pathname}`;
    }
    if (host.endsWith("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (url.pathname.startsWith("/embed/")) return link;
    }
    return null;
  } catch {
    return null;
  }
}

/** Media is stored as a full public URL (Vercel Blob), or a local-dev path. */
export async function signedMediaUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return null;
}
