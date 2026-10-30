"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

// Renders nothing (and loads nothing) unless NEXT_PUBLIC_META_PIXEL_ID is
// set — same opt-in pattern as GoogleAnalytics. Sends a PageView on first
// load and on every client-side route change; conversion events (Lead,
// Contact, ViewContent) are sent from trackEvent() in lib/analytics.ts.
export function MetaPixel() {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <>
      <Script id="meta-pixel-init" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      <Suspense fallback={null}>
        <MetaPixelPageViews />
      </Suspense>
    </>
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
