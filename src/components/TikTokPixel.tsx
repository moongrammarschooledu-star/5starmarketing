"use client";

import { Suspense, useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

// Renders nothing (and loads nothing) unless NEXT_PUBLIC_TIKTOK_PIXEL_ID is
// set - the same opt-in pattern as MetaPixel. Sends a page view on first load
// and on every client-side route change; conversion events (ViewContent,
// Contact, SubmitForm) are sent from trackEvent() in lib/analytics.ts.
// The pixel lets TikTok ads count real enquiries and find similar visitors.
export function TikTokPixel() {
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  if (!pixelId) return null;

  return (
    <>
      <Script id="tiktok-pixel-init" strategy="afterInteractive">
        {`
          !function (w, d, t) {
            w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
            ttq.load('${pixelId}');
            ttq.page();
          }(window, document, 'ttq');
        `}
      </Script>
      <Suspense fallback={null}>
        <TikTokPixelPageViews />
      </Suspense>
    </>
  );
}

function TikTokPixelPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    const url = `${pathname}?${searchParams.toString()}`;
    // The first page view is sent by the init script itself; only later
    // client-side navigations are sent from here.
    if (lastUrl.current === null) {
      lastUrl.current = url;
      return;
    }
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    window.ttq?.page();
  }, [pathname, searchParams]);

  return null;
}
