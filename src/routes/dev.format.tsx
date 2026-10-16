import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchThemes } from "@/lib/themes";
import { themeKindOf } from "@/lib/themeKind";
import { themePalettes, usePalettes } from "@/hooks/usePalettes";
import { SampleGift } from "@/components/SampleGift";
import type { GiftFormat } from "@/lib/formats";

/**
 * Dev only: a theme's full sample gift in any format, for checking every
 * theme x format. /dev/format?kind=birthday&format=comic
 */
export const Route = createFileRoute("/dev/format")({
  validateSearch: (s: Record<string, unknown>) => ({
    kind: typeof s["kind"] === "string" ? s["kind"] : "birthday",
    format: (typeof s["format"] === "string" ? s["format"] : "scrapbook") as GiftFormat,
    p: typeof s["p"] === "number" ? s["p"] : 0,
    cover: s["cover"] === 1 || s["cover"] === "1" || s["cover"] === true,
  }),
  component: DevFormat,
});

function DevFormat() {
  const { kind, format, p, cover } = Route.useSearch();
  const { data: themes = [] } = useQuery({ queryKey: ["themes", false], queryFn: () => fetchThemes(false) });
  const { data: all = [] } = usePalettes();
  if (!import.meta.env.DEV) return null;
  const theme = themes.find((t) => themeKindOf(t) === kind);
  if (!theme) return <p className="p-6">No theme for {kind} (loaded {themes.length})</p>;
  const pal = themePalettes(theme, all)[p] ?? themePalettes(theme, all)[0];
  if (!pal) return <p className="p-6">Loading palettes…</p>;
  return (
    <div className="min-h-dvh [container:gift/inline-size]">
      <SampleGift theme={theme} palette={{ background: pal.background, primary: pal.primary, accent: pal.accent }} format={format} showCover={cover} />
    </div>
  );
}
