/**
 * Wax Seal's opening: "for ana" over an envelope sealed in wax. Tap it and the seal
 * lifts away, the flap folds back and the card slides up ("you're invited to / a
 * little shower / 11.17.26"), then the page fades in underneath.
 *
 * The creator sets the seal's initial, the "for" line, the card's line and the date
 * (intro_settings.seal, src/lib/waxSeal.ts). Reduced motion skips straight to the gift.
 * Runs inside OpeningShell (Skip, sound, grain); the shell's own badge and hint are off,
 * the envelope says what to do itself.
 */
import "@/styles/bodies/waxseal-opening.css";
import { useEffect, useRef, useState } from "react";
import { OpeningShell } from "@/themes/_shared/opening";
import { loadFont } from "@/themes/_shared/design";
import { buzz, foley } from "@/lib/play";
import {
  WAX_FONT_QUERY,
  WAX_FONTS,
  cardWords,
  sealInitial,
  shortDate,
  type SealSettings,
} from "@/lib/waxSeal";

/** Loads Sacramento, Instrument Serif and DM Mono once (shared with the body). */
export function loadWaxFonts() {
  loadFont({ family: WAX_FONTS.serif, source: "google", query: WAX_FONT_QUERY }, "high");
}

export const waxSealBackground: React.CSSProperties = {
  background: "radial-gradient(70% 60% at 50% 45%, #3a2a23, #261a17 60%, #160f0d)",
};

export function WaxSealOpening({
  recipient,
  occasion,
  seal,
  contained,
  interactive,
  paused,
  autoplay,
  onOpen,
  onSkip,
}: {
  recipient: string;
  occasion?: string | null | undefined;
  seal?: SealSettings | undefined;
  contained: boolean;
  interactive: boolean;
  paused: boolean;
  autoplay: boolean;
  onOpen: () => void;
  onSkip?: (() => void) | undefined;
}) {
  useEffect(() => loadWaxFonts(), []);
  return (
    <OpeningShell
      kind="default"
      background={waxSealBackground}
      ink="#efe9e1"
      contained={contained}
      interactive={interactive}
      paused={paused}
      onDone={onOpen}
      onSkip={onSkip ?? onOpen}
      hint=""
      badge=""
      grain={0.16}
      reveal="fade"
    >
      {({ open, reduced }) => (
        <Envelope
          recipient={recipient}
          occasion={occasion}
          seal={seal}
          interactive={interactive}
          paused={paused}
          autoplay={autoplay}
          reduced={reduced}
          live={interactive && !contained && !paused}
          onDone={open}
        />
      )}
    </OpeningShell>
  );
}

function Envelope({
  recipient,
  occasion,
  seal,
  interactive,
  paused,
  autoplay,
  reduced,
  live,
  onDone,
}: {
  recipient: string;
  occasion?: string | null | undefined;
  seal?: SealSettings | undefined;
  interactive: boolean;
  paused: boolean;
  autoplay: boolean;
  reduced: boolean;
  /** The real gift page (not a preview): reduced motion goes straight to the gift. */
  live: boolean;
  onDone: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<number | null>(null);
  const name = recipient === "you" ? "" : recipient;
  const words = cardWords(occasion, name);
  const forLine = seal?.for_line?.trim() || (name ? `for ${name.toLocaleLowerCase()}` : "for you");
  const cardLine = seal?.card_line?.trim() || words.line;
  const date = shortDate(seal?.date);

  function tap() {
    if (opened || paused) return;
    setOpened(true);
    if (interactive) {
      foley("paper");
      buzz(10);
    }
    timer.current = window.setTimeout(onDone, reduced ? 150 : 2400);
  }

  useEffect(() => () => void (timer.current && window.clearTimeout(timer.current)), []);

  // Reduced motion on the real gift: no envelope, straight to the page.
  useEffect(() => {
    if (reduced && live) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, live]);

  // Previews open by themselves.
  useEffect(() => {
    if (!autoplay || paused) return;
    const t = window.setTimeout(tap, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, paused]);

  // Escape opens it too, like the reference.
  useEffect(() => {
    if (!interactive || paused) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && tap();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, paused, opened]);

  return (
    <div
      className={`wso ${opened ? "is-open" : ""} ${paused || reduced ? "is-still" : ""}`}
      onClick={tap}
      style={
        {
          "--wso-script": WAX_FONTS.script,
          "--wso-serif": WAX_FONTS.serif,
          "--wso-mono": WAX_FONTS.mono,
        } as React.CSSProperties
      }
    >
      <p className="wso-for">{forLine}</p>
      <button
        type="button"
        className="wso-env"
        aria-label="open the invitation"
        tabIndex={interactive && !paused ? 0 : -1}
        onClick={(e) => {
          e.stopPropagation();
          tap();
        }}
      >
        <span className="wso-back" aria-hidden="true" />
        <span className="wso-card" aria-hidden="true">
          <small>{words.kicker}</small>
          <b>{cardLine}</b>
          {date ? <small>{date}</small> : null}
        </span>
        <span className="wso-pocket" aria-hidden="true" />
        <span className="wso-flap" aria-hidden="true" />
        <span className="wso-seal" aria-hidden="true">
          {sealInitial(seal, name)}
        </span>
      </button>
      <p className="wso-tap">tap to open</p>
    </div>
  );
}
