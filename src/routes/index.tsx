import { useCallback, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { Bo3D } from "@/components/Bo3D";
import { fetchThemes } from "@/lib/themes";
import Bo from "@/components/Bo";
import { PricingCards } from "@/components/PricingCards";
import { BoBuddy } from "@/components/BoBuddy";
import { TalkingBo } from "@/components/TalkingBo";
import { HeroScraps } from "@/components/HeroScraps";
import { accessoryForTheme } from "@/lib/bo3d/accessories";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Just Because | One gift from everyone who loves them" },
      {
        name: "description",
        content: "Make a group gift: friends add letters, photos and songs through one link, and they open it all at once.",
      },
      { property: "og:title", content: "Just Because | One gift from everyone who loves them" },
      {
        property: "og:description",
        content: "Make a group gift: friends add letters, photos and songs through one link, and they open it all at once.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    n: "01",
    title: "Pick a theme",
    body: "Birthdays, showers, anniversaries, a send-off. Choose the mood, and Bo dresses up for it.",
    color: "bg-butter",
    chips: ["Happy Birthday", "Bridal Shower", "Anniversary", "Bon Voyage"],
  },
  {
    n: "02",
    title: "Friends add notes",
    body: "Share one link. Friends don't need to sign up. Letters, photos, songs and voice notes all land in the same box.",
    color: "bg-mint",
    chips: ["Letters", "Photos", "Songs", "Voice notes"],
  },
  {
    n: "03",
    title: "Wrap it up",
    body: "Read everything first and hide what you'd rather not show. Then pick a plan and tie the bow.",
    color: "bg-sky",
    chips: ["Approve notes", "Pick a plan", "Get the link"],
  },
  {
    n: "04",
    title: "They open it",
    body: "One link, one moment. Every note floats out for them to keep. No app and no sign-in, just the link.",
    color: "bg-pink",
    chips: ["Opening animation", "Keep forever"],
  },
];

