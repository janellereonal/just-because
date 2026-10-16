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
        {doc.sections.map((s) => (
          <section key={s.h} className="mt-9">
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            {s.body.map((b, i) =>
              typeof b === "string" ? (
                <p key={i} className="mt-3 leading-relaxed text-ink/80">
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
