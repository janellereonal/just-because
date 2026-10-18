import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/hooks/useAuth";
import { authClient } from "@/lib/auth-client";
import { deleteAccount } from "@/lib/api";
import { GuestSignInCard } from "@/components/GuestPrompt";
import { GUEST_COPY } from "@/copy/strings";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your account | Just Because" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (typed !== "DELETE" || busy) return;
    setBusy(true);
    try {
      await deleteAccount({ data: { confirm: "DELETE" } });
      await authClient.signOut().catch(() => {});
      toast.success("Your account and your gifts are deleted.");
      void navigate({ to: "/" });
    } catch (error) {
      setBusy(false);
      toast.error(error instanceof Error && error.message.length < 160 ? error.message : "That didn't work. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-12">
        <p className="font-mono text-[11px] tracking-[0.18em] text-accent uppercase">Account</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">Your account</h1>
        {isGuest ? (
          // Guests have a placeholder email and nothing to delete yet: offer to keep their gifts instead.
          <div className="mt-6">
            <GuestSignInCard title={GUEST_COPY.accountTitle} body={GUEST_COPY.accountBody} />
          </div>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-line bg-cream p-5">
              <p className="text-sm text-muted">Signed in as</p>
              <p className="mt-1 font-medium [overflow-wrap:anywhere]">{user?.email}</p>
              {user?.name ? (
                <p className="text-sm text-muted [overflow-wrap:anywhere]">{user.name}</p>
              ) : null}
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-cream p-5">
              <h2 className="font-display text-xl font-medium">Your gifts</h2>
              <p className="mt-1 text-sm text-muted">
                You can download every note, photo and voice note from a gift as a zip file. Open
                the gift from{" "}
                <Link to="/dashboard" className="text-accent underline underline-offset-2">
                  your gifts
                </Link>
                , then go to Wrap it up.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E4B3A8] bg-[#FDF3F0] p-5">
              <h2 className="font-display text-xl font-medium">Delete your account</h2>
              <p className="mt-1 text-sm text-pretty text-muted">
                This deletes your account, every gift you made, everything friends added to them,
                and every photo and voice note. Links to your gifts stop working. It can't be
                undone. We keep a record of any payments (without your details) for accounting and
                refunds.
              </p>
              <label className="mt-4 block text-sm">
                Type <b>DELETE</b> to confirm
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => void remove()}
                disabled={typed !== "DELETE" || busy}
                className="mt-4 rounded-full bg-[#B42318] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete my account"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
