import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Bo from "@/components/Bo";
import { SiteHeader } from "@/components/SiteHeader";
import { PageError, PageLoading } from "@/components/PageStates";
import { PlanPickerDialog } from "@/components/PlanControls";
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
      if (status && status !== "pending") return false;
      if (cancelled) return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (order?.status !== "pending") return;
    const t = window.setTimeout(() => setSlow(true), Math.max(0, PATIENCE_MS - (Date.now() - started)));
    return () => window.clearTimeout(t);
  }, [order?.status, started]);

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
          {order.kind === "upgrade" ? `You're on ${tier?.name ?? "the new plan"}` : "Your gift is ready to open"}
        </h1>
        <p className="mt-2 text-muted">
          Payment received, {formatPeso(order.amount)}. A receipt is on its way to your email.
        </p>
        {order.kind === "publish" && liveUrl ? (
          <div className="mt-7 flex items-center gap-2 rounded-xl border border-line bg-cream p-2 pl-4">
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
            <a href={liveUrl} className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-cream">
              Open the gift
            </a>
          ) : null}
          <Link to={editorUrl} className="rounded-full border border-line px-6 py-3 text-sm font-medium">
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
        <p className="mx-auto mt-2 max-w-[42ch] text-muted">
          Your gift is still saved as a draft, and nothing was charged. You can try again whenever you're ready.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {order.site ? (
            <button
              type="button"
              onClick={() => setRetryOpen(true)}
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-cream"
            >
              Try again
            </button>
          ) : null}
          <Link to={editorUrl} className="rounded-full border border-line px-6 py-3 text-sm font-medium">
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
        <p className="mx-auto mt-2 max-w-[42ch] text-muted">
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
      <div className="grid min-h-[75vh] place-items-center px-5 text-center">
        <div className="w-full max-w-xl">{body}</div>
      </div>
      {order.site ? (
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
