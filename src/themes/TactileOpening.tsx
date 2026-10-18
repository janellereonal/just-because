/**
 * Picks the theme's object and runs it inside the shared opening stage.
 * This is the default opening for every gift; the older 3D opening is still
 * there as "Classic" in the editor's Intro panel.
 */
import { useMemo, useState } from "react";
import type { Palette } from "@/lib/themes";
import type { ThemeKind } from "@/lib/themeKind";
import { castFor, designFor, type ThemePalette } from "@/themes/_shared/design";
import { resolveIconSet, type IconSetSetting } from "@/themes/_shared/iconSets";
import type { CharacterSetting } from "@/themes/_shared/cast/types";
import { OpeningShell, type OpeningComponent } from "@/themes/_shared/opening";
import { ValentineOpening, valentineBackground } from "@/themes/valentine/Opening";
import { BirthdayOpening, birthdayBackground } from "@/themes/birthday/Opening";
import { AnniversaryOpening, anniversaryBackground } from "@/themes/anniversary/Opening";
import { WeddingOpening, weddingBackground } from "@/themes/wedding/Opening";
import { BabyOpening, babyBackground } from "@/themes/baby/Opening";
import { NewYearOpening, newYearBackground } from "@/themes/newyear/Opening";
import { VoyageOpening, voyageBackground } from "@/themes/voyage/Opening";
import { PetsOpening, petsBackground } from "@/themes/pets/Opening";
import { ChristmasOpening, christmasBackground, defaultBackground } from "@/themes/christmas/Opening";
import { HandwrittenOpening, handwrittenBackground } from "@/themes/handwritten/Opening";
import { GameOpening, gameBackground } from "@/themes/game/Opening";
import { PixelOpening, pixelBackground } from "@/themes/pixel/Opening";
import { EngineStage } from "@/themes/engine/EngineStage";
import { engineThemeForName } from "@/themes/engine/registry";
import type { EngineNote, ThemeOptions } from "@/themes/engine/define";
import type { SlotInput } from "@/themes/engine/slots";

type Entry = {
  Component: OpeningComponent;
  background: (c: ThemePalette) => React.CSSProperties;
  ink: (c: ThemePalette) => string;
  button: string;
  grain?: number;
  /** How strongly the icon set drifts in the background (0 hides it). */
  sprinkles?: number;
};

export const OPENINGS: Partial<Record<ThemeKind, Entry>> = {
  valentine: {
    Component: ValentineOpening,
    background: valentineBackground,
    ink: (c) => c.oxblood!,
    button: "Open the letter",
  },
  birthday: {
    Component: BirthdayOpening,
    background: birthdayBackground,
    ink: (c) => c.cobalt!,
    button: "Blow them all out",
  },
  anniversary: {
    Component: AnniversaryOpening,
    background: anniversaryBackground,
    ink: (c) => c.champagne!,
    button: "Play the record",
    grain: 0.22,
    sprinkles: 0.25,
  },
  wedding: {
    Component: WeddingOpening,
    background: weddingBackground,
    ink: (c) => c.ink!,
    button: "Slide the card out",
    sprinkles: 0.45,
  },
  christmas: {
    Component: ChristmasOpening,
    background: christmasBackground,
    ink: () => "#2B2522",
    button: "Untie the ribbon",
    sprinkles: 0.7,
  },
  default: {
    Component: ChristmasOpening,
    background: defaultBackground,
    ink: () => "#2B2522",
    button: "Untie the ribbon",
    sprinkles: 0.35,
  },
  newyear: {
    Component: NewYearOpening,
    background: newYearBackground,
    ink: (c) => c.silver!,
    button: "Count down",
    grain: 0.1,
    sprinkles: 0.35,
  },
  voyage: {
    Component: VoyageOpening,
    background: voyageBackground,
    ink: (c) => c.ink!,
    button: "Tear the stub",
    sprinkles: 0.3,
  },
  pets: {
    Component: PetsOpening,
    background: petsBackground,
    ink: (c) => c.ink!,
    button: "Give them a pat",
    sprinkles: 0.25,
  },
  baby: {
    Component: BabyOpening,
    background: babyBackground,
    ink: (c) => c.ink!,
    button: "Pull the string",
    sprinkles: 0.3,
  },
  handwritten: {
    Component: HandwrittenOpening,
    background: handwrittenBackground,
    ink: (c) => c.ink!,
    button: "Unfold the note",
    sprinkles: 0.3,
  },
  game: {
    Component: GameOpening,
    background: gameBackground,
    ink: (c) => c.navy!,
    button: "Roll the dice",
    sprinkles: 0.35,
  },
  pixel: {
    Component: PixelOpening,
    background: pixelBackground,
    ink: (c) => c.snow!,
    button: "Press start",
    grain: 0.06,
    sprinkles: 0.4,
  },
  bridal: {
    Component: WeddingOpening,
    background: weddingBackground,
    ink: (c) => c.ink!,
    button: "Slide the card out",
    sprinkles: 0.45,
  },
};

