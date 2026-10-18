/**
 * Where "browse" links go: the styles gallery once flag `styles` is on, the themes
 * gallery until then. One place, so the header, footer, landing and 404 agree.
 */
import { isFlagOn } from "@/config/flags";
import { t } from "@/i18n";

export function galleryLink(): { to: "/styles" | "/themes"; label: string; browse: string; see: string } {
  return isFlagOn("styles")
    ? { to: "/styles", label: t("nav.styles"), browse: t("nav.browseStyles"), see: t("nav.seeStyles") }
    : { to: "/themes", label: "Themes", browse: "Browse themes", see: "See themes" };
}
