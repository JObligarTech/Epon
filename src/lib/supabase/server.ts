import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicEnv, supabaseServiceRoleKey } from "@/lib/env";

/**
 * The server client, reading the session from cookies and writing refreshed
 * ones back. Must be created per request — never hoisted to a module constant,
 * or one visitor's session would be handed to the next.
 */
export async function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine as long as
          // something else refreshes the session — the proxy does, on every
          // request — so this is expected rather than an error worth raising.
        }
      },
    },
  });
}

/**
 * Bypasses row level security completely. Only for work that arrives with no
 * user to act on behalf of — Plaid webhooks, chiefly. Never import this into a
 * path that serves a request from a browser: every query made with it can see
 * every user's rows, and it is on the caller to scope them.
 */
export function createServiceRoleClient() {
  const { url } = supabasePublicEnv();

  return createServerClient(url, supabaseServiceRoleKey(), {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}
