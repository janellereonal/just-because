import { createFileRoute, Link } from "@tanstack/react-router";
import { noteSummary, type NoteCounts } from "@/lib/noteCounts";
import { trackEvent } from "@/lib/track";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowUpRight, Link2, MoreHorizontal, PencilLine, Plus, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { deleteSite, listMySites } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { isGiftEnded, normalizeSite, type GiftSite } from "@/lib/gift";
import { getTier } from "@/config/pricing";
import { formatInfo } from "@/lib/formats";
import Bo from "@/components/Bo";
import { GiftCover } from "@/components/GiftCover";
import { fetchThemes, type Theme } from "@/lib/themes";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your gifts | Just Because" },
      { name: "description", content: "Every gift you're making or have sent." },
      { property: "og:title", content: "Your gifts | Just Because" },
      { property: "og:description", content: "Every gift you're making or have sent." },
    ],
  }),
  component: Dashboard,
});

function status(site: GiftSite) {
  if (isGiftEnded(site)) return { label: "Ended", tone: "bg-ink/8 text-ink/60" };
  if (site.status === "published") {
    const tier = getTier(site.tier);
    return { label: `Sent${tier ? ` · ${tier.name}` : ""}`, tone: "bg-mint text-ink" };
  }
  if (site.tier) return { label: "Paid, not sent yet", tone: "bg-butter text-ink" };
  return { label: "Collecting notes", tone: "bg-pink text-ink" };
}

