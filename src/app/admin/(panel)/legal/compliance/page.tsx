import Link from "next/link";
import { complianceService } from "@/services/complianceService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  await requireSection("legal");
  const records = await complianceService.list();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Property Compliance</h1>
      <p className="mt-1 text-sm text-muted">Status reflects only what has actually been reviewed against a configured checklist — never a jurisdiction-specific claim without real source data.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Next Review</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/legal/properties/${r.propertyId}`} className="font-semibold text-primary hover:underline">
                    {r.propertyTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{r.nextReviewDate ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted">
                  No compliance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
