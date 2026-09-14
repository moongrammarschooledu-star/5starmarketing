import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { tenantService } from "@/services/tenantService";
import { leaseService } from "@/services/leaseService";
import { rentScheduleService } from "@/services/rentScheduleService";
import { rentPaymentService } from "@/services/rentPaymentService";
import { depositService } from "@/services/depositService";
import { leaseRenewalService } from "@/services/leaseRenewalService";
import { rentalNoticeService } from "@/services/rentalNoticeService";
import { documentService } from "@/services/documentService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { CustomerRenewalRequestForm } from "@/components/customer/rentals/CustomerRenewalRequestForm";
import { CustomerNoticeList } from "@/components/customer/rentals/CustomerNoticeList";

export const metadata = { title: "My Lease" };
export const dynamic = "force-dynamic";

export default async function CustomerLeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const tenant = await tenantService.getByCustomerId(customer.id);
  const lease = await leaseService.getById(id);
  if (!lease || !tenant || lease.tenantId !== tenant.id) notFound();

  const [schedules, payments, deposit, renewals, notices, documents] = await Promise.all([
    rentScheduleService.listForLease(id),
    rentPaymentService.listForLease(id),
    depositService.getByLease(id),
    leaseRenewalService.listForLease(id),
    rentalNoticeService.listForRecipient(customer.id),
    documentService.listByLease(id),
  ]);
  const leaseNotices = notices.filter((n) => n.leaseId === id);
  const approvedDocuments = documents.filter((d) => d.status === "APPROVED" || d.status === "VERIFIED" || d.status === "UPLOADED");

  return (
    <div>
      <Link href="/customer/rentals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Rental
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {lease.propertyTitle} {lease.unitNumber ? `— ${lease.unitNumber}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">{lease.leaseNumber}</p>
        </div>
        <StatusBadge status={lease.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Monthly Rent" value={formatPKR(lease.monthlyRent)} />
        <Metric label="Security Deposit" value={formatPKR(lease.securityDeposit)} />
        <Metric label="Term" value={`${new Date(lease.startDate).toLocaleDateString("en-GB")} – ${new Date(lease.endDate).toLocaleDateString("en-GB")}`} />
        <Metric label="Payment Due Day" value={String(lease.paymentDueDay)} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Rent Schedule</h2>
        <div className="mt-3 space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{s.invoiceNumber}</p>
                <p className="text-xs text-muted">
                  {new Date(s.periodStart).toLocaleDateString("en-GB")} – {new Date(s.periodEnd).toLocaleDateString("en-GB")} · Due {new Date(s.dueDate).toLocaleDateString("en-GB")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink">{formatPKR(s.totalDue)}</p>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
          {schedules.length === 0 && <p className="text-sm text-muted">No rent periods published yet.</p>}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Payment History</h2>
        <div className="mt-3 space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{p.paymentNumber}</p>
                <p className="text-xs text-muted">
                  {new Date(p.paymentDate).toLocaleDateString("en-GB")} · {p.paymentMethod}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink">{formatPKR(p.amount)}</p>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
          {payments.length === 0 && <p className="text-sm text-muted">No payments recorded yet.</p>}
        </div>
      </div>

      {deposit && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-ink">Security Deposit</h2>
          <div className="mt-3 rounded-xl border border-border bg-surface p-3.5">
            <p className="text-sm font-semibold text-ink">{formatPKR(deposit.amount)}</p>
            <StatusBadge status={deposit.status} />
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Renew or Move Out</h2>
        <CustomerRenewalRequestForm leaseId={id} status={lease.status} renewals={renewals} />
        <p className="mt-3 text-xs text-muted">
          To submit a move-out notice or a maintenance request, use{" "}
          <Link href="/customer/maintenance/new" className="font-bold text-primary hover:underline">
            Maintenance
          </Link>{" "}
          or contact us via{" "}
          <Link href="/customer/messages" className="font-bold text-primary hover:underline">
            Messages
          </Link>
          .
        </p>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Notices</h2>
        <CustomerNoticeList notices={leaseNotices} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Documents</h2>
        <div className="mt-3 space-y-2">
          {approvedDocuments.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
              <div>
                <p className="text-sm font-semibold text-ink">{d.title}</p>
                <p className="text-xs text-muted">{d.documentTypeLabel ?? d.documentType}</p>
              </div>
              <Link href={`/customer/documents/${d.id}`} className="text-xs font-bold text-primary hover:underline">
                View
              </Link>
            </div>
          ))}
          {approvedDocuments.length === 0 && <p className="text-sm text-muted">No documents available yet.</p>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-base font-extrabold text-ink">{value}</p>
    </div>
  );
}
