import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "@/lib/api";

const RANGES = [7, 30, 90] as const;

/**
 * Admin only: how gifts are doing, from our own events table and the gift and note tables.
 * No third-party tracker. Events started being recorded with this release, so older gifts
 * show up in the gift counts but not in the event-based rates.
 */
export function Metrics() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isLoading, error } = useQuery({ queryKey: ["metrics", days], queryFn: () => getMetrics({ data: { days } }) });
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? "None yet" : `${v}%`);
  const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
  const hours = (h: number | null | undefined) =>
    h === null || h === undefined ? "None yet" : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h / 24)} days`;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-14">
      <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Admin</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-medium tracking-tight">How gifts are doing</h2>
        <div className="flex gap-1 rounded-full bg-cream p-1 ring-1 ring-line" role="radiogroup" aria-label="Time range">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={days === d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${days === d ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>
      {error ? <p className="mt-4 text-sm text-[#B4322E]">Couldn't load the numbers.</p> : null}
      {isLoading || !data ? (
        <p className="mt-6 text-sm text-muted">Counting…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="Gifts with 5+ notes" value={pct(data.pctWith5)} detail={`${data.giftsWith5} of ${n(data.gifts, "gift", "gifts")} made`} />
            <Stat label="Friend page to note" value={pct(data.viewToNote)} detail={`${n(data.friendNotes, "note", "notes")} from ${n(data.friendViews, "visit", "visits")}`} />
            <Stat label="Wrapped, then paid" value={pct(data.wrapToPay)} detail={`${data.paid} of ${n(data.wrapped, "gift", "gifts")}`} />
            <Stat label="Recipient opened it" value={pct(data.openRate)} detail={`${data.opened} of ${n(data.published, "sent gift", "sent gifts")}`} />
            <Stat label="Sign-up to first share" value={hours(data.medianHoursToShare)} detail={`Median, ${n(data.sharers, "person", "people")}`} />
            <Stat label="Kept the recommended layout" value={pct(data.keptLayoutPct)} detail={`${data.keptLayout} of ${n(data.gifts, "gift", "gifts")}. ${n(data.layoutChanges, "layout change", "layout changes")}, ${n(data.themeChanges, "theme change", "theme changes")}`} />
          </div>
          <details className="mt-4 rounded-2xl border border-line bg-cream px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium">All events in this range</summary>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 font-medium">Event</th>
                  <th className="py-1 font-medium">Count</th>
                  <th className="py-1 font-medium">Gifts</th>
                </tr>
              </thead>
              <tbody>
                {data.events.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-2 text-muted">
                      Nothing recorded yet.
                    </td>
                  </tr>
                ) : (
                  data.events.map((e) => (
                    <tr key={e.name} className="border-t border-line">
                      <td className="py-1.5 font-mono text-xs">{e.name}</td>
                      <td className="py-1.5 tabular-nums">{e.count}</td>
                      <td className="py-1.5 tabular-nums">{e.gifts}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              Our own records only: no tracker, no cookies, no note content. Views and opens count once per browser tab, and the
              organiser's own visits don't count.
            </p>
          </details>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-line bg-glass/60 px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-medium tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{detail}</p>
    </div>
  );
}
