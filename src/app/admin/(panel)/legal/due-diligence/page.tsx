import Link from "next/link";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { legalChecklistService } from "@/services/legalChecklistService";
import { propertyService } from "@/services/propertyService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewDueDiligenceCaseForm } from "@/components/admin/legal/NewDueDiligenceCaseForm";

export const dynamic = "force-dynamic";

export default async function DueDiligencePage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  await requireSection("legal");
  const { propertyId } = await searchParams;
  const [cases, templates, properties, admin] = await Promise.all([dueDiligenceService.list(), legalChecklistService.listTemplates("DUE_DILIGENCE"), propertyService.list(), profileService.getCurrentAdmin()]);
  const canManage = admin ? canManageLegal(admin.role) : false;

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Due Diligence</h1>
      <p className="mt-1 text-sm text-muted">Checklist completion is never the same as legal clearance — each case&apos;s outcome is entered by an authorized user only.</p>

      {canManage && (
        <div className="mt-4">
          <NewDueDiligenceCaseForm properties={properties.map((p) => ({ id: p.id, title: p.title }))} templates={templates} defaultPropertyId={propertyId} />
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Case #</th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                <td className="px-4 py-3">
                  <Link href={`/admin/legal/due-diligence/${c.id}`} className="font-semibold text-primary hover:underline">
                    {c.caseNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{c.propertyTitle ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{c.legalOfficerName ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-muted">{c.targetCompletionDate ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                  No due-diligence cases yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
