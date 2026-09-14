import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { depositService } from "@/services/depositService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalDepositsPage() {
  const deposits = await depositService.list();

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Security Deposits</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Lease</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Refunded</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <a href={`/admin/rentals/leases/${d.leaseId}`} className="font-semibold text-primary hover:underline">
                    {d.leaseNumber}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted">{d.tenantName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{d.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(d.amount)}</td>
                <td className="px-4 py-3 text-muted">{d.refundAmount != null ? formatPKR(d.refundAmount) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
              </tr>
            ))}
            {deposits.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No security deposits yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
