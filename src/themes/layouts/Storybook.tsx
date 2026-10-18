/**
 * STORYBOOK: the storybook itself, closed, exactly as its pages draw it: the
 * cover in the gift's accent with its framed title, the page edges, and under
 * the cover the dedication ("This book belongs to"). Gesture: open the cover
 * (drag it to the left, or tap). It swings open on the spine like a page turn
 * in the book, and the book carries on from the dedication.
 */
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import type { CharacterHandle } from "@/themes/_shared/cast/types";
import type { OpeningProps } from "@/themes/_shared/opening";
import type { Palette } from "@/lib/themes";
import { readableInk } from "@/lib/palettes";
import { FallbackButton, Layer, SPRING, useHaptics } from "@/themes/_shared/stage";
import { foley } from "@/lib/play";
import { live, pressable, useAutoplay, useHint, useOpenSequence } from "./kit";
import { Buddy } from "./buddy";

export function StorybookOpening(p: OpeningProps) {
  const h = useHaptics();
  const { background, primary, accent } = p.palette;
  const coverInk = readableInk(accent);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const cast = useRef<CharacterHandle | null>(null);
  const [open, setOpen] = useState(false);
  const angle = useMotionValue(0);
  // Like the book on a phone: once turned, the cover fades so the page reads clean.
  const coverOpacity = useTransform(angle, [0, -120, -170], [1, 1, 0]);
  useOpenSequence(p, open, pageRef, {
    hold: 2300,
    cast,
    colors: [accent, primary, "#FFD166", "#FFFFFF"],
  });
  useHint(p, "Open the cover to start the story", open);

  function openCover() {
    if (open || !live(p)) return;
    setOpen(true);
    foley("paper");
    h.thud();
    void animate(angle, -170, p.reduced ? { duration: 0 } : { ...SPRING.heavy, stiffness: 70 });
  }
  useAutoplay(p, [[900, openCover]]);

  const friends = p.contributors;

  return (
    <div
      className="sbk-root relative flex w-full flex-col items-center"
      style={
        {
          "--sbk-accent": accent,
          "--sbk-primary": primary,
          background: "transparent",
          color: readableInk(background),
          fontFamily: "var(--jb-text)",
        } as React.CSSProperties
      }
    >
      <Layer depth={8} className="relative" style={{ perspective: 2000 }}>
        <Buddy p={p} ref={cast} size={78} className="-right-[12%] -bottom-[6%]" />
        <div
          className="sbk-book"
          style={{ width: "min(74cqi, 340px, calc((100svh - 260px) * 0.723))", cursor: "default" }}
        >
          <div className="sbk-edges" />
          {/* The first page: the dedication. */}
          <div className="sbk-leaf" style={{ transition: "none" }}>
            <div ref={pageRef} className="sbk-front">
              <div className="sbk-page sbk-center">
                <p className="sbk-kicker" style={{ color: accent }}>
                  This book belongs to
                </p>
                <p className="sbk-name" style={{ fontFamily: "var(--jb-display)" }}>
                  {p.recipient}
                </p>
                <p className="sbk-body">Everyone who loves you wrote a page. Turn slowly.</p>
                {friends.length ? (
                  <p className="sbk-small">Written by {friends.join(", ")}</p>
                ) : null}
              </div>
            </div>
          </div>
          {/* The cover, hinged on the spine. */}
          <motion.div
            className="sbk-leaf touch-none outline-none"
            style={{ rotateY: angle, opacity: coverOpacity, transition: "none", cursor: "pointer" }}
            onPan={(_, info) => {
              if (open || !live(p)) return;
              angle.set(Math.max(-170, Math.min(0, info.offset.x * 0.9)));
            }}
            onPanEnd={(_, info) => {
              if (open || !live(p)) return;
              if (info.offset.x < -70) openCover();
              else void animate(angle, 0, SPRING.snappy);
            }}
            {...pressable(openCover, !open && live(p), "Open the book")}
          >
            <div className="sbk-front">
              <div className="sbk-cover" style={{ background: accent, color: coverInk }}>
                <span className="sbk-cover-frame" />
                <p className="sbk-cover-kicker">A storybook for</p>
                <h1 style={{ fontFamily: "var(--jb-display)" }}>{p.recipient}</h1>
                <p className="sbk-cover-sub">{p.greeting}</p>
                <span className="sbk-cover-emblem" aria-hidden="true">
                  ✦
                </span>
                <p className="sbk-cover-hint">Tap or drag the page to open</p>
              </div>
            </div>
            <div className="sbk-back" />
          </motion.div>
        </div>
      </Layer>

      <div className="mt-[min(10cqi,44px)] h-11">
        <FallbackButton
          onClick={openCover}
          color={readableInk(background)}
          ink={readableInk(background)}
          hidden={open || !live(p)}
        >
          {p.buttonText}
        </FallbackButton>
      </div>
    </div>
  );
}

/** The storybook's own room. */
export const storybookBackground = (palette: Palette): React.CSSProperties => ({
  background: `radial-gradient(120% 80% at 50% 0%, ${palette.background}, color-mix(in oklab, ${palette.primary} 22%, ${palette.background}))`,
});
