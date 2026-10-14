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
  Lock,
  Mail,
  Mic,
  Music2,
  Sparkles,
  TreePine,
  Type,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ThemeCard } from "@/components/ThemeCard";
import { fetchThemes } from "@/lib/themes";
import Bo from "@/components/Bo";
import { PricingCards } from "@/components/PricingCards";
import { BoBuddy } from "@/components/BoBuddy";
import { accessoryForTheme } from "@/lib/bo3d/accessories";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { FormatDemo } from "@/components/landing/FormatDemo";
import { FORMATS } from "@/lib/formats";
import { TIERS, paymentMethodsSentence } from "@/config/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Just Because | One gift from everyone who loves them" },
      {
        name: "description",
        content:
          "Make a group gift page: friends add letters, photos, songs and voice notes through one link, and they open it all at once.",
      },
      { property: "og:title", content: "Just Because | One gift from everyone who loves them" },
      {
        property: "og:description",
        content:
          "Make a group gift page: friends add letters, photos, songs and voice notes through one link, and they open it all at once.",
      },
    ],
  }),
  component: Index,
});

const OCCASIONS = [
  "Birthdays",
  "Debuts",
  "Send-offs",
  "Weddings",
  "Bridal showers",
  "Anniversaries",
  "Graduations",
  "Christmas",
  "Get well soon",
  "Just because",
];

