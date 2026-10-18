/** A legal page: draft banner (SITE.legalDraft), title, date, sections. */
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE } from "@/config/site";
import type { LegalDoc } from "@/copy/legal";
import { FOOTER_COPY } from "@/copy/strings";

export function DraftBanner() {
  if (!SITE.legalDraft) return null;
  return (
    <p role="note" className="rounded-xl border border-[#E8C27A] bg-[#FFF6DD] px-4 py-2.5 text-sm text-[#5C4310]">
      <strong>{FOOTER_COPY.draft}</strong> {FOOTER_COPY.draftBody}
    </p>
  );
}

/** "How long we keep your information" -> "how-long-we-keep-your-information", for links to a section. */
const slugOf = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function LegalPage({ doc }: { doc: LegalDoc }) {
  const updated = new Date(`${SITE.legalUpdated}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-2xl px-5 pt-8 pb-10">
        <DraftBanner />
        <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] leading-tight font-semibold tracking-tight">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted">{FOOTER_COPY.updated(updated)}</p>
        <p className="mt-5 text-[17px] leading-relaxed text-ink/85">{doc.intro}</p>
        {doc.numbered ? (
          <nav aria-label={FOOTER_COPY.onThisPage} className="mt-7 rounded-2xl bg-cream px-5 py-4">
            <p className="font-mono text-[11px] tracking-[0.16em] text-muted uppercase">{FOOTER_COPY.onThisPage}</p>
            <ol className="mt-2 grid gap-1 text-[15px] sm:grid-cols-2">
              {doc.sections.map((s, n) => (
                <li key={s.h}>
                  <a href={`#${slugOf(s.h)}`} className="text-ink/80 underline-offset-4 hover:text-accent hover:underline">
                    {n + 1}. {s.h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {doc.sections.map((s, n) => (
          <section key={s.h} id={slugOf(s.h)} className="mt-10 scroll-mt-24">
            <h2 className="font-display text-xl font-semibold">
              {doc.numbered ? `${n + 1}. ` : ""}
              {s.h}
            </h2>
            {s.summary ? (
              <p className="mt-3 rounded-xl border-l-4 border-accent bg-[#FBEDE6] px-4 py-3 text-[15px] leading-relaxed text-ink/90">
                <span className="font-semibold">{FOOTER_COPY.inShort} </span>
                {s.summary}
              </p>
            ) : null}
            {s.body.map((b, i) =>
              typeof b === "string" ? (
                <p key={i} className={`mt-3 leading-relaxed text-ink/80 ${/^\([a-z]\)/.test(b) ? "font-semibold text-ink" : ""}`}>
                  {b}
                </p>
              ) : (
                <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink/80 marker:text-accent">
                  {b.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}

export const legalHead = (title: string, description: string) => ({
  meta: [
    { title: `${title} | ${SITE.name}` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} | ${SITE.name}` },
    { property: "og:description", content: description },
  ],
});
