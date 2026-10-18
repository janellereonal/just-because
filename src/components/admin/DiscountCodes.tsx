/** Admin: make discount codes, turn them off, and see how often each was used. */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createDiscountCode, listDiscountCodes, updateDiscountCode } from "@/lib/api";
import { TIERS, formatPeso, getTier, type DiscountType, type TierId } from "@/config/pricing";

const field = "w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-accent";

function errorText(error: unknown) {
  const msg = error instanceof Error ? error.message : "";
  return msg && msg.length < 200 ? msg : "Couldn't save that code.";
}

/** A date input value ("2026-11-01") as the end of that day in the admin's time zone. */
function endOfDay(value: string): string | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, m! - 1, d!, 23, 59, 59).toISOString();
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DiscountCodes() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-codes"], queryFn: () => listDiscountCodes() });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-codes"] });

  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("20");
  const [plans, setPlans] = useState<TierId[]>([]);
  const [maxUses, setMaxUses] = useState("");
  const [maxPerUser, setMaxPerUser] = useState("1");
  const [expires, setExpires] = useState("");
  const [note, setNote] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createDiscountCode({
        data: {
          code: code.trim(),
          type,
          value: type === "free" ? 0 : Number(value) || 0,
          plans,
          maxUses: maxUses ? Number(maxUses) : null,
          maxPerUser: maxPerUser ? Number(maxPerUser) : null,
          expiresAt: endOfDay(expires),
          note,
        },
      }),
    onSuccess: () => {
      toast.success(`${code.trim().toUpperCase()} is ready to use.`);
      setCode("");
      setNote("");
      refresh();
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; active?: boolean; expiresAt?: string | null }) => updateDiscountCode({ data: v }),
    onSuccess: refresh,
    onError: (e) => toast.error(errorText(e)),
  });

  const codes = data?.codes ?? [];
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">Discount codes</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        Codes work on a gift's first plan. A use counts only once the payment is confirmed (or a free code opens the gift). Codes aren't case sensitive.
      </p>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Gives</th>
              <th className="px-4 py-3">Plans</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Per person</th>
              <th className="px-4 py-3">Ends</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-muted">
                  No codes yet.
                </td>
              </tr>
            ) : null}
            {codes.map((c) => {
              const ended = !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
              const usedUp = c.maxUses !== null && c.usedCount >= c.maxUses;
              return (
                <tr key={c.id} className={`border-t border-line ${!c.active || ended || usedUp ? "text-muted" : ""}`}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-medium">{c.code}</span>
                    {c.note ? <span className="block text-xs text-muted">{c.note}</span> : null}
                  </td>
                  <td className="px-4 py-3">{c.label}</td>
                  <td className="px-4 py-3">{c.plans.length ? c.plans.map((p) => getTier(p)?.name ?? p).join(", ") : "All"}</td>
                  <td className="px-4 py-3">
                    {c.usedCount}
                    {c.maxUses !== null ? ` / ${c.maxUses}` : ""}
                    {usedUp ? <span className="block text-xs">Used up</span> : null}
                  </td>
                  <td className="px-4 py-3">{c.maxPerUser ?? "No limit"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      aria-label={`When ${c.code} ends`}
                      defaultValue={c.expiresAt ? c.expiresAt.slice(0, 10) : ""}
                      onChange={(e) => update.mutate({ id: c.id, expiresAt: endOfDay(e.target.value) })}
                      className="rounded-lg border border-line bg-paper px-2 py-1 text-xs"
                    />
                    {ended ? <span className="block text-xs">Ended</span> : !c.expiresAt ? <span className="block text-xs text-muted">Never</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => update.mutate({ id: c.id, active: !c.active })}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium ${c.active ? "border border-line" : "bg-ink text-cream"}`}
                    >
                      {c.active ? "Turn off" : "Turn on"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form
        className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <p className="font-medium sm:col-span-2 lg:col-span-4">New code</p>
        <label className="text-xs text-muted">
          Code
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, "").toUpperCase())} placeholder="LAUNCH20" required minLength={3} maxLength={40} pattern="[A-Za-z0-9_-]+" className={`${field} mt-1 font-mono`} />
        </label>
        <label className="text-xs text-muted">
          Type
          <select value={type} onChange={(e) => setType(e.target.value as DiscountType)} className={`${field} mt-1`}>
            <option value="percent">Percent off</option>
            <option value="fixed">Pesos off</option>
            <option value="free">Free plan</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          {type === "percent" ? "Percent off" : type === "fixed" ? "Pesos off" : "Value"}
          <input
            type="number"
            min={type === "percent" ? 1 : 1}
            max={type === "percent" ? 100 : 100000}
            value={type === "free" ? "" : value}
            disabled={type === "free"}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "free" ? "Free" : ""}
            required={type !== "free"}
            className={`${field} mt-1`}
          />
        </label>
        <fieldset className="text-xs text-muted">
          <legend>Plans (none ticked = all)</legend>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink">
            {TIERS.map((t) => (
              <label key={t.id} className="flex items-center gap-1.5">
                <input type="checkbox" checked={plans.includes(t.id)} onChange={(e) => setPlans((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))} />
                {t.name} <span className="text-muted">{formatPeso(t.amount)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="text-xs text-muted">
          Max uses in total (empty = no limit)
          <input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-muted">
          Max per person (empty = no limit)
          <input type="number" min={1} value={maxPerUser} onChange={(e) => setMaxPerUser(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-muted">
          Ends on (empty = never)
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-muted">
          Note (only you see it)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={`${field} mt-1`} />
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={create.isPending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream disabled:opacity-60">
            {create.isPending ? "Saving…" : "Make code"}
          </button>
        </div>
      </form>

      {data?.recent.length ? (
        <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm">
          <p className="font-medium">Paid gifts that used a code</p>
          <ul className="mt-2 space-y-1">
            {data.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-x-3 text-muted">
                <span className="font-mono text-ink">{r.code}</span>
                <span>{getTier(r.tier)?.name ?? r.tier}</span>
                <span>
                  paid {formatPeso(r.amount)} (−{formatPeso(r.off)})
                </span>
                {r.slug ? (
                  <a href={`/g/${r.slug}`} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    /g/{r.slug}
                  </a>
                ) : (
                  <span>gift deleted</span>
                )}
                <span>{shortDate(r.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
