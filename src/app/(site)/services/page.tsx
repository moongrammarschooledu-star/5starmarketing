import type { Metadata } from "next";
import { Services } from "@/components/Services";
import { Contact } from "@/components/Contact";
import { Breadcrumbs } from "@/components/Breadcrumbs";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

const pageTitle = "Real Estate & Construction Services in Lahore";
const pageDescription =
  "Explore 5STAR.M Estate & Builders services in Lahore, including property buying and selling, real estate investment guidance, and construction solutions. Contact our team to discuss your property needs.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/services" },
  openGraph: {
    title: `${pageTitle} | 5STAR.M Estate & Builders`,
    description: pageDescription,
    url: "/services",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
  },
};

export default function ServicesPage() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-8 lg:px-8">
        <Breadcrumbs items={[{ label: "Services" }]} />
      </div>
      <Services />
      <Contact />
    </>
  );
}
