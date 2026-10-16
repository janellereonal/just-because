import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock3,
  EyeOff,
  Heart,
  Image as ImageIcon,
  Link2,
  Mail,
  Mic,
  Music2,
  Sparkles,
  TreePine,
  Type,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BENTO_COUNT, SectionsBento } from "@/components/landing/SectionsBento";
import { MODULES } from "@/lib/gift";
import { ExampleGifts } from "@/components/landing/ExampleGifts";
import { LANDING, LANDING_MORE } from "@/copy/strings";
import { fetchThemes } from "@/lib/themes";
import Bo from "@/components/Bo";
import { PricingCards } from "@/components/PricingCards";
import { BoBuddy } from "@/components/BoBuddy";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { FormatDemo } from "@/components/landing/FormatDemo";
import { FORMATS } from "@/lib/formats";
import { TIERS } from "@/config/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: LANDING.meta.title },
      { name: "description", content: LANDING.meta.description },
      { property: "og:title", content: LANDING.meta.title },
      { property: "og:description", content: LANDING.meta.description },
    ],
  }),
  component: Index,
});

const STEPS = LANDING.how.steps;
const SV = LANDING_MORE.stepVisuals;

function StepVisual({ n }: { n: string }) {
  if (n === "01")
    return (
      <div className="grid grid-cols-3 gap-2">
        {["bg-pink", "bg-butter", "bg-mint", "bg-lilac", "bg-sky", "bg-peach"].map((c, i) => (
          <span
            key={c}
            className={`h-12 rounded-xl ${c} ${i === 1 ? "ring-2 ring-accent ring-offset-2 ring-offset-white" : ""}`}
          />
        ))}
      </div>
    );
  if (n === "02")
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-[13px] ring-1 ring-ink/8">
          <Link2 className="size-4 text-accent" />
          <span className="truncate">{SV.link}</span>
          <span className="ml-auto rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-cream">
            {SV.copy}
          </span>
        </div>
        <div className="flex items-center">
          {["bg-pink", "bg-butter", "bg-mint", "bg-sky", "bg-lilac"].map((c, i) => (
            <span
              key={c}
              className={`-ml-2 grid size-9 place-items-center rounded-full first:ml-0 ${c} text-xs font-semibold ring-2 ring-white`}
            >
              {"SMACP"[i]}
            </span>
          ))}
          <span className="ml-3 text-sm text-ink/70">{SV.joined}</span>
        </div>
      </div>
    );
  if (n === "03")
    return (
      <div className="space-y-2">
        {SV.review.map((r) => (
          <div
            key={r.who}
            className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5 ring-1 ring-ink/6"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">{r.who}</span>
              <span className="block truncate text-xs text-ink/60">{r.text}</span>
            </span>
            {r.ok ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-[11px] font-medium">
                <Check className="size-3" /> {SV.approved}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium ring-1 ring-ink/10">
                <EyeOff className="size-3" /> {SV.hidden}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex items-center gap-4">
      <Bo pose="published" size={84} />
      <div className="rounded-2xl bg-paper px-4 py-3 ring-1 ring-ink/6">
        <p className="text-[13px] font-medium">{SV.opened}</p>
        <p className="text-xs text-ink/60">{SV.openedStats}</p>
      </div>
    </div>
  );
}

const FAQ = [
  ...LANDING_MORE.faq.slice(0, 4),
  ...LANDING_MORE.faq.slice(4, 5),
  {
    q: "How long does the gift stay up?",
    a: `${TIERS.map((t) => `${t.name} stays open for ${t.liveFor.label}`).join(", ")}. You can extend it later.`,
  },
  ...LANDING_MORE.faq.slice(5),
];

function Index() {
  const { user } = useAuth();
  const [allFormats, setAllFormats] = useState(false);
  const navigate = useNavigate();
  const { data: themes = [] } = useQuery({
    queryKey: ["themes", "published"],
    queryFn: () => fetchThemes(false),
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink selection:bg-pink">
      <LandingIntro />
      <SiteHeader showMascot={false} />
      <BoBuddy />

      {/* Hero: what it is, and a real gift you can play with */}
      <section className="mx-auto max-w-6xl px-3 pt-6 sm:px-5">
        <div className="hero-panel relative grid overflow-hidden rounded-[40px] px-6 pt-10 pb-10 sm:px-12 sm:pt-14 lg:grid-cols-[1.08fr_1fr] lg:items-center lg:gap-6">
          <span
            aria-hidden="true"
            className="absolute -top-24 right-10 size-72 rounded-full bg-white/40 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-28 -left-16 size-80 rounded-full bg-butter/70 blur-2xl"
          />
          <div className="relative min-w-0">
            <p
              className="jb-reveal inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase"
              style={{ "--d": "60ms" } as React.CSSProperties}
            >
              <span className="size-1.5 rounded-full bg-accent" /> {LANDING.hero.kicker}
            </p>
            <h1
              className="jb-reveal mt-5 font-display text-[clamp(2.6rem,6.2vw,4.9rem)] leading-[0.96] font-semibold tracking-tight text-balance"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              {LANDING.hero.title}
            </h1>
            <p
              className="jb-reveal mt-5 max-w-[44ch] text-lg text-ink/75 text-pretty"
              style={{ "--d": "200ms" } as React.CSSProperties}
            >
              {LANDING.hero.body}{" "}
              <span className="font-semibold text-accent">{LANDING.hero.bodyAccent}</span>
            </p>
            <div
              className="jb-reveal mt-8 flex flex-wrap items-center gap-3"
              style={{ "--d": "280ms" } as React.CSSProperties}
            >
              <Link
                to="/create"
                className="squish inline-flex min-h-14 items-center gap-2 rounded-full bg-ink px-7 text-base font-semibold text-cream hover:bg-ink/90"
              >
                {LANDING.hero.primary}
              </Link>
              <a
                href="#how"
                className="squish inline-flex min-h-14 items-center rounded-full bg-white/80 px-7 text-base font-medium hover:bg-white"
              >
                {LANDING.hero.secondary}
              </a>
            </div>
            <ul
              className="jb-reveal mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70"
              style={{ "--d": "340ms" } as React.CSSProperties}
            >
              {LANDING.hero.proof.map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-accent" /> {t}
                </li>
              ))}
            </ul>
            <p
              className="jb-reveal mt-4 text-sm text-ink/70"
              style={{ "--d": "400ms" } as React.CSSProperties}
            >
              {LANDING.hero.soloLead}{" "}
              <Link
                to="/create"
                search={{ theme: undefined, format: undefined, from: "me", sections: undefined }}
                className="font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
              >
                {LANDING.hero.soloLink}
              </Link>
            </p>
          </div>
          <div
            className="jb-reveal relative mt-12 min-w-0 lg:mt-0"
            style={{ "--d": "220ms" } as React.CSSProperties}
          >
            <div
              aria-hidden="true"
              className="float-note top-28 -left-14 hidden rotate-[-4deg] xl:block"
              style={{ "--r": "-4deg" } as React.CSSProperties}
            >
              <span className="block font-semibold">Sofia added a letter</span>
              <span className="text-ink/60">just now</span>
            </div>
            <div
              aria-hidden="true"
              className="float-note -right-8 bottom-40 hidden rotate-[5deg] xl:block"
              style={{ "--r": "5deg", animationDelay: "1.4s" } as React.CSSProperties}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Heart className="size-3.5 fill-accent text-accent" /> 12 friends joined
              </span>
            </div>
            <FormatDemo />
          </div>
        </div>
      </section>

      {/* Occasions */}
      <section className="mx-auto mt-10 max-w-6xl px-3 sm:px-5" aria-label="Made for">
        <div className="occasion-marquee">
          <div>
            {[...LANDING.occasions, ...LANDING.occasions].map((o, i) => (
              <span
                key={i}
                aria-hidden={i >= LANDING.occasions.length}
                className="rounded-full bg-glass px-4 py-2 font-display text-[15px] font-medium whitespace-nowrap ring-1 ring-ink/6"
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-24 sm:px-5">
        <div className="max-w-2xl" data-bo-perch data-bo-x="0.92" data-bo-say="Here's how it goes.">
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
            {LANDING.how.kicker}
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            {LANDING.how.title}
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <article key={s.n} className="card-paper flex flex-col gap-5 p-6">
              <span className="font-mono text-xs tracking-[0.16em] text-accent">{s.n}</span>
              <div className="min-h-[104px]">
                <StepVisual n={s.n} />
              </div>
              <div>
                <h3 className="font-display text-xl leading-tight font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{s.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Example gifts */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div data-bo-perch data-bo-x="0.85" data-bo-say="Pick a mood. I'll dress up for it.">
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              {LANDING.examples.kicker}
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight">
              {LANDING.examples.title}
            </h2>
          </div>
          <Link
            to="/themes"
            className="squish inline-flex min-h-12 items-center rounded-full bg-glass px-5 text-sm font-medium ring-1 ring-ink/12 hover:bg-pink/40"
          >
            {LANDING_MORE.themes.link(themes.length)}
          </Link>
        </div>
        <ExampleGifts />
      </section>

      {/* What friends can add */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div
          className="max-w-2xl"
          data-bo-perch
          data-bo-x="0.9"
          data-bo-say="I can hold all of this."
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
            {LANDING.inside.kicker}
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            {LANDING.inside.title}
          </h2>
          <p className="mt-3 text-ink/70">{LANDING.inside.body}</p>
        </div>
        <SectionsBento />
        <p className="mt-5 max-w-2xl text-[15px] text-ink/70">{LANDING.inside.more(MODULES.length - BENTO_COUNT)}</p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-24 sm:px-5">
        <div
          className="mb-8 max-w-2xl"
          data-bo-perch
          data-bo-x="0.9"
          data-bo-say="Plans come at the very end."
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
            {LANDING_MORE.plans.kicker}
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            {LANDING_MORE.plans.title}
          </h2>
          <p className="mt-3 text-ink/75 text-pretty">{LANDING_MORE.plans.body}</p>
        </div>
        <PricingCards />
      </section>

      {/* Formats */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-10 text-cream sm:px-12">
          <span
            aria-hidden="true"
            className="absolute -top-20 -right-10 size-72 rounded-full bg-accent/35 blur-3xl"
          />
          <span
            aria-hidden="true"
            className="absolute -bottom-24 left-10 size-72 rounded-full bg-lilac/25 blur-3xl"
          />
          <div
            className="relative max-w-2xl"
            data-bo-perch
            data-bo-x="0.9"
            data-bo-say="Same notes, new outfit."
          >
            <p className="font-mono text-[11px] tracking-[0.18em] text-pink uppercase">
              {LANDING_MORE.formats.kicker}
            </p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              {LANDING_MORE.formats.title}
            </h2>
            <p className="mt-3 text-cream/70">{LANDING_MORE.formats.body}</p>
          </div>
          <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(allFormats ? FORMATS : FORMATS.slice(0, 4)).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("jb:demo-format", { detail: f.id }));
                  document
                    .querySelector('[aria-label="Gift formats"]')
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="group rounded-[24px] bg-white/6 p-5 text-left ring-1 ring-white/10 transition-colors hover:bg-white/12"
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold">{f.title}</span>
                  {f.isNew ? (
                    <span className="rounded-full bg-pink px-2 py-0.5 text-[10px] font-semibold text-ink">
                      {LANDING_MORE.formats.isNew}
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-cream/70">{f.about}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-pink">
                  <Sparkles className="size-3.5" /> {LANDING_MORE.formats.tryIt}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAllFormats((v) => !v)}
            aria-expanded={allFormats}
            className="squish relative mt-5 inline-flex min-h-11 items-center rounded-full bg-white/10 px-5 text-sm font-medium ring-1 ring-white/15 hover:bg-white/15"
          >
            {allFormats ? LANDING_MORE.formats.seeFewer : LANDING_MORE.formats.seeAll(FORMATS.length)}
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-3 pt-24 sm:px-5" aria-labelledby="faq">
        <h2
          id="faq"
          className="text-center font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] font-semibold tracking-tight"
        >
          {LANDING_MORE.faqTitle}
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="faq group card-paper px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium">
                {f.q}
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pink text-xl leading-none transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-3 pt-24 pb-12 sm:px-5">
        <div
          className="relative overflow-hidden rounded-[40px] bg-pink px-6 py-14 text-center sm:px-12"
          data-bo-perch
          data-bo-x="0.82"
          data-bo-say="Ready when you are."
        >
          <span
            aria-hidden="true"
            className="absolute -top-16 -left-10 size-56 rounded-full bg-white/50 blur-2xl"
          />
          <span
            aria-hidden="true"
            className="absolute -right-12 -bottom-20 size-64 rounded-full bg-butter/70 blur-2xl"
          />
          <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
            <Bo pose="hello" size={110} />
            <h2 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              {LANDING.closing.title}
            </h2>
            <p className="text-ink/70">{LANDING.closing.body}</p>
            <Link
              to="/create"
              className="squish mt-2 inline-flex min-h-14 items-center rounded-full bg-ink px-8 text-base font-semibold text-cream hover:bg-ink/90"
            >
              {LANDING.closing.cta}
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
        <nav className="flex gap-5" aria-label="Footer">
          <Link to="/themes" className="hover:text-ink">
            {LANDING_MORE.footer.themes}
          </Link>
          <a href="#pricing" className="hover:text-ink">
            {LANDING_MORE.footer.plans}
          </a>
          {user ? (
            <Link to="/dashboard" className="hover:text-ink">
              {LANDING_MORE.footer.myGifts}
            </Link>
          ) : (
            <Link to="/auth" className="hover:text-ink">
              {LANDING_MORE.footer.signIn}
            </Link>
          )}
        </nav>
        <p>{LANDING_MORE.footer.line}</p>
      </footer>
    </div>
  );
}
