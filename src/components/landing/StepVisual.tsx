/** The little picture on each "How it works" step (landing page and the new-user guide). */
import { Check, EyeOff, Link2 } from "lucide-react";
import Bo from "@/components/Bo";
import { LANDING_MORE } from "@/copy/strings";

const SV = LANDING_MORE.stepVisuals;

export function StepVisual({ n }: { n: string }) {
  if (n === "01")
    return (
      <div className="grid grid-cols-3 gap-2">
        {["bg-pink", "bg-butter", "bg-mint", "bg-lilac", "bg-sky", "bg-peach"].map((c, i) => (
          <span
            key={c}
            className={`h-12 rounded-xl ${c} ${i === 1 ? "ring-2 ring-accent ring-offset-2 ring-offset-white" : ""}`}
          />
        ))}
      </div>
    );
  if (n === "02")
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-[13px] ring-1 ring-ink/8">
          <Link2 className="size-4 text-accent" />
          <span className="truncate">{SV.link}</span>
          <span className="ml-auto rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-cream">
            {SV.copy}
          </span>
        </div>
        <div className="flex items-center">
          {["bg-pink", "bg-butter", "bg-mint", "bg-sky", "bg-lilac"].map((c, i) => (
            <span
              key={c}
              className={`-ml-2 grid size-9 place-items-center rounded-full first:ml-0 ${c} text-xs font-semibold ring-2 ring-white`}
            >
              {"SMACP"[i]}
            </span>
          ))}
          <span className="ml-3 text-sm text-ink/70">{SV.joined}</span>
        </div>
      </div>
    );
  if (n === "03")
    return (
      <div className="space-y-2">
        {SV.review.map((r) => (
          <div
            key={r.who}
            className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 ring-1 ring-ink/6"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{r.who}</span>
              <span className="block truncate text-xs text-ink/60">{r.text}</span>
            </span>
            {r.ok ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[11px] font-medium">
                <Check className="size-3" /> {SV.approved}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium ring-1 ring-ink/10">
                <EyeOff className="size-3" /> {SV.hidden}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex items-center gap-4">
      <Bo pose="published" size={84} />
      <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
        <p className="text-[13px] font-medium">{SV.opened}</p>
        <p className="text-xs text-ink/60">{SV.openedStats}</p>
      </div>
    </div>
  );
}
