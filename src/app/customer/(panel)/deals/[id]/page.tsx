import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Wallet, Receipt, FileText, CalendarClock } from "lucide-react";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { dealDocumentService } from "@/services/dealDocumentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { formatDateOnly } from "@/lib/date";

export const metadata = { title: "Deal Details" };
export const dynamic = "force-dynamic";

export default async function CustomerDealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const deal = await dealService.getById(id);
  // RLS already scopes deals to their own customer_id — this is a
  // defense-in-depth check, matching the pattern used throughout the
  // customer portal (belt-and-suspenders, not the only guard).
  if (!deal || deal.customerId !== customer.id) notFound();

  const [payments, documents, schedule] = await Promise.all([
    dealPaymentService.listByDeal(deal.id),
    dealDocumentService.listByDeal(deal.id),
    dealService.getScheduleForDeal(deal.id),
  ]);
  const approvedDocuments = documents.filter((d) => d.status === "Approved");

  return (
    <div>
      <Link href="/customer/deals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Deals
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{deal.dealNumber}</h1>
          <p className="mt-1 text-sm text-muted">{deal.dealType}</p>
        </div>
        <StatusBadge status={deal.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(deal.propertyTitle || deal.projectName) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Building2 className="h-4.5 w-4.5 text-primary" /> Property
              </h2>
              <p className="mt-2 text-sm font-semibold text-ink">{deal.propertyTitle ?? deal.projectName}</p>
              {deal.propertyLocation && <p className="text-sm text-muted">{deal.propertyLocation}</p>}
              {deal.propertySlug && (
                <Link href={`/properties/${deal.propertySlug}`} className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                  View property →
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Wallet className="h-4.5 w-4.5 text-primary" /> Financial Summary
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Deal Amount" value={formatPKR(deal.finalAmount)} />
              <Row label="Received" value={formatPKR(deal.receivedAmount)} />
              <Row label="Outstanding" value={formatPKR(deal.outstandingAmount)} />
              {deal.expectedCompletionDate && <Row label="Expected Completion" value={formatDateOnly(deal.expectedCompletionDate)} />}
            </div>
          </div>

          {schedule.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <CalendarClock className="h-4.5 w-4.5 text-primary" /> Payment Schedule
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Due</th>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2.5 font-semibold text-ink">{item.installmentNumber}</td>
                        <td className="px-3 py-2.5 text-muted">{item.dueDate ? formatDateOnly(item.dueDate) : "—"}</td>
                        <td className="px-3 py-2.5 text-ink">{formatPKR(item.amount)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Receipt className="h-4.5 w-4.5 text-primary" /> Payments
            </h2>
            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No payments recorded.</p>
            ) : (
              <div className="mt-4 space-y-2.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted p-3 text-sm">
                    <div>
                      <div className="font-bold text-ink">{formatPKR(p.amount)}</div>
                      <div className="text-xs text-muted">
                        {p.paymentType} · {new Date(p.paymentDate).toLocaleDateString("en-GB")}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {approvedDocuments.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <FileText className="h-4.5 w-4.5 text-primary" /> Documents
              </h2>
              <div className="mt-4 space-y-2">
                {approvedDocuments.map((d) => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg bg-surface-muted p-3 text-sm font-semibold text-ink hover:text-primary">
                    {d.name} <span className="text-xs text-muted-foreground">{d.documentType}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
