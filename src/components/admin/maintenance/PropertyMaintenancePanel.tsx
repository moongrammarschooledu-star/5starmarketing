import Link from "next/link";
import { Wrench } from "lucide-react";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { propertyInspectionService } from "@/services/propertyInspectionService";
import { maintenanceReportService } from "@/services/maintenanceReportService";

/** Property Maintenance Tab — internal-only; mirrors PropertyFinancialPanel/
 *  PropertyInvestmentPanel exactly. This is the codebase's implementation
 *  of the spec's /properties/[id]/inspection and /properties/[id]/
 *  maintenance routes — kept admin-side (not public) because inspection
 *  findings, defects and repair cost estimates are private data (section
 *  42: "Public: No private maintenance data"), unlike investment metrics
 *  which the spec explicitly wanted public. */
export async function PropertyMaintenancePanel({ propertyId }: { propertyId: string }) {
  const [openRequests, inspections, conditionScore] = await Promise.all([
    maintenanceRequestService.listByProperty(propertyId),
    propertyInspectionService.listByProperty(propertyId),
    maintenanceReportService.conditionScore(propertyId),
  ]);
  const activeRequests = openRequests.filter((r) => !["CLOSED", "REJECTED", "CANCELLED"].includes(r.status));

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <Wrench className="h-3.5 w-3.5" /> Maintenance &amp; Inspections (admin-only — never shown publicly)
        </h2>
        <div className="flex items-center gap-3 text-xs font-bold text-primary">
          <Link href="/admin/inspections/new" className="hover:underline">
            New Inspection
          </Link>
          <Link href="/admin/maintenance/requests/new" className="hover:underline">
            New Request
          </Link>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Open Requests" value={String(activeRequests.length)} />
        <Stat label="Inspections" value={String(inspections.length)} />
        <Stat label="Condition Score" value={conditionScore ? `${conditionScore.score} (${conditionScore.label})` : "Insufficient data"} accent={!!conditionScore && conditionScore.label !== "Excellent" && conditionScore.label !== "Good"} />
      </div>

      {activeRequests.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {activeRequests.slice(0, 3).map((r) => (
            <Link key={r.id} href={`/admin/maintenance/requests/${r.id}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-xs hover:bg-surface-muted/70">
              <span className="font-semibold text-ink">
                {r.requestNumber} — {r.category}
              </span>
              <span className="text-muted">{r.status.replace(/_/g, " ")}</span>
            </Link>
          ))}
        </div>
      )}
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
