/** A small "12 / 40" counter that appears once text gets near its limit. */
export function CharCount({ value, max, className = "" }: { value: string | null | undefined; max: number; className?: string }) {
  const n = [...(value ?? "")].length;
  if (n < max * 0.8) return null;
  const over = n > max;
  return (
    <span aria-live="polite" className={`text-[11px] tabular-nums ${over ? "font-semibold text-[#B42318]" : n >= max ? "text-[#B42318]" : "text-muted"} ${className}`}>
      {n} / {max}
      {over ? " · too long" : ""}
    </span>
  );
}
