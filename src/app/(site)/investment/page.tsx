import type { Metadata } from "next";
import { InvestmentSection } from "@/components/InvestmentSection";
import { Contact } from "@/components/Contact";

// Public page: built once and kept for a few minutes (and rebuilt at once when
// the admin changes the related data), so visitors do not each run the server.
export const dynamic = "force-static";
export const revalidate = 180;

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
