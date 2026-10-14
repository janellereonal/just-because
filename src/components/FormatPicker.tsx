import { Lock } from "lucide-react";
import { FORMATS, type GiftFormat } from "@/lib/formats";

/** A tiny live-ish preview of each format, drawn in CSS. */
function Mini({ id }: { id: GiftFormat }) {
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
}: {
  value: GiftFormat;
  onChange: (value: GiftFormat) => void;
  /** Formats the current plan can't use show a lock. */
  isAllowed?: (format: GiftFormat) => boolean;
  compact?: boolean;
}) {
  return (
    <fieldset>
      <legend className={compact ? "sr-only" : "font-display text-base font-medium"}>Choose a format</legend>
      {!compact ? <p className="mt-1 text-xs text-muted">Same notes, different way to open them. You can switch any time.</p> : null}
      <div className={`mt-3 grid gap-2.5 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {FORMATS.map((f) => {
          const active = value === f.id;
          const allowed = isAllowed ? isAllowed(f.id) : true;
          return (
            <label
              key={f.id}
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
                <Mini id={f.id} />
                {f.isNew ? <span className="fmt-new">New</span> : null}
                {!allowed ? (
                  <span className="fmt-lock">
                    <Lock className="size-3" /> Bigger plan
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
