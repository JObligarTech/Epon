import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * The authorization check that counts. The proxy makes an optimistic redirect
 * from the cookie; this revalidates with Supabase before any data is read.
 *
 * Returns null when Supabase is not configured, so the app keeps working on
 * mock data rather than locking everyone out of a database that does not exist.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/** For routes that must not render without a real, verified session. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Whether sign-in is available at all — false until Supabase is configured. */
export function isAuthEnabled(): boolean {
  return hasSupabaseConfig();
}
