import Link from "next/link";
import { Receipt, Printer } from "lucide-react";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";

export const metadata = { title: "My Payments" };
export const dynamic = "force-dynamic";

export default async function CustomerPaymentsPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const deals = await dealService.listByCustomer(customer.id);
  const paymentsByDeal = await Promise.all(deals.map(async (d) => ({ deal: d, payments: await dealPaymentService.listByDeal(d.id) })));
  const rows = paymentsByDeal.flatMap(({ deal, payments }) => payments.map((p) => ({ deal, payment: p }))).sort((a, b) => b.payment.paymentDate.localeCompare(a.payment.paymentDate));

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Payments</h1>
      <p className="mt-1 text-sm text-muted">Every payment recorded against your deals.</p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">No payments recorded.</h2>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Deal</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ deal, payment }) => (
                <tr key={payment.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{new Date(payment.paymentDate).toLocaleDateString("en-GB")}</td>
                  <td className="px-4 py-3 font-semibold text-ink">
                    <Link href={`/customer/deals/${deal.id}`} className="hover:text-primary">
                      {deal.dealNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{payment.paymentType}</td>
                  <td className="px-4 py-3 font-bold text-ink">{formatPKR(payment.amount)}</td>
                  <td className="px-4 py-3 text-muted">{payment.reference ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/customer/deal-receipt-print/${payment.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                      <Printer className="h-3.5 w-3.5" /> Print
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
