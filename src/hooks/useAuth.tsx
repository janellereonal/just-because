import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession?.user) setProfile(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        if (active) setProfile(data as Profile);
        return;
      }
      // First sign-in on this backend: make sure the person has a profile row,
      // otherwise anything they create can't be linked back to them.
      const meta = user.user_metadata ?? {};
      const { data: created } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email ?? null,
          full_name: (meta["full_name"] as string) ?? (meta["name"] as string) ?? null,
          avatar_url: (meta["avatar_url"] as string) ?? null,
          is_admin: false,
        })
        .select("id, email, full_name, avatar_url, is_admin")
        .maybeSingle();
      if (active) setProfile((created as Profile) ?? null);
    };
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  return { session, user, profile, loading, isAdmin: profile?.is_admin === true };
}
