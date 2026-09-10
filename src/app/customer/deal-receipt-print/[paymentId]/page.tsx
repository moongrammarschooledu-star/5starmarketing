import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

function generatedDate() {
  return new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function CustomerDealReceiptPrintPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) notFound();

  const { paymentId } = await params;
  const payment = await dealPaymentService.getById(paymentId);
  if (!payment) notFound();
  const deal = await dealService.getById(payment.dealId);
  // RLS already scopes deal_payments/deals to their own customer_id —
  // this ownership check is defense-in-depth on top of that.
  if (!deal || deal.customerId !== customer.id) notFound();

  const allPayments = await dealPaymentService.listByDeal(deal.id);
  const verifiedUpTo = allPayments.filter((p) => p.status === "Verified" && new Date(p.paymentDate) <= new Date(payment.paymentDate)).reduce((sum, p) => sum + p.amount, 0);
  const balanceAfter = Math.max(deal.finalAmount - verifiedUpTo, 0);

  return (
    <div className="mx-auto max-w-2xl bg-white px-6 py-10 text-black print:px-0 print:py-0">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="flex items-start justify-between border-b-2 border-black/80 pb-4">
        <div>
          <div className="text-lg font-extrabold">{site.fullName}</div>
          <div className="text-xs uppercase tracking-wide text-black/60">Estate &amp; Builders</div>
          <div className="mt-1 text-xs text-black/60">{site.address}</div>
        </div>
        <PrintButton />
      </div>

      <h1 className="mt-6 text-2xl font-extrabold">Payment Receipt</h1>
      <div className="mt-1 text-sm text-black/70">Generated: {generatedDate()}</div>

      <table className="mt-6 w-full border-collapse text-sm">
        <tbody>
          <Row label="Deal Number" value={deal.dealNumber} />
          <Row label="Property" value={deal.propertyTitle ?? deal.projectName ?? "—"} />
          <Row label="Payment Date" value={new Date(payment.paymentDate).toLocaleDateString("en-GB")} />
          <Row label="Payment Amount" value={formatPKR(payment.amount)} />
          <Row label="Payment Type" value={payment.paymentType} />
          <Row label="Payment Method" value={payment.paymentMethod} />
          {payment.reference && <Row label="Reference" value={payment.reference} />}
          <Row label="Status" value={payment.status} />
          <Row label="Balance After Payment" value={formatPKR(balanceAfter)} />
        </tbody>
      </table>

      <p className="mt-10 text-[11px] text-black/40">
        {site.fullName} — {site.phoneDisplay} — {site.email}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-black/10">
      <td className="py-1.5 text-black/60">{label}</td>
      <td className="py-1.5 text-right font-semibold">{value}</td>
    </tr>
  );
}
