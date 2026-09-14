import { notFound } from "next/navigation";
import Link from "next/link";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { legalChecklistService } from "@/services/legalChecklistService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { canManageLegal } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DueDiligenceCaseControls } from "@/components/admin/legal/DueDiligenceCaseControls";
import { ChecklistResultManager } from "@/components/admin/legal/ChecklistResultManager";

export const dynamic = "force-dynamic";

export default async function DueDiligenceCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("legal");
  const { id } = await params;
  const dd = await dueDiligenceService.getById(id);
  if (!dd) notFound();

  const [results, score, team, admin] = await Promise.all([
    legalChecklistService.listResults("DUE_DILIGENCE_CASE", id),
    dueDiligenceService.completionScore(id),
    teamService.list(),
    profileService.getCurrentAdmin(),
  ]);
  const canManage = admin ? canManageLegal(admin.role) : false;
  const isAssignedOfficer = admin ? admin.id === dd.legalOfficerId : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{dd.caseNumber}</h1>
          {dd.propertyId && (
            <Link href={`/admin/legal/properties/${dd.propertyId}`} className="text-sm text-primary hover:underline">
              {dd.propertyTitle}
            </Link>
          )}
        </div>
        <StatusBadge status={dd.status} />
      </div>

      <div className="mt-4">
        <DueDiligenceCaseControls dueDiligenceCase={dd} officers={team.map((t) => ({ id: t.id, name: t.name }))} canManage={canManage} />
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Checklist Results</h2>
        <p className="mt-1 text-xs text-muted">Manual verification required for every item — no automated government/registry check is configured in this system.</p>
        <ChecklistResultManager subjectType="DUE_DILIGENCE_CASE" subjectId={id} results={results} score={score} officerId={canManage ? undefined : dd.legalOfficerId} canManage={canManage || isAssignedOfficer} />
      </div>
    </div>
  );
}
