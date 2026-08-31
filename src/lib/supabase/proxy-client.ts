import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "@/lib/env";

/**
 * Refreshes the session on every request and writes the rotated cookies onto
 * the response.
 *
 * Server Components cannot set cookies, so without this the access token would
 * expire and never renew — the user would appear signed in until the first
 * query quietly failed. This is the one place that renewal can happen.
 */
export async function refreshSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let response = NextResponse.next({ request });

  const { url, anonKey } = supabasePublicEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Written to both: the request so anything later in this pass sees the
        // fresh token, and the response so the browser keeps it.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser, not getSession: this revalidates the token with Supabase rather
  // than trusting whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}
