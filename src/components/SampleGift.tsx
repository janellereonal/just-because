/**
 * A finished sample gift for a theme: the theme's own sections first, then
 * the other good ones a creator could add, filled with real-looking notes.
 * Used behind the gallery's full-screen opening, so opening a theme lands on
 * what a whole gift could look like.
 */
import { useMemo } from "react";
import type { ModuleType, SiteModule } from "@/lib/gift";
import { MODULES } from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";
import { themeKindOf } from "@/lib/themeKind";
import { PRESETS } from "@/lib/presets";
import { sampleNotes } from "@/lib/sampleSections";
import { DEMO_GIFTS, DEMO_ORDER } from "@/lib/demoGifts";
import { FormatView } from "@/components/formats/FormatView";
import type { GiftFormat } from "@/lib/formats";
import { buildPreviewSite, sampleFor } from "@/components/ThemeLivePreview";

/** The sections worth showing off, in the order they read best. */
const SHOWCASE: ModuleType[] = ["letters", "photobooth", "songs", "voice", "superlatives", "wordcloud", "quiz", "map", "openwhen", "capsule", "coupons", "video", "doodle", "countdown"];

export function showcaseSections(theme: Theme): ModuleType[] {
  const kind = themeKindOf(theme);
  const own = PRESETS[kind] ?? [];
  const extra = kind === "christmas" ? (["calendar", "tree"] as ModuleType[]) : [];
  const all = [...own, ...extra, ...SHOWCASE];
  return all.filter((t, i) => all.indexOf(t) === i && MODULES.some((m) => m.type === t));
}

export function SampleGift({ theme, palette, format, showCover = false }: { theme: Theme; palette: Palette; format?: GiftFormat; showCover?: boolean }) {
  const site = useMemo(() => ({ ...buildPreviewSite(theme, palette), ...(format ? { format } : {}) }), [theme, palette, format]);
  const modules: SiteModule[] = useMemo(
    () => showcaseSections(theme).map((type, i) => ({ id: `show-${i}-${type}`, site_id: site.id, module_type: type, price: 0, enabled: true })),
    [theme, site.id],
  );
  const kind = themeKindOf(theme);
  const demo = DEMO_ORDER.map((d) => DEMO_GIFTS[d]).find((g) => g.kind === kind);
  const notes = useMemo(() => {
    const base = sampleNotes(sampleFor(theme).name, site.id);
    if (!demo) return base;
    const have = new Set(demo.notes.map((n) => n.module_type));
    return [...demo.notes, ...base.filter((n) => !have.has(n.module_type))];
  }, [theme, site.id, demo]);
  return <FormatView site={site} theme={theme} palette={palette} modules={modules} contributions={notes} calendarEntries={demo?.calendar} sample showCover={showCover} />;
}
