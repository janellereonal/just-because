import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { OpeningShell } from "@/themes/_shared/opening";
import { castFor, designFor } from "@/themes/_shared/design";
import { resolveIconSet } from "@/themes/_shared/iconSets";
import { valentineBackground } from "@/themes/valentine/Opening";
import { LOVE_LETTER_DIRECTIONS } from "@/themes/valentine/LoveLetter";
import { FormatView } from "@/components/formats/FormatView";
import { DEMO_GIFTS } from "@/lib/demoGifts";
import type { Theme } from "@/lib/themes";

/**
 * Dev only: the three Love Letter directions, with the gift waiting underneath like the real page.
 * /dev/love-letter?d=a            interactive (a, b or c)
 * /dev/love-letter?d=b&auto=1     plays by itself (for recordings)
 * /dev/love-letter?d=c&name=Lou   another name (the crack, the monogram and the scatter change)
 */
export const Route = createFileRoute("/dev/love-letter")({
  head: () => ({ meta: [NOINDEX] }),
  validateSearch: (s: Record<string, unknown>) => ({
    d: (s["d"] === "b" || s["d"] === "c" ? s["d"] : "a") as "a" | "b" | "c",
    auto: s["auto"] === true || s["auto"] === 1 || s["auto"] === "1" || s["auto"] === "true",
    name: typeof s["name"] === "string" ? s["name"] : "Ana",
    /** Recordings: wait for window.__play() before playing by itself. */
    hold: s["hold"] === true || s["hold"] === 1 || s["hold"] === "1",
  }),
  component: DevLoveLetter,
});

const WAX = { background: "#F6EEE3", primary: "#B4335A", accent: "#5E1424" };
const THEME = { id: "dev-valentine", name: "Valentine's", category: "Romance" } as Theme;

function DevLoveLetter() {
  const { d, auto, name, hold } = Route.useSearch();
  const [go, setGo] = useState(!hold);
  useEffect(() => {
    (window as unknown as { __play?: () => void }).__play = () => setGo(true);
  }, []);
  const [opened, setOpened] = useState(false);
  const [round, setRound] = useState(0);
  const [hint, setHint] = useState("");
  const ana = DEMO_GIFTS.ana;
  const site = useMemo(
    () => ({ ...ana.site, format: "storybook" as const, style: "love-letter" as const, occasion: "anniversary" as const, custom_text: { ...ana.site.custom_text, heading: "", recipient_name: name } }),
    [ana.site, name],
  );
  const design = designFor("valentine");
  const cast = castFor("valentine", null, null);
  const icons = useMemo(() => resolveIconSet(cast.iconSet, { recipient: name, palette: WAX }), [cast.iconSet, name]);
  const dir = LOVE_LETTER_DIRECTIONS[d];
  const Component = dir.Component;
  useEffect(() => setOpened(false), [d, round]);
  if (!import.meta.env.DEV) return null;
  return (
    <div className="fixed inset-0 overflow-y-auto [container:gift/inline-size]" style={{ background: WAX.background }}>
      <div data-gift-underlay="">
        <FormatView site={site} theme={THEME} palette={WAX} modules={ana.modules} contributions={ana.notes} calendarEntries={ana.calendar} />
      </div>
      {!opened ? (
        <OpeningShell
          key={`${d}-${round}`}
          kind="valentine"
          background={valentineBackground(design.palette)}
          ink={design.palette.oxblood!}
          contained={false}
          interactive
          paused={false}
          onDone={() => setOpened(true)}
          onSkip={() => setOpened(true)}
          hint={hint}
          badge="Anniversary"
          reveal={dir.reveal}
        >
          {({ hostRef, open, reduced }) => (
            <Component
              kind="valentine"
              design={design}
              palette={WAX}
              recipient={name}
              greeting={`For ${name}`}
              badge="Anniversary"
              buttonText="Open the letter"
              character={cast.character}
              accessory={cast.accessory}
              iconSet={icons}
              contributors={["Mia", "Leo", "Priya", "Tom", "Sofia"]}
              interactive
              paused={false}
              autoplay={auto && go}
              reduced={reduced}
              onOpen={open}
              hostRef={hostRef}
              setHint={setHint}
            />
          )}
        </OpeningShell>
      ) : (
        <button type="button" onClick={() => setRound((n) => n + 1)} className="fixed right-3 bottom-3 z-[90] rounded-full bg-ink px-4 py-2 text-xs font-semibold text-cream">
          {dir.label} · play again
        </button>
      )}
    </div>
  );
}
