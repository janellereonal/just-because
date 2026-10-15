import { HandCoins } from "lucide-react";
import { CHIP_IN_COPY } from "@/copy/strings";

/** The chip-in fund isn't built yet. This says so, kindly, where the sections are listed. */
export function ChipInSoon() {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl bg-paper px-4 py-3 opacity-80"
      aria-disabled="true"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink/6">
        <HandCoins className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          {CHIP_IN_COPY.label}
          <span className="rounded-full bg-butter px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase">
            {CHIP_IN_COPY.soon}
          </span>
        </span>
        <span className="block text-xs text-ink/60">{CHIP_IN_COPY.blurb}</span>
      </span>
    </div>
  );
}
