import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import type { Palette } from "@/lib/themes";
import type { ThemeKind } from "@/lib/themeKind";
import { reducedMotion, useSound } from "@/lib/play";
import { designFor, loadThemeFonts, themeFontVars, type ThemeDesign } from "@/themes/_shared/design";
import { Grain, ParallaxRoot, SPRING } from "@/themes/_shared/stage";
import type { AccessoryId, CharacterSetting } from "@/themes/_shared/cast/types";
import type { IconSet } from "@/themes/_shared/iconSets";
import { SprinkleField } from "@/themes/_shared/Sprinkles";

export type OpeningProps = {
  kind: ThemeKind;
  design: ThemeDesign;
  /** The gift's own palette (the opening's materials come from the design). */
  palette: Palette;
  recipient: string;
  greeting: string;
  badge: string;
  /** Label for the plain button that does the same as the gesture. */
  buttonText: string;
  character: CharacterSetting;
  accessory: AccessoryId | null;
  iconSet: IconSet;
  /** Friends' names, for stamps, sparks and tags. */
  contributors: string[];
  interactive: boolean;
  /** Rest on the first frame (a gallery card that isn't playing). */
  paused: boolean;
  /** Previews: perform the gesture by itself, then open. */
  autoplay: boolean;
  reduced: boolean;
  /** The object has opened: the shell fades and the gift takes over. */
  onOpen: () => void;
  /** Positioned host for particle bursts (the whole stage). */
  hostRef: React.RefObject<HTMLDivElement | null>;
  /** Live hint text under the object. */
  setHint: (hint: string) => void;
};

/** Every theme's object gets these props. */
export type OpeningComponent = (props: OpeningProps) => React.ReactNode;

const OpeningContext = createContext<{ design: ThemeDesign } | null>(null);
export const useOpeningDesign = () => useContext(OpeningContext)?.design ?? designFor("default");

/**
 * The stage around a theme's object: full-bleed background, grain, parallax,
 * the sound toggle, the greeting line, a live hint and "Skip". When the object
 * calls onOpen, the stage settles away and the gift takes over.
 */
export function OpeningShell({
  kind,
  background,
  ink,
  contained,
  interactive,
  paused,
  onDone,
  onSkip,
  children,
  hint,
  badge,
  hideChrome = false,
  grain = 0.14,
  sprinkles,
  sprinkleOpacity = 0.4,
}: {
  kind: ThemeKind;
  background: React.CSSProperties;
  ink: string;
  contained: boolean;
  interactive: boolean;
  paused: boolean;
  onDone: () => void;
  onSkip?: (() => void) | undefined;
  children: (args: { hostRef: React.RefObject<HTMLDivElement | null>; open: () => void; opening: boolean; reduced: boolean }) => React.ReactNode;
  hint: string;
  badge?: string;
  hideChrome?: boolean;
  grain?: number;
  /** The gift's icon set, drifting in the background. */
  sprinkles?: IconSet;
  sprinkleOpacity?: number;
}) {
  const design = designFor(kind);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [opening, setOpening] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [sound, setSound] = useSound();
  useEffect(() => {
    setReduced(reducedMotion());
    loadThemeFonts(kind);
  }, [kind]);

  function open() {
    if (opening) return;
    setOpening(true);
    window.setTimeout(onDone, reduced ? 300 : 900);
  }

  return (
    <OpeningContext.Provider value={{ design }}>
      <motion.div
        ref={hostRef}
        className={`jb-opening ${contained ? "absolute" : "fixed"} inset-0 z-[60] overflow-hidden select-none [container:gift/inline-size] [-webkit-touch-callout:none]`}
        style={{ ...(background as object), ...(themeFontVars(kind) as object), color: ink, fontFamily: "var(--jb-text)" }}
        initial={false}
        animate={{ opacity: opening ? 0 : 1, scale: opening && !reduced ? 1.04 : 1 }}
        transition={{ ...SPRING.soft, opacity: { duration: 0.6, delay: opening ? 0.25 : 0 } }}
        data-paused={paused ? "" : undefined}
      >
        {sprinkles ? <SprinkleField set={sprinkles} count={14} opacity={sprinkleOpacity} seed={kind.length} /> : null}
        <ParallaxRoot enabled={interactive && !paused} className="absolute inset-0 grid place-items-center [perspective:1200px]">
          {children({ hostRef, open, opening, reduced })}
        </ParallaxRoot>
        <Grain opacity={grain} />

        {!hideChrome ? (
          <>
            {badge ? (
              <motion.p
                className="pointer-events-none absolute inset-x-0 top-[max(18px,5cqi)] z-[45] px-14 text-center text-[11px] font-medium tracking-[0.3em] uppercase opacity-75"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 0.75, y: 0 }}
                transition={{ ...SPRING.soft, delay: 0.3 }}
              >
                {badge}
              </motion.p>
            ) : null}
            {interactive && !paused ? (
              <button
                type="button"
                onClick={() => setSound(!sound)}
                aria-pressed={sound}
                aria-label={sound ? "Sound is on" : "Sound is off"}
                title={sound ? "Sound is on" : "Turn on sound"}
                className="absolute top-3 right-3 z-[46] grid size-10 place-items-center rounded-full outline-none backdrop-blur-md transition-transform focus-visible:ring-4 focus-visible:ring-white/60 active:scale-90"
                style={{ background: "rgba(255,255,255,.18)", boxShadow: `inset 0 0 0 1px ${ink}26`, color: ink }}
              >
                {sound ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
              </button>
            ) : null}
            <div className="pointer-events-none absolute inset-x-0 bottom-[max(14px,4cqi)] z-[45] flex flex-col items-center gap-1.5 px-6 text-center">
              <AnimatePresence mode="wait">
                {!opening && hint ? (
                  <motion.p
                    key={hint}
                    aria-live="polite"
                    className="text-[13px] font-medium"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 0.85, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={SPRING.soft}
                  >
                    {hint}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              {interactive && !paused && onSkip ? (
                <button
                  type="button"
                  onClick={onSkip}
                  className="pointer-events-auto min-h-8 px-2 text-xs underline underline-offset-4 opacity-70 outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-current"
                >
                  Skip intro
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </motion.div>
    </OpeningContext.Provider>
  );
}

/** The greeting, set in the theme's display face with soft optical sizing. */
export function Greeting({ text, className = "", style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={`block leading-[0.95] tracking-[-0.02em] [overflow-wrap:anywhere] ${className}`}
      style={{ fontFamily: "var(--jb-display)", fontVariationSettings: '"opsz" 144, "SOFT" 100', ...style }}
    >
      {text}
    </span>
  );
}
