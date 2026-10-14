import { accessoryForTheme } from "@/lib/bo3d/accessories";
import { useEffect, useState } from "react";
import { resolvePreviewUrl, type Theme } from "@/lib/themes";
import { ThemeLivePreview, claimPreview, releasePreview } from "@/components/ThemeLivePreview";
import { usePalettes, themePalettes } from "@/hooks/usePalettes";

export function usePreviewUrl(value: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    resolvePreviewUrl(value).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [value]);
  return url;
}

type Props = {
  theme: Theme;
  /** Kept for older callers; the pastel cards don't tilt. */
  tiltRight?: boolean;
  onSelect?: () => void;
  footer?: React.ReactNode;
  /** "phone": tall phone mockup (theme gallery). "compact": shorter card (landing). */
  variant?: "phone" | "compact";
};

/** The candy color behind each card, picked by occasion so the grid reads as a rainbow. */
export function stageColorFor(theme: Pick<Theme, "name" | "category">) {
  const key = `${theme.category} ${theme.name}`.toLowerCase();
  if (key.includes("valentine") || key.includes("romance")) return "var(--pink)";
  if (key.includes("birthday")) return "var(--butter)";
  if (key.includes("voyage") || key.includes("farewell")) return "var(--sky)";
  if (key.includes("christmas")) return "var(--mint)";
  if (key.includes("pet")) return "var(--peach)";
  if (key.includes("new year")) return "var(--lilac)";
  if (key.includes("anniversar")) return "var(--peach)";
  if (key.includes("bridal") || key.includes("shower")) return "var(--pink)";
  if (key.includes("wedding")) return "var(--mint)";
  return "var(--lilac)";
}

/**
 * A theme as a phone showing the real gift, playing through itself on hover
 * (or when scrolled into view on phones). Click opens the full preview.
 */
export function ThemeCard({ theme, onSelect, footer, variant = "phone" }: Props) {
  const { data: allPalettes = [] } = usePalettes();
  const palettes = themePalettes(theme, allPalettes);
  const stage = stageColorFor(theme);

  return (
    <article
      data-bo-accessory={accessoryForTheme(theme) ?? undefined}
      className="group card-paper flex flex-col overflow-hidden p-2.5"
      onMouseEnter={() => claimPreview(theme.id)}
      onMouseLeave={() => releasePreview(theme.id)}
      onFocus={() => claimPreview(theme.id)}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={!onSelect}
        aria-label={`Preview the ${theme.name} theme`}
        className="relative block w-full overflow-hidden rounded-[22px] text-left disabled:cursor-default"
        style={{ backgroundColor: stage }}
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 size-32 rounded-full bg-white/45" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-10 size-36 rounded-full bg-white/35" />
        <div className={`relative mx-auto ${variant === "phone" ? "w-[66%] pt-6 pb-0" : "w-[72%] pt-5 pb-0"}`}>
          <div
            className={`overflow-hidden rounded-t-[26px] border-[5px] border-b-0 border-ink bg-ink shadow-[0_18px_40px_-18px_rgba(43,37,34,0.55)] transition-transform duration-500 group-hover:-translate-y-1.5 ${
              variant === "phone" ? "aspect-[9/15.5]" : "aspect-[9/12]"
            }`}
          >
            <div className="relative size-full overflow-hidden rounded-t-[21px]">
              <ThemeLivePreview theme={theme} />
            </div>
          </div>
        </div>
      </button>

      <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{theme.category}</p>
            <h3 className="font-display text-xl font-semibold tracking-tight">{theme.name}</h3>
          </div>
          {palettes.length > 0 ? (
            <div className="flex shrink-0 -space-x-1.5 pt-1" aria-label={`${palettes.length} color palettes`}>
              {palettes.slice(0, 3).map((p, i) => (
                <span
                  key={i}
                  className="size-6 rounded-full ring-2 ring-white"
                  style={{ background: `conic-gradient(${p.background} 0 50%, ${p.accent} 50% 75%, ${p.primary} 75%)` }}
                />
              ))}
            </div>
          ) : null}
        </div>
        {footer}
      </div>
    </article>
  );
}
