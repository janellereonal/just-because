import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listConciergeRequests, setConciergeStatus } from "@/lib/api";

const STATUSES = [
  ["new", "New"],
  ["contacted", "Contacted"],
  ["in_progress", "In progress"],
  ["done", "Done"],
] as const;

type Row = {
  id: string;
  site_id: string | null;
  recipient: string;
  occasion: string;
  deadline: string;
  friends: number;
  contact: string;
  time_zone: string;
  notes: string | null;
  status: string;
  created_at: string;
  organiser: string | null;
  organiser_email: string | null;
};

/** Admin only: concierge beta requests, newest first, with a status you move along by hand. */
export function ConciergeRequests() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["concierge"], queryFn: async () => (await listConciergeRequests()) as unknown as Row[] });
  const open = data.filter((r) => r.status !== "done").length;
  return (
    <section id="concierge" className="mx-auto max-w-6xl px-5 pt-14">
      <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Admin</p>
      <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">Concierge requests</h2>
      <p className="mt-2 text-sm text-muted">
        {isLoading ? "Loading…" : data.length === 0 ? "No requests yet." : `${data.length} in total, ${open} still open. We promised a reply within 24 hours.`}
      </p>
      <div className="mt-5 space-y-3">
        {data.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-glass/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">
                  {r.recipient} · {r.occasion}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Needed by {r.deadline} ({r.time_zone}) · about {r.friends} friends · asked {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <select
                aria-label={`Status for ${r.recipient}`}
                value={r.status}
                onChange={(e) => {
                  const status = e.target.value as (typeof STATUSES)[number][0];
                  void setConciergeStatus({ data: { id: r.id, status } })
                    .then(() => queryClient.invalidateQueries({ queryKey: ["concierge"] }))
                    .catch(() => toast.error("Couldn't change that."));
                }}
                className="rounded-full border border-line bg-cream px-3 py-1.5 text-sm"
              >
                {STATUSES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-sm">
              {r.organiser || "Someone"} {r.organiser_email ? `(${r.organiser_email})` : ""} · reach them at <span className="font-medium">{r.contact}</span>
            </p>
            {r.notes ? <p className="mt-2 text-sm whitespace-pre-line text-muted">{r.notes}</p> : null}
            {r.site_id ? (
              <a href={`/sites/${r.site_id}`} className="mt-2 inline-block text-sm text-accent underline underline-offset-2">
                Open their gift
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
