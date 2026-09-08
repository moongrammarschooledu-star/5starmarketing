import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIX = "/admin";
const LOGIN_PATH = "/admin/login";

/**
 * Refreshes the Supabase auth session on every request (required so it
 * doesn't silently expire) and redirects unauthenticated visitors away
 * from protected /admin/* routes. Runs in the Edge runtime.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith(PROTECTED_PREFIX) && pathname !== LOGIN_PATH;

  if (!url || !anonKey) {
    // Supabase isn't configured yet. Let public pages render (they'll show
    // their own "not configured" empty state), but don't pretend admin
    // routes are safe to enter without a real auth check.
    if (isProtected) {
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
