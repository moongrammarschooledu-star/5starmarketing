import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { rentalReportService } from "@/services/rentalReportService";
import { CountBucketChart } from "@/components/admin/charts/CountBucketChart";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

const exports = [
  { type: "rent-collection", label: "Rent Collection Report" },
  { type: "outstanding", label: "Outstanding Rent Report" },
  { type: "lease-expiry", label: "Lease Expiry Report" },
  { type: "tenants", label: "Tenant Report" },
  { type: "landlords", label: "Landlord Report" },
  { type: "deposits", label: "Deposit Report" },
];

export default async function RentalReportsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [performance, collectionRate] = await Promise.all([rentalReportService.propertyPerformance(), rentalReportService.rentCollectionRate(monthStart, monthEnd)]);

  const incomeBuckets = performance
    .filter((p) => p.monthlyRent != null)
    .map((p) => ({ label: p.propertyTitle, count: p.monthlyRent ?? 0 }));

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rental Reports</h1>
      <p className="mt-1 text-sm text-muted">
        This month&apos;s collection rate: {collectionRate.collectionRatePercent != null ? `${collectionRate.collectionRatePercent}%` : "Insufficient data"} ({formatPKR(collectionRate.confirmedCollected)} of {formatPKR(collectionRate.totalDue)} due).
      </p>

      <div className="mt-6">
        <CountBucketChart title="Property-wise Monthly Rent" data={incomeBuckets} empty="Insufficient data for this report." />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {exports.map((e) => (
          <a key={e.type} href={`/admin/rentals/reports/export?type=${e.type}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <Download className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-bold text-ink">{e.label}</p>
              <p className="text-xs text-muted">Export as CSV</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
