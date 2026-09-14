import { legalSettingsService } from "@/services/legalSettingsService";
import { legalChecklistService } from "@/services/legalChecklistService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { redirect } from "next/navigation";
import { LegalSettingsForm } from "@/components/admin/legal/LegalSettingsForm";
import { ChecklistTemplateManager } from "@/components/admin/legal/ChecklistTemplateManager";
import type { LegalChecklistTemplateItem } from "@/lib/models/legal";

export const dynamic = "force-dynamic";

export default async function LegalSettingsPage() {
  await requireSection("legal");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageLegal(admin.role)) redirect("/admin/legal");
  const [settings, templates] = await Promise.all([legalSettingsService.get(), legalChecklistService.listTemplates()]);
  const itemsByTemplate: Record<string, LegalChecklistTemplateItem[]> = {};
  await Promise.all(
    templates.map(async (t) => {
      itemsByTemplate[t.id] = await legalChecklistService.listItems(t.id);
    })
  );

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Settings</h1>
      <p className="mt-1 text-sm text-muted">Reminder windows, confidentiality defaults and the deal-completion legal-clearance gate.</p>
      <div className="mt-6">
        <LegalSettingsForm settings={settings} />
      </div>

      <div className="mt-8 max-w-2xl">
        <h2 className="font-heading text-lg font-bold text-ink">Due-Diligence / Compliance Checklist Templates</h2>
        <p className="mt-1 text-xs text-muted">Checklist completion is never the same as legal clearance — these templates only define what gets checked.</p>
        <div className="mt-3">
          <ChecklistTemplateManager templates={templates} itemsByTemplate={itemsByTemplate} />
        </div>
      </div>
    </div>
  );
}
