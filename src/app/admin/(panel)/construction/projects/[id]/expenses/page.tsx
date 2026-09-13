import { constructionBudgetService } from "@/services/constructionBudgetService";
import { constructionExpenseService } from "@/services/constructionExpenseService";
import { constructionReportService } from "@/services/constructionReportService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { constructionContractorService } from "@/services/constructionContractorService";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { BudgetExpenseManager } from "@/components/admin/construction/BudgetExpenseManager";

export const dynamic = "force-dynamic";

export default async function ConstructionExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageConstruction(admin.role) : false;
  const [lines, summary, expenses, alerts, phases, contractors, vendors] = await Promise.all([
    constructionBudgetService.listLines(id),
    constructionBudgetService.summary(id),
    constructionExpenseService.list(id),
    constructionReportService.budgetAlerts(id),
    constructionPhaseService.list(id),
    constructionContractorService.list(id),
    maintenanceVendorService.list(true),
  ]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Budget &amp; Expenses</h2>
      <BudgetExpenseManager
        projectId={id}
        lines={lines}
        summary={summary}
        expenses={expenses}
        alerts={alerts}
        phases={phases.map((p) => ({ id: p.id, name: p.name }))}
        contractors={contractors.map((c) => ({ id: c.id, name: c.vendorName ?? "Unknown" }))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.businessName }))}
        canManage={canManage}
      />
    </div>
  );
}
