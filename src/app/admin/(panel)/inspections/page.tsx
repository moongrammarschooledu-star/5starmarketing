import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { propertyInspectionService } from "@/services/propertyInspectionService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  await requireSection("maintenance");
  const inspections = await propertyInspectionService.list();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/maintenance" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Maintenance
          </Link>
          <h1 className="mt-2 font-heading text-2xl font-extrabold text-ink">Property Inspections</h1>
        </div>
        <Link href="/admin/inspections/new" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> New Inspection
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Inspection #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Inspector</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/inspections/${i.id}`} className="font-semibold text-primary hover:underline">
                    {i.inspectionNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">{i.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{i.inspectionType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted">{i.inspectorName ?? "Unassigned"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={i.status} />
                </td>
                <td className="px-4 py-3 text-muted">{i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString("en-GB") : "—"}</td>
              </tr>
            ))}
            {inspections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No inspections yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
