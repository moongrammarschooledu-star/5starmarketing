import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";
const AGENT_PREFIX = "/agent";
const CUSTOMER_PREFIX = "/customer";
const CUSTOMER_LOGIN_PATH = "/login";

/**
 * Refreshes the Supabase auth session on every request (required so it
 * doesn't silently expire) and redirects visitors away from routes their
 * session doesn't grant access to. Runs in the Edge runtime.
 *
 * Since customers can now also sign in via Supabase Auth (STEP 10), being
 * "authenticated" no longer implies "is an admin" — so /admin/* also
 * checks for a real admin_profiles row, not just any logged-in session.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX) && pathname !== ADMIN_LOGIN_PATH;
  const isAgentRoute = pathname.startsWith(AGENT_PREFIX);
  const isCustomerRoute = pathname.startsWith(CUSTOMER_PREFIX);

  if (!url || !anonKey) {
    // Supabase isn't configured yet. Let public pages render (they'll show
    // their own "not configured" empty state), but don't pretend
    // protected routes are safe to enter without a real auth check.
    if (isAdminRoute || isAgentRoute) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isCustomerRoute) {
      const loginUrl = new URL(CUSTOMER_LOGIN_PATH, request.url);
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

  if (isAdminRoute || isAgentRoute) {
    if (!user) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // A logged-in customer has no admin_profiles row — block them from
    // every /admin/* or /agent/* route rather than letting a page
    // partially render. Both portals share the same staff login.
    const { data: adminProfile } = await supabase
      .from("admin_profiles")
      .select("id, status")
      .eq("id", user.id)
      .maybeSingle();
    if (!adminProfile || adminProfile.status === "Inactive") {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isCustomerRoute && !user) {
    const loginUrl = new URL(CUSTOMER_LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
