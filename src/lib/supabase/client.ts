"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/lib/env";

/**
 * The browser client. It carries the signed-in user's session, so every query
 * it makes is subject to row level security — which is what actually keeps one
 * user's data away from another, not the secrecy of the key it uses.
 */
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
