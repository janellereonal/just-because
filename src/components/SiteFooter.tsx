import { galleryLink } from "@/lib/gallery";
/** The marketing footer: product links, legal pages, contact and socials. */
import { Link } from "@tanstack/react-router";
import Bo from "@/components/Bo";
import { SITE } from "@/config/site";
import { FOOTER_COPY } from "@/copy/strings";
import { useAuth } from "@/hooks/useAuth";

export function SiteFooter({ bo = true }: { bo?: boolean }) {
  const { user } = useAuth();
  const socials = Object.entries(SITE.socials).filter(([, url]) => url);
  const link = "rounded hover:text-ink focus-visible:text-ink";
  return (
    <footer className="mx-auto max-w-6xl px-5 pt-16 pb-10 text-sm text-muted">
      <div className="grid gap-8 border-t border-line pt-8 sm:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            {bo ? <Bo pose="idle" size={30} title="Bo" /> : null}
            <span className="font-display text-base font-semibold text-ink">
              Just <span className="text-accent">Because</span>
            </span>
          </div>
          <p className="mt-2 max-w-[16rem]">{FOOTER_COPY.line}</p>
          <p className="mt-3 text-xs">{FOOTER_COPY.madeIn}</p>
        </div>
        <nav aria-label={FOOTER_COPY.product} className="flex flex-col gap-2">
          <p className="font-medium text-ink">{FOOTER_COPY.product}</p>
          <Link to={galleryLink().to} className={link}>{galleryLink().label}</Link>
          <Link to="/sections" className={link}>{FOOTER_COPY.sections}</Link>
          <Link to="/" hash="pricing" className={link}>{FOOTER_COPY.plans}</Link>
          {user ? <Link to="/dashboard" className={link}>{FOOTER_COPY.myGifts}</Link> : <Link to="/auth" className={link}>{FOOTER_COPY.signIn}</Link>}
        </nav>
        <nav aria-label={FOOTER_COPY.legal} className="flex flex-col gap-2">
          <p className="font-medium text-ink">{FOOTER_COPY.legal}</p>
          <Link to="/privacy" className={link}>{FOOTER_COPY.privacy}</Link>
          <Link to="/terms" className={link}>{FOOTER_COPY.terms}</Link>
          <Link to="/refunds" className={link}>{FOOTER_COPY.refunds}</Link>
        </nav>
        <div className="flex flex-col gap-2">
          <p className="font-medium text-ink">{FOOTER_COPY.help}</p>
          <Link to="/contact" className={link}>{FOOTER_COPY.contact}</Link>
          <a href={`mailto:${SITE.contactEmail}`} className={link}>{SITE.contactEmail}</a>
          {socials.map(([name, url]) => (
            <a key={name} href={url} className={`${link} capitalize`} target="_blank" rel="noreferrer">
              {name}
            </a>
          ))}
        </div>
      </div>
      <p className="mt-8 text-xs">© {new Date().getFullYear()} {SITE.name}</p>
    </footer>
  );
}
