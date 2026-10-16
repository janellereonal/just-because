import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Bo from "@/components/Bo";
import { SiteHeader } from "@/components/SiteHeader";
import { PageError, PageLoading } from "@/components/PageStates";
import { ExtendDialog, PlanPickerDialog } from "@/components/PlanControls";
import { cancelOrder, getOrderStatus } from "@/lib/api";
import { formatPeso, getTier } from "@/config/pricing";

/** How long we keep checking before saying "this is taking a while". */
const PATIENCE_MS = 90_000;

/**
 * Where PayMongo sends people back. Coming back here is not proof of
 * payment: we wait until our webhook has marked the order paid.
 */
function CheckoutStatusPage() {
  const { orderId } = useParams({ from: "/_authenticated/checkout/$orderId" });
  const { cancelled } = useSearch({ from: "/_authenticated/checkout/$orderId" });
  const [started] = useState(() => Date.now());
  const [slow, setSlow] = useState(false);
  const [retryOpen, setRetryOpen] = useState(false);
  const [party, setParty] = useState(false);
  const cancelSent = useRef(false);

  useEffect(() => {
    if (!cancelled || cancelSent.current) return;
    cancelSent.current = true;
    void cancelOrder({ data: { orderId } }).catch(() => undefined);
  }, [cancelled, orderId]);

  const { data: order, error, refetch } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getOrderStatus({ data: { orderId } }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "paid") return false;
      // After a cancel or a timeout, keep an eye out for a minute: they may have paid in another tab.
      if (cancelled || status === "failed" || status === "expired") return Date.now() - started < 60_000 ? 5000 : false;
      if (status && status !== "pending") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (order?.status !== "pending") return;
    const t = window.setTimeout(() => setSlow(true), Math.max(0, PATIENCE_MS - (Date.now() - started)));
    return () => window.clearTimeout(t);
  }, [order?.status, started]);

  // Confetti once, when the payment is confirmed.
  useEffect(() => {
    if (order?.status === "paid" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) setParty(true);
  }, [order?.status]);

  if (error) {
    return <PageError message="We couldn't check this payment just now." onRetry={() => void refetch()} />;
  }
  if (!order) return <PageLoading label="Confirming your payment…" />;

  const tier = getTier(order.tier);
  const editorUrl = order.site ? `/sites/${order.site.id}` : "/dashboard";
  const liveUrl =
    order.site && typeof window !== "undefined" ? `${window.location.origin}/g/${order.site.slug}` : "";
  const paid = order.status === "paid";
  // Cancel only counts while the order is still unpaid; a late payment still wins.
  const stopped = !paid && (order.status === "failed" || order.status === "expired" || !!cancelled);

  let body: React.ReactNode;
  if (paid) {
    body = (
      <>
        <Bo pose="published" size={190} />
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight">
          {order.kind === "upgrade"
            ? `You're on ${tier?.name ?? "the new plan"}`
            : order.kind === "extend"
              ? "Your gift is open for longer"
              : "Your gift is ready to open"}
        </h1>
        <p className="mt-2 text-ink/70">
          Payment received, {formatPeso(order.amount)}. A receipt is on its way to your email.
        </p>
        {order.kind === "extend" && order.site?.expiresAt ? (
          <p className="mt-1 text-ink/70">
            It now stays open until{" "}
            {new Date(order.site.expiresAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            .
          </p>
        ) : null}
        {order.kind === "publish" && liveUrl ? (
          <div className="mt-7 flex items-center gap-2 rounded-full bg-white/85 p-1.5 pl-5">
            <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted">{liveUrl}</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(liveUrl);
                toast.success("Gift link copied.");
              }}
              className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream"
            >
              Copy
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {order.kind === "publish" && liveUrl ? (
            <a href={liveUrl} className="squish rounded-full bg-accent px-6 py-3 text-sm font-semibold text-cream">
              Open the gift
            </a>
          ) : null}
          <Link to={editorUrl} className="squish rounded-full bg-white/80 px-6 py-3 text-sm font-medium">
            Back to the editor
          </Link>
        </div>
      </>
    );
  } else if (stopped) {
    body = (
      <>
        <Bo pose="idle" size={150} />
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">
          {order.status === "expired" ? "That payment timed out" : "No payment was made"}
        </h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-ink/70">
          {order.kind === "publish"
            ? "Your gift is still saved as a draft, and nothing was charged. You can try again whenever you're ready."
            : "Nothing was charged, and your gift is just as you left it. You can try again whenever you're ready."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {order.site ? (
            <button
              type="button"
              onClick={() => setRetryOpen(true)}
              className="squish rounded-full bg-accent px-6 py-3 text-sm font-semibold text-cream"
            >
              Try again
            </button>
          ) : null}
          <Link to={editorUrl} className="squish rounded-full bg-white/80 px-6 py-3 text-sm font-medium">
            Back to the editor
          </Link>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="bo-bob inline-block">
          <Bo pose="idle" size={150} />
        </div>
        <h1 className="mt-3 font-display text-3xl font-medium tracking-tight">Confirming your payment…</h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-ink/70">
          {slow
            ? "This is taking longer than usual. If you paid, you'll get an email once it's confirmed, and the gift opens on its own. You can close this page."
            : "This usually takes a few seconds. Please keep this page open."}
        </p>
        {slow ? (
          <Link
            to={editorUrl}
            className="mt-6 inline-block rounded-full border border-line px-6 py-3 text-sm font-medium"
          >
            Back to the editor
          </Link>
        ) : null}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="grid min-h-[75vh] place-items-center px-4 py-10 text-center">
        <div className={`rise relative w-full max-w-xl overflow-hidden rounded-[36px] px-6 py-10 sm:px-12 ${paid ? "bg-mint" : stopped ? "bg-butter" : "bg-pink"}`}>
          <span aria-hidden className="absolute -top-16 -right-12 size-56 rounded-full bg-white/45 blur-2xl" />
          <div className="relative">{body}</div>
        </div>
      </div>
      {party ? (
        <div className="hunt-confetti" aria-hidden>
          {Array.from({ length: 36 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                background: ["#C2366B", "#FFE8B0", "#D5F0E3", "#D9E8FB", "#E6DCF7", "#FBD3DC"][i % 6],
                animationDelay: `${(i % 12) * 70}ms`,
                animationDuration: `${1500 + ((i * 53) % 900)}ms`,
              }}
            />
          ))}
        </div>
      ) : null}
      {order.site && order.kind === "extend" ? (
        <ExtendDialog siteId={order.site.id} open={retryOpen} onOpenChange={setRetryOpen} />
      ) : order.site ? (
        <PlanPickerDialog
          siteId={order.site.id}
          recipient="them"
          mode={order.kind === "upgrade" ? "upgrade" : "publish"}
          open={retryOpen}
          onOpenChange={setRetryOpen}
        />
      ) : null}
    </div>
  );
}

export default CheckoutStatusPage;
