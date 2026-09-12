import { accountingReportService } from "@/services/accountingReportService";
import { agentCommissionService } from "@/services/agentCommissionService";
import { formatPKR } from "@/lib/calculator";

/** Agent Financial Tab (STEP 23, section 52) — only ever rendered for
 *  authorized management (canManageFinance); the agent's own
 *  commission figures are separately available via the Communication
 *  Center's agent routes, but never shown to a plain agent viewing
 *  ANOTHER agent's page. */
export async function AgentFinancialPanel({ agentId, agentName }: { agentId: string; agentName: string }) {
  const [summary, commissionSummary] = await Promise.all([
    accountingReportService.agentFinancialSummary(agentId, agentName),
    agentCommissionService.summaryForAgent(agentId),
  ]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <MetricBox label="Deals" value={String(summary.dealsCount)} />
      <MetricBox label="Sales Value" value={formatPKR(summary.salesValue)} />
      <MetricBox label="Collected Value" value={formatPKR(summary.collectedValue)} />
      <MetricBox label="Commission Earned" value={formatPKR(commissionSummary.commissionEarned)} />
      <MetricBox label="Commission Paid" value={formatPKR(commissionSummary.commissionPaid)} />
      <MetricBox label="Commission Pending" value={formatPKR(commissionSummary.commissionPending)} accent={commissionSummary.commissionPending > 0} />
    </div>
  );
}

function MetricBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 text-center">
      <div className={`font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}
