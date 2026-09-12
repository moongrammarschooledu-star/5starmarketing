import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { investmentScenarioService } from "@/services/investmentScenarioService";
import { profileService } from "@/services/profileService";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { ValuationSettingsForm } from "@/components/admin/investment/ValuationSettingsForm";
import { InvestmentScenarioManager } from "@/components/admin/investment/InvestmentScenarioManager";

export const dynamic = "force-dynamic";

export default async function InvestmentSettingsPage() {
  await requireSection("investment");
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canManageFinance(admin.role)) redirect("/admin/investment");

  const [settings, scenarios] = await Promise.all([valuationSettingsService.get(), investmentScenarioService.list()]);

  return (
    <div>
      <Link href="/admin/investment" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Investment
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Investment Settings</h1>
      <p className="mt-1 text-sm text-muted">Area conversion factors, confidence thresholds, expense defaults, appreciation scenarios, currency, and the investment disclaimer — all admin-configurable, never hardcoded.</p>

      <div className="mt-6 space-y-8">
        <ValuationSettingsForm settings={settings} />
        <InvestmentScenarioManager scenarios={scenarios} />
      </div>
    </div>
  );
}
