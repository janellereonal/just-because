import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * Gift sites point at a profile row, so make sure the signed-in person has one
 * before they create anything.
 */
export async function ensureProfile(user: User) {
  const meta = user.user_metadata ?? {};
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: (meta["full_name"] as string) ?? (meta["name"] as string) ?? null,
      avatar_url: (meta["avatar_url"] as string) ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
