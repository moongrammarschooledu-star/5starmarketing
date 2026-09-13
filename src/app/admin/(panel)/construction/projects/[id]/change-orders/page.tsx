import { constructionChangeOrderService } from "@/services/constructionChangeOrderService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { ChangeOrderManager } from "@/components/admin/construction/ChangeOrderManager";

export const dynamic = "force-dynamic";

export default async function ConstructionChangeOrdersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageConstruction(admin.role) : false;
  const [orders, impact] = await Promise.all([constructionChangeOrderService.list(id), constructionChangeOrderService.impactSummary(id)]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Change Orders</h2>
      <ChangeOrderManager projectId={id} orders={orders} impact={impact} canManage={canManage} />
    </div>
  );
}
