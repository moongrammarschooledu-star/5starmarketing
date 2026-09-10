import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { paymentPlanService } from "@/services/paymentPlanService";
import { PaymentCalculator } from "@/components/PaymentCalculator";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Property Payment Calculator",
  description: "Estimate your property payment plan with 5STAR.M Estate & Builders.",
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const { property: slug } = await searchParams;

  let propertyName: string | undefined;
  let propertyLocation: string | undefined;
  let initialPrice: number | undefined;
  let initialDownPayment: number | undefined;
  let initialDuration: number | undefined;
  let initialFrequency: "Monthly" | "Quarterly" | "Yearly" | undefined;
  let isCustomSchedule = false;
  let scheduleItems: Awaited<ReturnType<typeof paymentPlanService.listScheduleItems>> = [];

  if (slug) {
    const property = await propertyService.getBySlug(slug);
    if (property) {
      propertyName = property.title;
      propertyLocation = property.location;
      initialPrice = property.priceValue ?? undefined;

      const plan = await paymentPlanService.getForProperty(property.id);
      if (plan) {
        initialPrice = plan.propertyPrice;
        initialDownPayment = plan.downPayment;
        initialDuration = plan.duration;
        initialFrequency = plan.installmentFrequency;
        if (plan.calculationType === "Custom") {
          isCustomSchedule = true;
          scheduleItems = await paymentPlanService.listScheduleItems(plan.id);
        }
      }
    }
  }

  return (
    <main className="bg-surface">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8 lg:py-14">
        {slug && (
          <Breadcrumbs
            items={[
              { label: "Properties", href: "/properties" },
              ...(propertyName ? [{ label: propertyName, href: `/properties/${slug}` }] : []),
              { label: "Payment Calculator" },
            ]}
          />
        )}
        {slug && (
          <Link href={`/properties/${slug}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Property
          </Link>
        )}

        <h1 className="mt-4 font-heading text-2xl font-extrabold text-ink sm:text-3xl">Property Payment Calculator</h1>
        <p className="mt-1 text-sm text-muted">
          Estimate your property payment plan with 5STAR.M Estate &amp; Builders.
          {propertyName && ` Pre-filled for ${propertyName}.`}
        </p>

        <div className="mt-6">
          <PaymentCalculator
            propertyName={propertyName}
            propertyLocation={propertyLocation}
            initialPrice={initialPrice}
            initialDownPayment={initialDownPayment}
            initialDuration={initialDuration}
            initialFrequency={initialFrequency}
            isCustomSchedule={isCustomSchedule}
            scheduleItems={scheduleItems}
          />
        </div>
      </div>
    </main>
  );
}
