import type { Metadata } from "next";
import { Services } from "@/components/Services";
import { Contact } from "@/components/Contact";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Services",
  description:
    "Real estate and construction services from 5STAR.M Estate & Builders in Lahore — property buying, selling, investment consultancy and construction services.",
  alternates: { canonical: "/services" },
  openGraph: { title: "Services | 5STAR.M Estate & Builders", url: "/services" },
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
