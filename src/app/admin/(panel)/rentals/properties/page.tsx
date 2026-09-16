import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { landlordService } from "@/services/landlordService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { RentalPropertyManager } from "@/components/admin/rentals/RentalPropertyManager";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function RentalPropertiesPage() {
  await requireSection("rentals");
  const [rentalProperties, landlords, admin] = await Promise.all([rentalPropertyService.list(), landlordService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageRentals(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Rentals
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Properties</h1>
        </div>
        <Link href="/admin/rentals/properties/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Rental Property
        </Link>
      </div>

      <RentalPropertyManager rentalProperties={rentalProperties} landlords={landlords.map((l) => ({ id: l.id, name: l.name }))} canManage={canManage} />
    </div>
  );
}
