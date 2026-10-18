import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { getMe } from "@/lib/api";
import { isFlagOn } from "@/config/flags";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({ meta: [NOINDEX] }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    let user = await getMe();
    // Starting a gift doesn't need an account (flag guestStart): a guest session is made on
    // the spot, and the gift moves to their account when they sign in later.
    if (!user && isFlagOn("guestStart") && location.pathname === "/create") {
      const { authClient } = await import("@/lib/auth-client");
      const { error } = await authClient.signIn.anonymous();
      if (!error) user = await getMe();
    }
    // Come back to where they were headed (a new gift, a gift they were editing) after signing in.
    if (!user) throw redirect({ to: "/auth", search: { next: location.href } });
    return { user };
  },
  component: () => <Outlet />,
});
