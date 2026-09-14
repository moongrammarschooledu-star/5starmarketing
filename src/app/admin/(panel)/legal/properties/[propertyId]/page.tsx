import { notFound } from "next/navigation";
import Link from "next/link";
import { propertyService } from "@/services/propertyService";
import { legalPropertyService } from "@/services/legalPropertyService";
import { ownershipService } from "@/services/ownershipService";
import { legalDocumentService } from "@/services/legalDocumentService";
import { encumbranceService } from "@/services/encumbranceService";
import { complianceService } from "@/services/complianceService";
import { legalChecklistService } from "@/services/legalChecklistService";
import { legalRiskService } from "@/services/legalRiskService";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { legalCaseService } from "@/services/legalCaseService";
import { legalContractService } from "@/services/legalContractService";
import { legalNoticeService } from "@/services/legalNoticeService";
import { documentService } from "@/services/documentService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OwnershipManager } from "@/components/admin/legal/OwnershipManager";
import { LegalDocumentManager } from "@/components/admin/legal/LegalDocumentManager";
import { EncumbranceManager } from "@/components/admin/legal/EncumbranceManager";
import { ComplianceManager } from "@/components/admin/legal/ComplianceManager";
import { LegalRiskManager } from "@/components/admin/legal/LegalRiskManager";
import { LegalOfficerAssignForm } from "@/components/admin/legal/LegalOfficerAssignForm";
import { GenerateLegalFileButton } from "@/components/admin/legal/GenerateLegalFileButton";

export const dynamic = "force-dynamic";

export default async function LegalPropertyDetailPage({ params }: { params: Promise<{ propertyId: string }> }) {
  await requireSection("legal");
  const { propertyId } = await params;
  const property = await propertyService.getById(propertyId);
  if (!property) notFound();

  const [record, allocation, legalDocs, docTypes, encumbrances, compliance, complianceTemplates, riskIndicator, risks, ddCases, legalCases, contracts, notices, team, admin] = await Promise.all([
    legalPropertyService.ensureForProperty(propertyId),
    ownershipService.allocationSummary(propertyId),
    legalDocumentService.listForProperty(propertyId),
    documentService.listTypes(),
    encumbranceService.listForProperty(propertyId),
    complianceService.list({ propertyId }),
    legalChecklistService.listTemplates("COMPLIANCE"),
    legalRiskService.propertyRiskIndicator(propertyId),
    legalRiskService.listForProperty(propertyId),
    dueDiligenceService.list({ propertyId }),
    legalCaseService.list({ propertyId }),
    legalContractService.list({ propertyId }),
    legalNoticeService.list({ propertyId }),
    teamService.list(),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canManageLegal(admin.role) : false;
  const officers = team.map((t) => ({ id: t.id, name: t.name }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{property.title} — Legal &amp; Due Diligence</h1>
          <p className="mt-1 text-sm text-muted">Admin-only — this information is never shown on the public property page.</p>
        </div>
        {canManage && <GenerateLegalFileButton propertyId={propertyId} />}
      </div>

      <div className="mt-4">
        <LegalOfficerAssignForm propertyId={propertyId} legalOfficerId={record.legalOfficerId} internalNotes={record.internalNotes} officers={officers} />
      </div>

      <Section title="Ownership">
        <OwnershipManager propertyId={propertyId} allocation={allocation} canManage={canManage} />
      </Section>

      <Section title="Legal Documents">
        <LegalDocumentManager propertyId={propertyId} documents={legalDocs} types={docTypes} canManage={canManage} />
      </Section>

      <Section title="Encumbrances">
        <EncumbranceManager propertyId={propertyId} encumbrances={encumbrances} canManage={canManage} />
      </Section>

      <Section title="Compliance">
        <ComplianceManager propertyId={propertyId} records={compliance} templates={complianceTemplates} canManage={canManage} />
      </Section>

      <Section title="Legal Risks">
        <LegalRiskManager propertyId={propertyId} risks={risks} indicator={riskIndicator} canManage={canManage} />
      </Section>

      <Section title="Due-Diligence Cases">
        <SummaryList
          rows={ddCases.map((c) => ({ id: c.id, label: c.caseNumber, status: c.status, href: `/admin/legal/due-diligence/${c.id}` }))}
          emptyText="No due-diligence cases for this property yet."
          newHref={canManage ? `/admin/legal/due-diligence?propertyId=${propertyId}` : undefined}
          newLabel="Open Due-Diligence"
        />
      </Section>

      <Section title="Legal Cases">
        <SummaryList
          rows={legalCases.map((c) => ({ id: c.id, label: `${c.caseNumber} — ${c.title}`, status: c.status, href: `/admin/legal/cases/${c.id}` }))}
          emptyText="No legal cases for this property."
          newHref={canManage ? `/admin/legal/cases?propertyId=${propertyId}` : undefined}
          newLabel="New Legal Case"
        />
      </Section>

      <Section title="Contracts">
        <SummaryList
          rows={contracts.map((c) => ({ id: c.id, label: `${c.contractNumber} — ${c.contractType}`, status: c.status, href: `/admin/legal/contracts?propertyId=${propertyId}` }))}
          emptyText="No contracts for this property."
          newHref={canManage ? `/admin/legal/contracts?propertyId=${propertyId}` : undefined}
          newLabel="New Contract"
        />
      </Section>

      <Section title="Legal Notices">
        <SummaryList
          rows={notices.map((n) => ({ id: n.id, label: `${n.noticeNumber} — ${n.recipientName}`, status: n.status, href: `/admin/legal/notices?propertyId=${propertyId}` }))}
          emptyText="No notices for this property."
          newHref={canManage ? `/admin/legal/notices?propertyId=${propertyId}` : undefined}
          newLabel="New Notice"
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}

function SummaryList({ rows, emptyText, newHref, newLabel }: { rows: { id: string; label: string; status: string; href: string }[]; emptyText: string; newHref?: string; newLabel: string }) {
  return (
    <div className="mt-3">
      {newHref && (
        <Link href={newHref} className="inline-block rounded-full border border-border px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-muted">
          + {newLabel}
        </Link>
      )}
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <Link key={r.id} href={r.href} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:border-primary">
            <span className="text-sm font-semibold text-ink">{r.label}</span>
            <StatusBadge status={r.status} />
          </Link>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">{emptyText}</p>}
      </div>
    </div>
  );
}
