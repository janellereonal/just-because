import { galleryLink } from "@/lib/gallery";
import { Link } from "@tanstack/react-router";
import Bo from "@/components/Bo";
import { SiteHeader } from "@/components/SiteHeader";

/** Small bobbing Bo while a page's data loads — never a blank screen. */
export function PageLoading({ label = "Just a moment…" }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center text-ink">
      <div>
        <div className="bo-bob inline-block">
          <Bo pose="idle" size={110} title="Loading" />
        </div>
        <p className="mt-4 text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

type StateProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionTo?: string;
  showHeader?: boolean;
};

/** Friendly dead-end for links that point at something that no longer exists. */
export function PageNotFound({
  title = "We couldn't find that one",
  message = "The link may be old, or the gift may have been removed.",
  actionLabel = galleryLink().browse,
  actionTo = galleryLink().to,
  showHeader = true,
}: StateProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {showHeader ? <SiteHeader /> : null}
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <Bo pose="idle" size={150} title="Bo" />
          <p className="mt-4 font-display text-2xl font-medium tracking-tight">{title}</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-sm text-muted">{message}</p>
          <Link
            to={actionTo}
            className="mt-6 inline-block rounded-full bg-accent px-5 py-3 font-medium text-cream transition-colors hover:bg-accent/90"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Something went wrong fetching — offer a retry instead of a blank page. */
export function PageError({
  title = "Something went wrong",
  message = "We couldn't load this page. Please try again.",
  onRetry,
  showHeader = true,
}: StateProps & { onRetry?: () => void }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      {showHeader ? <SiteHeader /> : null}
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <Bo pose="idle" size={150} title="Bo" />
          <p className="mt-4 font-display text-2xl font-medium tracking-tight">{title}</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-sm text-muted">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-full bg-accent px-5 py-3 font-medium text-cream transition-colors hover:bg-accent/90"
              >
                Try again
              </button>
            ) : null}
            <Link
              to={galleryLink().to}
              className="rounded-full border border-line px-5 py-3 font-medium transition-colors hover:bg-glass/60"
            >
              {galleryLink().browse}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
