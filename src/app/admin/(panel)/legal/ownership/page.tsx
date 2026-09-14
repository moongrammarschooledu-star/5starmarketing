import Link from "next/link";
import { ownershipService } from "@/services/ownershipService";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function LegalOwnershipPage() {
  await requireSection("legal");
  const overview = await ownershipService.listAllocationOverview();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Ownership Overview</h1>
      <p className="mt-1 text-sm text-muted">Never assumes a missing remainder — an incomplete allocation is shown exactly as such.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Owners on Record</th>
              <th className="px-4 py-3">Active Share Recorded</th>
              <th className="px-4 py-3">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {overview.map((o) => (
              <tr key={o.propertyId} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/legal/properties/${o.propertyId}`} className="font-semibold text-primary hover:underline">
                    {o.propertyTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{o.ownerCount}</td>
                <td className="px-4 py-3 text-muted">{o.totalActiveSharePercent}%</td>
                <td className="px-4 py-3">
                  {o.allocationComplete ? (
                    <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success">Complete</span>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600">Incomplete</span>
                  )}
                </td>
              </tr>
            ))}
            {overview.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No ownership records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
