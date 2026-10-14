import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { getAuthOptions } from "@/lib/api";
import { SiteHeader } from "@/components/SiteHeader";
import Bo from "@/components/Bo";

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
  const [resent, setResent] = useState(false);

  async function resend() {
    if (!sentTo) return;
    setBusy(true);
    await authClient.sendVerificationEmail({ email: sentTo.email, callbackURL: "/themes" }).catch(() => null);
    setBusy(false);
    setResent(true);
  }
  const { data: options } = useQuery({
    queryKey: ["auth-options"],
    queryFn: () => getAuthOptions(),
  });

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
        error.status === 401
          ? "That email and password don't match."
          : (error.message ?? "Couldn't sign in."),
      );
      return;
    }
    navigate({ to: "/themes" });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl items-stretch gap-5 px-4 py-10 sm:px-5 sm:py-14 lg:grid-cols-[1fr_1.05fr]">
        <div className="rise card-paper p-6 sm:p-9">
          {sentTo ? (
            <div className="text-center">
              <h1 className="font-display text-3xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="mx-auto mt-3 max-w-sm text-[15px] text-ink/70">
                {sentTo.kind === "verify"
                  ? `We sent an email to ${sentTo.email}. Tap the link inside to confirm it's you.`
                  : `If ${sentTo.email} has an account, a reset link is on its way. It works for one hour.`}
              </p>
              {sentTo.kind === "verify" ? (
                <p className="mx-auto mt-3 max-w-sm text-sm text-ink/60">
                  Already have an account with this email? Then the email tells you that instead, and you can just sign in.
                </p>
              ) : null}
              <p className="mx-auto mt-3 max-w-sm text-sm text-ink/60">Can't find it? Check Spam or Promotions. It can take a minute.</p>
              <div className="mt-6 flex flex-col items-center gap-2">
                {sentTo.kind === "verify" ? (
                  <button
                    type="button"
                    disabled={busy || resent}
                    onClick={() => void resend()}
                    className="squish min-h-11 rounded-full bg-ink px-5 text-sm font-medium text-cream disabled:opacity-60"
                  >
                    {resent ? "Sent again" : busy ? "Sending…" : "Send it again"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSentTo(null);
                    setResent(false);
                    setMode("signin");
                  }}
                  className="min-h-11 text-sm text-ink/70 transition-colors hover:text-ink"
                >
                  Back to sign in
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[2.1rem] leading-tight font-semibold tracking-tight">
                {mode === "signin"
                  ? "Welcome back"
                  : mode === "signup"
                    ? "Start a gift"
                    : "Forgot your password?"}
              </h1>
              <p className="mt-2 text-[15px] text-ink/65">
                {mode === "signin"
                  ? "Sign in to keep working on your gifts."
                  : mode === "signup"
                    ? "Make an account to start a gift. Your friends won't need one."
                    : "We'll email you a link to set a new one."}
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
                    <span className="h-px flex-1 bg-line" /> or{" "}
                    <span className="h-px flex-1 bg-line" />
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
                    aria-label="Your name"
                    autoComplete="name"
                    className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-white"
                  />
                ) : null}
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email"
                  className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-white"
                />
                {mode !== "forgot" ? (
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    aria-label="Password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="w-full rounded-2xl border border-line bg-paper px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-accent focus:bg-white"
                  />
                ) : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="squish w-full rounded-full bg-accent px-5 py-3.5 text-[15px] font-semibold text-cream transition-colors hover:bg-accent/90 disabled:opacity-60"
                >
                  {mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send me a reset link"}
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
        <aside
          className="relative hidden overflow-hidden rounded-[36px] bg-pink p-10 lg:block"
          aria-hidden="true"
        >
          <span className="absolute -top-20 -right-16 size-72 rounded-full bg-white/45 blur-2xl" />
          <span className="absolute -bottom-24 -left-10 size-72 rounded-full bg-butter/80 blur-2xl" />
          <div className="relative flex h-full flex-col justify-between">
            <p className="max-w-xs font-display text-3xl leading-tight font-semibold">
              One link. Every friend. One happy surprise.
            </p>
            <div className="relative mx-auto mt-6 h-64 w-full max-w-sm">
              <div
                className="float-note top-2 left-0 rotate-[-5deg]"
                style={{ "--r": "-5deg" } as React.CSSProperties}
              >
                <span className="block font-semibold">Mama added a letter</span>
                <span className="text-ink/60">So proud of you, anak.</span>
              </div>
              <div
                className="float-note top-24 right-0 rotate-[4deg]"
                style={{ "--r": "4deg", animationDelay: "1.2s" } as React.CSSProperties}
              >
                <span className="block font-semibold">Jo added 3 photos</span>
                <span className="text-ink/60">La Union, 2am, graduation</span>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <Bo pose="delivery" size={130} />
              </div>
            </div>
            <p className="text-sm text-ink/65">Friends add their notes without signing up.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
