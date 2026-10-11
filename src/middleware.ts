import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/agent") || pathname.startsWith("/customer")) {
    return updateSession(request);
  }

  // A cached public page must look the same for everybody. If a signed-in
  // admin or customer opened it, the server would otherwise read data with
  // that person's rights and the CDN would then show it to every visitor. So
  // the sign-in cookies are removed from the request before the page is made.
  // (The browser still keeps them; /api/session reads them to show "My Account".)
  const headers = new Headers(request.headers);
  const cookie = headers.get("cookie");
  if (cookie) {
    const kept = cookie
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith("sb-"));
    if (kept.length > 0) headers.set("cookie", kept.join("; "));
    else headers.delete("cookie");
  }
  return NextResponse.next({ request: { headers } });
}

// The matcher must be written out literally (Next reads it at build time). The
// public part is the same list as the Cache-Control headers in next.config.ts.
export const config = {
  matcher: [
    "/admin/:path*",
    "/agent/:path*",
    "/customer/:path*",
    "/",
    "/properties",
    "/properties/:slug",
    "/projects",
    "/projects/:slug",
    "/services",
    "/about",
    "/contact",
    "/locations",
    "/locations/:slug",
    "/property-types/:slug",
    "/blog",
    "/blog/:slug",
    "/landing/:slug",
    "/faq",
    "/support/faq",
    "/investment",
    "/construction",
    "/buy",
    "/rent",
    "/commercial",
    "/residential",
  ],
};
