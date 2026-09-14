import { redirect } from "next/navigation";
import { supportSettingsService } from "@/services/supportSettingsService";
import { supportDepartmentService } from "@/services/supportDepartmentService";
import { supportCategoryService } from "@/services/supportCategoryService";
import { profileService } from "@/services/profileService";
import { canManageSupport } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { SupportSettingsForm } from "@/components/support/SupportSettingsForm";
import { CategoryManager } from "@/components/support/CategoryManager";

export const dynamic = "force-dynamic";

export default async function SupportSettingsPage() {
  await requireSection("support");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageSupport(admin.role)) redirect("/admin/support");
  const [settings, departments, categories] = await Promise.all([supportSettingsService.get(), supportDepartmentService.list(true), supportCategoryService.list()]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Support Settings</h1>
      <p className="mt-1 text-sm text-muted">Business hours, routing categories and the customer-facing disclaimer.</p>
      <div className="mt-6">
        <SupportSettingsForm settings={settings} departments={departments} />
      </div>

      <div className="mt-8 max-w-2xl">
        <h2 className="font-heading text-lg font-bold text-ink">Categories &amp; Routing</h2>
        <p className="mt-1 text-xs text-muted">A category&apos;s own default department IS its routing rule.</p>
        <div className="mt-3">
          <CategoryManager categories={categories} departments={departments} />
        </div>
      </div>
    </div>
  );
}
