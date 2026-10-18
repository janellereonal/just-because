import { authClient } from "@/lib/auth-client";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  isAdmin?: boolean | null;
  /** Started a gift without an account (flag guestStart). */
  isAnonymous?: boolean | null;
};

/** The signed-in person (if any). `isAdmin` comes from the account row. */
export function useAuth() {
  const { data, isPending } = authClient.useSession();
  const user = (data?.user as AuthUser | undefined) ?? null;
  return {
    session: data?.session ?? null,
    user,
    loading: isPending,
    isAdmin: user?.isAdmin === true,
    isGuest: user?.isAnonymous === true,
  };
}
