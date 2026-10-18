/**
 * Shared pieces for the layout styles' openings (Scrapbook, Storybook, Comic...).
 * Every opening: one object, one gesture, a plain button that does the same,
 * a short payoff, then `onOpen` hands over to the gift. Previews (`autoplay`)
 * perform the gesture by themselves. Reduced motion skips the in-between frames.
 */
import { useEffect, useRef } from "react";
import type { OpeningProps } from "@/themes/_shared/opening";
import { readableInk } from "@/lib/palettes";
import { useBeats, useHaptics } from "@/themes/_shared/stage";
import { burstSet } from "@/themes/_shared/Sprinkles";
import { melody } from "@/lib/play";
import type { CharacterHandle } from "@/themes/_shared/cast/types";

/** The gift's own colors, plus readable ink on each. Layout styles take the gift's look. */
export function giftColors(p: OpeningProps) {
  const { background, primary, accent } = p.palette;
  return {
    bg: background,
    primary,
    accent,
    onAccent: readableInk(accent),
    onPrimary: readableInk(primary),
    ink: readableInk(background),
  };
}

/**
 * After the object is open: a burst at `burstFrom`, a little chime, the buddy
 * cheers, then hand over. Beats: 0 burst · 700 success · `hold` open.
 */
export function useOpenSequence(
  p: OpeningProps,
  open: boolean,
  burstFrom: React.RefObject<HTMLElement | null>,
  {
    hold = 1500,
    colors,
    cast,
  }: {
    hold?: number;
    /** The burst's colors (the style's own pastels). */
    colors?: string[];
    cast?: React.RefObject<CharacterHandle | null>;
  } = {},
) {
  const h = useHaptics();
  const beat = useBeats(open, [0, 700, hold]);
  const c = giftColors(p);
  useEffect(() => {
    if (beat === 1) {
      melody([523, 659, 784, 1047], 0.12, "sine", 0.05);
      cast?.current?.celebrate();
      const r = burstFrom.current?.getBoundingClientRect();
      if (r && !p.reduced)
        burstSet(p.hostRef.current, r.left + r.width / 2, r.top + r.height * 0.4, p.iconSet, {
          colors: colors ?? [c.accent, c.primary, "#FFD166", "#FFFFFF"],
          count: 18,
          spread: 1.2,
          up: true,
          gravity: 0.6,
        });
    }
    if (beat === 2) h.success();
    if (beat === 3) p.onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);
  return beat;
}

/** Previews: run each step after its delay (ms from mount). */
export function useAutoplay(p: OpeningProps, steps: [number, () => void][]) {
  const latest = useRef(steps);
  latest.current = steps;
  useEffect(() => {
    if (!p.autoplay || p.paused) return;
    const timers = latest.current.map(([ms], i) =>
      window.setTimeout(() => latest.current[i]![1](), ms),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [p.autoplay, p.paused]);
}

/** Can the visitor act right now? */
export const live = (p: OpeningProps) => p.interactive && !p.paused;

/** Keyboard support for an object that acts as a button. */
export function pressable(onPress: () => void, enabled: boolean, label: string) {
  return {
    role: "button" as const,
    tabIndex: enabled ? 0 : -1,
    "aria-label": label,
    onClick: onPress,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPress();
      }
    },
  };
}

/** Friends' names for a sign-off line: "Sofia, Noah and everyone". */
export function signoff(names: string[], max = 3) {
  if (!names.length) return "everyone who loves you";
  const shown = names.slice(0, max);
  return `${shown.join(", ")}${names.length > max ? " and everyone" : ""}`;
}

/** The line under the stage while the gift is still closed. */
export function useHint(p: OpeningProps, hint: string, done: boolean) {
  useEffect(() => {
    p.setHint(done ? "" : hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, hint]);
}
