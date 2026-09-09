import Script from "next/script";

// Renders nothing (and loads nothing) unless NEXT_PUBLIC_GA_ID is set —
// analytics is opt-in via environment variable, never hard-coded.
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { anonymize_ip: true });
          window.gtag = gtag;
        `}
      </Script>
    </>
  );
}
