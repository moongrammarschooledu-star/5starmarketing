import type { Metadata } from "next";
import { ComparePageClient } from "@/components/ComparePageClient";

export const metadata: Metadata = {
  title: "Compare Properties",
  robots: { index: false, follow: false },
};

export default function ComparePage() {
  return (
    <main className="bg-surface">
      <ComparePageClient />
    </main>
  );
}
