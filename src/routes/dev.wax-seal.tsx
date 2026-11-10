import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { FormatView } from "@/components/formats/FormatView";
import { GiftIntro } from "@/components/GiftIntro";
import { CHAI_SHOWER } from "@/lib/demo/chaiShower";

/**
 * The Wax Seal test gift (Chai's shower), opening and all, the way a recipient sees it.
 * Only locally and on Vercel previews: it has real names and a real place in it.
 * /dev/wax-seal            the envelope, then the gift
 * /dev/wax-seal?open=1     straight to the gift
 * /dev/wax-seal?empty=1    no notes yet: the samples a new gift shows
 */
export const Route = createFileRoute("/dev/wax-seal")({
  head: () => ({ meta: [NOINDEX, { title: "Wax Seal test gift" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    open: s["open"] === true || s["open"] === 1 || s["open"] === "1",
    empty: s["empty"] === true || s["empty"] === 1 || s["empty"] === "1",
  }),
  component: DevWaxSeal,
});

const allowed = () =>
  import.meta.env.DEV || (import.meta.env["VITE_VERCEL_ENV"] as string | undefined) === "preview";

function DevWaxSeal() {
  const { open, empty } = Route.useSearch();
  const [opened, setOpened] = useState(open);
  if (!allowed()) return null;
  const g = CHAI_SHOWER;
  return (
    <div className="min-h-screen" style={{ background: g.palette.background }}>
      <FormatView
        site={g.site}
        theme={null}
        palette={g.palette}
        modules={g.modules}
        contributions={empty ? [] : g.notes}
        sample={empty}
        showShare={false}
      />
      {!opened ? (
        <GiftIntro
          style="invitation"
          palette={g.palette}
          fonts={{ heading: "serif", body: "sans-serif" }}
          backgroundStyle="paper"
          recipientName={g.site.custom_text.recipient_name}
          settings={g.site.intro_settings}
          giftStyle={g.site.style}
          occasion={g.site.occasion}
          onOpen={() => setOpened(true)}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            window.scrollTo(0, 0);
            setOpened(false);
          }}
          className="fixed right-3 bottom-3 z-[90] rounded-full bg-[#efe9e1] px-4 py-2 font-mono text-xs text-[#261a17] shadow-lg"
        >
          open the envelope again
        </button>
      )}
    </div>
  );
}
