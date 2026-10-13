import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { listMySites } from "@/lib/api";
import { isGiftEnded, normalizeSite } from "@/lib/gift";
import { getTier } from "@/config/pricing";
import Bo from "@/components/Bo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your gifts — Just Because" },
      { name: "description", content: "Every gift site you're building or have published." },
      { property: "og:title", content: "Your gifts — Just Because" },
      {
        property: "og:description",
        content: "Every gift site you're building or have published.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: sites = [], isLoading } = useQuery({
    queryKey: ["my-sites"],
    queryFn: async () => {
      const data = await listMySites();
      return data.map((row) => normalizeSite(row as Record<string, unknown>));
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader showMascot={!isLoading && sites.length > 0} />
      <section className="mx-auto max-w-4xl px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              Your gifts
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">
              Everything you're making
            </h1>
          </div>
          <Link
            to="/themes"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-accent/90"
          >
            New gift
          </Link>
        </div>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted">Loading…</p>
        ) : sites.length === 0 ? (
          <div className="card-paper mt-10 p-10 text-center">
            <Bo pose="idle" size={140} />
            <p className="mt-2 font-display text-xl">No gifts yet. Let's make one for someone you love.</p>
            <Link
              to="/themes"
              className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream"
            >
              Start a gift
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {sites.map((site) => (
              <Link
                key={site.id}
                to="/sites/$id"
                params={{ id: site.id }}
                className="card-paper flex flex-wrap items-center justify-between gap-4 p-5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <p className="font-display text-lg font-medium tracking-tight">{site.title}</p>
                  <p className="font-mono text-xs text-muted">/{site.slug}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    site.status === "published"
                      ? "bg-ink text-cream"
                      : "border border-line bg-cream text-muted"
                  }`}
                >
                  {isGiftEnded(site)
                    ? "Ended"
                    : site.status === "published"
                      ? `Open${getTier(site.tier) ? ` · ${getTier(site.tier)!.name}` : ""}`
                      : site.tier
                        ? "Paid, offline"
                        : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
