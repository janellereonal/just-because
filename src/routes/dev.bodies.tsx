import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { FormatView } from "@/components/formats/FormatView";
import { DEMO_GIFTS, isDemoId } from "@/lib/demoGifts";
import { isStyleId, lookFor, styleInfo, type StyleId } from "@/lib/styles";
import type { Palette, Theme } from "@/lib/themes";

/**
 * Dev only: a style's own body, with no opening in front.
 * /dev/bodies?style=love-letter                 Ana's notes (a full gift)
 * /dev/bodies?style=cake&demo=sample            the sample notes a new gift shows
 * /dev/bodies?style=cake&demo=sam               another demo gift (ana, sam, milo, nora-james)
 * /dev/bodies?style=cake&pal=night              another palette (default: the style's own)
 * /dev/bodies?style=cake&solo=1                 a gift made by one person
 * /dev/bodies?style=care-package&look=balikbayan  another look of the style (invitation: ivory, blush)
 */
export const Route = createFileRoute("/dev/bodies")({
  head: () => ({ meta: [NOINDEX] }),
  validateSearch: (s: Record<string, unknown>) => ({
    style: (isStyleId(s["style"]) ? s["style"] : "love-letter") as StyleId,
    demo: typeof s["demo"] === "string" ? s["demo"] : "ana",
    pal: typeof s["pal"] === "string" ? s["pal"] : "",
    solo: s["solo"] === true || s["solo"] === 1 || s["solo"] === "1",
    name: typeof s["name"] === "string" ? s["name"] : "",
    look: typeof s["look"] === "string" ? s["look"] : "",
  }),
  component: DevBodies,
});

/** Each style's suggested palette (the first one its theme suggests), so bodies are judged in their own colors. */
const STYLE_PALETTES: Partial<Record<StyleId, Palette>> = {
  cake: { background: "#FFF3C4", primary: "#EB4E99", accent: "#2D4BD6" },
  "love-letter": { background: "#F6EEE3", primary: "#B4335A", accent: "#5E1424" },
  "boarding-pass": { background: "#F6F0E4", primary: "#3E8CCE", accent: "#E2531F" },
  "gift-box": { background: "#F7F4EE", primary: "#A3203A", accent: "#1F4D3A" },
  countdown: { background: "#10152E", primary: "#E5C26B", accent: "#A99BF5" },
  "record-player": { background: "#2B1D18", primary: "#E9D6B0", accent: "#B48DA3" },
  invitation: { background: "#FBF7EE", primary: "#7D946C", accent: "#A8843E" },
  "crib-mobile": { background: "#F5EFE4", primary: "#5A8CBC", accent: "#D5627C" },
  fetch: { background: "#F4EBDD", primary: "#D1662B", accent: "#A8461F" },
  "board-game": { background: "#FFF6E5", primary: "#22305E", accent: "#D93A33" },
  arcade: { background: "#1B1640", primary: "#3DF2B0", accent: "#FF5DA2" },
  "winter-window": { background: "#F7F3EC", primary: "#2F5D46", accent: "#B5621E" },
  "care-package": { background: "#F3E9DA", primary: "#7A5230", accent: "#2F5D86" },
  parol: { background: "#141B3A", primary: "#E8B04B", accent: "#F6EEDC" },
  debut: { background: "#FBF5EF", primary: "#A8566A", accent: "#8A6A2E" },
};

/** Second looks have their own suggested palette. */
const LOOK_PALETTES: Record<string, Palette> = {
  balikbayan: { background: "#F6EBDD", primary: "#1F4E8C", accent: "#B83A2E" },
  blush: { background: "#FCF1F0", primary: "#B97A74", accent: "#9C829B" },
};

const EXTRA: Record<string, Palette> = {
  cream: { background: "#FBF8F2", primary: "#B5623E", accent: "#E9C9B6" },
  berry: { background: "#FFF4F6", primary: "#7A5CFF", accent: "#C2366B" },
  night: { background: "#151A2E", primary: "#3B4A8C", accent: "#F2C14E" },
  sage: { background: "#F3F6EF", primary: "#5E7D5A", accent: "#D9895B" },
};

function DevBodies() {
  const { style, demo, pal, solo, name, look: lookId } = Route.useSearch();
  const info = styleInfo(style);
  const look = lookFor(info, null, lookId || null);
  const gift = DEMO_GIFTS[isDemoId(demo) ? demo : "ana"];
  const palette = EXTRA[pal] ?? (lookId ? LOOK_PALETTES[lookId] : undefined) ?? STYLE_PALETTES[style] ?? gift.palette;
  const theme = useMemo<Theme | null>(
    () => (look ? { ...gift.theme, id: `dev-${look.id}`, name: look.theme, category: "", palettes: [palette] } : null),
    [gift.theme, look, palette],
  );
  const empty = demo === "sample" || demo === "empty";
  const site = useMemo(
    () => ({
      ...gift.site,
      style,
      format: info.body,
      solo,
      custom_colors: palette,
      custom_text: { ...gift.site.custom_text, heading: "", ...(name ? { recipient_name: name } : {}) },
    }),
    [gift.site, style, info.body, solo, palette, name],
  );
  if (!import.meta.env.DEV) return null;
  return (
    <div className="[container:gift/inline-size]">
      <FormatView
        site={site}
        theme={theme}
        palette={palette}
        modules={gift.modules}
        contributions={empty ? [] : gift.notes}
        calendarEntries={empty ? [] : gift.calendar}
        sample={empty}
        showShare
      />
    </div>
  );
}
