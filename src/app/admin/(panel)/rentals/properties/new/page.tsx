import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { propertyService } from "@/services/propertyService";
import { landlordService } from "@/services/landlordService";
import { NewRentalPropertyForm } from "@/components/admin/rentals/NewRentalPropertyForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewRentalPropertyPage() {
  await requireSection("rentals");
  const [properties, landlords] = await Promise.all([propertyService.list(), landlordService.list()]);

  return (
    <div>
      <Link href="/admin/rentals/properties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rental Properties
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Add Rental Property</h1>
      <div className="mt-6 max-w-2xl">
        <NewRentalPropertyForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} landlords={landlords.map((l) => ({ id: l.id, name: l.name }))} />
      </div>
    </div>
  );
}
