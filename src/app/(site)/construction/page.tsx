import type { Metadata } from "next";
import { ConstructionSection } from "@/components/ConstructionSection";
import { Contact } from "@/components/Contact";

export const metadata: Metadata = {
  title: "Construction Services",
  description:
    "Construction and building services from 5STAR.M Estate & Builders in Lahore — from plot to finished, quality-built home.",
  alternates: { canonical: "/construction" },
  openGraph: { title: "Construction Services | 5STAR.M Estate & Builders", url: "/construction" },
};

export default function ConstructionPage() {
  return (
    <>
      <ConstructionSection />
      <Contact />
    </>
  );
}
