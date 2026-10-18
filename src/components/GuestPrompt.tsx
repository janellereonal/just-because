/**
 * Prompts for guests (flag guestStart): people who started a gift without an account. Signing
 * in moves the gift to their account (see src/server/guests.ts), so every prompt says that.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { getAuthOptions } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { GUEST_COPY } from "@/copy/strings";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function here() {
  return typeof window === "undefined" ? "/dashboard" : `${window.location.pathname}${window.location.search}`;
}

/** Google first (one tap, and it moves the gift over), then email. */
function SignInButtons({ compact = false }: { compact?: boolean }) {
  const { data: options } = useQuery({ queryKey: ["auth-options"], queryFn: () => getAuthOptions() });
  const [busy, setBusy] = useState(false);
  async function google() {
    setBusy(true);
    const { error } = await authClient.signIn.social({ provider: "google", callbackURL: here(), errorCallbackURL: "/auth" });
    if (error) {
      setBusy(false);
      toast.error("Google sign-in didn't work. Please try again.");
    }
  }
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-4"}`}>
      {options?.google ? (
        <button
          type="button"
          onClick={() => void google()}
          disabled={busy}
          className="squish inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-cream disabled:opacity-60"
        >
          {GUEST_COPY.google}
        </button>
      ) : null}
      <Link
        to="/auth"
        search={{ next: here() }}
        className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${options?.google ? "border border-line bg-paper" : "bg-ink text-cream"}`}
      >
        {options?.google ? GUEST_COPY.email : GUEST_COPY.signIn}
      </Link>
    </div>
  );
}

/** A slim banner at the top of the editor and My gifts while someone is a guest. */
export function GuestBanner() {
  const { isGuest } = useAuth();
  if (!isGuest) return null;
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2.5 text-sm">
      <span>
        <b>{GUEST_COPY.keep}</b> {GUEST_COPY.bannerBody}
      </span>
      <SignInButtons compact />
    </div>
  );
}

/** Shown instead of sharing or paying while someone is a guest. */
export function GuestSignInCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line bg-cream p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <SignInButtons />
    </div>
  );
}

export function GuestSignInDialog({ open, onOpenChange, title, body }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; body: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-paper">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight">{title}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        <SignInButtons />
      </DialogContent>
    </Dialog>
  );
}
