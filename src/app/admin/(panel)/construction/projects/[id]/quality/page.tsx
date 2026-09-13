import { constructionQualityService } from "@/services/constructionQualityService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { QualityManager } from "@/components/admin/construction/QualityManager";

export const dynamic = "force-dynamic";

export default async function ConstructionQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [inspections, phases] = await Promise.all([constructionQualityService.list(id), constructionPhaseService.list(id)]);
  const issuesByInspection = Object.fromEntries(await Promise.all(inspections.map(async (i) => [i.id, await constructionQualityService.listIssues(i.id)] as const)));

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Quality Control</h2>
      <QualityManager projectId={id} inspections={inspections} issuesByInspection={issuesByInspection} phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
