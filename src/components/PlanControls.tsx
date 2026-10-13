import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getBilling, setCustomSlug, startCheckout, startExtendCheckout } from "@/lib/api";
import { PricingCards } from "@/components/PricingCards";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LEGACY_TIER, TIERS, formatPeso, getTier, paymentMethodsSentence, type TierId } from "@/config/pricing";

export type Billing = Awaited<ReturnType<typeof getBilling>>;

export function useBilling(siteId: string) {
  return useQuery({
    queryKey: ["billing", siteId],
    queryFn: () => getBilling({ data: { siteId } }),
  });
}

function errorMessage(error: unknown, fallback: string) {
  const msg = error instanceof Error ? error.message : "";
  return msg && msg.length < 200 ? msg : fallback;
}

/** Tier picker for publishing (first payment) or upgrading (pay the difference). */
export function PlanPickerDialog({
  siteId,
  recipient,
  mode,
  open,
  onOpenChange,
}: {
  siteId: string;
  recipient: string;
  mode: "publish" | "upgrade";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: billing } = useBilling(siteId);
  const [busyTier, setBusyTier] = useState<TierId | null>(null);

  async function pick(tier: TierId) {
    setBusyTier(tier);
    try {
      const { checkoutUrl } = await startCheckout({ data: { siteId, tier } });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setBusyTier(null);
      toast.error(errorMessage(error, "We couldn't open the payment page. Please try again."));
    }
  }

  const upgradeIds = new Set(billing?.upgrades.map((u) => u.id) ?? []);
  const tiers = mode === "upgrade" ? TIERS.filter((t) => upgradeIds.has(t.id)) : TIERS;
  const blockers = new Map(
    (mode === "upgrade" ? billing?.upgrades : billing?.fit)?.map((f) => [f.id, f.blocker]) ?? [],
  );
  const upgradePrice = new Map(billing?.upgrades.map((u) => [u.id, u.amount]) ?? []);
  const current = getTier(billing?.tier);

  return (
    <Dialog open={open} onOpenChange={(next) => !busyTier && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            {mode === "upgrade" ? "Make room for more" : `Ready to send this to ${recipient}?`}
          </DialogTitle>
          <DialogDescription>
            {mode === "upgrade"
              ? `You're on ${current?.name ?? "a plan"}. Pay the difference to move up. The time it stays open counts from when you first published.`
              : "Pick a plan to open the gift and get the link to send. Friends can keep adding notes after."}
          </DialogDescription>
        </DialogHeader>
        {billing ? (
          tiers.length > 0 ? (
            <PricingCards
              tiers={tiers}
              priceFor={mode === "upgrade" ? (t) => upgradePrice.get(t.id) ?? t.amount : undefined}
              priceNote={mode === "upgrade" ? "Pay the difference" : undefined}
              blockerFor={(t) => blockers.get(t.id) ?? null}
              action={{
                label: (t) => (mode === "upgrade" ? `Upgrade to ${t.name}` : `Choose ${t.name}`),
                onPick: (t) => void pick(t),
                busyTier,
                disabled: !!busyTier,
              }}
            />
          ) : (
            <p className="text-sm text-muted">This gift is already on the biggest plan.</p>
          )
        ) : (
          <p className="py-10 text-center text-sm text-muted">Loading plans…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** Pay to keep a gift open for another stretch of its plan. Works before or after it ends. */
export function ExtendDialog({
  siteId,
  open,
  onOpenChange,
}: {
  siteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: billing } = useBilling(siteId);
  const [busy, setBusy] = useState(false);
  const tier = getTier(billing?.tier);

  async function extend() {
    setBusy(true);
    try {
      const { checkoutUrl } = await startExtendCheckout({ data: { siteId } });
      window.location.assign(checkoutUrl);
    } catch (error) {
      setBusy(false);
      toast.error(errorMessage(error, "We couldn't open the payment page. Please try again."));
    }
  }

  let body: React.ReactNode;
  if (!billing) {
    body = <p className="py-6 text-center text-sm text-muted">Loading…</p>;
  } else if (!billing.extend || !tier) {
    body = <p className="text-sm text-muted">This gift doesn't need extending.</p>;
  } else {
    const when = billing.ended
      ? "It opens again as soon as the payment goes through."
      : billing.expiresAt
        ? `The extra time is added after ${shortDate(billing.expiresAt)}, so you don't lose any days.`
        : null;
    body = (
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-cream p-4">
          <p className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">{tier.name} plan</p>
          <p className="mt-1 font-display text-3xl font-medium tracking-tight">{formatPeso(billing.extend.amount)}</p>
          <p className="mt-1 text-sm text-muted">Another {billing.extend.label}, same plan and limits.</p>
        </div>
        {when ? <p className="text-sm text-muted">{when}</p> : null}
        <Button className="w-full rounded-full" disabled={busy} onClick={() => void extend()}>
          {busy ? "Opening payment…" : `Extend for ${formatPeso(billing.extend.amount)}`}
        </Button>
        <p className="text-center text-xs text-muted">Pay with {paymentMethodsSentence()}.</p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">
            Keep this gift open longer
          </DialogTitle>
          <DialogDescription>Everything friends added stays right where it is.</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

/** Shown at the top of the editor when a published gift is full or has ended. */
export function PlanBanner({
  billing,
  onUpgrade,
  onExtend,
}: {
  billing: Billing | undefined;
  onUpgrade: () => void;
  onExtend: () => void;
}) {
  if (!billing || !billing.tier || billing.legacy) return null;
  if (billing.ended) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-cream px-4 py-2.5 text-sm">
        <span>This gift has ended, so the link now shows a goodbye page.</span>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={onExtend}
        >
          Extend this gift
        </Button>
      </div>
    );
  }
  const limits = billing.limits;
  if (!limits) return null;
  const contributorsFull = billing.usage.contributors >= limits.contributors;
  const photosFull = billing.usage.photos >= limits.photos;
  if (!contributorsFull && !photosFull) return null;
  const what =
    contributorsFull && photosFull
      ? `${billing.usage.contributors} of ${limits.contributors} contributors and ${billing.usage.photos} of ${limits.photos} photos`
      : contributorsFull
        ? `${billing.usage.contributors} of ${limits.contributors} contributors`
        : `${billing.usage.photos} of ${limits.photos} photos`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-sm">
      <span>
        This gift is full: {what}. New friends will see a "this gift is full" note until you make room.
      </span>
      {billing.upgrades.length > 0 ? (
        <Button size="sm" className="rounded-full" onClick={onUpgrade}>
          Upgrade
        </Button>
      ) : null}
    </div>
  );
}

/** Keepsake (and legacy) gifts can rename their link. */
export function LinkNameDialog({
  siteId,
  slug,
  open,
  onOpenChange,
  onSaved,
}: {
  siteId: string;
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (slug: string) => void;
}) {
  const [value, setValue] = useState(slug);
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await setCustomSlug({ data: { siteId, slug: value } });
      if (!result.ok) {
        toast.error(result.error ?? "That link name didn't work.");
        return;
      }
      onSaved(result.slug);
      void queryClient.invalidateQueries({ queryKey: ["site", siteId] });
      toast.success("Link updated. Old links stop working, so send the new one.");
      onOpenChange(false);
    } catch (error) {
      toast.error(errorMessage(error, "Use letters, numbers and dashes only."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium">Choose the link name</DialogTitle>
          <DialogDescription>Letters, numbers and dashes. The old link stops working.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="flex items-center rounded-xl border border-line bg-cream px-3 py-2 font-mono text-xs">
            <span className="shrink-0 text-muted">{origin.replace(/^https?:\/\//, "")}/g/</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="min-w-0 flex-1 bg-transparent outline-none"
              maxLength={60}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full rounded-full" disabled={busy || value.length < 3}>
            {busy ? "Saving…" : "Save link name"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function canRenameLink(tier: string | null) {
  return tier === LEGACY_TIER || !!getTier(tier)?.features.customLinkName;
}

export function planSummary(billing: Billing | undefined): string | null {
  if (!billing?.tier) return null;
  if (billing.legacy) return "Open for good";
  const tier = getTier(billing.tier);
  if (!tier) return null;
  if (billing.ended) return `${tier.name} plan, ended`;
  const until = billing.expiresAt
    ? new Date(billing.expiresAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : null;
  return until ? `${tier.name} plan, open until ${until}` : `${tier.name} plan`;
}
