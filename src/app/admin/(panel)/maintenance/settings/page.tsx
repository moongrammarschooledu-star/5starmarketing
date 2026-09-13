import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { maintenanceSettingsService } from "@/services/maintenanceSettingsService";
import { maintenanceSlaService } from "@/services/maintenanceSlaService";
import { inspectionTemplateService } from "@/services/inspectionTemplateService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { MaintenanceSettingsForm } from "@/components/admin/maintenance/MaintenanceSettingsForm";
import { SlaSettingsManager } from "@/components/admin/maintenance/SlaSettingsManager";
import { InspectionTemplateManager } from "@/components/admin/maintenance/InspectionTemplateManager";

export const dynamic = "force-dynamic";

export default async function MaintenanceSettingsPage() {
  await requireSection("maintenance");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageMaintenance(admin.role)) redirect("/admin/maintenance");

  const [settings, slaSettings, templates] = await Promise.all([maintenanceSettingsService.get(), maintenanceSlaService.list(), inspectionTemplateService.list()]);
  const itemsByTemplate = await Promise.all(templates.map((t) => inspectionTemplateService.listItems(t.id)));

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Maintenance Settings</h1>
      <p className="mt-1 text-sm text-muted">SLA targets, recurring-issue/condition-score thresholds, currency, disclaimer, and inspection checklist templates.</p>

      <div className="mt-6 space-y-8">
        <SlaSettingsManager settings={slaSettings} />
        <MaintenanceSettingsForm settings={settings} />
        <InspectionTemplateManager templates={templates.map((t, i) => ({ ...t, items: itemsByTemplate[i] }))} />
      </div>
    </div>
  );
}