/** The stage behind a theme's object, for frames around it (gallery, previews). */
export function openingBackground(kind: ThemeKind): React.CSSProperties {
  const entry = OPENINGS[kind] ?? OPENINGS.valentine!;
  return entry.background(designFor(kind).palette);
}

export function hasTactileOpening(kind: ThemeKind) {
  return !!OPENINGS[kind];
}

export function TactileOpening({
  kind,
  palette,
  recipientName,
  introText,
  badgeText,
  buttonText,
  character,
  iconSet: iconSetting,
  contributors = [],
  contained = false,
  interactive = true,
  paused = false,
  autoplay = false,
  onOpen,
  onSkip,
  themeName,
  notes,
  slots,
  options,
  age,
  calm = false,
}: {
  age?: number | null | undefined;
  /** Calm occasions (Sympathy, Get well): no drifting particles. */
  calm?: boolean | undefined;
  /** The theme row's name: themes built on the engine are found by it. */
  themeName?: string | null | undefined;
  /** Engine themes: friends' notes, extra personalisation and options. */
  notes?: EngineNote[] | undefined;
  slots?: SlotInput | undefined;
  options?: ThemeOptions | undefined;
  kind: ThemeKind;
  palette: Palette;
  recipientName?: string | undefined;
  introText?: string | undefined;
  badgeText?: string | undefined;
  buttonText?: string | undefined;
  character?: CharacterSetting | null | undefined;
  iconSet?: IconSetSetting | null | undefined;
  contributors?: string[];
  contained?: boolean;
  interactive?: boolean;
  paused?: boolean;
  autoplay?: boolean;
  onOpen: () => void;
  onSkip?: (() => void) | undefined;
}) {
  const engine = engineThemeForName(themeName);
  const entry = OPENINGS[kind] ?? OPENINGS.valentine!;
  const design = designFor(kind);
  const cast = castFor(kind, character, iconSetting);
  const recipient = recipientName?.trim() || "you";
  const set = useMemo(
    () => resolveIconSet(cast.iconSet, { recipient, palette }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(cast.iconSet), recipient, palette.primary, palette.accent],
  );
  const [hint, setHint] = useState("");
  if (engine) {
    return (
      <EngineStage
        theme={engine}
        slots={{ ...slots, recipient: recipientName?.trim() || slots?.recipient || "" }}
        greeting={introText}
        badge={badgeText || engine.name}
        buttonText={buttonText}
        icons={iconSetting ? set : null}
        contributors={contributors}
        notes={notes}
        options={options}
        contained={contained}
        interactive={interactive}
        paused={paused}
        autoplay={autoplay}
        onOpen={onOpen}
        onSkip={onSkip}
      />
    );
  }
  const Component = entry.Component;
  const c = design.palette;
  return (
    <OpeningShell
      kind={kind}
      background={entry.background(c)}
      ink={entry.ink(c)}
      contained={contained}
      interactive={interactive}
      paused={paused}
      onDone={onOpen}
      onSkip={onSkip ?? onOpen}
      hint={interactive && !paused ? hint : ""}
      badge={badgeText || design.name}
      {...(entry.grain !== undefined ? { grain: entry.grain } : {})}
      {...(entry.sprinkles !== 0 && !calm ? { sprinkles: set, sprinkleOpacity: entry.sprinkles ?? 0.4 } : {})}
    >
      {({ hostRef, open, reduced }) => (
        <Component
          kind={kind}
          design={design}
          palette={palette}
          recipient={recipient}
          greeting={introText?.trim() || `For ${recipient}`}
          badge={badgeText || design.name}
          buttonText={buttonText || entry.button}
          character={cast.character}
          accessory={cast.accessory}
          iconSet={set}
          contributors={contributors}
          age={age ?? null}
          interactive={interactive}
          paused={paused}
          autoplay={autoplay}
          reduced={reduced}
          onOpen={open}
          hostRef={hostRef}
          setHint={setHint}
        />
      )}
    </OpeningShell>
  );
}
