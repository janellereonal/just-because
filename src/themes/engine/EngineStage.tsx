/**
 * Runs an engine theme: the shared opening shell (background, grain, sound
 * toggle, hint, Skip), the theme's fonts, its gesture set up from the config,
 * and its object, loaded on demand. Every gesture also gets the plain button.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { animate } from "motion/react";
import { OpeningShell } from "@/themes/_shared/opening";
import { FallbackButton } from "@/themes/_shared/stage";
import { loadFont } from "@/themes/_shared/design";
import type { IconSet } from "@/themes/_shared/iconSets";
import { t } from "@/i18n";
import { useGesture } from "./gestures";
import { resolveSlots, type SlotInput } from "./slots";
import { SOUND_PACKS } from "./sound";
import type { EngineObject, ThemeDefinition } from "./define";

const loaded = new Map<string, React.LazyExoticComponent<EngineObject>>();
function objectFor(def: ThemeDefinition) {
  let c = loaded.get(def.id);
  if (!c) {
    c = lazy(def.load);
    loaded.set(def.id, c);
  }
  return c;
}

export type EngineStageProps = {
  theme: ThemeDefinition;
  slots: SlotInput;
  greeting?: string;
  badge?: string;
  buttonText?: string;
  icons?: IconSet | null;
  contributors?: string[];
  contained?: boolean;
  interactive?: boolean;
  paused?: boolean;
  /** Previews: do the gesture by itself, then open. */
  autoplay?: boolean;
  onOpen: () => void;
  onSkip?: () => void;
};

export function EngineStage(p: EngineStageProps) {
  const def = p.theme;
  const interactive = p.interactive ?? true;
  const paused = p.paused ?? false;
  const slots = useMemo(() => resolveSlots(p.slots, { accent: def.palette.accent, accent2: def.palette.accent2 }), [p.slots, def]);
  const [hint, setHint] = useState("");
  useEffect(() => {
    loadFont(def.fonts.display, "high");
    loadFont(def.fonts.text, "low");
  }, [def]);

  return (
    <OpeningShell
      kind="default"
      background={{ background: def.palette.background }}
      ink={def.palette.ink}
      contained={p.contained ?? false}
      interactive={interactive}
      paused={paused}
      onDone={p.onOpen}
      onSkip={p.onSkip}
      hint={hint}
      badge={p.badge ?? ""}
      {...(p.icons ? { sprinkles: p.icons } : {})}
    >
      {({ hostRef, open, reduced }) => (
        <EngineBody
          def={def}
          slots={slots}
          greeting={p.greeting ?? ""}
          buttonText={p.buttonText ?? t("opening.open")}
          icons={p.icons ?? null}
          contributors={p.contributors ?? []}
          interactive={interactive}
          paused={paused}
          autoplay={p.autoplay ?? false}
          reduced={reduced}
          hostRef={hostRef}
          setHint={setHint}
          open={open}
        />
      )}
    </OpeningShell>
  );
}

function EngineBody(b: {
  def: ThemeDefinition;
  slots: ReturnType<typeof resolveSlots>;
  greeting: string;
  buttonText: string;
  icons: IconSet | null;
  contributors: string[];
  interactive: boolean;
  paused: boolean;
  autoplay: boolean;
  reduced: boolean;
  hostRef: React.RefObject<HTMLDivElement | null>;
  setHint: (h: string) => void;
  open: () => void;
}) {
  const { def } = b;
  const pack = SOUND_PACKS[def.sound];
  const gesture = useGesture(def.gesture, {
    ...def.gestureOptions,
    sound: def.gestureOptions?.sound ?? { tick: pack.tick, done: pack.done },
    enabled: b.interactive && !b.paused,
    // A beat after the payoff, so it can be seen and heard before the gift takes over.
    onDone: () => window.setTimeout(b.open, b.reduced ? 250 : 900),
  });

  useEffect(() => {
    b.setHint(gesture.done ? "" : def.hint ? t(def.hint) : gesture.hint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gesture.done, gesture.hint]);

  // Previews perform the gesture by themselves.
  useEffect(() => {
    if (!b.autoplay || b.paused) return;
    const timer = window.setTimeout(() => {
      void animate(gesture.progress, 0.9, { duration: 1.4, ease: [0.4, 0, 0.2, 1] }).then(() => gesture.complete());
    }, 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.autoplay, b.paused]);

  const Obj = objectFor(def);
  return (
    <div
      className="relative flex size-full flex-col items-center justify-center pt-[clamp(44px,11cqi,72px)] pb-[clamp(96px,22cqi,120px)]"
      style={{ ["--jb-display" as string]: def.fonts.display.family, ["--jb-text" as string]: def.fonts.text.family, fontFamily: "var(--jb-text)" } as React.CSSProperties}
    >
      <Suspense fallback={null}>
        <Obj
          theme={def}
          slots={b.slots}
          palette={def.palette}
          gesture={gesture}
          greeting={b.greeting}
          icons={b.icons}
          contributors={b.contributors}
          interactive={b.interactive}
          paused={b.paused}
          autoplay={b.autoplay}
          reduced={b.reduced}
          hostRef={b.hostRef}
          setHint={b.setHint}
        />
      </Suspense>
      <div className="relative z-[45] mt-4 h-11">
        <FallbackButton onClick={gesture.complete} color={def.palette.ink} ink={def.palette.ink} hidden={gesture.done || !b.interactive || b.paused}>
          {b.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}
