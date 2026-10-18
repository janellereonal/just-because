/**
 * Openings for the layout styles (the styles made from a way of reading rather
 * than from a theme). Each one leads into its own pages: the scrapbook opens on
 * a spread, the cassette starts the mixtape, the foil comes off the scratch cards.
 * Picked by `TactileOpening` when it's given a layout style's id.
 */
import type { OpeningComponent } from "@/themes/_shared/opening";
import type { StyleId } from "@/lib/styles";
import { BentoOpening, bentoBackground } from "./Bento";
import { ComicOpening, comicBackground } from "./Comic";
import { ConstellationOpening, constellationBackground } from "./Constellation";
import { HuntOpening, huntBackground } from "./Hunt";
import { MixtapeOpening, mixtapeBackground } from "./Mixtape";
import { ScratchOpening, scratchBackground } from "./Scratch";
import { ScrapbookOpening, scrapbookBackground } from "./Scrapbook";
import { StorybookOpening, storybookBackground } from "./Storybook";
import { ZineOpening, zineBackground } from "./Zine";

export type LayoutOpeningEntry = {
  Component: OpeningComponent;
  background: () => React.CSSProperties;
  /** Ink for the stage's own words (greeting, hint, Skip). */
  ink: string;
  /** The plain button that does the same as the gesture. */
  button: string;
  /** The small label at the top of the stage (the style's name). */
  badge: string;
  grain?: number;
};

export const LAYOUT_OPENINGS: Partial<Record<StyleId, LayoutOpeningEntry>> = {
  scrapbook: {
    Component: ScrapbookOpening,
    background: scrapbookBackground,
    ink: "#5B4339",
    button: "Open the scrapbook",
    badge: "Scrapbook",
  },
  storybook: {
    Component: StorybookOpening,
    background: storybookBackground,
    ink: "#3F3566",
    button: "Open the book",
    badge: "Storybook",
  },
  comic: {
    Component: ComicOpening,
    background: comicBackground,
    ink: "#4A2E4F",
    button: "Slide it out of the bag",
    badge: "Comic Issue",
  },
  bento: {
    Component: BentoOpening,
    background: bentoBackground,
    ink: "#5A3443",
    button: "Lift the lid",
    badge: "Bento Board",
  },
  hunt: {
    Component: HuntOpening,
    background: huntBackground,
    ink: "#2F5560",
    button: "Unroll the map",
    badge: "Gift Hunt",
  },
  zine: {
    Component: ZineOpening,
    background: zineBackground,
    ink: "#7A2E55",
    button: "Rip the band",
    badge: "Zine",
  },
  mixtape: {
    Component: MixtapeOpening,
    background: mixtapeBackground,
    ink: "#4B3F73",
    button: "Press play",
    badge: "Mixtape",
  },
  scratch: {
    Component: ScratchOpening,
    background: scratchBackground,
    ink: "#4A3A6B",
    button: "Scratch it off",
    badge: "Scratch Cards",
  },
  stars: {
    Component: ConstellationOpening,
    background: constellationBackground,
    ink: "#FFF3FA",
    button: "Connect the stars",
    badge: "Constellation",
    grain: 0.04,
  },
};

export function layoutOpeningFor(style: string | null | undefined): LayoutOpeningEntry | null {
  return style ? (LAYOUT_OPENINGS[style as StyleId] ?? null) : null;
}
