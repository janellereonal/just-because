import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getAuthOptions } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Just Because" },
      {
        name: "description",
        content: "Sign in to create and manage your Just Because gift sites.",
      },
      { property: "og:title", content: "Sign in | Just Because" },
      {
        property: "og:description",
        content: "Sign in to create and manage your Just Because gift sites.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [sentTo, setSentTo] = useState<{ email: string; kind: "verify" | "reset" } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: options } = useQuery({ queryKey: ["auth-options"], queryFn: () => getAuthOptions() });

  async function handleGoogle() {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/themes",
      errorCallbackURL: "/auth",
    });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in didn't work. Please try again.");
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "forgot") {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      setBusy(false);
      // Same message either way, so nobody can check which emails have accounts.
      setSentTo({ email, kind: "reset" });
      return;
    }
    if (mode === "signup") {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: name.trim() || email.split("@")[0]!,
        callbackURL: "/themes",
      });
      setBusy(false);
      if (error) {
        toast.error(error.message ?? "Couldn't create that account.");
        return;
      }
      if (options?.email) {
        setSentTo({ email, kind: "verify" });
        return;
      }
      navigate({ to: "/themes" });
      return;
    }
    const { error } = await authClient.signIn.email({ email, password, callbackURL: "/themes" });
    setBusy(false);
    if (error) {
      if (error.status === 403) {
        setSentTo({ email, kind: "verify" });
        return;
      }
      toast.error(
        error.status === 401 ? "That email and password don't match." : (error.message ?? "Couldn't sign in."),
      );
      return;
    }
    navigate({ to: "/themes" });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto max-w-md px-5 py-16">
        <div className="rise card-paper p-6">
          {sentTo ? (
            <div className="text-center">
              <h1 className="font-display text-3xl font-medium tracking-tight">Check your inbox</h1>
              <p className="mt-3 text-sm text-muted">
                {sentTo.kind === "verify"
                  ? `We sent a link to ${sentTo.email}. Tap it to confirm your email and you're in.`
                  : `If ${sentTo.email} has an account, a reset link is on its way. It works for one hour.`}
              </p>
              <button
                onClick={() => {
                  setSentTo(null);
                  setMode("signin");
                }}
                className="mt-6 text-sm text-muted transition-colors hover:text-ink"
              >
                Back to sign in
              </button>
            </div>
          ) : (
          <>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            {mode === "signin" ? "Welcome back" : mode === "signup" ? "Start a gift" : "Forgot your password?"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to create gift sites, collect contributions and publish.
          </p>

          {options?.google && mode !== "forgot" ? (
            <>
              <button
                onClick={handleGoogle}
                disabled={busy}
                className="mt-6 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-ink/90 disabled:opacity-60"
              >
                Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] font-mono tracking-[0.14em] text-muted uppercase">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
              </div>
            </>
          ) : (
            <div className="mt-6" />
          )}

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
              />
            ) : null}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
            />
            {mode !== "forgot" ? (
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm outline-none focus:border-accent"
              />
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-accent px-5 py-3 text-sm font-medium text-cream transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send me a reset link"}
            </button>
          </form>

          {mode === "signin" && options?.email ? (
            <button
              onClick={() => setMode("forgot")}
              className="mt-3 w-full text-center text-xs text-muted transition-colors hover:text-ink"
            >
              Forgot your password?
            </button>
          ) : null}

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted transition-colors hover:text-ink"
          >
            {mode === "signin"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
