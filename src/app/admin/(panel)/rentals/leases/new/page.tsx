import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { landlordService } from "@/services/landlordService";
import { tenantService } from "@/services/tenantService";
import { NewLeaseForm } from "@/components/admin/rentals/NewLeaseForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function NewLeasePage() {
  await requireSection("rentals");
  const [rentalProperties, landlords, tenants] = await Promise.all([rentalPropertyService.list(), landlordService.list(), tenantService.list()]);

  return (
    <div>
      <Link href="/admin/rentals/leases" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Leases
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">New Lease</h1>
      <div className="mt-6 max-w-2xl">
        <NewLeaseForm
          rentalProperties={rentalProperties.map((rp) => ({ id: rp.id, label: `${rp.propertyTitle ?? "Untitled"}${rp.unitNumber ? ` — ${rp.unitNumber}` : ""}`, monthlyRent: rp.monthlyRent, securityDepositAmount: rp.securityDepositAmount, landlordId: rp.landlordId }))}
          landlords={landlords.map((l) => ({ id: l.id, name: l.name }))}
          tenants={tenants.map((t) => ({ id: t.id, name: t.name }))}
        />
      </div>
    </div>
  );
}
