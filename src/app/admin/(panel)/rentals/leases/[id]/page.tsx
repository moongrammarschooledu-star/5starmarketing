import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { leaseService } from "@/services/leaseService";
import { rentScheduleService } from "@/services/rentScheduleService";
import { rentPaymentService } from "@/services/rentPaymentService";
import { depositService } from "@/services/depositService";
import { leaseRenewalService } from "@/services/leaseRenewalService";
import { moveRecordService } from "@/services/moveRecordService";
import { documentService } from "@/services/documentService";
import { profileService } from "@/services/profileService";
import { canManageRentals } from "@/lib/permissions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { LeaseStatusActions } from "@/components/admin/rentals/LeaseStatusActions";
import { RentScheduleManager } from "@/components/admin/rentals/RentScheduleManager";
import { SecurityDepositPanel } from "@/components/admin/rentals/SecurityDepositPanel";
import { LeaseRenewalManager } from "@/components/admin/rentals/LeaseRenewalManager";
import { MoveRecordPanel } from "@/components/admin/rentals/MoveRecordPanel";
import { LeaseDocumentManager } from "@/components/admin/rentals/LeaseDocumentManager";
import { formatPKR } from "@/lib/calculator";
import { requireSection } from "@/lib/guard";

const LEASE_DOCUMENT_TYPE_CODES = ["RENTAL_AGREEMENT", "LEASE_ADDENDUM", "LEASE_RENEWAL_AGREEMENT", "MOVE_IN_REPORT", "MOVE_OUT_REPORT", "RENTAL_NOTICE_DOCUMENT", "RENTAL_APPLICATION_DOCUMENT"];

export const dynamic = "force-dynamic";

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("rentals");
  const { id } = await params;
  const lease = await leaseService.getById(id);
  if (!lease) notFound();

  const [schedules, payments, deposit, renewals, moveRecords, documents, allTypes, admin] = await Promise.all([
    rentScheduleService.listForLease(id),
    rentPaymentService.listForLease(id),
    depositService.getByLease(id),
    leaseRenewalService.listForLease(id),
    moveRecordService.listForLease(id),
    documentService.listByLease(id),
    documentService.listTypes(true),
    profileService.getCurrentAdmin(),
  ]);
  const moveIn = moveRecords.find((r) => r.recordType === "MOVE_IN");
  const moveOut = moveRecords.find((r) => r.recordType === "MOVE_OUT");
  const documentTypes = allTypes.filter((t) => LEASE_DOCUMENT_TYPE_CODES.includes(t.code));
  const depositTransactions = deposit ? await depositService.listTransactions(deposit.id) : [];
  const canManage = admin ? canManageRentals(admin.role) : false;

  return (
    <div>
      <Link href="/admin/rentals/leases" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Leases
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{lease.leaseNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {lease.propertyTitle} {lease.unitNumber ? `— ${lease.unitNumber}` : ""} · {lease.tenantName} · {lease.landlordName}
          </p>
        </div>
        <StatusBadge status={lease.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Monthly Rent" value={formatPKR(lease.monthlyRent)} />
        <Metric label="Security Deposit" value={formatPKR(lease.securityDeposit)} />
        <Metric label="Term" value={`${new Date(lease.startDate).toLocaleDateString("en-GB")} – ${new Date(lease.endDate).toLocaleDateString("en-GB")}`} />
        <Metric label="Late Fee" value={lease.lateFeeType === "NONE" ? "None" : `${lease.lateFeeType} ${lease.lateFeeValue}`} />
      </div>

      {canManage && (
        <div className="mt-4">
          <LeaseStatusActions leaseId={lease.id} status={lease.status} />
        </div>
      )}

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Rent Schedule &amp; Payments</h2>
        <RentScheduleManager leaseId={lease.id} schedules={schedules} payments={payments} canManage={canManage} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Security Deposit</h2>
        <SecurityDepositPanel deposit={deposit} transactions={depositTransactions} canManage={canManage} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Lease Renewals</h2>
        <LeaseRenewalManager leaseId={lease.id} renewals={renewals} canManage={canManage} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Move-In</h2>
          <MoveRecordPanel leaseId={lease.id} recordType="MOVE_IN" record={moveIn} canManage={canManage} />
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Move-Out</h2>
          <MoveRecordPanel leaseId={lease.id} recordType="MOVE_OUT" record={moveOut} canManage={canManage} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Documents</h2>
        <LeaseDocumentManager leaseId={lease.id} documents={documents} types={documentTypes} />
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
