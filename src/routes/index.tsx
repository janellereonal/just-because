import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { fetchThemes } from "@/lib/themes";
import heroScrapbook from "@/assets/hero-scrapbook.jpg";
import heroPolaroid from "@/assets/hero-polaroid.jpg";
import Bo from "@/components/Bo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Just Because — Made for the people you love" },
      {
        name: "description",
        content:
          "Build a shared gift site where friends add letters, photos and songs, then send one link.",
      },
      { property: "og:title", content: "Just Because — Made for the people you love" },
      {
        property: "og:description",
        content:
          "Build a shared gift site where friends add letters, photos and songs, then send one link.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-accent/20">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 -left-24 size-[420px] rounded-full bg-glass/60 blur-3xl" />
        <div className="absolute top-1/3 -right-20 size-[380px] rounded-full bg-accent-soft/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-[360px] rounded-full bg-glass/50 blur-3xl" />
      </div>

      <SiteHeader showMascot={false} />

      <section className="mx-auto max-w-6xl px-5 pt-14 pb-10">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="rise lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              <span className="size-1.5 rounded-full bg-accent" /> Collaborative gift sites
            </span>
            <div className="mt-4 flex items-center gap-2 sm:gap-5">
              <h1 className="font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.02] font-medium tracking-tight text-balance">
                Made for the people you love,
                <br />
                <span className="text-accent italic">Just Because.</span>
              </h1>
              <Bo pose="hello" size={180} className="shrink-0" />
            </div>
            <p className="mt-6 max-w-[46ch] text-lg text-muted text-pretty">
              A shared scrapbook for the moments that matter. Friends and family add letters,
              photos and songs — you hand them a single link.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/themes"
                className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-cream transition-colors hover:bg-accent/90"
              >
                Start a gift
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
              <Link
                to="/themes"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-glass/60 px-6 py-3.5 text-sm font-medium backdrop-blur-md transition-colors hover:bg-glass/80"
              >
                Browse themes
              </Link>
            </div>
          </div>

          <div className="relative h-[420px] lg:col-span-5">
            <div className="absolute inset-0 grid place-items-center">
              <div className="settle w-[78%] rotate-[-3deg] [animation-delay:120ms]">
                <img
                  src={heroScrapbook}
                  alt="A handmade scrapbook of taped photos and handwritten notes"
                  width={1024}
                  height={1280}
                  className="aspect-[4/5] w-full rounded-2xl object-cover ring-1 ring-ink/5"
                />
              </div>
            </div>
            <div className="settle absolute top-6 left-0 w-[46%] rotate-[4deg] [animation-delay:260ms]">
              <img
                src={heroPolaroid}
                alt="A taped polaroid of two friends laughing"
                width={816}
                height={816}
                loading="lazy"
                className="aspect-square w-full rounded-xl object-cover ring-1 ring-ink/5"
              />
            </div>
            <div className="settle absolute right-0 bottom-4 w-[42%] rotate-[-5deg] [animation-delay:400ms]">
              <div className="rounded-xl bg-cream p-4 shadow-sm ring-1 ring-ink/5">
                <p className="font-display text-sm leading-snug text-ink italic">
                  "Thank you for being my person."
                </p>
                <p className="mt-2 font-mono text-[11px] text-muted">— Priya</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              (a) Choose a theme
            </p>
            <h2 className="mt-2 font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              Pick the mood of the moment
            </h2>
          </div>
          <span className="hidden text-sm text-muted sm:block">
            {themes.length} themes, one neutral shell
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {themes.map((theme, i) => (
            <ThemeCard key={theme.id} theme={theme} tiltRight={i % 2 === 1} />
          ))}
        </div>
      </section>

      <footer className="mt-6 border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Bo pose="idle" size={32} title="Bo" />
            <span className="font-display font-semibold tracking-tight">Just Because</span>
          </div>
          <p className="text-sm text-muted">Made for the people you love.</p>
        </div>
      </footer>
    </div>
  );
}
