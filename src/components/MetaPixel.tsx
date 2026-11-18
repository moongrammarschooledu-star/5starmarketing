"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// The pixel itself starts from <MetaPixelHead /> in the root layout's
// <head>, so it loads in parallel with the page instead of waiting for React
// to hydrate. On slow phones (e.g. Facebook's in-app browser) the old
// "afterInteractive" start meant many ad visitors left before the pixel ever
// fired, so Meta under-counted landing page views and optimised on less data.
// This client component only sends PageView on later client-side navigations;
// conversion events (Lead, Contact, ViewContent) come from trackEvent().
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <Suspense fallback={null}>
      <MetaPixelPageViews />
    </Suspense>
  );
}

function MetaPixelPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = `${pathname}?${searchParams.toString()}`;
    // The first page view is sent by the init script itself; only
    // later client-side navigations are sent from here.
    if (lastUrl.current === null) {
      lastUrl.current = url;
      return;
    }
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}
