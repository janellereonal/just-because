import type { ModuleType } from "@/lib/gift";

export type { GiftFormat } from "@/lib/formats";

export type ComicSettings = {
  cover_title?: string;
  cover_subtitle?: string;
  two_worlds?: boolean;
  world_one?: string;
  world_two?: string;
  panel_order?: string[];
  chapter_overrides?: Record<string, string>;
};

export const COMIC_CHAPTERS: Record<ModuleType, string> = {
  countdown: "Next Issue Drops In…",
  photobooth: "Origin Story",
  letters: "The Ohana",
  songs: "Soundtrack",
  wordcloud: "Power Words",
  voice: "Transmissions",
  calendar: "Secret Missions",
  tree: "The Giving Tree",
};

export function normalizeComicSettings(value: unknown): ComicSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ComicSettings;
}

const COVER_SUBTITLE: Record<string, string> = {
  valentine: "SPECIAL LOVE ISSUE",
  birthday: "SPECIAL BIRTHDAY ISSUE",
  voyage: "SPECIAL SEND-OFF ISSUE",
  christmas: "SPECIAL HOLIDAY ISSUE",
  pets: "SPECIAL GOOD BOY ISSUE",
  newyear: "SPECIAL NEW YEAR ISSUE",
  anniversary: "SPECIAL ANNIVERSARY ISSUE",
  wedding: "SPECIAL WEDDING ISSUE",
  bridal: "SPECIAL SHOWER ISSUE",
  baby: "SPECIAL BABY ISSUE",
  default: "SPECIAL COLLECTOR'S ISSUE",
};

export function comicSettingDefaults(recipient?: string, kind?: string): Required<Pick<ComicSettings, "cover_title" | "cover_subtitle" | "world_one" | "world_two">> {
  return {
    cover_title: `THE AMAZING ${(recipient || "YOU").toUpperCase()}`,
    cover_subtitle: COVER_SUBTITLE[kind ?? "default"] ?? "SPECIAL COLLECTOR'S ISSUE",
    world_one: "HERO WORLD",
    world_two: "OHANA WORLD",
  };
}

export function orderedComicIds(ids: string[], order: string[] | undefined) {
  if (!order?.length) return ids;
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...ids].sort((a, b) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER));
}