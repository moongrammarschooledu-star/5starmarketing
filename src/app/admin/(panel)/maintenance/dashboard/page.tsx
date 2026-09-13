import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { maintenanceReportService } from "@/services/maintenanceReportService";
import { requireSection } from "@/lib/guard";
import { formatPKR } from "@/lib/calculator";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";

export const dynamic = "force-dynamic";

export default async function MaintenanceDashboardPage() {
  await requireSection("maintenance");
  const [byStatus, byCategory, byProperty, costTrend, preventiveVsReactive, resolutionTrend, vendorPerformance] = await Promise.all([
    maintenanceReportService.requestsByStatus(),
    maintenanceReportService.requestsByCategory(),
    maintenanceReportService.requestsByProperty(),
    maintenanceReportService.monthlyMaintenanceCostTrend(),
    maintenanceReportService.preventiveVsReactive(),
    maintenanceReportService.averageResolutionTrend(),
    maintenanceReportService.vendorPerformance(),
  ]);

  return (
    <div>
      <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Maintenance
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Maintenance Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Every chart below reflects real, recorded requests and work orders.</p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CountBucketChart title="Requests by Status" data={byStatus} empty="Insufficient data for this report." />
        <CountBucketChart title="Requests by Category" data={byCategory} empty="Insufficient data for this report." />
        <CountBucketChart title="Requests by Property (Top 10)" data={byProperty} empty="Insufficient data for this report." />
        <CountBucketChart title="Preventive vs Reactive Work Orders" data={preventiveVsReactive} empty="Insufficient data for this report." />
        <TrendChart title="Monthly Maintenance Cost (PKR, by completion month)" data={costTrend} empty="Insufficient data for this report." />
        <TrendChart title="Average Resolution Time (hours, by month closed)" data={resolutionTrend} empty="Insufficient data for this report." />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Vendor Performance</h2>
        <p className="mt-1 text-xs text-muted">Shown only once a vendor has at least 3 assigned jobs — otherwise the percentage would be misleading.</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Avg. Completion</th>
                <th className="px-4 py-3">Avg. Cost</th>
                <th className="px-4 py-3">On-Time %</th>
              </tr>
            </thead>
            <tbody>
              {vendorPerformance.map((v) => (
                <tr key={v.vendorId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{v.vendorName}</td>
                  <td className="px-4 py-3 text-muted">{v.assignedJobs}</td>
                  <td className="px-4 py-3 text-muted">{v.completedJobs}</td>
                  <td className="px-4 py-3 text-muted">{v.hasSufficientData && v.averageCompletionDays != null ? `${v.averageCompletionDays.toFixed(1)}d` : "Insufficient data"}</td>
                  <td className="px-4 py-3 text-muted">{v.hasSufficientData && v.averageCost != null ? formatPKR(v.averageCost) : "Insufficient data"}</td>
                  <td className="px-4 py-3 text-muted">{v.hasSufficientData && v.onTimeCompletionPercent != null ? `${v.onTimeCompletionPercent}%` : "Insufficient data"}</td>
                </tr>
              ))}
              {vendorPerformance.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                    No vendors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
