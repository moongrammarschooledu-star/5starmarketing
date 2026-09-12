import { redirect } from "next/navigation";
import { accountingSettingsService } from "@/services/accountingSettingsService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { AccountingSettingsForm } from "@/components/admin/accounting/AccountingSettingsForm";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function AccountingSettingsPage() {
  await requireSection("accounting");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageFinance(admin.role)) redirect("/admin/accounting");

  const settings = await accountingSettingsService.get();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Accounting Settings</h1>
      <p className="mt-1 text-sm text-muted">Commission defaults, fiscal year, and currency.</p>
      <div className="mt-6">
        <AccountingSettingsForm settings={settings} />
      </div>
    </div>
  );
}
