import type { Metadata } from "next";
import { InvestmentSection } from "@/components/InvestmentSection";
import { Contact } from "@/components/Contact";

export const metadata: Metadata = {
  title: "Property Investment",
  description:
    "Property investment opportunities in Lahore with 5STAR.M Estate & Builders — LDA-approved societies, cash or easy monthly installment plans.",
  alternates: { canonical: "/investment" },
  openGraph: { title: "Property Investment | 5STAR.M Estate & Builders", url: "/investment" },
};

export default function InvestmentPage() {
  return (
    <>
      <InvestmentSection />
      <Contact />
    </>
  );
}
