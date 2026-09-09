import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { settingsService } from "@/services/settingsService";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { JsonLd } from "@/components/JsonLd";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "5STAR.M Estate & Builders | Real Estate & Property Solutions in Lahore",
    template: "%s | 5STAR.M Estate & Builders",
  },
  description: site.description,
  keywords: [
    "5STAR.M",
    "real estate Lahore",
    "property for sale Lahore",
    "Johar Town property",
    "LDA approved society",
    "construction company Lahore",
    "builders Lahore",
    "property investment Pakistan",
  ],
  authors: [{ name: site.director }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: site.url,
    siteName: site.fullName,
    title: "5STAR.M Estate & Builders | Real Estate & Property Solutions in Lahore",
    description: site.description,
    images: [
      {
        url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: site.fullName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "5STAR.M Estate & Builders",
    description: site.description,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = isSupabaseConfigured() ? await settingsService.get().catch(() => null) : null;

  const address = settings?.address || site.address;
  const city = settings?.city || "Lahore";
  const country = settings?.country || "Pakistan";
  const phone = settings?.phone || site.phoneDisplay;
  const email = settings?.email || site.email;

  // Organization + LocalBusiness — only real, admin-entered fields go in.
  // No invented opening hours, reviews, ratings or years-in-business.
  const localBusinessJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.fullName,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
    url: site.url,
    telephone: phone,
    email,
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: city,
      addressCountry: country,
    },
  };
  if (settings?.latitude !== undefined && settings?.longitude !== undefined) {
    localBusinessJsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: settings.latitude,
      longitude: settings.longitude,
    };
  }

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.fullName,
    url: site.url,
  };

  return (
    <html lang="en">
      <body className={`${poppins.variable} ${inter.variable} antialiased`}>
        <JsonLd data={localBusinessJsonLd} />
        <JsonLd data={websiteJsonLd} />
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
