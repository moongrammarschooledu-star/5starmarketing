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
  "frame-src 'self' https://maps.google.com https://www.google.com",
  "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com wss://*.supabase.co",
  "form-action 'self'",
  "base-uri 'self'",
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
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
