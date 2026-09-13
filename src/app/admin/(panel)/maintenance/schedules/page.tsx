import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { maintenanceScheduleService } from "@/services/maintenanceScheduleService";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { propertyService } from "@/services/propertyService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { ScheduleManager } from "@/components/admin/maintenance/ScheduleManager";

export const dynamic = "force-dynamic";

export default async function MaintenanceSchedulesPage() {
  await requireSection("maintenance");
  const [schedules, properties, vendors, admin] = await Promise.all([maintenanceScheduleService.list(), propertyService.list(), maintenanceVendorService.list(true), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Preventive Maintenance Schedules</h1>
      <p className="mt-1 text-sm text-muted">Recurring maintenance (AC service, generator service, fire safety, etc.) with real due dates.</p>

      <div className="mt-6">
        <ScheduleManager
          schedules={schedules}
          properties={properties.map((p) => ({ id: p.id, title: p.title }))}
          vendors={vendors.map((v) => ({ id: v.id, businessName: v.businessName }))}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
