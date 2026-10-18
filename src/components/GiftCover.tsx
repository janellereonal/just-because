import { useEffect, useMemo } from "react";
import { Character } from "@/themes/_shared/cast/Character";
import { castFor } from "@/themes/_shared/design";
import { loadThemeFonts, themeFontVars } from "@/themes/_shared/design";
import { IconGlyph } from "@/themes/_shared/Sprinkles";
import { pick, resolveIconSet } from "@/themes/_shared/iconSets";
import { themeStillUrl } from "@/components/Theme3D";
import { FONT_PAIRINGS, backgroundCss, resolvePalette, type GiftSite } from "@/lib/gift";
import { giftHeading, giftWords, themeKindOf } from "@/lib/themeKind";
import { readableInk, readableOn } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import { isStyleId, styleInfo } from "@/lib/styles";
import { FormatMini } from "@/components/FormatPicker";
import { LAYOUT_STAGE } from "@/components/styles/StylePicker";

/** Where the few sprinkles sit on a cover, as % of its box: [x, y, size px, turn]. */
const SPOTS: [number, number, number, number][] = [
  [6, 12, 15, -12],
  [38, 9, 11, 18],
  [93, 64, 13, 8],
  [58, 16, 10, -20],
  [24, 30, 8, 30],
];

/**
 * A small, still picture of the gift itself for the gift cards: its palette and background,
 * the occasion's 3D object, its character and sprinkles, and the heading in its own font.
 * Cheap to draw (no 3D, no animation), so a page of cards stays quick on phones.
 */
export function GiftCover({ site, theme, className = "" }: { site: GiftSite; theme: Theme | null; className?: string }) {
  const kind = themeKindOf(theme);
  useEffect(() => loadThemeFonts(kind), [kind]);
  const palette = resolvePalette(theme, site.custom_colors);
  const ink = readableInk(palette.background);
  const accent = readableOn(palette.background, palette.accent);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.theme;
  const recipient = site.custom_text.recipient_name?.trim() ?? "";
  const heading = giftHeading(site.custom_text, theme, site.occasion);
  const cast = castFor(kind, site.character ?? null, site.icon_set ?? null);
  const icons = useMemo(() => resolveIconSet(cast.iconSet, { recipient, palette }), [cast.iconSet, recipient, palette]);
  const tint = icons.colors.length ? icons.colors : [palette.accent, palette.primary];
  const showChar = cast.character.type !== "none";
  // Layout styles (Mixtape, Constellation...) wear no theme: show their own little card instead of the plain box.
  const layout = isStyleId(site.style) && styleInfo(site.style).origin === "layout" ? styleInfo(site.style) : null;

  return (
    <span
      className={`block overflow-hidden ${className || "relative"}`}
      style={{ ...backgroundCss(site.background_style ?? "paper", palette), ...themeFontVars(kind), color: ink }}
      aria-hidden="true"
    >
      {SPOTS.map(([x, y, size, turn], i) => (
        <span key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: `rotate(${turn}deg)` }}>
          <IconGlyph item={pick(icons.items, i)} color={pick(tint, i)} size={size} />
        </span>
      ))}
      {layout ? (
        <span
          className="absolute right-3 bottom-4 grid h-[66%] w-[42%] rotate-[4deg] place-items-center overflow-hidden rounded-2xl shadow-[0_10px_18px_-8px_rgba(43,37,34,.35)] ring-1 ring-white/60 transition-transform duration-500 group-hover:rotate-1 group-hover:scale-[1.04]"
          style={{ background: LAYOUT_STAGE[layout.body] ?? LAYOUT_STAGE["scrapbook"] }}
        >
          <FormatMini id={layout.body} />
        </span>
      ) : <img
        src={themeStillUrl(kind)}
        alt=""
        loading="lazy"
        draggable={false}
        className="absolute -right-2 bottom-1 h-[82%] w-auto max-w-[52%] object-contain drop-shadow-[0_10px_14px_rgba(43,37,34,.18)] transition-transform duration-500 group-hover:-rotate-2 group-hover:scale-[1.04]"
      />}
      {showChar ? (
        <span className="absolute right-[17%] bottom-0">
          <Character setting={cast.character} size={58} live={false} follow={false} showName={false} />
        </span>
      ) : null}
      <span className="absolute bottom-4 left-5 max-w-[54%]">
        <span className="block font-mono text-[9px] tracking-[0.18em] uppercase opacity-70" style={{ color: accent }}>
          {giftWords(theme, site.occasion).badge}
        </span>
        <span
          className="mt-1 line-clamp-2 text-[1.35rem] leading-[1.05] font-semibold text-balance [overflow-wrap:anywhere]"
          style={{ fontFamily: fonts.heading }}
        >
          {heading}
        </span>
        {recipient && !heading.toLowerCase().includes(recipient.toLowerCase()) ? (
          <span className="mt-0.5 block truncate text-sm" style={{ color: accent }}>
            for {recipient}
          </span>
        ) : null}
      </span>
    </span>
  );
}
