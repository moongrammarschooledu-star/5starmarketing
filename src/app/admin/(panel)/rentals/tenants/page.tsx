import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { tenantService } from "@/services/tenantService";
import { rentalApplicationService } from "@/services/rentalApplicationService";
import { TenantManager } from "@/components/admin/rentals/TenantManager";
import { ApplicationManager } from "@/components/admin/rentals/ApplicationManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function RentalTenantsPage() {
  await requireSection("rentals");
  const [tenants, applications] = await Promise.all([tenantService.list(), rentalApplicationService.list()]);

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Tenants</h1>
      <TenantManager tenants={tenants} />

      <div className="mt-10">
        <h2 className="font-heading text-lg font-bold text-ink">Rental Applications</h2>
        <ApplicationManager applications={applications} />
      </div>
    </div>
  );
}
