import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { landlordService } from "@/services/landlordService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { LandlordManager } from "@/components/admin/rentals/LandlordManager";

export const dynamic = "force-dynamic";

export default async function RentalLandlordsPage() {
  const [landlords, admin] = await Promise.all([landlordService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageRentals(admin.role) : false;

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Landlords</h1>
      <LandlordManager landlords={landlords} canManage={canManage} />
    </div>
  );
}
