import { notFound } from "next/navigation";
import { customerService } from "@/services/customerService";
import { dealService } from "@/services/dealService";
import { propertyService } from "@/services/propertyService";
import { ownershipService } from "@/services/ownershipService";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { complianceService } from "@/services/complianceService";
import { encumbranceService } from "@/services/encumbranceService";
import { legalDocumentService } from "@/services/legalDocumentService";
import { legalNoticeService } from "@/services/legalNoticeService";
import { legalContractService } from "@/services/legalContractService";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CustomerLegalPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;
  const { id: propertyId } = await params;

  const [property, deals] = await Promise.all([propertyService.getById(propertyId), dealService.listByCustomer(customer.id)]);
  if (!property || !deals.some((d) => d.propertyId === propertyId)) notFound();

  const [allocation, ddCases, compliance, encumbrances, documents, notices, contracts] = await Promise.all([
    ownershipService.allocationSummary(propertyId),
    dueDiligenceService.listCustomerSafe(undefined, propertyId),
    complianceService.list({ propertyId }),
    encumbranceService.listForProperty(propertyId),
    legalDocumentService.listForPropertyCustomerSafe(propertyId),
    legalNoticeService.list({ propertyId, recipientCustomerId: customer.id }),
    legalContractService.list({ propertyId }),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">{property.title} — Legal Status</h1>
      <p className="mt-1 text-sm text-muted">Not a legal opinion, title report, or government clearance — always confirm with a licensed professional before relying on this for a decision.</p>

      <Section title="Ownership">
        {allocation.records.length === 0 ? (
          <p className="text-sm text-muted">No ownership records published for this property yet.</p>
        ) : (
          <div className="space-y-2">
            {allocation.records
              .filter((r) => r.status === "ACTIVE")
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                  <span className="text-sm font-semibold text-ink">
                    {r.ownerName} — {r.ownershipSharePercent}% ({r.ownershipType})
                  </span>
                  <StatusBadge status={r.verificationStatus} />
                </div>
              ))}
            <p className="text-xs text-muted">{allocation.allocationComplete ? "Ownership allocation on record totals 100%." : "Ownership allocation on record is incomplete."}</p>
          </div>
        )}
      </Section>

      <Section title="Due Diligence">
        {ddCases.length === 0 ? (
          <p className="text-sm text-muted">No due-diligence case on record for this property.</p>
        ) : (
          <div className="space-y-2">
            {ddCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <span className="text-sm font-semibold text-ink">{c.caseNumber}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Compliance">
        {compliance.length === 0 ? (
          <p className="text-sm text-muted">No compliance record on file for this property.</p>
        ) : (
          <div className="space-y-2">
            {compliance.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <span className="text-sm font-semibold text-ink">Compliance Record</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Encumbrances">
        {encumbrances.length === 0 ? (
          <p className="text-sm text-muted">No encumbrances recorded on this property — this reflects what has been recorded here, not an independently verified guarantee.</p>
        ) : (
          <div className="space-y-2">
            {encumbrances.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <span className="text-sm font-semibold text-ink">{e.encumbranceType.replace(/_/g, " ")}</span>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Verified Documents">
        {documents.length === 0 ? (
          <p className="text-sm text-muted">No verified legal documents have been published for this property yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <span className="text-sm font-semibold text-ink">{d.documentTitle}</span>
                <StatusBadge status={d.documentStatus ?? "VERIFIED"} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Contracts">
        {contracts.length === 0 ? (
          <p className="text-sm text-muted">No contracts on record for this property.</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
                <span className="text-sm font-semibold text-ink">
                  {c.contractNumber} — {c.contractType}
                </span>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Notices">
        {notices.length === 0 ? (
          <p className="text-sm text-muted">No notices have been sent to you regarding this property.</p>
        ) : (
          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-ink">{n.subject}</span>
                  <StatusBadge status={n.status} />
                </div>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-heading text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