function GiftCard({ site, index, theme, counts }: { site: GiftSite; index: number; theme: Theme | null; counts: NoteCounts | null }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Paid plans keep their gift (and its receipt). Legacy gifts never had an order.
  const paid = !!site.tier && site.tier !== "legacy";
  const s = status(site);
  const friendsLink =
    typeof window === "undefined"
      ? `/contribute/${site.slug}`
      : `${window.location.origin}/contribute/${site.slug}`;
  return (
    <article
      className="rise group card-paper flex flex-col overflow-hidden"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
    >
      <Link
        to="/sites/$id"
        params={{ id: site.id }}
        className="relative block h-44 overflow-hidden"
        aria-label={`Edit ${site.title}`}
      >
        <GiftCover site={site} theme={theme} className="absolute inset-0" />
        <span className="absolute top-3 right-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink backdrop-blur">
          {site.solo ? "Just me" : "Me and friends"} · {formatInfo(site.format).title}
        </span>
      </Link>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${s.tone}`}>{s.label}</span>
          <span className="font-mono text-[11px] text-muted">
            {new Date(site.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {counts ? <p className="-mt-2 text-sm text-muted">{noteSummary(counts)}</p> : null}
        <div className="mt-auto flex flex-wrap gap-2">
          <Link
            to="/sites/$id"
            params={{ id: site.id }}
            className="squish inline-flex min-h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-cream"
          >
            <PencilLine className="size-4" /> Edit
          </Link>
          {!site.solo && (site.status !== "published" || !isGiftEnded(site)) ? (
            <button
              type="button"
              onClick={() => {
                trackEvent("invite_shared", site.id, { channel: "dashboard" });
                void navigator.clipboard.writeText(friendsLink).then(
                  () => toast.success("Invite link copied"),
                  () => toast.error("Couldn't copy the link."),
                );
              }}
              className="squish inline-flex min-h-10 items-center gap-1.5 rounded-full bg-paper px-4 text-sm font-medium ring-1 ring-ink/10 hover:bg-pink/40"
            >
              <Link2 className="size-4" /> Invite link
            </button>
          ) : null}
          {site.status === "published" ? (
            <a
              href={`/g/${site.slug}`}
              className="squish inline-flex min-h-10 items-center gap-1.5 rounded-full bg-paper px-4 text-sm font-medium ring-1 ring-ink/10 hover:bg-pink/40"
            >
              <ArrowUpRight className="size-4" /> Open gift
            </a>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`More for ${site.title}`}
                className="squish ml-auto grid size-10 place-items-center rounded-full text-muted ring-1 ring-ink/10 hover:bg-pink/40 hover:text-ink"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {paid ? (
                <p className="px-2 py-1.5 text-xs text-muted">
                  This gift has a paid plan, so it stays. You can unpublish it from the editor.
                </p>
              ) : (
                <DropdownMenuItem className="text-[#B4322E] focus:text-[#B4322E]" onSelect={() => setConfirming(true)}>
                  <Trash2 /> Delete gift
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <AlertDialog open={confirming} onOpenChange={(open) => !deleting && setConfirming(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {site.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              Every note, photo and song in it goes too
              {site.solo ? "" : ", and the invite link stops working"}. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-[#B4322E] text-white hover:bg-[#9A2A27]"
              onClick={(e) => {
                e.preventDefault();
                setDeleting(true);
                deleteSite({ data: { id: site.id } })
                  .then(async () => {
                    toast.success("Gift deleted.");
                    setConfirming(false);
                    await queryClient.invalidateQueries({ queryKey: ["my-sites"] });
                  })
                  .catch((err: unknown) => {
                    toast.error(err instanceof Error && err.message.length < 160 ? err.message : "Couldn't delete that gift.");
                  })
                  .finally(() => setDeleting(false));
              }}
            >
              {deleting ? "Deleting…" : "Delete gift"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function Dashboard() {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["my-sites"],
    queryFn: async () => {
      const data = await listMySites();
      return data.map((row) => Object.assign(normalizeSite(row as Record<string, unknown>), { counts: (row.note_counts ?? null) as NoteCounts | null }));
    },
  });
  const { data: themes = [] } = useQuery({ queryKey: ["themes", "published"], queryFn: () => fetchThemes(false) });
  const empty = !isLoading && sites.length === 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader showMascot={!empty} />
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-20 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              Your gifts
            </p>
            <h1 className="mt-2 font-display text-[clamp(2rem,4.5vw,3rem)] leading-[1.02] font-semibold tracking-tight">
              {empty ? "Let's make the first one" : "Everything you're making"}
            </h1>
            {!empty && !isLoading ? (
              <p className="mt-2 text-ink/65">
                {sites.length} {sites.length === 1 ? "gift" : "gifts"}. Share the invite link to
                collect notes.
              </p>
            ) : null}
          </div>
          {empty || isLoading ? (
            <span className="relative isolate inline-flex">
              {empty ? (
                // Bo peeks out from behind the button.
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-11 right-3 -z-10"
                >
                  <span className="bo-peek block origin-bottom">
                    <Bo pose="hello" size={64} title="" />
                  </span>
                </span>
              ) : null}
              <Link
                to="/create"
                className="squish inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-cream hover:bg-accent/90"
              >
                <Plus className="size-4" /> New gift
              </Link>
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div
            className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Loading your gifts"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="card-paper h-64 animate-pulse" />
            ))}
          </div>
        ) : empty ? (
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="relative overflow-hidden rounded-[36px] bg-pink p-8 sm:p-10">
              <span
                aria-hidden
                className="absolute -right-16 -bottom-16 size-64 rounded-full bg-white/40 blur-2xl"
              />
              <div className="relative">
                <h2 className="max-w-md font-display text-3xl leading-tight font-semibold">
                  No gifts yet. Who's it for?
                </h2>
                <p className="mt-3 max-w-md text-ink/70">
                  Pick a theme, share one link with friends, and watch the notes roll in.
                </p>
                <Link
                  to="/create"
                  className="squish mt-7 inline-flex min-h-12 items-center rounded-full bg-ink px-6 text-sm font-semibold text-cream"
                >
                  Start a gift
                </Link>
              </div>
            </div>
            <ol className="grid gap-3">
              {[
                ["Pick a theme", "Birthday, send-off, wedding, or just because."],
                ["Share the invite link", "No sign-up for them. Notes wait for you."],
                ["Wrap it up", "Approve the notes, pick a plan, send one link."],
              ].map(([t, b], i) => (
                <li key={t} className="card-paper flex items-start gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-butter font-display font-semibold">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold">{t}</span>
                    <span className="block text-sm text-ink/65">{b}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((site, i) => (
              <GiftCard key={site.id} site={site} counts={site.counts} index={i} theme={themes.find((t) => t.id === site.theme_id) ?? null} />
            ))}
            <Link
              to="/create"
              className="group grid min-h-64 place-items-center rounded-[28px] border-2 border-dashed border-ink/12 text-center transition-colors hover:border-accent/50 hover:bg-pink/20"
            >
              <span>
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-pink transition-transform group-hover:rotate-90">
                  <Plus className="size-6" />
                </span>
                <span className="mt-3 block font-display text-lg font-semibold">
                  Start another gift
                </span>
              </span>
            </Link>
          </div>
        )}
        <p className="mt-12 text-center text-sm text-muted">
          <Link to="/account" className="underline underline-offset-2 hover:text-ink">
            Account settings
          </Link>
        </p>
      </section>
    </div>
  );
}
