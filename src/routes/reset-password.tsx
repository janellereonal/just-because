import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : undefined,
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Choose a new password | Just Because" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (resetError) {
      toast.error("That link has expired. Ask for a new one from the sign-in page.");
      return;
    }
    toast.success("Password updated. Sign in with your new one.");
    navigate({ to: "/auth" });
  }

  const usable = token && !error;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="rise card-paper p-6">
          <h1 className="font-display text-3xl font-medium tracking-tight">Choose a new password</h1>
          {usable ? (
            <form onSubmit={submit} className="mt-6 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-accent/90 disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </form>
          ) : (
            <>
              <p className="mt-3 text-sm text-muted">
                This link has expired or was already used. You can ask for a new one.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-cream"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
