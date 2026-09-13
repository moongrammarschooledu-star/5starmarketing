import { constructionContractorService } from "@/services/constructionContractorService";
import { constructionPhaseService } from "@/services/constructionPhaseService";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { profileService } from "@/services/profileService";
import { canManageConstruction } from "@/lib/permissions";
import { ContractorManager } from "@/components/admin/construction/ContractorManager";

export const dynamic = "force-dynamic";

export default async function ConstructionContractorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await profileService.getCurrentAdmin();
  const canManage = admin ? canManageConstruction(admin.role) : false;
  const [contractors, workOrders, phases, vendors] = await Promise.all([
    constructionContractorService.list(id),
    constructionContractorService.listWorkOrders(id),
    constructionPhaseService.list(id),
    maintenanceVendorService.list(true),
  ]);

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink">Contractors</h2>
      <ContractorManager
        projectId={id}
        contractors={contractors}
        workOrders={workOrders}
        phases={phases.map((p) => ({ id: p.id, name: p.name }))}
        vendors={vendors.map((v) => ({ id: v.id, name: v.businessName }))}
        canManage={canManage}
      />
    </div>
  );
}
