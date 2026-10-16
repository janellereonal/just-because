import { Suspense, lazy, useEffect, useState } from "react";
import { themeKindOf } from "@/lib/themeKind";
import {useParams} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FormatView } from "@/components/formats/FormatView";
import { formatInfo } from "@/lib/formats";
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
import { getMe, unlockGift } from "@/lib/api";
import Bo from "@/components/Bo";
import { ExtendDialog } from "@/components/PlanControls";
import { clearIntroSkip, hasSkippedIntro, rememberIntroSkip } from "@/lib/introSkip";
import { engineIntroProps, simbangVisible } from "@/lib/engineGift";
import { t } from "@/i18n";


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
  // Behind a password, nothing else loads until the server says this browser is unlocked.
  const locked = !!site && !site.unlocked;
  const { data: theme = null, isFetched: themeReady } = useQuery({
    queryKey: ["theme", site?.theme_id],
    queryFn: () => fetchTheme(site?.theme_id ?? null),
    enabled: !!site,
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", site?.id],
    queryFn: () => fetchModules(site!.id),
    enabled: !!site && !locked,
  });
  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", site?.id, "approved"],
    queryFn: () => fetchContributions(site!.id, true),
    enabled: !!site && !locked,
  });

  const { data: calendarEntries = [] } = useQuery({
    queryKey: ["calendar", site?.id],
    queryFn: () => fetchCalendarEntries(site!.id),
    enabled: !!site && !locked,
  });
  const { data: treeOrnaments = [] } = useQuery({
    queryKey: ["tree-ornaments", site?.id],
    queryFn: () => fetchPublicTreeOrnaments(site!.id),
    enabled: !!site && !locked,
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
  if (locked && isGiftOpen(site)) {
    return <PasswordGate slug={slug} recipient={site.custom_text.recipient_name} />;
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
  // Simbang Gabi (Parol Christmas): only tonight's notes and earlier are open.
  const simbang = simbangVisible(theme?.name, site, contributions);
  const shown = simbang.notes;

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
      {opened && simbang.night !== null && simbang.night < 9 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4">
          <p className="rounded-full bg-ink/85 px-4 py-2 text-center text-xs text-cream shadow-lg backdrop-blur">
            {simbang.night === 0 ? t("theme.parol.before") : `${t("theme.parol.night", { n: simbang.night })}. ${t("theme.parol.next")}`}
          </p>
        </div>
      ) : null}
      {!opened && formatInfo(site.format).usesIntro ? (
        <Suspense fallback={<PageLoading label="Opening your gift…" />}>
        {/* The gift waits underneath, so the opening can reveal it through the object. */}
        <div aria-hidden="true" inert className="pointer-events-none fixed inset-0 overflow-hidden">
          <FormatView
            site={site}
            theme={theme}
            palette={palette}
            modules={modules}
            contributions={[...shown.filter((item) => item.module_type !== "tree"), ...treeOrnaments]}
            calendarEntries={calendarEntries}
          />
        </div>
        <GiftIntro
          style={introStyleForTheme(theme?.name)}
          kind={themeKindOf(theme)}
          palette={palette}
          fonts={fonts}
          backgroundStyle={site.background_style ?? "paper"}
          recipientName={site.custom_text.recipient_name}
          introText={site.intro_text ?? undefined}
          settings={site.intro_settings}
          character={site.character}
          iconSet={site.icon_set}
          contributors={[...new Set(contributions.map((c) => c.author_name.trim()).filter(Boolean))]}
          {...engineIntroProps(theme?.name, site, contributions)}
          onOpen={() => setOpened(true)}
          onSkip={() => {
            rememberIntroSkip(site.id);
            setOpened(true);
          }}
        />
        </Suspense>
      ) : (
        <FormatView
          site={site}
          theme={theme}
          palette={palette}
          modules={modules}
          contributions={[...shown.filter((item) => item.module_type !== "tree"), ...treeOrnaments]}
          calendarEntries={calendarEntries}
          showShare
          showCover={!opened}
          onReplayCover={() => setOpened(false)}
          onReplayIntro={replayIntro}
        />
      )}
    </>
  );
}

/** Shown before a password-protected gift. The notes only load after the server accepts the password. */
function PasswordGate({ slug, recipient }: { slug: string; recipient?: string | undefined }) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await unlockGift({ data: { slug, password } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["site-slug", slug] });
    } catch {
      setError("We couldn't check that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <form onSubmit={submit} className="w-full max-w-sm">
        <Bo pose="idle" size={140} title="Bo" />
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">
          {recipient ? `A gift for ${recipient}` : "A gift for you"}
        </h1>
        <p className="mt-2 text-muted text-pretty">
          This one has a password. Whoever sent you the link will know it.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="off"
          autoFocus
          maxLength={200}
          aria-label="Gift password"
          className="mt-6 w-full rounded-full border border-line bg-cream px-5 py-3 text-center text-sm outline-none focus:border-accent"
        />
        {error ? (
          <p role="alert" className="mt-2 text-sm text-accent">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !password.trim()}
          className="mt-4 w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-cream disabled:opacity-60"
        >
          {busy ? "Checking…" : "Open the gift"}
        </button>
      </form>
    </div>
  );
}

/** A gift whose plan ran out. The link still lands somewhere kind. */
function GiftEndedPage({ isOwner, siteId }: { isOwner: boolean; siteId: string }) {
  const [extendOpen, setExtendOpen] = useState(false);
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
              onClick={() => setExtendOpen(true)}
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
        {isOwner ? <ExtendDialog siteId={siteId} open={extendOpen} onOpenChange={setExtendOpen} /> : null}
      </div>
    </div>
  );
}

export default PublishedPage;