const ADDS = [
  {
    icon: Mail,
    title: "Letters",
    body: "Long, short, funny, teary. Everyone writes their own.",
    tint: "bg-butter",
    span: "col-span-2",
  },
  {
    icon: ImageIcon,
    title: "Photos",
    body: "Throwbacks and blurry 2am shots, with captions.",
    tint: "bg-pink",
    span: "sm:col-span-2",
  },
  {
    icon: Music2,
    title: "Songs",
    body: "Paste a Spotify or YouTube link. It plays right on the page.",
    tint: "bg-lilac",
    span: "",
  },
  {
    icon: Mic,
    title: "Voice notes",
    body: "Hear Lola say happy birthday, again and again.",
    tint: "bg-mint",
    span: "",
  },
  {
    icon: Type,
    title: "Word cloud",
    body: "One word each. Together it says a lot.",
    tint: "bg-sky",
    span: "",
  },
  {
    icon: Clock3,
    title: "Countdown",
    body: "A live countdown to the big day.",
    tint: "bg-peach",
    span: "",
  },
  {
    icon: CalendarDays,
    title: "Advent calendar",
    body: "A little surprise behind each date. You plan it.",
    tint: "bg-lilac",
    span: "sm:col-span-2",
  },
  {
    icon: TreePine,
    title: "Wish tree",
    body: "Ornaments with secret wishes only they can read.",
    tint: "bg-mint",
    span: "col-span-2",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick a theme and a format",
    body: "Choose the occasion, the colors and how it opens: a scrapbook, a comic, tiles, a gift hunt or a zine.",
  },
  {
    n: "02",
    title: "Share one link",
    body: "Friends open it on their phone and add notes. No app, no account, no group chat chaos.",
  },
  {
    n: "03",
    title: "Read everything first",
    body: "Every note waits for you. Approve the sweet ones, hide anything you'd rather not show.",
  },
  {
    n: "04",
    title: "Wrap it up and send",
    body: "Pick a plan, tie the bow, and send them one link they can keep for years.",
  },
];

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
          <span className="truncate">justbecause.site/c/maya-21</span>
          <span className="ml-auto rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-cream">
            Copy
          </span>
        </div>
        <div className="flex items-center">
          {["bg-pink", "bg-butter", "bg-mint", "bg-sky", "bg-lilac"].map((c, i) => (
            <span
              key={c}
              className={`-ml-2 grid size-9 place-items-center rounded-full first:ml-0 ${c} text-xs font-semibold ring-2 ring-white`}
            >
              {"MJPBL"[i]}
            </span>
          ))}
          <span className="ml-3 text-sm text-ink/70">+14 notes</span>
        </div>
      </div>
    );
  if (n === "03")
    return (
      <div className="space-y-2">
        {[
          { who: "Mama", text: "So proud of you, anak.", ok: true },
          { who: "Paolo", text: "Remember the karaoke?", ok: false },
        ].map((r) => (
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
                <Check className="size-3" /> Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium ring-1 ring-ink/10">
                <EyeOff className="size-3" /> Hidden
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
        <p className="text-[13px] font-medium">Maya opened her gift</p>
        <p className="text-xs text-ink/60">18 notes, 9 photos, 3 songs</p>
      </div>
    </div>
  );
}

const FAQ = [
  {
    q: "Do my friends need an account?",
    a: "No. They open your link, type their name and add a note. That's it.",
  },
  {
    q: "Can I see notes before they do?",
    a: "Yes. Every note waits for you to approve it, and you can hide anything before you send the gift.",
  },
  {
    q: "When do I pay?",
    a: `Only when you wrap it up. Making the gift and collecting notes is free. You can pay with ${paymentMethodsSentence()}.`,
  },
  {
    q: "How long does the gift stay up?",
    a: `${TIERS.map((t) => `${t.name} stays open for ${t.liveFor.label}`).join(", ")}. You can extend it later.`,
  },
  {
    q: "Can I keep it private?",
    a: "The link is only shared by you. On Celebration and Keepsake you can add a password too.",
  },
  {
    q: "Can I change the format later?",
    a: "Any time before or after you send it. The notes stay the same, only the way it opens changes.",
  },
];

function Index() {
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
              <span className="size-1.5 rounded-full bg-accent" /> Group gifts, made together
            </p>
            <h1
              className="jb-reveal mt-5 font-display text-[clamp(2.6rem,6.2vw,4.9rem)] leading-[0.96] font-semibold tracking-tight text-balance"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              One gift from everyone who loves them.
            </h1>
            <p
              className="jb-reveal mt-5 max-w-[44ch] text-lg text-ink/75 text-pretty"
              style={{ "--d": "200ms" } as React.CSSProperties}
            >
              Make one gift page and share the link. Friends add letters, photos, songs and voice
              notes from their phones. Then they open it all at once,{" "}
              <span className="font-semibold text-accent">just because.</span>
            </p>
            <div
              className="jb-reveal mt-8 flex flex-wrap items-center gap-3"
              style={{ "--d": "280ms" } as React.CSSProperties}
            >
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
            <ul
              className="jb-reveal mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70"
              style={{ "--d": "340ms" } as React.CSSProperties}
            >
              {["Free to make", "Friends don't need an account", "Pay once with GCash or card"].map(
                (t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Check className="size-4 text-accent" /> {t}
                  </li>
                ),
              )}
            </ul>
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
              <span className="block font-semibold">Mama added a letter</span>
              <span className="text-ink/60">just now</span>
            </div>
            <div
              aria-hidden="true"
              className="float-note -right-8 bottom-40 hidden rotate-[5deg] xl:block"
              style={{ "--r": "5deg", animationDelay: "1.4s" } as React.CSSProperties}
            >
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Heart className="size-3.5 fill-accent text-accent" /> 14 friends joined
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
            {[...OCCASIONS, ...OCCASIONS].map((o, i) => (
              <span
                key={i}
                aria-hidden={i >= OCCASIONS.length}
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
            How it works
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            You set it up. Friends fill it. They open it.
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

      {/* What friends can add */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div
          className="max-w-2xl"
          data-bo-perch
          data-bo-x="0.9"
          data-bo-say="I can hold all of this."
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
            What goes inside
          </p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            More than a card. Less work than a scrapbook.
          </h2>
          <p className="mt-3 text-ink/70">
            Turn on the sections you want. Friends only see what you pick.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {ADDS.map(({ icon: Icon, title, body, tint, span }) => (
            <article
              key={title}
              className={`group relative overflow-hidden rounded-[28px] p-5 sm:p-6 ${tint} ${span} transition-transform duration-300 hover:-translate-y-1`}
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-white/70 transition-transform duration-300 group-hover:rotate-[-8deg]">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 font-display text-lg font-semibold sm:mt-8 sm:text-xl">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink/70 sm:text-[15px]">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Formats */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-14 text-cream sm:px-12">
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
            <p className="font-mono text-[11px] tracking-[0.18em] text-pink uppercase">Formats</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
              Five ways to open the same gift.
            </h2>
            <p className="mt-3 text-cream/70">Switch any time. Nobody has to rewrite their note.</p>
          </div>
          <div className="relative mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {FORMATS.map((f) => (
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
                      New
                    </span>
                  ) : null}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-cream/70">{f.about}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-pink">
                  <Sparkles className="size-3.5" /> Try it above
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Themes */}
      <section className="mx-auto max-w-6xl px-3 pt-24 sm:px-5">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div data-bo-perch data-bo-x="0.85" data-bo-say="Pick a mood. I'll dress up for it.">
            <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Themes</p>
            <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight">
              A mood for every occasion
            </h2>
          </div>
          <Link
            to="/themes"
            className="squish inline-flex min-h-12 items-center rounded-full bg-glass px-5 text-sm font-medium ring-1 ring-ink/12 hover:bg-pink/40"
          >
            See all {themes.length > 0 ? themes.length : ""} themes
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {themes.slice(0, 4).map((theme, i) => (
            <div
              key={theme.id}
              data-bo-perch
              data-bo-x="0.72"
              data-bo-delay={(i % 4) * 90}
              data-bo-accessory={accessoryForTheme(theme) ?? undefined}
            >
              <ThemeCard
                theme={theme}
                variant="compact"
                onSelect={() => navigate({ to: "/themes/$id", params: { id: theme.id } })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-3 pt-24 sm:px-5">
        <div
          className="mb-8 max-w-2xl"
          data-bo-perch
          data-bo-x="0.9"
          data-bo-say="Making a gift is free."
        >
          <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Plans</p>
          <h2 className="mt-2 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.02] font-semibold tracking-tight text-balance">
            Free to make. Pay once when it's ready to open.
          </h2>
          <p className="mt-3 text-ink/75 text-pretty">
            Setting up the gift and collecting notes from friends costs nothing. You pick a plan
            when you wrap it up and send the link.
          </p>
        </div>
        <PricingCards />
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink/60">
          <Lock className="size-3.5" /> Secure checkout with {paymentMethodsSentence()}.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-3 pt-24 sm:px-5" aria-labelledby="faq">
        <h2
          id="faq"
          className="text-center font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.05] font-semibold tracking-tight"
        >
          Good questions
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
              Start a gift tonight. Send it whenever.
            </h2>
            <p className="text-ink/70">
              Friends can start adding notes the minute you share the link.
            </p>
            <Link
              to="/themes"
              className="squish mt-2 inline-flex min-h-14 items-center rounded-full bg-ink px-8 text-base font-semibold text-cream hover:bg-ink/90"
            >
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
        <nav className="flex gap-5" aria-label="Footer">
          <Link to="/themes" className="hover:text-ink">
            Themes
          </Link>
          <a href="#pricing" className="hover:text-ink">
            Plans
          </a>
          <Link to="/auth" className="hover:text-ink">
            Sign in
          </Link>
        </nav>
        <p>Made for the people you love.</p>
      </footer>
    </div>
  );
}
