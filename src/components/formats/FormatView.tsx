import { lazy, Suspense } from "react";
import { GiftSiteView } from "@/components/GiftSiteView";
import { ComicIssueView } from "@/components/ComicIssueView";
import {
  resolvePalette,
  type CalendarEntry,
  type CustomText,
  type GiftSite,
  type SiteModule,
  type ViewContribution,
} from "@/lib/gift";
import type { Palette, Theme } from "@/lib/themes";

const BentoView = lazy(() =>
  import("@/components/formats/BentoView").then((m) => ({ default: m.BentoView })),
);
const HuntView = lazy(() =>
  import("@/components/formats/HuntView").then((m) => ({ default: m.HuntView })),
);
const ZineView = lazy(() =>
  import("@/components/formats/ZineView").then((m) => ({ default: m.ZineView })),
);

export type FormatViewProps = {
  site: GiftSite;
  modules: SiteModule[];
  contributions: ViewContribution[];
  calendarEntries?: CalendarEntry[] | undefined;
  palette: Palette;
  sample?: boolean | undefined;
  showShare?: boolean | undefined;
};

/** Drop undefined keys (the comic and scrapbook views use exact optional props). */
function defined<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

type Props = Omit<FormatViewProps, "palette"> & {
  theme: Theme | null;
  palette?: Palette;
  /** Comic: show the cover first. */
  showCover?: boolean | undefined;
  onReplayCover?: (() => void) | undefined;
  onClose?: (() => void) | undefined;
  /** Scrapbook: editor hooks and replaying the opening. */
  onReplayIntro?: (() => void) | undefined;
  highlightField?: keyof CustomText | null | undefined;
  onEditField?: ((field: keyof CustomText) => void) | undefined;
};

/** One gift, shown in whichever format the creator picked. */
export function FormatView(props: Props) {
  const { site, theme } = props;
  const palette = props.palette ?? resolvePalette(theme, site.custom_colors);
  const common = defined({
    site,
    modules: props.modules,
    contributions: props.contributions,
    calendarEntries: props.calendarEntries,
    palette,
    sample: props.sample,
    showShare: props.showShare,
  });
  const fallback = <div className="min-h-[60vh]" style={{ background: palette.background }} />;
  switch (site.format) {
    case "comic":
      return (
        <ComicIssueView
          {...common}
          {...defined({
            showCover: props.showCover,
            onReplayCover: props.onReplayCover,
            onClose: props.onClose,
          })}
        />
      );
    case "bento":
      return (
        <Suspense fallback={fallback}>
          <BentoView {...common} />
        </Suspense>
      );
    case "hunt":
      return (
        <Suspense fallback={fallback}>
          <HuntView {...common} />
        </Suspense>
      );
    case "zine":
      return (
        <Suspense fallback={fallback}>
          <ZineView {...common} />
        </Suspense>
      );
    default:
      return (
        <GiftSiteView
          theme={theme}
          {...common}
          {...defined({
            onReplayIntro: props.onReplayIntro,
            highlightField: props.highlightField,
            onEditField: props.onEditField,
          })}
        />
      );
  }
}
