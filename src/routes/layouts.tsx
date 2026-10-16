import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { FormatShowroom } from "@/components/landing/FormatShowroom";
import { fetchThemes } from "@/lib/themes";
import { formatInfo } from "@/lib/formats";
import { recommendedLayout } from "@/lib/recommendedLayout";
import { LAYOUTS_PAGE, MODEL_LINE } from "@/copy/strings";

export const Route = createFileRoute("/layouts")({
  head: () => ({
    meta: [
      { title: "Layouts | Just Because" },
      { name: "description", content: LAYOUTS_PAGE.meta },
      { property: "og:title", content: "Layouts | Just Because" },
      { property: "og:description", content: LAYOUTS_PAGE.meta },
    ],
  }),
  component: LayoutsPage,
});

function LayoutsPage() {
  const { data: themes = [] } = useQuery({ queryKey: ["themes", "published"], queryFn: () => fetchThemes(false) });
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 pt-8 pb-24 sm:px-5">
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-10 text-cream sm:px-12">
          <span aria-hidden="true" className="absolute -top-20 -right-10 size-72 rounded-full bg-accent/35 blur-3xl" />
          <span aria-hidden="true" className="absolute -bottom-24 left-10 size-72 rounded-full bg-lilac/25 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="font-mono text-[11px] tracking-[0.18em] text-pink uppercase">{LAYOUTS_PAGE.kicker}</p>
            <h1 className="mt-2 font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              {LAYOUTS_PAGE.title}
            </h1>
            <p className="mt-3 text-cream/70">{LAYOUTS_PAGE.body}</p>
            <p className="mt-2 text-sm text-cream/55">{MODEL_LINE}</p>
          </div>
          <FormatShowroom />
        </div>

        {themes.length ? (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold">{LAYOUTS_PAGE.pairsTitle}</h2>
            <p className="mt-1 text-ink/70">{LAYOUTS_PAGE.pairsBody}</p>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {themes.map((t) => {
                const pick = recommendedLayout(t.name);
                return (
                  <li key={t.id} className="card-paper p-4">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-muted uppercase">{t.name}</p>
                    <p className="mt-0.5 font-display text-lg font-semibold">{formatInfo(pick.layout).title}</p>
                    <p className="mt-0.5 text-sm text-muted">{pick.why}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="mt-12 flex justify-center">
          <Link to="/create" className="squish inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-cream hover:bg-accent/90">
            {LAYOUTS_PAGE.cta}
          </Link>
        </div>
      </main>
    </div>
  );
}
