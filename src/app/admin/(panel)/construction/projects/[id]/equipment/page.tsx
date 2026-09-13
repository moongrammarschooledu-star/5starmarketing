import { constructionEquipmentService } from "@/services/constructionEquipmentService";
import { EquipmentManager } from "@/components/admin/construction/EquipmentManager";

export const dynamic = "force-dynamic";

export default async function ConstructionEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const equipment = await constructionEquipmentService.list(id);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Equipment</h2>
      <EquipmentManager projectId={id} equipment={equipment} />
    </div>
  );
}
