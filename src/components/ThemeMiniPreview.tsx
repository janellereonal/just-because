import { FONT_PAIRINGS, type FontChoice } from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";

export function themeFont(theme: Pick<Theme, "category" | "name">): FontChoice {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("wedding") || key.includes("anniversar") || key.includes("valentine"))
    return "romantic";
  if (key.includes("pet") || key.includes("birthday")) return "playful";
  if (key.includes("new year") || key.includes("christmas")) return "modern";
  return "handwritten";
}

/** Scaled-down wireframe of a theme's published layout, in its own palette + font. */
export function ThemeMiniPreview({
  theme,
  palette,
  className,
}: {
  theme: Theme;
  palette?: Palette;
  className?: string;
}) {
  const p = palette ?? theme.palettes[0];
  if (!p) return null;
  const fonts = FONT_PAIRINGS[themeFont(theme)];
  const mods = theme.default_modules;
  const photos = mods.includes("photobooth") ? 4 : 2;

  return (
    <div
      className={`size-full overflow-hidden p-3 ${className ?? ""}`}
      style={{ backgroundColor: p.background, color: p.primary, fontFamily: fonts.body }}
    >
      <div className="text-center">
        <p className="text-[6px] tracking-[0.2em] uppercase" style={{ color: p.accent }}>
          {theme.category}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight" style={{ fontFamily: fonts.heading }}>
          {theme.name}
        </p>
        <div
          className="mx-auto mt-1 h-[2px] w-8 rounded-full"
          style={{ backgroundColor: `${p.accent}66` }}
        />
      </div>

      {mods.includes("countdown") ? (
        <div
          className="mt-2 rounded-[4px] py-1 text-center text-[8px]"
          style={{ backgroundColor: `${p.accent}1f`, color: p.accent }}
        >
          12 days to go
        </div>
      ) : null}

      {mods.includes("calendar") ? (
        <div className="mt-2 grid grid-cols-7 gap-[2px]">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="aspect-square rounded-[2px]"
              style={{ backgroundColor: i % 5 === 2 ? `${p.accent}99` : `${p.primary}1a` }}
            />
          ))}
        </div>
      ) : null}

      <div className={`mt-2 grid gap-[3px] ${photos === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {Array.from({ length: photos }).map((_, i) => (
          <span
            key={i}
            className="aspect-square rounded-[3px]"
            style={{ backgroundColor: `${p.primary}1f` }}
          />
        ))}
      </div>

      {mods.includes("wordcloud") ? (
        <div className="mt-2 flex flex-wrap items-baseline justify-center gap-x-1.5">
          <span className="text-[10px]" style={{ color: p.accent }}>
            kind
          </span>
          <span className="text-[6px]">funny</span>
          <span className="text-[8px]">loyal</span>
          <span className="text-[6px]">warm</span>
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-[3px]">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-[3px] p-1"
            style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
          >
            <span
              className="block h-[2px] w-full rounded-full"
              style={{ backgroundColor: `${p.primary}26` }}
            />
            <span
              className="mt-[3px] block h-[2px] w-2/3 rounded-full"
              style={{ backgroundColor: `${p.primary}26` }}
            />
            <span className="mt-1 block text-[5px]" style={{ color: p.accent }}>
              — Sam
            </span>
          </div>
        ))}
      </div>

      {mods.includes("songs") || mods.includes("voice") ? (
        <div
          className="mt-2 flex items-center gap-1 rounded-[3px] p-1"
          style={{ backgroundColor: "rgba(255,255,255,0.6)" }}
        >
          <span className="size-3 rounded-[2px]" style={{ backgroundColor: `${p.primary}26` }} />
          <span className="h-[2px] flex-1 rounded-full" style={{ backgroundColor: `${p.primary}26` }} />
          <span className="size-2.5 rounded-full" style={{ backgroundColor: p.accent }} />
        </div>
      ) : null}
    </div>
  );
}
