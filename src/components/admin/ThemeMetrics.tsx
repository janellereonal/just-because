import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getThemeMetrics } from "@/lib/api";

/** Admin only: each theme's numbers, sorted by paid conversion, with a region filter. */
export function ThemeMetrics() {
  const [days, setDays] = useState(30);
  const [region, setRegion] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["theme-metrics", days, region],
    queryFn: () => getThemeMetrics({ data: { days, region } }),
  });
  const pct = (v: number | null) => (v === null ? "·" : `${v}%`);
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Themes</h2>
          <p className="mt-1 text-sm text-muted">Sorted by paid conversion. This is how we pick which themes to build more of.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted">Days</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-full border border-line bg-cream px-3 py-1.5">
              {[7, 30, 90, 365].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs text-muted">Region</span>
            <select
              value={region ?? ""}
              onChange={(e) => setRegion(e.target.value || null)}
              className="rounded-full border border-line bg-cream px-3 py-1.5"
            >
              <option value="">Everywhere</option>
              {(data?.regions ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-cream">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Theme</th>
              <th className="px-3 py-2 font-medium">Gifts made</th>
              <th className="px-3 py-2 font-medium" title="Openings finished out of openings started">Opened all the way</th>
              <th className="px-3 py-2 font-medium" title="Replays out of finished openings">Replayed</th>
              <th className="px-3 py-2 font-medium" title="Shares out of gift opens">Shared</th>
              <th className="px-3 py-2 font-medium" title="Gifts paid for out of gifts made">Paid</th>
              <th className="px-3 py-2 font-medium" title="Make-your-own clicks out of gift opens">Made their own</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-muted">
                  Counting…
                </td>
              </tr>
            ) : !data?.rows.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-3 text-muted">
                  Nothing recorded yet.
                </td>
              </tr>
            ) : (
              data.rows.map((r) => (
                <tr key={r.theme} className="border-t border-line">
                  <td className="px-4 py-2 font-medium">{r.theme}</td>
                  <td className="px-3 py-2 tabular-nums">{r.created}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(r.completion)}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(r.replay)}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(r.share)}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{pct(r.paid)}</td>
                  <td className="px-3 py-2 tabular-nums">{pct(r.makeYourOwn)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
