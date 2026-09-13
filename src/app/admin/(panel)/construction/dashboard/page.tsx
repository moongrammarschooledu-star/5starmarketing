import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { constructionReportService } from "@/services/constructionReportService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";

export const dynamic = "force-dynamic";

export default async function ConstructionDashboardPage() {
  await requireSection("construction");
  const [byStatus, expenseTrend, budgetVsActual, contractorPerformance] = await Promise.all([
    constructionReportService.projectsByStatus(),
    constructionReportService.monthlyExpenseTrend(),
    constructionReportService.budgetVsActualTotals(),
    constructionReportService.contractorPerformance(),
  ]);

  const budgetVsActualChart = [
    { label: "Approved Budget", count: Math.round(budgetVsActual.budgeted) },
    { label: "Actual Expenditure", count: Math.round(budgetVsActual.actual) },
  ];

  return (
    <div>
      <Link href="/admin/construction" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Construction
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Construction Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Every chart reflects real, recorded projects and expenses.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CountBucketChart title="Projects by Status" data={byStatus} empty="Insufficient data for this report." />
        <CountBucketChart title="Budget vs Actual (All Projects, PKR)" data={budgetVsActualChart} empty="Insufficient data for this report." />
        <TrendChart title="Monthly Construction Expenses (PKR, paid)" data={expenseTrend} empty="Insufficient data for this report." />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Contractor Performance</h2>
        <p className="mt-1 text-xs text-muted">Shown only once a contractor has at least 3 assigned work orders.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Contractor</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Avg. Completion Days</th>
              </tr>
            </thead>
            <tbody>
              {contractorPerformance.map((c, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{c.vendorName}</td>
                  <td className="px-4 py-3 text-muted">{c.assignedWorkOrders}</td>
                  <td className="px-4 py-3 text-muted">{c.completedWorkOrders}</td>
                  <td className="px-4 py-3 text-muted">{c.hasSufficientData && c.averageCompletionDays != null ? `${c.averageCompletionDays.toFixed(1)}d` : "Insufficient data"}</td>
                </tr>
              ))}
              {contractorPerformance.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                    No contractors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">Total approved budget: {formatPKR(budgetVsActual.budgeted)} · Total actual expenditure: {formatPKR(budgetVsActual.actual)}</p>
    </div>
  );
}
