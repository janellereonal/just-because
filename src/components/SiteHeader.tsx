import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/hooks/useAuth";
import Bo from "@/components/Bo";

/** A floating, rounded nav bar. Pastel redesign (Oct 2026). */
export function SiteHeader({ showMascot = true }: { showMascot?: boolean }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await authClient.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link =
    "rounded-full px-3.5 py-2 text-sm font-medium text-ink/75 transition-colors hover:bg-pink/60 hover:text-ink";

  return (
    <header data-bo-avoid className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 rounded-full bg-glass/85 pr-2 pl-4 shadow-[0_8px_30px_-12px_rgba(194,54,107,0.25)] ring-1 ring-ink/5 backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2" aria-label="Just Because, home">
          {showMascot ? <Bo pose="hello" size={38} title="Bo, the Just Because mascot" /> : null}
          <span className="font-display text-xl font-semibold tracking-tight">
            Just <span className="text-accent">Because</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          <Link to="/themes" className={link} activeProps={{ className: "bg-pink/70 text-ink" }}>
            Themes
          </Link>
          <Link to="/" hash="pricing" className={link}>
            Plans
          </Link>
          {user && (
            <Link to="/dashboard" className={link} activeProps={{ className: "bg-pink/70 text-ink" }}>
              My gifts
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className={link} activeProps={{ className: "bg-pink/70 text-ink" }}>
              Admin
            </Link>
          )}
        </nav>
        {user ? (
          <button
            onClick={() => void handleSignOut()}
            className="squish min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-cream hover:bg-ink/90"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/auth"
            className="squish inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-sm font-medium text-cream hover:bg-accent/90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
