import type { NextConfig } from "next";

// A conservative CSP: broad enough that it won't break Next.js hydration,
// Google Analytics, Google Maps embeds or Supabase, but still meaningfully
// restricts where scripts/frames/connections can come from. Intentionally
// not using a strict nonce-based policy — the priority here is "does not
// break the site" over maximum strictness.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https:",
  // Property walkthrough videos are served straight from Supabase Storage.
  "media-src 'self' https://*.supabase.co",
  "frame-src 'self' https://maps.google.com https://www.google.com",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com wss://*.supabase.co",
  "form-action 'self'",
  "base-uri 'self'",
  // STEP 31 — the service worker registers as a same-origin worker.
  "worker-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // STEP 31 — the property map's "use my current location" is an
          // explicit, user-initiated opt-in (never auto-requested); this
          // just lets the browser's own permission prompt run at all.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
