import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { FormatView } from "@/components/formats/FormatView";
import { PageNotFound } from "@/components/PageStates";
import { TactileOpening } from "@/themes/TactileOpening";
import { DEMO_GIFTS, demoAge, isDemoId } from "@/lib/demoGifts";
import { EXAMPLE_COPY, LANDING } from "@/copy/strings";
import { exampleShareTags } from "@/lib/share";

export const Route = createFileRoute("/example/$id")({
  // Posts link here, so the preview in Messenger or iMessage names the example and uses its picture.
  head: ({ params }) => {
    const demo = isDemoId(params.id) ? DEMO_GIFTS[params.id] : null;
    const title = demo ? EXAMPLE_COPY.shareTitle(demo.short) : EXAMPLE_COPY.fallbackTitle;
    return {
      meta: [
        { title },
        { name: "description", content: EXAMPLE_COPY.shareDescription },
        ...exampleShareTags(title, EXAMPLE_COPY.shareDescription, demo?.kind ?? "default"),
      ],
    };
  },
  // Unknown examples answer 404, with the same friendly page.
  loader: ({ params }) => {
    if (!isDemoId(params.id)) throw notFound();
  },
  notFoundComponent: () => <PageNotFound message="We don't have that example." />,
  component: ExamplePage,
});

/** A whole example gift: open it with your hands, then scroll the notes. */
function ExamplePage() {
  const { id } = Route.useParams();
  // ?open=1 skips straight to the gift (handy for links that should land on the notes).
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("open")) setOpened(true);
  }, []);
  if (!isDemoId(id)) return <PageNotFound message="We don't have that example." />;
  const g = DEMO_GIFTS[id];
  return (
    <div className="min-h-screen">
      <div className={`fixed inset-x-0 bottom-3 z-[70] flex justify-center px-3 transition-opacity duration-500 ${opened ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className="flex items-center gap-3 rounded-full bg-ink/90 py-1.5 pr-1.5 pl-4 text-sm text-cream shadow-lg backdrop-blur">
          <span>{LANDING.example.banner}</span>
          <Link to="/create" className="rounded-full bg-accent px-3.5 py-1.5 font-medium">
            {LANDING.example.cta}
          </Link>
        </div>
      </div>
      {!opened ? (
        <div className="fixed inset-0 z-[60] [container:gift/inline-size]">
          <TactileOpening
            kind={g.kind}
            palette={g.palette}
            recipientName={g.who}
            contributors={g.friends}
            age={demoAge(g)}
            contained
            onOpen={() => setOpened(true)}
            onSkip={() => setOpened(true)}
          />
        </div>
      ) : null}
      <FormatView
        site={g.site}
        theme={g.theme}
        palette={g.palette}
        modules={g.modules}
        contributions={g.notes}
        calendarEntries={g.calendar}
        onReplayIntro={() => setOpened(false)}
      />
    </div>
  );
}
