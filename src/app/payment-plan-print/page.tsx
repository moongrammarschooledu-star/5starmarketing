import type { Metadata } from "next";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import { PrintButton } from "@/components/admin/PrintButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payment Plan",
  robots: { index: false, follow: false },
};

function generatedDate() {
  return new Date().toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PaymentPlanPrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    location?: string;
    price?: string;
    downPayment?: string;
    installment?: string;
    duration?: string;
    frequency?: string;
  }>;
}) {
  const sp = await searchParams;
  const price = Number(sp.price) || 0;
  const downPayment = Number(sp.downPayment) || 0;
  const installment = sp.installment ? Number(sp.installment) : undefined;
  const remaining = price - downPayment;

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

      <h1 className="mt-6 text-2xl font-extrabold">Payment Plan</h1>
      <div className="mt-1 text-sm text-black/70">Generated: {generatedDate()}</div>

      {sp.property && (
        <div className="mt-6">
          <div className="text-xs uppercase text-black/50">Property</div>
          <div className="text-lg font-bold">{sp.property}</div>
          {sp.location && <div className="text-sm text-black/70">{sp.location}</div>}
        </div>
      )}

      <table className="mt-6 w-full border-collapse text-sm">
        <tbody>
          <Row label="Property Price" value={formatPKR(price)} />
          <Row label="Down Payment" value={formatPKR(downPayment)} />
          <Row label="Remaining Amount" value={formatPKR(remaining)} />
          {installment !== undefined && (
            <Row label={`Estimated Installment (${sp.frequency ?? "Monthly"})`} value={formatPKR(installment)} />
          )}
          {sp.duration && <Row label="Duration" value={`${sp.duration} ${sp.frequency === "Yearly" ? "years" : sp.frequency === "Quarterly" ? "quarters" : "months"}`} />}
          {sp.frequency && <Row label="Payment Frequency" value={sp.frequency} />}
        </tbody>
      </table>

      <div className="mt-8 rounded border border-black/15 p-4 text-xs leading-relaxed text-black/70">
        This payment plan is an estimate for informational purposes only. Final prices, terms and payment schedules
        are subject to confirmation by 5STAR.M Estate &amp; Builders.
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
