import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Building2, FolderKanban, Receipt, FileStack } from "lucide-react";
import { dealService } from "@/services/dealService";
import { dealPaymentService } from "@/services/dealPaymentService";
import { dealDocumentService } from "@/services/dealDocumentService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DealFinancialSummaryPanel } from "@/components/admin/deals/DealFinancialSummaryPanel";
import { DealPaymentSchedule } from "@/components/admin/deals/DealPaymentSchedule";
import { DealPaymentsPanel } from "@/components/admin/deals/DealPaymentsPanel";
import { DealDocumentsPanel } from "@/components/admin/deals/DealDocumentsPanel";
import { DealNotesPanel } from "@/components/admin/deals/DealNotesPanel";
import { DealActivityTimeline } from "@/components/admin/deals/DealActivityTimeline";
import { DealCommissionPanel } from "@/components/admin/deals/DealCommissionPanel";
import { DealStatusActionsPanel } from "@/components/admin/deals/DealStatusActionsPanel";
import { canManageDealFinancials } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("deals");
  const { id } = await params;
  const deal = await dealService.getById(id);
  if (!deal) notFound();

  const [notes, activity, payments, documents, schedule, assignableAgents, admin] = await Promise.all([
    dealService.listNotes(deal.id),
    dealService.listActivity(deal.id),
    dealPaymentService.listByDeal(deal.id),
    dealDocumentService.listByDeal(deal.id),
    dealService.getScheduleForDeal(deal.id),
    teamService.listAssignable(),
    profileService.getCurrentAdmin(),
  ]);

  const canManage = admin ? canManageDealFinancials(admin.role) : false;

  return (
    <div>
      <Link href="/admin/deals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{deal.dealNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {deal.dealType} · Created {new Date(deal.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
        <StatusBadge status={deal.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {(deal.customerName || deal.customerId) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <User className="h-4.5 w-4.5 text-primary" /> Customer Information
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Name" value={deal.customerName ?? "—"} />
                {deal.customerPhone && <Row label="Phone" value={deal.customerPhone} />}
                {deal.customerWhatsapp && <Row label="WhatsApp" value={deal.customerWhatsapp} />}
                {deal.customerEmail && <Row label="Email" value={deal.customerEmail} />}
                {deal.customerId && <Row label="Customer ID" value={deal.customerId.slice(0, 8)} />}
              </div>
              {deal.customerId && (
                <Link href={`/admin/customers/${deal.customerId}`} className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
                  View customer account →
                </Link>
              )}
            </div>
          )}

          {(deal.propertyTitle || deal.propertyId) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Building2 className="h-4.5 w-4.5 text-primary" /> Property Information
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Property" value={deal.propertyTitle ?? "—"} />
                {deal.propertyType && <Row label="Type" value={deal.propertyType} />}
                {deal.propertyLocation && <Row label="Location" value={deal.propertyLocation} />}
                {deal.propertySize && <Row label="Size" value={deal.propertySize} />}
                {deal.propertyStatus && <Row label="Current Status" value={deal.propertyStatus} />}
              </div>
              {deal.propertySlug && (
                <Link href={`/properties/${deal.propertySlug}`} target="_blank" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
                  View property on site →
                </Link>
              )}
            </div>
          )}

          {deal.projectName && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <FolderKanban className="h-4.5 w-4.5 text-primary" /> Project
              </h2>
              <p className="mt-2 text-sm font-semibold text-ink">{deal.projectName}</p>
            </div>
          )}

          {(deal.sellerName || deal.sellerPhone) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="font-heading text-base font-bold text-ink">Seller / Owner</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {deal.sellerName && <Row label="Name" value={deal.sellerName} />}
                {deal.sellerPhone && <Row label="Phone" value={deal.sellerPhone} />}
              </div>
              {deal.sellerNotes && <p className="mt-3 text-sm text-muted">{deal.sellerNotes}</p>}
            </div>
          )}

          <DealFinancialSummaryPanel deal={deal} canEdit={canManage} />
          <DealPaymentSchedule installments={schedule} />
          <DealPaymentsPanel dealId={deal.id} payments={payments} />
          <DealDocumentsPanel dealId={deal.id} documents={documents} canManage={canManage} />

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                  <FileStack className="h-4.5 w-4.5 text-primary" /> Documents &amp; Agreements
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Checklist progress, generated booking forms, agreements and signature requests for this deal.
                </p>
              </div>
              <Link
                href={`/admin/deals/${deal.id}/documents`}
                className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
              >
                <FileStack className="h-4 w-4" /> Open Documents
              </Link>
            </div>
          </div>
          <DealCommissionPanel deal={deal} canManage={canManage} />
          <DealNotesPanel dealId={deal.id} notes={notes} />
          <DealActivityTimeline activity={activity} />
        </div>

        <div>
          <DealStatusActionsPanel deal={deal} assignableAgents={assignableAgents} canAssign={canManage} />

          {deal.leadId && (
            <Link
              href={`/admin/crm/leads/${deal.leadId}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 px-4 py-2.5 text-sm font-bold text-ink hover:border-primary hover:text-primary"
            >
              <Receipt className="h-4 w-4" /> View Originating Lead
            </Link>
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
