import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/lib/env";
import { refreshSession } from "@/lib/supabase/proxy-client";

/** Reachable without a session. Everything else requires one. */
const PUBLIC_ROUTES = ["/sign-in", "/create-account", "/reset-password", "/styleguide"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Two jobs, and deliberately no more.
 *
 * It refreshes the session cookie, which nothing else can do, and it makes an
 * optimistic redirect so signed-out visitors do not watch a protected page
 * render before being bounced. It is not the authorization check — this runs on
 * every request including prefetches, so the real check belongs in the layout
 * that actually reads data.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Nothing configured yet: the app is still on mock data, and redirecting
  // everyone to a sign-in page that cannot work would take the site down.
  if (!hasSupabaseConfig()) return NextResponse.next();

  const { response, userId } = await refreshSession(request);

  if (!userId && !isPublic(pathname)) {
    const signIn = new URL("/sign-in", request.url);
    // Remember where they were headed so sign-in can return them to it.
    if (pathname !== "/") signIn.searchParams.set("next", pathname);
    return NextResponse.redirect(signIn);
  }

  if (userId && isPublic(pathname) && pathname !== "/styleguide") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation. Running on those
     * would refresh the session for every icon on the page.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
