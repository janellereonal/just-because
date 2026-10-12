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
} from "@/lib/gift";
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

  if (isLoading || (!!site && (!themeReady || !skipChecked))) {
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
  if (site.status !== "published") {
    return (
      <PageNotFound
        title="This gift isn't live yet"
        message="Check back once the organiser publishes it."
        showHeader={false}
      />
    );
  }

  const palette = resolvePalette(theme, site.custom_colors);
  const fonts = FONT_PAIRINGS[site.font_choice] ?? FONT_PAIRINGS.romantic;

  function replayIntro() {
    clearIntroSkip(site!.id);
    setOpened(false);
  }

  return (
    <>
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

export default PublishedPage;
