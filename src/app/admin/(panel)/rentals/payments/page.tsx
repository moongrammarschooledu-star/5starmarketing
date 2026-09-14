import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { rentPaymentService } from "@/services/rentPaymentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const dynamic = "force-dynamic";

export default async function RentalPaymentsPage() {
  const payments = await rentPaymentService.list();

  return (
    <div>
      <Link href="/admin/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Rentals
      </Link>
      <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Rent Payments</h1>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Payment #</th>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-ink">{p.paymentNumber}</td>
                <td className="px-4 py-3 text-muted">{p.tenantName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{p.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 font-semibold text-ink">{formatPKR(p.amount)}</td>
                <td className="px-4 py-3 text-muted">{new Date(p.paymentDate).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-muted">{p.paymentMethod}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No rent payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
