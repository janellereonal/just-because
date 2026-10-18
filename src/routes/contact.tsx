import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DraftBanner, legalHead } from "@/components/LegalPage";
import { CONTACT } from "@/copy/legal";

export const Route = createFileRoute("/contact")({
  head: () => legalHead(CONTACT.title, CONTACT.intro),
  component: ContactPage,
});

/** A mailto form: nothing is stored here, the message opens in the visitor's own email app. */
function ContactPage() {
  const [topic, setTopic] = useState<string>(CONTACT.topics[0]);
  const [message, setMessage] = useState("");
  const href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(`[Just Because] ${topic}`)}&body=${encodeURIComponent(message)}`;
  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main id="main" className="mx-auto max-w-xl px-5 pt-8 pb-10">
        <DraftBanner />
        <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] leading-tight font-semibold tracking-tight">{CONTACT.title}</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink/80">{CONTACT.intro}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-4">
          <Mail className="size-5 text-accent" aria-hidden="true" />
          <a href={`mailto:${CONTACT.email}`} className="font-medium underline underline-offset-4">
            {CONTACT.email}
          </a>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(CONTACT.email).then(() => toast.success("Email address copied"))}
            className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm hover:bg-cream"
          >
            <Copy className="size-3.5" aria-hidden="true" /> Copy
          </button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={(e) => (e.preventDefault(), (window.location.href = href))}>
          <label className="block">
            <span className="text-sm font-medium">What's it about?</span>
            <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-[16px] outline-none focus:border-accent">
              {CONTACT.topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Your message</span>
            <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} rows={6} maxLength={2000} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-3 text-[16px] outline-none focus:border-accent" placeholder="Tell us what happened. Include the gift link if it's about a gift." />
          </label>
          <button type="submit" className="squish inline-flex min-h-12 items-center rounded-full bg-accent px-6 font-medium text-cream hover:bg-accent/90">
            Open in my email app
          </button>
          <p className="text-sm text-muted">{CONTACT.reply} {CONTACT.report}</p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
