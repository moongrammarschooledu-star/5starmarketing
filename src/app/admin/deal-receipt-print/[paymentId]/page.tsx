import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

// Outside /admin/(panel) for a clean printable page with no sidebar —
// mirrors reports-print/[type]. Carries real financial/customer data,
// so it stays admin-gated and never indexable.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function generatedDate() {
  return new Date().toLocaleString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function DealReceiptPrintPage({ params }: { params: Promise<{ paymentId: string }> }) {
  await requireSection("deals");
  const { paymentId } = await params;
  const payment = await dealPaymentService.getById(paymentId);
  if (!payment) notFound();
  const deal = await dealService.getById(payment.dealId);
  if (!deal) notFound();

  // Balance after this specific payment — computed from the deal's
  // final amount minus every Verified payment up to and including this
  // one's payment date, so a receipt printed later still reflects what
  // the balance actually was at that point in the ledger.
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
          <Row label="Customer" value={deal.customerName ?? "—"} />
          <Row label="Property" value={deal.propertyTitle ?? deal.projectName ?? "—"} />
          <Row label="Payment Date" value={new Date(payment.paymentDate).toLocaleDateString("en-GB")} />
          <Row label="Payment Amount" value={formatPKR(payment.amount)} />
          <Row label="Payment Type" value={payment.paymentType} />
          <Row label="Payment Method" value={payment.paymentMethod} />
          {payment.reference && <Row label="Reference" value={payment.reference} />}
          <Row label="Status" value={payment.status} />
          <Row label="Recorded By" value={payment.recordedByName ?? "—"} />
          <Row label="Balance After Payment" value={formatPKR(balanceAfter)} />
        </tbody>
      </table>

      <div className="mt-8 rounded border border-black/15 p-4 text-xs leading-relaxed text-black/70">
        This receipt reflects the payment record above as of the date shown. Contact {site.fullName} with any questions regarding this transaction.
      </div>

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
