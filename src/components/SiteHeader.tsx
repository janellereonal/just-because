import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Bo from "@/components/Bo";

export function SiteHeader({ showMascot = true }: { showMascot?: boolean }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-glass/55 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5">
          {showMascot ? <Bo pose="hello" size={40} title="Bo, the Just Because mascot" /> : null}
          <span className="font-display text-lg font-semibold tracking-tight">Just Because</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted sm:flex">
          <Link to="/themes" className="transition-colors hover:text-ink">
            Themes
          </Link>
          {user && (
            <Link to="/dashboard" className="transition-colors hover:text-ink">
              My gifts
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="transition-colors hover:text-ink">
              Admin
            </Link>
          )}
        </nav>
        {user ? (
          <button
            onClick={() => void handleSignOut()}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-ink/90"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/auth"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-ink/90"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
