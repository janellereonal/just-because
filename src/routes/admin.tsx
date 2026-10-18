import { useState } from "react";
import { NOINDEX } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { ConciergeRequests } from "@/components/admin/ConciergeRequests";
import { Metrics } from "@/components/admin/Metrics";
import { ThemeMetrics } from "@/components/admin/ThemeMetrics";
import { usePreviewUrl } from "@/components/ThemeCard";
import { fetchThemes, type Theme } from "@/lib/themes";
import { getPaymentsSetup, listPaymentLog, setThemePreview, setThemeStatus, setupPaymongoWebhook } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { useAuth } from "@/hooks/useAuth";
import { AdminReports } from "@/components/admin/AdminReports";
import { DiscountCodes } from "@/components/admin/DiscountCodes";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [NOINDEX, 
      { title: "Theme admin | Just Because" },
      { name: "description", content: "Manage the Just Because theme template library." },
      { property: "og:title", content: "Theme admin | Just Because" },
      {
        property: "og:description",
        content: "Manage the Just Because theme template library.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "all"],
    queryFn: () => fetchThemes(true),
    enabled: isAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: async (theme: Theme) => {
      const next = theme.status === "published" ? "draft" : "published";
      await setThemeStatus({ data: { id: theme.id, status: next } });
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["themes"] });
      toast.success(next === "published" ? "Theme published." : "Theme hidden from creators.");
    },
    onError: () => toast.error("Couldn't update that theme."),
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted">Checking access…</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <SiteHeader />
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <h1 className="font-display text-2xl font-medium tracking-tight">Admins only</h1>
          <p className="mt-2 text-sm text-muted">
            This space manages the shared theme library.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <ConciergeRequests />
      <Metrics />
      <ThemeMetrics />
      <AdminReports />
      <PaymentsSetup />
      <DiscountCodes />
      <PaymentLog />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Admin</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Theme library</h1>
        <p className="mt-3 max-w-[52ch] text-muted">
          Upload preview images and control which themes creators can pick.
        </p>

        <div className="mt-8 space-y-3">
          {themes.map((theme) => (
            <AdminThemeRow
              key={theme.id}
              theme={theme}
              onToggle={() => toggleStatus.mutate(theme)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminThemeRow({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const queryClient = useQueryClient();
  const previewUrl = usePreviewUrl(theme.preview_image_url);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    let url: string;
    try {
      url = await uploadFile(file, "theme", theme.id);
    } catch {
      setUploading(false);
      toast.error("Upload failed. Images must be under 10MB.");
      return;
    }
    try {
      await setThemePreview({ data: { id: theme.id, url } });
    } catch {
      setUploading(false);
      toast.error("Saved the image but couldn't link it to the theme.");
      return;
    }
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ["themes"] });
    toast.success("Preview image updated.");
  }

  return (
    <div className="card-paper flex flex-wrap items-center gap-4 p-4">
      <div
        className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl ring-1 ring-ink/5"
        style={{ backgroundColor: theme.palettes[0]?.background ?? "transparent" }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={theme.name} className="size-full object-cover" />
        ) : (
          <span className="font-mono text-[10px] text-muted">no image</span>
        )}
      </div>

      <div className="min-w-[180px] flex-1">
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          {theme.category}
        </p>
        <p className="font-display text-lg font-medium tracking-tight">{theme.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {theme.palettes.map((palette, i) => (
            <div key={i} className="flex gap-1">
              {[palette.background, palette.primary, palette.accent].map((c) => (
                <span
                  key={c}
                  className="size-3.5 rounded-full ring-1 ring-ink/5"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <label className="cursor-pointer rounded-full border border-line bg-glass/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-glass/80">
        {uploading ? "Uploading…" : "Upload preview"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </label>

      <button
        onClick={onToggle}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          theme.status === "published"
            ? "bg-ink text-cream hover:bg-ink/90"
            : "border border-line bg-cream hover:bg-glass/70"
        }`}
      >
        {theme.status === "published" ? "Published" : "Draft"}
      </button>
    </div>
  );
}

/** Read-only checklist: is PayMongo wired up? Shows whether things are set, never their values. */
function PaymentsSetup() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["payments-setup"], queryFn: () => getPaymentsSetup() });
  const setupWebhook = useMutation({
    mutationFn: () => setupPaymongoWebhook(),
    onSuccess: (result) => {
      toast.success(`PayMongo webhook: ${result.action}.`);
      void queryClient.invalidateQueries({ queryKey: ["payments-setup"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error && error.message.length < 200 ? error.message : "That didn't work. Try again."),
  });
  if (!data) return null;
  const rows: { ok: boolean; label: string; help: string }[] = [
    {
      ok: data.keyMode === "test",
      label:
        data.keyMode === "test"
          ? "PayMongo test key is set"
          : data.keyMode === "live"
            ? data.liveAllowed
              ? "Live key is set and allowed"
              : "A live key is set but blocked (test mode only for now)"
            : "PayMongo secret key isn't set",
      help: "Vercel → Settings → Environment Variables → PAYMONGO_SECRET_KEY (sk_test_…)",
    },
    {
      ok: data.webhookReady,
      label: data.webhookReady
        ? `PayMongo ${data.keyMode} webhook is on for this site`
        : data.webhooksError ?? `PayMongo has no working ${data.keyMode === "live" ? "live" : "test"} webhook for this site`,
      help: "Press “Set up the webhook” below. It uses the secret key that's already in Vercel.",
    },
    {
      ok: data.appBaseUrlSet,
      label: data.appBaseUrlSet ? "APP_BASE_URL is set" : "APP_BASE_URL isn't set (falling back to the auth URL)",
      help: "Set APP_BASE_URL to https://justbecause.site",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 pt-14">
      <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Admin</p>
      <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">Payments setup</h2>
      <div className="mt-6 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 rounded-2xl border border-line bg-glass/60 px-4 py-3">
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                row.ok ? "bg-accent text-cream" : "border border-line text-muted"
              }`}
              aria-hidden
            >
              {row.ok ? "✓" : ""}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.label}</p>
              {!row.ok ? <p className="mt-0.5 text-xs text-muted">{row.help}</p> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-line bg-cream px-4 py-3 text-sm">
        <p className="text-muted">Webhook URL to register in PayMongo</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(data.webhookUrl);
            toast.success("Webhook URL copied.");
          }}
          className="mt-1 break-all text-left font-mono text-xs underline-offset-2 hover:underline"
        >
          {data.webhookUrl}
        </button>
        {data.webhooks ? (
          <div className="mt-3">
            <p className="text-muted">
              Webhooks PayMongo has ({data.keyMode} mode){data.webhooks.length === 0 ? ": none" : ""}
            </p>
            <ul className="mt-1 space-y-1 font-mono text-xs">
              {data.webhooks.map((w) => (
                <li key={`${w.url}-${w.events.join()}`} className="break-all">
                  {w.url} · {w.events.join(", ")} · {w.status}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {!data.webhookReady && (data.keyMode === "test" || (data.keyMode === "live" && data.liveAllowed)) ? (
          <button
            type="button"
            disabled={setupWebhook.isPending}
            onClick={() => setupWebhook.mutate()}
            className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-medium text-cream disabled:opacity-60"
          >
            {setupWebhook.isPending ? "Setting up…" : "Set up the webhook"}
          </button>
        ) : null}
        <p className="mt-3 text-muted">
          {data.webhookSecretSet
            ? "Webhook secret is set, so signed events are checked too."
            : "No webhook secret set. That's fine: every payment is confirmed by asking PayMongo directly."}
        </p>
        <p className="mt-3 text-muted">
          Payment methods offered: {data.methods.join(", ")} · Paid orders: {data.paidOrders} · Waiting: {data.pendingOrders}
        </p>
        <p className="mt-1 text-muted">
          Card payments: {data.cardPayments.local} from Philippine cards · {data.cardPayments.foreign} from foreign cards
          {data.cardPayments.unknown ? ` · ${data.cardPayments.unknown} unknown` : ""}. When foreign cards pass about 20% of
          paid gifts, it's time for dollar prices or a second provider (docs/payments-international.md).
        </p>
      </div>
    </section>
  );
}

/** The last 60 payment signals: webhooks, confirm-page and editor checks, the daily job. */
function PaymentLog() {
  const { data = [] } = useQuery({ queryKey: ["payment-log"], queryFn: () => listPaymentLog() });
  if (!data.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">Payment log</h2>
      <p className="mt-1 text-sm text-muted">Newest first. "Needs a refund" lines are payments for a gift that already had that plan, or was deleted.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-cream">
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 font-medium">What happened</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className={`border-t border-line ${/refund/i.test(r.outcome) ? "bg-[#FDF3F0]" : ""}`}>
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.source}</td>
                <td className="px-3 py-2 font-mono">{r.event}</td>
                <td className="px-3 py-2">{r.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
