import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { rentalReportService } from "@/services/rentalReportService";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalsDashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [stats, occupancy, collectionRate, expiryBuckets, performance] = await Promise.all([
    rentalReportService.dashboardStats(),
    rentalReportService.occupancySummary(),
    rentalReportService.rentCollectionRate(monthStart, monthEnd),
    rentalReportService.leaseExpiryBuckets(),
    rentalReportService.propertyPerformance(),
  ]);

  const occupancyBuckets = [
    { label: "Occupied", count: occupancy.occupied },
    { label: "Vacant", count: occupancy.vacant },
    { label: "Unavailable", count: occupancy.unavailable },
  ];

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Occupancy Rate" value={occupancy.occupancyRatePercent != null ? `${occupancy.occupancyRatePercent}%` : "Insufficient data"} accent />
        <Metric label="Collection Rate (This Month)" value={collectionRate.collectionRatePercent != null ? `${collectionRate.collectionRatePercent}%` : "Insufficient data"} />
        <Metric label="Security Deposits Held" value={formatPKR(stats.securityDepositsHeld)} />
        <Metric label="Open Maintenance" value={String(stats.openMaintenanceRequests)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CountBucketChart title="Occupancy" data={occupancyBuckets} empty="Insufficient data for this report." />
        <CountBucketChart title="Lease Expiry" data={expiryBuckets} empty="Insufficient data for this report." />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Property-wise Rental Performance</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Lease Status</th>
                <th className="px-4 py-3">Monthly Rent</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Maintenance</th>
                <th className="px-4 py-3">Next Expiry</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((p) => (
                <tr key={p.rentalPropertyId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink">{p.propertyTitle}</td>
                  <td className="px-4 py-3 text-muted">{p.currentTenantName ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.leaseStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{p.monthlyRent != null ? formatPKR(p.monthlyRent) : "—"}</td>
                  <td className={`px-4 py-3 font-semibold ${p.outstandingAmount > 0 ? "text-primary" : "text-ink"}`}>{formatPKR(p.outstandingAmount)}</td>
                  <td className="px-4 py-3 text-muted">{p.openMaintenanceRequests}</td>
                  <td className="px-4 py-3 text-muted">{p.nextLeaseExpiry ? new Date(p.nextLeaseExpiry).toLocaleDateString("en-GB") : "—"}</td>
                </tr>
              ))}
              {performance.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                    Insufficient data for this report.
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

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
