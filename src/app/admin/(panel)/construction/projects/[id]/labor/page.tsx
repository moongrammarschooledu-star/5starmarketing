import { constructionLaborService } from "@/services/constructionLaborService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { LaborManager } from "@/components/admin/construction/LaborManager";

export const dynamic = "force-dynamic";

export default async function ConstructionLaborPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [records, phases] = await Promise.all([constructionLaborService.list(id), constructionPhaseService.list(id)]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Labor Tracking</h2>
      <LaborManager projectId={id} records={records} phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
