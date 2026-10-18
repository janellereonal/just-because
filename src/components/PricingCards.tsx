import {
  TIERS,
  featureList,
  formatApprox,
  formatPeso,
  type Tier,
  type TierId,
} from "@/config/pricing";
import { PRICE_COPY } from "@/copy/strings";
import { useViewerMoney } from "@/lib/viewerCurrency";

type Props = {
  /** Only show these tiers (e.g. upgrade options). Defaults to all. */
  tiers?: Tier[] | undefined;
  /** Override the shown price per tier (e.g. the upgrade difference). */
  priceFor?: ((tier: Tier) => number) | undefined;
  /** Why a tier can't be picked for this gift, if it can't. */
  blockerFor?: ((tier: Tier) => string | null) | undefined;
  /** Card button. Leave out for the landing page, where the cards link nowhere. */
  action?: { label: (tier: Tier) => string; onPick: (tier: TierId) => void; busyTier?: TierId | null; disabled?: boolean };
  /** The full price to show crossed out next to a discounted one (null = no discount on this plan). */
  wasFor?: ((tier: Tier) => number | null) | undefined;
  /** Small line above the price, e.g. "Pay the difference". */
  priceNote?: string | undefined;
  compact?: boolean | undefined;
};

export function PricingCards({ tiers = TIERS, priceFor, wasFor, blockerFor, action, priceNote, compact }: Props) {
  // Null until the page has loaded in the browser: until then everyone sees the dollar guide.
  const money = useViewerMoney();
  return (
    <div>
      <div className={`grid gap-4 ${tiers.length >= 3 ? "md:grid-cols-3" : tiers.length === 2 ? "sm:grid-cols-2" : ""}`}>
        {tiers.map((tier) => {
          const price = priceFor ? priceFor(tier) : tier.amount;
          const was = wasFor?.(tier) ?? null;
          const blocker = blockerFor?.(tier) ?? null;
          const busy = action?.busyTier === tier.id;
          return (
            <div
              key={tier.id}
              {...(tier.mostPopular ? { "data-bo-perch": "", "data-bo-x": "0.9", "data-bo-point": "-1", "data-bo-say": "Most friends pick this one." } : {})}
              {...(tier.id === "keepsake" ? { "data-bo-hover-face": "love" } : {})}
              className={`relative flex flex-col rounded-3xl border p-5 sm:p-6 ${
                tier.mostPopular
                  ? "border-accent bg-cream shadow-[0_10px_30px_-18px_rgba(181,98,62,0.6)]"
                  : "border-line bg-glass/60"
              } ${blocker ? "opacity-60" : ""}`}
            >
              {tier.mostPopular && (
                <span className="absolute -top-3 left-5 rounded-full bg-accent px-3 py-1 font-mono text-[10px] tracking-[0.16em] text-cream uppercase">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-medium tracking-tight">{tier.name}</h3>
              <p className="mt-1 text-sm text-muted">{tier.audience}</p>
              {priceNote && <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-muted uppercase">{priceNote}</p>}
              <p className={`${priceNote ? "mt-1" : "mt-4"} flex flex-wrap items-baseline gap-x-2 font-display text-4xl font-medium tracking-tight`} suppressHydrationWarning>
                {was !== null && was !== price ? (
                  <s className="text-2xl text-muted decoration-accent/70 decoration-2" aria-label={`was ${formatPeso(was)}`}>
                    {formatPeso(was)}
                  </s>
                ) : null}
                <span>{price === 0 && was !== null ? "Free" : formatPeso(price)}</span>
              </p>
              {price > 0 ? (
                // In the Philippines the peso price is enough; the line stays (invisible) so the card doesn't jump.
                <p className={`text-xs text-muted ${money?.local ? "invisible" : ""}`} aria-hidden={money?.local || undefined} suppressHydrationWarning>
                  {formatApprox(price, money?.currency ?? "USD")} <span className="opacity-80">{PRICE_COPY.approxSuffix}</span>
                </p>
              ) : (
                <p className="text-xs text-muted">Nothing to pay</p>
              )}
              {!compact && (
                <ul className="mt-5 space-y-2 text-sm">
                  {featureList(tier).map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
              {blocker && <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-xs text-muted">{blocker}</p>}
              {action && (
                <div className="mt-auto pt-5">
                  <button
                    type="button"
                    onClick={() => action.onPick(tier.id)}
                    disabled={!!blocker || action.disabled || busy}
                    className={`w-full rounded-full px-5 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                      tier.mostPopular
                        ? "bg-accent text-cream hover:bg-accent/90"
                        : "border border-line bg-paper hover:bg-cream"
                    }`}
                  >
                    {busy ? "Opening payment…" : action.label(tier)}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mx-auto mt-5 max-w-xl text-center text-sm text-muted">
        {money && !money.local ? PRICE_COPY.footerAbroad : PRICE_COPY.footerLocal}
      </p>
      {tiers.some((t) => t.contributors.unlimited || t.photos.unlimited) && (
        <p className="mt-1 text-center text-xs text-muted">"Unlimited" is subject to fair use.</p>
      )}
    </div>
  );
}
