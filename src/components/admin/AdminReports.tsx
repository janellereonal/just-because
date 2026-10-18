/** Admin: gift reports, with Pause / Un-pause and Dismiss. */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listReports, resolveReport, setGiftDisabled } from "@/lib/reports";
import { REPORT_COPY } from "@/copy/strings";

const reasonLabel = (r: string) => REPORT_COPY.reasons.find(([k]) => k === r)?.[1] ?? r;

export function AdminReports() {
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery({ queryKey: ["admin-reports"], queryFn: () => listReports() });
  const toggle = useMutation({
    mutationFn: (v: { siteId: string; disabled: boolean }) => setGiftDisabled({ data: { ...v, reason: v.disabled ? "Paused after a report" : null } }),
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success(v.disabled ? "Gift paused." : "Gift is open again.");
    },
    onError: () => toast.error("Couldn't change that gift."),
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => resolveReport({ data: { id } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-reports"] }),
  });
  const open = reports.filter((r) => !r.resolvedAt);
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">
        Reports {open.length ? <span className="text-accent">({open.length} open)</span> : null}
      </h2>
      {reports.length === 0 ? <p className="mt-2 text-sm text-muted">No reports yet.</p> : null}
      <div className="mt-4 space-y-2">
        {reports.map((r) => (
          <div key={r.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm ${r.resolvedAt ? "opacity-60" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {reasonLabel(r.reason)} ·{" "}
                <a href={`/g/${r.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  /g/{r.slug}
                </a>
                {r.title ? <span className="text-muted"> ({r.title})</span> : null}
              </p>
              {r.details ? <p className="mt-1 text-muted">{r.details}</p> : null}
              <p className="mt-1 text-xs text-muted">
                From the {r.page} page · {new Date(r.createdAt).toLocaleString()} {r.disabledAt ? "· Paused" : ""} {r.resolvedAt ? "· Resolved" : ""}
              </p>
            </div>
            {r.siteId ? (
              <button
                type="button"
                onClick={() => toggle.mutate({ siteId: r.siteId!, disabled: !r.disabledAt })}
                className={`rounded-full px-4 py-2 font-medium ${r.disabledAt ? "border border-line" : "bg-[#B42318] text-white"}`}
              >
                {r.disabledAt ? "Un-pause gift" : "Pause gift"}
              </button>
            ) : null}
            {!r.resolvedAt ? (
              <button type="button" onClick={() => dismiss.mutate(r.id)} className="rounded-full border border-line px-4 py-2">
                Dismiss
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
