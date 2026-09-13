import { constructionProcurementService } from "@/services/constructionProcurementService";
import { constructionMaterialService } from "@/services/constructionMaterialService";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { ProcurementManager } from "@/components/admin/construction/ProcurementManager";

export const dynamic = "force-dynamic";

export default async function ConstructionProcurementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageConstruction(admin.role) : false;
  const [orders, materials, vendors] = await Promise.all([
    constructionProcurementService.list(id),
    constructionMaterialService.list(id),
    maintenanceVendorService.list(true),
  ]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Procurement</h2>
      <ProcurementManager
        projectId={id}
        orders={orders}
        materials={materials.map((m) => ({ id: m.id, label: `${m.materialCode} — ${m.name}` }))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.businessName }))}
        canManage={canManage}
      />
    </div>
  );
}
