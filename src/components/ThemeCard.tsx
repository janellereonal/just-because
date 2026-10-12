import { useEffect, useState } from "react";
import { resolvePreviewUrl, type Theme } from "@/lib/themes";
import { ThemeLivePreview } from "@/components/ThemeLivePreview";
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
  tiltRight?: boolean;
  onSelect?: () => void;
  footer?: React.ReactNode;
};

export function ThemeCard({ theme, tiltRight, onSelect, footer }: Props) {
  const { data: allPalettes = [] } = usePalettes();
  const palettes = themePalettes(theme, allPalettes);
  const firstPalette = palettes[0];

  return (
    <div
      className={`group card-paper p-3 transition-transform duration-300 hover:-translate-y-1 ${
        tiltRight ? "hover:rotate-[1deg]" : "hover:rotate-[-1deg]"
      }`}
    >
      <div
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (onSelect && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`block w-full text-left ${onSelect ? "cursor-pointer" : ""}`}
      >
        <div
          className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl outline-1 -outline-offset-1 outline-ink/5"
          style={{ backgroundColor: firstPalette?.background ?? "transparent" }}
        >
          <ThemeLivePreview theme={theme} />
        </div>
        <div className="pt-3">
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            {theme.category}
          </p>
          <p className="font-display text-lg font-medium tracking-tight">{theme.name}</p>
          <div className="mt-2 space-y-1.5">
            {palettes.map((palette, i) => (
              <div key={i} className="flex gap-1.5">
                <span
                  className="size-4 rounded-full ring-1 ring-ink/5"
                  style={{ backgroundColor: palette.background }}
                />
                <span
                  className="size-4 rounded-full ring-1 ring-ink/5"
                  style={{ backgroundColor: palette.primary }}
                />
                <span
                  className="size-4 rounded-full ring-1 ring-ink/5"
                  style={{ backgroundColor: palette.accent }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {footer}
    </div>
  );
}
