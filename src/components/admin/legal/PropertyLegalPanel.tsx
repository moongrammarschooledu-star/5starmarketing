import Link from "next/link";
import { Scale } from "lucide-react";
import { ownershipService } from "@/services/ownershipService";
import { legalRiskService } from "@/services/legalRiskService";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { encumbranceService } from "@/services/encumbranceService";

/** Legal &amp; Due-Diligence Tab — admin-only, mirrors
 *  PropertyMaintenancePanel/PropertyInvestmentPanel exactly. This is
 *  this codebase's implementation of the spec's /properties/[id]/legal
 *  and /properties/[id]/due-diligence routes — kept admin-side (not
 *  public), since ownership detail, due-diligence findings and
 *  encumbrances are private data, following the same precedent STEP 25
 *  established for maintenance/inspection data. */
export async function PropertyLegalPanel({ propertyId }: { propertyId: string }) {
  const [allocation, openRisks, ddCases, encumbrances] = await Promise.all([
    ownershipService.allocationSummary(propertyId),
    legalRiskService.listForProperty(propertyId, true),
    dueDiligenceService.list({ propertyId }),
    encumbranceService.listForProperty(propertyId),
  ]);
  const openDdCases = ddCases.filter((c) => !["COMPLETED", "CLEARED_WITH_CONDITIONS", "CANCELLED"].includes(c.status));
  const activeEncumbrances = encumbrances.filter((e) => e.status === "ACTIVE");

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Scale className="h-3.5 w-3.5" /> Legal &amp; Due Diligence (admin-only — never shown publicly)
        </h2>
        <Link href={`/admin/legal/properties/${propertyId}`} className="text-xs font-bold text-primary hover:underline">
          Manage
        </Link>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ownership" value={allocation.records.length === 0 ? "Not recorded" : allocation.allocationComplete ? "Complete" : "Incomplete"} accent={allocation.records.length > 0 && !allocation.allocationComplete} />
        <Stat label="Open Due-Diligence" value={String(openDdCases.length)} accent={openDdCases.length > 0} />
        <Stat label="Active Encumbrances" value={String(activeEncumbrances.length)} accent={activeEncumbrances.length > 0} />
        <Stat label="Open Risks" value={String(openRisks.length)} accent={openRisks.length > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-heading text-sm font-extrabold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