function Index() {
  const navigate = useNavigate();
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  // Scroll progress through the four steps, read by Bo every frame (no re-renders).
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const storySource = useCallback(() => {
    if (typeof window === "undefined") return 0;
    const vh = window.innerHeight || 800;
    let p = 0;
    for (const el of stepRefs.current) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      p += Math.max(0, Math.min(1, (vh * 0.62 - r.top) / Math.max(1, r.height)));
    }
    return p;
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink selection:bg-pink">
      <SiteHeader showMascot={false} />
      <BoBuddy />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-3 pt-6 sm:px-5">
        <div ref={heroRef} className="relative grid overflow-hidden rounded-[40px] bg-pink px-6 pt-10 pb-4 sm:px-12 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-10">
          <HeroScraps heroRef={heroRef} />
          <span aria-hidden="true" className="absolute -top-24 right-10 size-72 rounded-full bg-white/40" />
          <span aria-hidden="true" className="absolute -bottom-28 -left-16 size-80 rounded-full bg-butter/80" />
          <span aria-hidden="true" className="absolute top-1/2 right-1/3 size-24 rounded-full bg-lilac/80" />
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase">
              <span className="size-1.5 rounded-full bg-accent" /> Group gifts, made together
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,6.2vw,4.8rem)] leading-[0.98] font-semibold tracking-tight text-balance">
              One gift from everyone who loves them.
            </h1>
            <p className="mt-5 max-w-[42ch] text-lg text-ink/75 text-pretty">
              Pick a theme, send one link, and friends add notes, photos and songs. They open it all at once,{" "}
              <span className="font-semibold text-accent">just because.</span>
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/themes"
                className="squish inline-flex min-h-14 items-center gap-2 rounded-full bg-ink px-7 text-base font-semibold text-cream hover:bg-ink/90"
              >
                Make a gift
              </Link>
              <a
                href="#how"
                className="squish inline-flex min-h-14 items-center rounded-full bg-white/80 px-7 text-base font-medium hover:bg-white"
              >
                See how it works
              </a>
            </div>
          </div>
          <TalkingBo
            className="mx-auto h-[340px] w-full max-w-[520px] sm:h-[440px]"
            notes
            mood="wave"
            label="Bo the gift box waving, with notes floating around him"
            intro={[
              { text: "Hi, I'm Bo.", face: "wink" },
              { text: "I keep everyone's notes safe in one gift.", face: "happy" },
            ]}
            onTap={[
              { text: "Hehe, that tickles.", face: "happy" },
              { text: "Friends add notes. I hold onto them.", face: "wink" },
              { text: "Then I open up for them, all at once.", face: "love" },
              { text: "Boop.", face: "blep" },
            ]}
          />
        </div>
      </section>

      {/* How it works: Bo acts out each step as you scroll */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-16 sm:px-5">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">How it works</p>
        <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight">
          Four steps, one happy surprise
        </h2>
        <div className="mt-6 grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
          <div className="sticky top-[84px] z-10 order-first -mx-3 h-[300px] sm:mx-0 lg:order-last lg:h-[560px]">
            <div className="relative size-full overflow-hidden bg-lilac sm:rounded-[36px]">
              <span aria-hidden="true" className="absolute -top-14 -left-10 size-48 rounded-full bg-white/40" />
              <Bo3D className="absolute inset-0" notes story={0} storySource={storySource} label="Bo acting out each step" />
            </div>
          </div>
          <div>
            {STEPS.map((step, i) => (
              <article
                key={step.n}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="flex min-h-[78vh] flex-col justify-center gap-4 py-10 lg:min-h-[560px]"
              >
                <span className={`grid size-14 place-items-center rounded-2xl ${step.color} font-display text-xl font-semibold`}>
                  {step.n}
                </span>
                <h3 className="font-display text-4xl leading-none font-semibold tracking-tight sm:text-5xl">{step.title}</h3>
                <p className="max-w-[38ch] text-lg text-ink/75">{step.body}</p>
                <ul className="flex flex-wrap gap-2">
                  {step.chips.map((c) => (
                    <li key={c} className="rounded-full bg-glass px-3.5 py-1.5 text-sm font-medium ring-1 ring-ink/8">
                      {c}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Themes */}
      <section className="mx-auto max-w-6xl px-3 pt-16 sm:px-5">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div data-bo-perch data-bo-x="0.85" data-bo-say="Pick a mood. I'll dress up for it.">
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Themes</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight">
              A mood for every occasion
            </h2>
          </div>
          <Link to="/themes" className="squish inline-flex min-h-12 items-center rounded-full bg-glass px-5 text-sm font-medium ring-1 ring-ink/12 hover:bg-pink/40">
            See all {themes.length > 0 ? themes.length : ""} themes
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {themes.slice(0, 4).map((theme, i) => (
            <div key={theme.id} data-bo-perch data-bo-x="0.72" data-bo-delay={(i % 4) * 90} data-bo-accessory={accessoryForTheme(theme) ?? undefined}>
              <ThemeCard theme={theme} variant="compact" onSelect={() => navigate({ to: "/themes/$id", params: { id: theme.id } })} />
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-20 sm:px-5">
        <div className="mb-8 max-w-2xl" data-bo-perch data-bo-x="0.9" data-bo-say="Making a gift is free.">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Plans</p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            Free to make. Pay once when it's ready to open.
          </h2>
          <p className="mt-3 text-ink/75 text-pretty">
            Setting up the gift and collecting notes from friends costs nothing. You pick a plan when you wrap it up and send the link.
          </p>
        </div>
        <PricingCards />
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-3 pt-20 pb-12 sm:px-5">
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-14 text-center text-cream sm:px-12" data-bo-perch data-bo-x="0.82" data-bo-say="Ready when you are.">
          <span aria-hidden="true" className="absolute -top-16 -left-10 size-56 rounded-full bg-accent/30" />
          <span aria-hidden="true" className="absolute -right-12 -bottom-20 size-64 rounded-full bg-lilac/20" />
          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
            <Bo pose="hello" size={110} />
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              Start a gift tonight. Send it whenever.
            </h2>
            <p className="text-cream/80">Friends can start adding notes the minute you share the link.</p>
            <Link to="/themes" className="squish mt-2 inline-flex min-h-14 items-center rounded-full bg-pink px-8 text-base font-semibold text-ink hover:bg-white">
              Make a gift
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 pb-10 text-sm text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <Bo pose="idle" size={30} title="Bo" />
          <span className="font-display text-base font-semibold text-ink">
            Just <span className="text-accent">Because</span>
          </span>
        </div>
        <p>Made for the people you love.</p>
      </footer>
    </div>
  );
}
