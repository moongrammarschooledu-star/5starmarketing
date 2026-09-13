import { constructionMaterialService } from "@/services/constructionMaterialService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { MaterialManager } from "@/components/admin/construction/MaterialManager";

export const dynamic = "force-dynamic";

export default async function ConstructionMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [materials, requests, phases] = await Promise.all([
    constructionMaterialService.list(id),
    constructionMaterialService.listRequests(id),
    constructionPhaseService.list(id),
  ]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Materials</h2>
      <MaterialManager projectId={id} materials={materials} requests={requests} phases={phases.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
