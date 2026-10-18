import { useState } from "react";
import { Lock } from "lucide-react";
import { t } from "@/i18n";
import { FormatMini } from "@/components/FormatPicker";
import { stageColorFor } from "@/components/ThemeCard";
import { themeStillUrl } from "@/components/Theme3D";
import { stylePlanTag } from "@/config/pricing";
import { themeKindOf } from "@/lib/themeKind";
import type { OccasionId } from "@/lib/occasions";
import {
  STYLES,
  isRecommended,
  lookFor,
  styleCopy,
  stylesForOccasion,
  styleTitle,
  type StyleId,
  type StyleInfo,
} from "@/lib/styles";

/** Backdrops for layout styles, so each card reads as its own thing. */
const LAYOUT_STAGE: Record<string, string> = {
  scrapbook: "linear-gradient(140deg, var(--pink), var(--lilac) 55%, var(--sky))",
  storybook: "linear-gradient(140deg, var(--peach), var(--butter))",
  comic: "#1f2440",
  bento: "linear-gradient(140deg, var(--mint), var(--sky))",
  hunt: "linear-gradient(140deg, var(--butter), var(--peach))",
  zine: "#efece4",
  mixtape: "linear-gradient(140deg, var(--lilac), var(--pink))",
  scratch: "linear-gradient(140deg, var(--sky), var(--lilac))",
  stars: "#141833",
};

/** The picture on a style card: the opening's object for theme styles, a tiny layout for the rest. */
export function StyleArt({ style, occasion }: { style: StyleInfo; occasion?: OccasionId | null }) {
  const look = lookFor(style, occasion);
  if (look) {
    const theme = { name: look.theme, category: "" };
    return (
      <span className="absolute inset-0 grid place-items-center" style={{ background: stageColorFor(theme) }} aria-hidden>
        <img src={themeStillUrl(themeKindOf(theme))} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <span className="absolute inset-0 grid place-items-center" style={{ background: LAYOUT_STAGE[style.body] ?? LAYOUT_STAGE["scrapbook"] }} aria-hidden>
      <FormatMini id={style.body} />
    </span>
  );
}

/**
 * The one visual choice: a grid of styles, sorted for the occasion. Phones see the best
 * few first, then "Show all". Every style works for every occasion.
 */
export function StylePicker({
  value,
  onChange,
  occasion,
  available,
  isAllowed,
  first = 6,
  current,
}: {
  value: StyleId | null;
  onChange: (id: StyleId) => void;
  occasion: OccasionId | null;
  /** Which styles can be picked right now (draft themes are hidden). Default: all. */
  available?: (style: StyleInfo) => boolean;
  /** Styles the gift's plan can't use show a lock (editor only). */
  isAllowed?: (style: StyleInfo) => boolean;
  /** How many to show before "Show all". */
  first?: number;
  /** An older gift's look, shown as "Current style" until a style is picked. */
  current?: { title: string; art: React.ReactNode } | null;
}) {
  const list = stylesForOccasion(occasion, STYLES.filter((s) => s.id === value || !available || available(s)));
  const [all, setAll] = useState(false);
  const pickedAt = value ? list.findIndex((s) => s.id === value) : -1;
  const shown = all || pickedAt >= first ? list : list.slice(0, first);
  return (
    <fieldset>
      <legend className="sr-only">{t("picker.style.label")}</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {current && !value ? (
          <div className="fmt-card style-card is-active" aria-current="true">
            <span className="fmt-stage">{current.art}</span>
            <span className="block px-3 pt-2.5 pb-3">
              <span className="block text-sm font-semibold">{current.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{t("picker.style.current")}</span>
            </span>
          </div>
        ) : null}
        {shown.map((s) => {
          const active = value === s.id;
          const allowed = isAllowed ? isAllowed(s) : true;
          const plan = stylePlanTag(s.id);
          return (
            <label key={s.id} data-style={s.id} className={`fmt-card style-card group ${active ? "is-active" : ""} ${allowed ? "" : "is-locked"}`}>
              <input className="sr-only" type="radio" name="style" checked={active} disabled={!allowed} onChange={() => onChange(s.id)} />
              <span className="fmt-stage">
                <StyleArt style={s} occasion={occasion} />
                {!allowed ? (
                  <span className="fmt-lock">
                    <Lock className="size-3" /> {plan ?? "Bigger plan"}
                  </span>
                ) : plan ? (
                  <span className="fmt-plan">{plan}</span>
                ) : null}
              </span>
              <span className="block px-3 pt-2.5 pb-3">
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-semibold">
                  {styleTitle(s.id)}
                  {isRecommended(s.id, occasion) ? <span className="fmt-rec">{t("picker.style.recommended")}</span> : null}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{styleCopy(s.id)}</span>
              </span>
            </label>
          );
        })}
      </div>
      {list.length > first && pickedAt < first ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-3 w-full rounded-2xl border border-dashed border-ink/20 px-4 py-3 text-sm font-medium hover:bg-paper">
          {all ? t("picker.style.showFewer") : t("picker.style.showAll", { n: list.length })}
        </button>
      ) : null}
    </fieldset>
  );
}
