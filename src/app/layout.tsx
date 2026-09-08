import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

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

const siteUrl = "https://www.5starm.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: siteUrl,
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
