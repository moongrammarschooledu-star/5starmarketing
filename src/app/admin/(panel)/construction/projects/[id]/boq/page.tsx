import { constructionBoqService } from "@/services/constructionBoqService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { BoqManager } from "@/components/admin/construction/BoqManager";

export const dynamic = "force-dynamic";

export default async function ConstructionBoqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageConstruction(admin.role) : false;
  const boq = await constructionBoqService.getForProject(id);
  const items = boq ? await constructionBoqService.listItems(boq.id) : [];

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Bill of Quantities</h2>
      <BoqManager projectId={id} boq={boq} items={items} canManage={canManage} />
    </div>
  );
}
