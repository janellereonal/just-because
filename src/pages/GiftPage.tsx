import { Suspense, lazy, useEffect, useState } from "react";
import {useParams} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GiftSiteView } from "@/components/GiftSiteView";
import { ComicIssueView } from "@/components/ComicIssueView";
import { introStyleForTheme } from "@/lib/intro";
import { PageError, PageLoading, PageNotFound } from "@/components/PageStates";

// The opening animation is only needed the first time a gift is viewed.
const GiftIntro = lazy(() =>
  import("@/components/GiftIntro").then((m) => ({ default: m.GiftIntro })),
);
import {
  FONT_PAIRINGS,
  fetchCalendarEntries,
  fetchContributions,
  fetchModules,
  fetchSiteBySlug,
  fetchTheme,
  fetchPublicTreeOrnaments,
  resolvePalette,
  isGiftEnded,
  isGiftOpen,
} from "@/lib/gift";
import { getMe } from "@/lib/api";
import Bo from "@/components/Bo";
import { toast } from "sonner";
import { clearIntroSkip, hasSkippedIntro, rememberIntroSkip } from "@/lib/introSkip";


function PublishedPage() {
  const { slug } = useParams({ from: "/g/$slug" });
  const [opened, setOpened] = useState(false);
  // Don't show the reveal until we know this device didn't already skip it.
  const [skipChecked, setSkipChecked] = useState(false);
  const { data: site, isLoading, error, refetch } = useQuery({
    queryKey: ["site-slug", slug],
    queryFn: () => fetchSiteBySlug(slug),
  });
  const { data: me, isFetched: meReady } = useQuery({ queryKey: ["me"], queryFn: () => getMe() });
  const { data: theme = null, isFetched: themeReady } = useQuery({
    queryKey: ["theme", site?.theme_id],
    queryFn: () => fetchTheme(site?.theme_id ?? null),
    enabled: !!site,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", site?.id],
    queryFn: () => fetchModules(site!.id),
    enabled: !!site,
  });
  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", site?.id, "approved"],
    queryFn: () => fetchContributions(site!.id, true),
    enabled: !!site,
  });

  const { data: calendarEntries = [] } = useQuery({
    queryKey: ["calendar", site?.id],
    queryFn: () => fetchCalendarEntries(site!.id),
    enabled: !!site,
  });
  const { data: treeOrnaments = [] } = useQuery({
    queryKey: ["tree-ornaments", site?.id],
    queryFn: () => fetchPublicTreeOrnaments(site!.id),
    enabled: !!site,
  });

  useEffect(() => {
    if (!site) return;
    if (hasSkippedIntro(site.id)) setOpened(true);
    setSkipChecked(true);
  }, [site?.id]);

  if (isLoading || !meReady || (!!site && (!themeReady || !skipChecked))) {
    return <PageLoading label="Opening your gift…" />;
  }
  if (error) {
    return (
      <PageError
        message="We couldn't open this gift just now. Please try again."
        onRetry={() => void refetch()}
        showHeader={false}
      />
    );
  }
  if (!site) {
    return (
      <PageNotFound
        message="This gift link doesn't lead anywhere. It may be old, or the gift may have been removed."
        showHeader={false}
      />
    );
  }
  const isOwner = !!me && (me.id === site.creator_id || me.isAdmin);
  if (isGiftEnded(site) && site.status === "published") {
    return <GiftEndedPage isOwner={isOwner} siteId={site.id} />;
  }
  if (!isGiftOpen(site) && !isOwner) {
    return (
      <PageNotFound
        title="This gift isn't open yet"
        message="The person putting it together hasn't sent it yet. Check back once they do."
        actionLabel="What's Just Because?"
        actionTo="/"
        showHeader={false}
      />
    );
  }
  const previewing = !isGiftOpen(site);

  const palette = resolvePalette(theme, site.custom_colors);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;

  function replayIntro() {
    clearIntroSkip(site!.id);
    setOpened(false);
  }

  return (
    <>
      {previewing ? (
        <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-3 bg-ink px-4 py-2 text-center text-xs text-cream">
          <span>Preview. Only you can see this until the gift is sent.</span>
          <a href={`/sites/${site.id}`} className="underline underline-offset-2">
            Back to the editor
          </a>
        </div>
      ) : null}
      {!opened && site.format !== "comic" ? (
        <Suspense fallback={<PageLoading label="Opening your gift…" />}>
        <GiftIntro
          style={introStyleForTheme(theme?.name)}
          palette={palette}
          fonts={fonts}
          backgroundStyle={site.background_style ?? "paper"}
          recipientName={site.custom_text.recipient_name}
          introText={site.intro_text ?? undefined}
          onOpen={() => setOpened(true)}
          onSkip={() => {
            rememberIntroSkip(site.id);
            setOpened(true);
          }}
        />
        </Suspense>
      ) : site.format === "comic" ? (
        <ComicIssueView
          site={site}
          modules={modules}
          contributions={[...contributions.filter((item) => item.module_type !== "tree"), ...treeOrnaments]}
          calendarEntries={calendarEntries}
          palette={palette}
          showCover={!opened}
          showShare
          onReplayCover={() => setOpened(false)}
        />
      ) : (
        <GiftSiteView
          site={site}
          theme={theme}
          modules={modules}
          contributions={[...contributions.filter((item) => item.module_type !== "tree"), ...treeOrnaments]}
          calendarEntries={calendarEntries}
          showShare
          onReplayIntro={replayIntro}
        />
      )}
    </>
  );
}

/** A gift whose plan ran out. The link still lands somewhere kind. */
function GiftEndedPage({ isOwner, siteId }: { isOwner: boolean; siteId: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <div className="max-w-md">
        <Bo pose="idle" size={150} title="Bo" />
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">This gift has ended</h1>
        <p className="mt-2 text-muted text-pretty">
          {isOwner
            ? "Your plan's time is up, so the link now shows this page. Everything friends added is still saved."
            : "It was open for a while, and now it's wrapped up for good. Thanks for stopping by."}
        </p>
        {isOwner ? (
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => toast("Extending a gift is coming soon.")}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-cream"
            >
              Extend this gift
            </button>
            <a href={`/sites/${siteId}`} className="rounded-full border border-line px-6 py-3 text-sm font-medium">
              Back to the editor
            </a>
          </div>
        ) : (
          <a href="/" className="mt-6 inline-block text-sm text-accent underline underline-offset-2">
            Make a gift of your own
          </a>
        )}
      </div>
    </div>
  );
}

export default PublishedPage;
