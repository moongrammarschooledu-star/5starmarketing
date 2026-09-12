import Link from "next/link";
import { Settings2 } from "lucide-react";
import { agentCommissionService } from "@/services/agentCommissionService";
import { commissionRuleService } from "@/services/commissionRuleService";
import { dealService } from "@/services/dealService";
import { profileService } from "@/services/profileService";
import { parseCommissionSearchParams, type RawSearchParams } from "@/lib/accountingSearchParams";
import { CommissionList } from "@/components/admin/accounting/CommissionList";
import { CommissionCalculatePanel } from "@/components/admin/accounting/CommissionCalculatePanel";
import { canManageFinance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("accounting");
  const sp = await searchParams;
  const filters = parseCommissionSearchParams(sp);

  const [result, rules, allDeals, admin] = await Promise.all([
    agentCommissionService.search(filters),
    commissionRuleService.list(true),
    dealService.searchAll({ page: 1, pageSize: 200 }),
    profileService.getCurrentAdmin(),
  ]);

  const existingDealIds = new Set((await agentCommissionService.search({ page: 1, pageSize: 500 })).commissions.map((c) => c.dealId));
  const eligibleDeals = allDeals
    .filter((d) => d.agentId && d.status !== "Cancelled" && !existingDealIds.has(d.id))
    .map((d) => ({ id: d.id, dealNumber: d.dealNumber, agentName: d.agentName, finalAmount: d.finalAmount }));

  const canManage = admin ? canManageFinance(admin.role) : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Agent Commissions</h1>
          <p className="mt-1 text-sm text-muted">Every commission calculated against a configurable rule — never a single hardcoded percentage.</p>
        </div>
        {canManage && (
          <Link href="/admin/accounting/commissions/rules" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary">
            <Settings2 className="h-4 w-4" /> Manage Rules
          </Link>
        )}
      </div>

      {canManage && (
        <div className="mt-6">
          <CommissionCalculatePanel eligibleDeals={eligibleDeals} rules={rules} />
        </div>
      )}

      <div className="mt-6">
        <CommissionList commissions={result.commissions} total={result.total} page={result.page} totalPages={result.totalPages} canManage={canManage} />
      </div>
    </div>
  );
}
