import { t } from "@/i18n";
import { childOccasions, occasionInfo, occasionName, topOccasions, type OccasionId } from "@/lib/occasions";

/**
 * Quick chips for what the gift is for. Optional: tap the picked chip again to clear it.
 * Chips with sub-occasions (Holidays, Wedding, Baby, Send-off, Love) open a second row.
 * "Holidays" only opens its row; the gift is saved with the holiday picked inside it.
 */
export function OccasionChips({
  value,
  onChange,
  open: openProp,
  onOpen,
}: {
  value: OccasionId | null;
  onChange: (next: OccasionId | null) => void;
  /** Which row is open (a parent id). Defaults to the value's parent. */
  open?: OccasionId | null;
  onOpen?: (parent: OccasionId | null) => void;
}) {
  const parentOfValue = value ? (occasionInfo(value).parent ?? (childOccasions(value).length ? value : null)) : null;
  const open = openProp !== undefined ? openProp : parentOfValue;
  const chip = (id: OccasionId, sub = false) => {
    const info = occasionInfo(id);
    const on = value === id;
    // An open row's chip is tinted, not filled, so it never reads as a second pick.
    const expanded = !on && open === id;
    return (
      <button
        key={id}
        type="button"
        role={info.groupOnly ? undefined : "radio"}
        aria-checked={info.groupOnly ? undefined : value === id}
        aria-expanded={childOccasions(id).length ? open === id : undefined}
        onClick={() => {
          if (info.groupOnly) {
            onOpen?.(open === id ? null : id);
            return;
          }
          const next = value === id ? null : id;
          onChange(next);
          const kids = childOccasions(id).length > 0;
          if (kids) onOpen?.(next ? id : null);
          else if (!info.parent) onOpen?.(null);
        }}
        className={`squish shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
          on ? "bg-ink text-cream" : expanded ? "bg-pink/70 text-ink shadow-[0_0_0_1px_var(--accent)]" : sub ? "bg-white/80 text-ink shadow-[0_0_0_1px_var(--line)] hover:bg-white" : "bg-paper text-ink shadow-[0_0_0_1px_var(--line)] hover:bg-white"
        }`}
      >
        {occasionName(id)}
        {childOccasions(id).length ? <span aria-hidden className="ml-1 opacity-60">{open === id ? "▴" : "▾"}</span> : null}
      </button>
    );
  };
  const kids = open ? childOccasions(open) : [];
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("picker.occasion.label")}>
        {topOccasions().map((o) => chip(o.id))}
      </div>
      {kids.length ? (
        <div className="mt-2.5 flex flex-wrap gap-2 rounded-2xl bg-pink/30 p-2.5" role="radiogroup" aria-label={occasionName(open!)}>
          {kids.map((o) => chip(o.id, true))}
        </div>
      ) : null}
    </div>
  );
}
