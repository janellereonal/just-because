import { useQuery } from "@tanstack/react-query";
import { listRefundsDue } from "@/lib/api";
import { formatPeso, getTier } from "@/config/pricing";

/**
 * Payments we owe back: paid twice for one gift, paid more than an upgrade cost, or paid after
 * the gift was deleted. Refund each one by hand in the PayMongo dashboard (Payments, search the
 * payment id, Refund) until refunds are automated (HANDOFF.md, Refunds).
 */
export function RefundsDue() {
  const { data = [] } = useQuery({ queryKey: ["refunds-due"], queryFn: () => listRefundsDue() });
  if (!data.length) return null;
  const total = data.reduce((sum, r) => sum + r.amount, 0);
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">Refunds to make</h2>
      <p className="mt-1 text-sm text-muted">
        {data.length} {data.length === 1 ? "payment" : "payments"}, {formatPeso(total)} in all. Refund each in the PayMongo dashboard: Payments, search the
        payment id, Refund. The buyer was told it's coming within a few days.
      </p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-[#FDF3F0]">
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Refund</th>
              <th className="px-3 py-2 font-medium">Paid</th>
              <th className="px-3 py-2 font-medium">Why</th>
              <th className="px-3 py-2 font-medium">Payment id</th>
              <th className="px-3 py-2 font-medium">Gift</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={`${r.orderId}-${r.at}`} className="border-t border-line align-top">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{formatPeso(r.amount)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.paid != null ? formatPeso(r.paid) : "?"} {r.tier ? `· ${getTier(r.tier)?.name ?? r.tier} ${r.kind ?? ""}` : ""}
                </td>
                <td className="px-3 py-2">{r.why}</td>
                <td className="px-3 py-2 font-mono break-all">{r.paymentId ?? "?"}</td>
                <td className="px-3 py-2">{r.slug ? <a className="underline underline-offset-2" href={`/g/${r.slug}`}>{r.slug}</a> : "deleted"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
