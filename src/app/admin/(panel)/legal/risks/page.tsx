import Link from "next/link";
import { legalRiskService } from "@/services/legalRiskService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function LegalRisksPage() {
  await requireSection("legal");
  const risks = await legalRiskService.listOpen();

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Legal Risks</h1>
      <p className="mt-1 text-sm text-muted">&quot;Risk / Requires Review&quot; — never presented as a legal conclusion of illegality.</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  {r.propertyId ? (
                    <Link href={`/admin/legal/properties/${r.propertyId}`} className="font-semibold text-primary hover:underline">
                      {r.propertyTitle}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{r.description}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.severity} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
              </tr>
            ))}
            {risks.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                  No open risks flagged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
