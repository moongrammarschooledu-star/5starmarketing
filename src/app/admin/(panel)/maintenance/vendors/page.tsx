import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { VendorManager } from "@/components/admin/maintenance/VendorManager";

export const dynamic = "force-dynamic";

export default async function MaintenanceVendorsPage() {
  await requireSection("maintenance");
  const [vendors, admin] = await Promise.all([maintenanceVendorService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Vendors &amp; Contractors</h1>
      <p className="mt-1 text-sm text-muted">Real, admin-entered contractor directory. No vendor login/portal in this deployment — vendors are contacted directly, same as leads and customers.</p>

      <div className="mt-6">
        <VendorManager vendors={vendors} canManage={canManage} />
      </div>
    </div>
  );
}
