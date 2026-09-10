import type { Metadata } from "next";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";

export const metadata: Metadata = {
  title: "Property Investment Calculator",
  description: "Estimate the potential return on a property investment with 5STAR.M Estate & Builders.",
};

export default function InvestmentCalculatorPage() {
  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
        <h1 className="font-heading text-2xl font-extrabold text-ink sm:text-3xl">Property Investment Calculator</h1>
        <p className="mt-1 text-sm text-muted">
          Estimate the potential return on a property investment. This tool is for guidance only.
        </p>

        <div className="mt-6">
          <InvestmentCalculator />
        </div>
      </div>
    </main>
  );
}
