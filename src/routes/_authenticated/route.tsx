import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { NOINDEX } from "@/lib/seo";
import { getMe } from "@/lib/api";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({ meta: [NOINDEX] }),
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await getMe();
    // Come back to where they were headed (a new gift, a gift they were editing) after signing in.
    if (!user) throw redirect({ to: "/auth", search: { next: location.href } });
    return { user };
  },
  component: () => <Outlet />,
});
