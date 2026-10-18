import { Lock } from "lucide-react";
import { FORMATS, offeredFormats, type GiftFormat } from "@/lib/formats";
import { formatPlanTag } from "@/config/pricing";

/** A tiny live-ish preview of each format, drawn in CSS. */
export function FormatMini({ id }: { id: GiftFormat }) {
  switch (id) {
    case "comic":
      return (
        <span className="fmt-mini fmt-comic" aria-hidden>
          <i />
          <i>BAM!</i>
          <i />
        </span>
      );
    case "bento":
      return (
        <span className="fmt-mini fmt-bento" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      );
    case "hunt":
      return (
        <span className="fmt-mini fmt-hunt" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      );
    case "zine":
      return (
        <span className="fmt-mini fmt-zine" aria-hidden>
          <b>Z</b>
          <b>I</b>
          <b>N</b>
          <b>E</b>
          <i />
        </span>
      );
    case "storybook":
      return (
        <span className="fmt-mini fmt-book" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      );
    case "mixtape":
      return (
        <span className="fmt-mini fmt-tape" aria-hidden>
          <b />
          <i />
          <i />
        </span>
      );
    case "scratch":
      return (
        <span className="fmt-mini fmt-scratch" aria-hidden>
          <b>you won</b>
          <i />
        </span>
      );
    case "handwritten":
      return (
        <span className="fmt-mini fmt-hand" aria-hidden>
          <i />
          <i />
          <b>♥</b>
        </span>
      );
    case "stars":
      return (
        <span className="fmt-mini fmt-stars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <svg viewBox="0 0 100 64" preserveAspectRatio="none">
            <line x1="14" y1="15" x2="36" y2="39" />
            <line x1="36" y1="39" x2="60" y2="16" />
            <line x1="60" y1="16" x2="84" y2="35" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="fmt-mini fmt-scrap" aria-hidden>
          <i />
          <i />
          <i />
        </span>
      );
  }
}

export function FormatPicker({
  value,
  onChange,
  isAllowed,
  compact = false,
  bare = false,
}: {
  value: GiftFormat;
  onChange: (value: GiftFormat) => void;
  /** Formats the current plan can't use show a lock. */
  isAllowed?: (format: GiftFormat) => boolean;
  compact?: boolean;
  /** No visible legend or hint (the page already titles this). */
  bare?: boolean;
}) {
  return (
    <fieldset>
      <legend className={compact || bare ? "sr-only" : "font-display text-base font-medium"}>
        Choose a format
      </legend>
      {!compact && !bare ? (
        <p className="mt-1 text-xs text-muted">
          Same notes, different way to open them. You can switch any time.
        </p>
      ) : null}
      <div
        className={`mt-3 grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}
      >
        {FORMATS.filter((f) => f.id === value || offeredFormats().includes(f)).map((f) => {
          const active = value === f.id;
          const allowed = isAllowed ? isAllowed(f.id) : true;
          return (
            <label
              key={f.id}
              data-format={f.id}
              className={`fmt-card group ${active ? "is-active" : ""} ${allowed ? "" : "is-locked"}`}
            >
              <input
                className="sr-only"
                type="radio"
                name="format"
                checked={active}
                disabled={!allowed}
                onChange={() => onChange(f.id)}
              />
              <span className="fmt-stage">
                <FormatMini id={f.id} />
                {f.isNew ? <span className="fmt-new">New</span> : null}
                {!allowed ? (
                  <span className="fmt-lock">
                    <Lock className="size-3" /> {formatPlanTag(f.id) ? `${formatPlanTag(f.id)} plan` : "Bigger plan"}
                  </span>
                ) : formatPlanTag(f.id) ? (
                  <span className="fmt-plan" title={`Needs the ${formatPlanTag(f.id)} plan or higher`}>
                    {formatPlanTag(f.id)} plan
                  </span>
                ) : null}
              </span>
              <span className="block px-3 pt-2.5 pb-3">
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{f.copy}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
