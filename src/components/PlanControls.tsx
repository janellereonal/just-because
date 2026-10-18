import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { boWrap } from "@/lib/mascot/bus";
import { getBilling, previewDiscountCode, setCustomSlug, setGiftPassword, startCheckout, startExtendCheckout } from "@/lib/api";
import { CODE_COPY } from "@/copy/strings";
import { PricingCards } from "@/components/PricingCards";
import { PRICE_COPY } from "@/copy/strings";
import { useViewerMoney } from "@/lib/viewerCurrency";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LEGACY_TIER,
  TIERS,
  formatPeso,
  getTier,
  hasFeature,
  paymentMethodsSentence,
  type TierId,
} from "@/config/pricing";

export type Billing = Awaited<ReturnType<typeof getBilling>>;

export function useBilling(siteId: string) {
  return useQuery({
    queryKey: ["billing", siteId],
    queryFn: () => getBilling({ data: { siteId } }),
  });
}

/** Only for visitors outside the Philippines: how to pay from abroad. */
function AbroadPayNote() {
  const money = useViewerMoney();
  if (!money || money.local) return null;
  return <p className="mx-auto max-w-md text-center text-xs text-muted">{PRICE_COPY.abroadPayNote}</p>;
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
  const [codeOpen, setCodeOpen] = useState(false);
  const [codeText, setCodeText] = useState("");
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Extract<Awaited<ReturnType<typeof previewDiscountCode>>, { ok: true }> | null>(null);
  const deal = new Map(applied?.plans.map((p) => [p.id, p]) ?? []);

  async function applyCode() {
    const code = codeText.trim();
    if (!code) return;
    setChecking(true);
    setCodeError(null);
    try {
      const res = await previewDiscountCode({ data: { siteId, code } });
      if (res.ok) setApplied(res);
      else setCodeError(res.message);
    } catch (error) {
      setCodeError(errorMessage(error, "We couldn't check that code. Try again?"));
    } finally {
      setChecking(false);
    }
  }

  async function pick(tier: TierId) {
    setBusyTier(tier);
    try {
      // The price is worked out again on the server; the code only goes along if it fits this plan.
      const code = applied && deal.get(tier)?.applies ? applied.code : undefined;
      // Bo wraps himself up while the checkout loads (never more than ~1s).
      const [{ checkoutUrl }] = await Promise.all([startCheckout({ data: { siteId, tier, ...(code ? { code } : {}) } }), boWrap()]);
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
          <p className="-mt-1 rounded-xl bg-cream px-3 py-2 text-sm text-muted">
            So far this gift has{" "}
            <b className="text-ink">
              {billing.usage.contributors} {billing.usage.contributors === 1 ? "friend" : "friends"}
            </b>{" "}
            and{" "}
            <b className="text-ink">
              {billing.usage.photos} {billing.usage.photos === 1 ? "photo" : "photos"}
            </b>
            . Each plan says how many it holds; friends can keep adding until it's full.
          </p>
        ) : null}
        {billing && mode === "publish" ? (
          <div className="-mt-1 text-sm">
            {applied ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
                <span>
                  {CODE_COPY.applied(
                    applied.code,
                    applied.label,
                    applied.plans.filter((p) => p.applies).map((p) => getTier(p.id)?.name ?? p.id),
                    applied.plans.every((p) => p.applies),
                  )}
                </span>
                <button
                  type="button"
                  className="text-muted underline underline-offset-2 hover:text-ink"
                  onClick={() => {
                    setApplied(null);
                    setCodeText("");
                  }}
                >
                  {CODE_COPY.remove}
                </button>
              </p>
            ) : codeOpen ? (
              <form
                className="flex flex-wrap items-start gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void applyCode();
                }}
              >
                <div className="min-w-0 flex-1">
                  <label htmlFor="plan-code" className="sr-only">
                    {CODE_COPY.placeholder}
                  </label>
                  <input
                    id="plan-code"
                    value={codeText}
                    onChange={(e) => {
                      setCodeText(e.target.value);
                      setCodeError(null);
                    }}
                    placeholder={CODE_COPY.placeholder}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={40}
                    autoFocus
                    aria-invalid={!!codeError}
                    aria-describedby={codeError ? "plan-code-error" : undefined}
                    className="w-full rounded-full border border-line bg-paper px-4 py-2.5 font-mono text-sm tracking-wide uppercase outline-none focus:border-accent"
                  />
                  {codeError ? (
                    <p id="plan-code-error" role="alert" className="mt-1.5 px-2 text-xs text-accent">
                      {codeError}
                    </p>
                  ) : null}
                </div>
                <Button type="submit" variant="outline" className="rounded-full" disabled={checking || !codeText.trim()}>
                  {checking ? CODE_COPY.checking : CODE_COPY.apply}
                </Button>
              </form>
            ) : (
              <button type="button" className="text-muted underline underline-offset-2 hover:text-ink" onClick={() => setCodeOpen(true)}>
                {CODE_COPY.ask}
              </button>
            )}
          </div>
        ) : null}
        {billing ? (
          tiers.length > 0 ? (
            <PricingCards
              tiers={tiers}
              wasFor={applied ? (t) => (deal.get(t.id)?.applies ? t.amount : null) : undefined}
              priceFor={mode === "upgrade" ? (t) => upgradePrice.get(t.id) ?? t.amount : applied ? (t) => deal.get(t.id)?.amount ?? t.amount : undefined}
              priceNote={mode === "upgrade" ? "Pay the difference" : undefined}
              blockerFor={(t) => blockers.get(t.id) ?? null}
              action={{
                label: (t) => (mode === "upgrade" ? `Upgrade to ${t.name}` : deal.get(t.id)?.free ? CODE_COPY.free(t.name) : `Choose ${t.name}`),
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
        <p className="text-center text-xs text-muted">
          By continuing you agree to the{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            Terms
          </a>{" "}
          and{" "}
          <a href="/refunds" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            Refund policy
          </a>
          . Prices are in Philippine pesos.
        </p>
        <AbroadPayNote />
      </DialogContent>
    </Dialog>
  );
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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
      const [{ checkoutUrl }] = await Promise.all([startExtendCheckout({ data: { siteId } }), boWrap()]);
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
        <p className="text-center text-xs text-muted">
          Pay with {paymentMethodsSentence()}. By continuing you agree to the{" "}
          <a href="/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Terms
          </a>{" "}
          and{" "}
          <a href="/refunds" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Refund policy
          </a>
          .
        </p>
        <AbroadPayNote />
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
    ? new Date(billing.expiresAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;
  return until ? `${tier.name} plan, open until ${until}` : `${tier.name} plan`;
}

/** Names of the plans that include a feature, e.g. "Celebration and Keepsake". */
function plansWith(feature: "passwordProtection" | "customLinkName") {
  const names = TIERS.filter((t) => t.features[feature]).map((t) => t.name);
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Editor setting: a password the recipient types before the gift opens (paid feature). */
export function GiftPasswordSetting({
  siteId,
  tier,
  passwordSet,
  canUpgrade,
  onUpgrade,
}: {
  siteId: string;
  tier: string | null;
  passwordSet: boolean;
  canUpgrade: boolean;
  onUpgrade: () => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const included = !tier || hasFeature(tier, "passwordProtection");

  async function save(password: string | null) {
    setBusy(true);
    try {
      await setGiftPassword({ data: { siteId, password } });
      await queryClient.invalidateQueries({ queryKey: ["site", siteId] });
      setEditing(false);
      setValue("");
      toast.success(password === null ? "Password removed. The link opens without one." : "Password saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Use at least 4 characters."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-line bg-cream p-3">
      <p className="text-sm font-medium">Password</p>
      {!included ? (
        <>
          <p className="mt-1 text-xs text-muted">
            Ask for a password before the gift opens. Comes with {plansWith("passwordProtection")}.
            {passwordSet ? " Your saved password isn't asked for on this plan." : ""}
          </p>
          {canUpgrade ? (
            <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={onUpgrade}>
              Upgrade
            </Button>
          ) : null}
        </>
      ) : editing || !passwordSet ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save(value);
          }}
        >
          <p className="text-xs text-muted">
            {passwordSet
              ? "Pick a new one. Anyone who opened it before will need the new one."
              : `Ask for a password before the gift opens. Share it along with the link.${
                  tier ? "" : ` Works on ${plansWith("passwordProtection")}.`
                }`}
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. the name of your group chat"
            autoComplete="off"
            maxLength={100}
            className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={busy || value.trim().length < 4}>
              {busy ? "Saving…" : "Save password"}
            </Button>
            {passwordSet ? (
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted">
            On. People opening the link type the password first. You don't need it as the owner.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" disabled={busy} onClick={() => void save(null)}>
              Remove
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
