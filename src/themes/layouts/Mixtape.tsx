/**
 * MIXTAPE: the mixtape's own tape deck and cassette, in the gift's colors,
 * exactly as they look on the pages (same parts, same classes). The cassette
 * waits above the empty deck. Gesture: push it in (drag it down, or tap). It
 * clicks into the well, play goes down, the reels turn and the counter runs,
 * and Side A starts.
 */
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Play, SkipBack, SkipForward } from "lucide-react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { FallbackButton, SPRING, useHaptics } from "@/themes/_shared/stage";
import { foley } from "@/lib/play";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

export function MixtapeOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const deckRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [inDeck, setInDeck] = useState(false);
  const [count, setCount] = useState(0);
  const drop = useMotionValue(0); // 0 waiting above, 1 in the deck
  const y = useTransform(drop, [0, 1], ["-72%", "0%"]);
  const rotate = useTransform(drop, [0, 1], [-7, 0]);
  const scale = useTransform(drop, [0, 1], [1.04, 1]);
  const beat = useOpenSequence(p, inDeck, deckRef, {
    hold: 2400,
    cast,
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
  });
  const playing = beat >= 1;
  useHint(p, "Push the tape into the deck to play it", inDeck);

  // The counter runs once it plays.
  useEffect(() => {
    if (!playing || p.reduced) return;
    const t = window.setInterval(() => setCount((c) => c + 1), 120);
    return () => window.clearInterval(t);
  }, [playing, p.reduced]);

  function play() {
    if (inDeck || !live(p)) return;
    setInDeck(true);
    foley("thunk");
    h.thud();
    void animate(drop, 1, p.reduced ? { duration: 0 } : SPRING.snappy);
  }
  useAutoplay(p, [[900, play]]);

  return (
    <div
      className="mix-root relative flex w-full flex-col items-center"
      style={
        {
          "--mix-accent": accent,
          "--mix-primary": primary,
          "--mix-bg": background,
          background: "transparent",
          color: readableInk(background),
          fontFamily: "var(--jb-text)",
        } as React.CSSProperties
      }
    >
      <p className="mix-kicker">A mixtape for {p.recipient}</p>
      <div className="relative mt-[min(36cqi,160px)]" style={{ width: "min(88cqi, 400px)" }}>
        <Buddy p={p} ref={cast} size={76} className="-right-[4%] -bottom-[16%]" />
        <div ref={deckRef} className="mix-deck relative" style={{ marginTop: 0 }}>
          {/* The well the tape clicks into. */}
          <div className="relative" style={{ aspectRatio: "1.62" }}>
            <span
              className="absolute inset-0 rounded-[14px]"
              style={{
                background: "rgba(0,0,0,.35)",
                boxShadow: "inset 0 4px 12px rgba(0,0,0,.6)",
              }}
              aria-hidden
            />
            {/* The cassette. */}
            <motion.div
              className={`mix-tape absolute inset-0 cursor-pointer touch-none outline-none ${playing && !p.reduced ? "is-playing" : ""}`}
              data-side="A"
              style={{ y, rotate, scale, zIndex: 3, position: "absolute", inset: 0 }}
              onPan={(_, info) => {
                if (inDeck || !live(p)) return;
                drop.set(Math.max(0, Math.min(0.7, info.offset.y / 220)));
              }}
              onPanEnd={(_, info) => {
                if (inDeck || !live(p)) return;
                if (info.offset.y > 50) play();
                else void animate(drop, 0, SPRING.snappy);
              }}
              {...pressable(play, !inDeck && live(p), "Put the tape in and press play")}
            >
              <div className="mix-label">
                <span className="mix-side">A</span>
                <span className="mix-label-text">{p.greeting}</span>
                <span className="mix-label-lines" />
              </div>
              <div className="mix-window">
                {[0, 1].map((k) => (
                  <span
                    key={k}
                    className="mix-reel"
                    style={{ "--fill": k ? 0.3 : 0.7 } as React.CSSProperties}
                  >
                    <i />
                  </span>
                ))}
                <span className="mix-tape-ribbon" />
              </div>
              <span className="mix-screw mix-s1" />
              <span className="mix-screw mix-s2" />
              <span className="mix-screw mix-s3" />
              <span className="mix-screw mix-s4" />
            </motion.div>
          </div>

          <div className="mix-controls" aria-hidden>
            <button type="button" tabIndex={-1}>
              <SkipBack className="size-5" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="mix-play"
              onClick={play}
              style={{
                background: accent,
                color: readableInk(accent),
                ...(inDeck
                  ? { transform: "translateY(4px)", boxShadow: "0 1px 0 rgba(0,0,0,.3)" }
                  : {}),
              }}
            >
              <Play className="size-6" />
            </button>
            <button type="button" tabIndex={-1}>
              <SkipForward className="size-5" />
            </button>
            <span className="mix-counter">{String(Math.floor(count / 10)).padStart(3, "0")}</span>
          </div>
        </div>
      </div>

      <div className="mt-[min(8cqi,36px)] h-11">
        <FallbackButton
          onClick={play}
          color={readableInk(background)}
          ink={readableInk(background)}
          hidden={inDeck || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The mixtape's own room: its background, glowing in the gift's colors. */
export const mixtapeBackground = (palette: Palette): React.CSSProperties => ({
  background: `radial-gradient(120% 70% at 50% 0%, ${palette.background}, color-mix(in oklab, ${palette.primary} 30%, ${palette.background}))`,
});
