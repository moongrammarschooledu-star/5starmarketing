import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { profileService } from "@/services/profileService";
import { DealPaymentsFullTable } from "@/components/admin/deals/DealPaymentsFullTable";
import { formatPKR } from "@/lib/calculator";
import { canManageDealFinancials } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("deals");
  const { id } = await params;
  const deal = await dealService.getById(id);
  if (!deal) notFound();

  const [payments, admin] = await Promise.all([dealPaymentService.listByDeal(id), profileService.getCurrentAdmin()]);
  const canVerify = admin ? canManageDealFinancials(admin.role) : false;

  return (
    <div>
      <Link href={`/admin/deals/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to {deal.dealNumber}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Payments — {deal.dealNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {formatPKR(deal.receivedAmount)} received of {formatPKR(deal.finalAmount)} · {formatPKR(deal.outstandingAmount)} outstanding.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <DealPaymentsFullTable deal={deal} payments={payments} canVerify={canVerify} />
      </div>
    </div>
  );
}
