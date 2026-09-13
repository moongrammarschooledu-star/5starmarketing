import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { maintenanceVendorService } from "@/services/maintenanceVendorService";
import { profileService } from "@/services/profileService";
import { canManageMaintenance } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatPKR } from "@/lib/calculator";
import { WORK_ORDER_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import { WorkOrderStatusActions } from "@/components/admin/maintenance/WorkOrderStatusActions";
import { WorkOrderAssignForm } from "@/components/admin/maintenance/WorkOrderAssignForm";
import { WorkOrderCostsPanel } from "@/components/admin/maintenance/WorkOrderCostsPanel";
import { WorkOrderItemsManager } from "@/components/admin/maintenance/WorkOrderItemsManager";
import { WorkOrderPhotoGallery } from "@/components/admin/maintenance/WorkOrderPhotoGallery";

export const dynamic = "force-dynamic";

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("maintenance");
  const { id } = await params;
  const [workOrder, items, photos, vendors, admin] = await Promise.all([
    maintenanceWorkOrderService.getById(id),
    maintenanceWorkOrderService.listItems(id),
    maintenanceWorkOrderService.listPhotos(id),
    maintenanceVendorService.list(true),
    profileService.getCurrentAdmin(),
  ]);
  if (!workOrder) notFound();
  const canManage = admin ? canManageMaintenance(admin.role) : false;

  const supabase = await createClient();
  const { data: technicians } = await supabase.from("admin_profiles").select("id, name").in("role", ["sales_agent", "sales_manager", "admin"]).eq("status", "Active");

  return (
    <div>
      <Link href="/admin/maintenance/work-orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Work Orders
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{workOrder.workOrderNumber}</h1>
          <p className="mt-1 text-sm text-muted">
            {workOrder.propertyTitle ?? "Property"} {workOrder.requestNumber ? `· ${workOrder.requestNumber}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={workOrder.priority} />
          <StatusBadge status={workOrder.status} />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-sm text-ink">{workOrder.description}</p>
        {workOrder.scopeOfWork && <p className="mt-2 text-sm text-muted">{workOrder.scopeOfWork}</p>}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Meta label="Scheduled" value={workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString("en-GB") : "—"} />
          <Meta label="Started" value={workOrder.startedDate ? new Date(workOrder.startedDate).toLocaleDateString("en-GB") : "—"} />
          <Meta label="Completed" value={workOrder.completedDate ? new Date(workOrder.completedDate).toLocaleDateString("en-GB") : "—"} />
          <Meta label="Vendor / Technician" value={workOrder.vendorName ?? workOrder.technicianName ?? "Unassigned"} />
        </div>
      </div>

      <div className="mt-4">
        <WorkOrderStatusActions workOrderId={workOrder.id} allowed={WORK_ORDER_ALLOWED_TRANSITIONS[workOrder.status]} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WorkOrderAssignForm workOrderId={workOrder.id} vendors={vendors.map((v) => ({ id: v.id, businessName: v.businessName }))} technicians={technicians ?? []} currentVendorId={workOrder.vendorId} currentTechnicianId={workOrder.technicianId} />
        {canManage && <WorkOrderCostsPanel workOrder={workOrder} />}
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Parts &amp; Labor</h2>
        <WorkOrderItemsManager workOrderId={workOrder.id} items={items} />
        <p className="mt-2 text-sm font-semibold text-ink">Total from items: {formatPKR(items.reduce((s, i) => s + i.totalCost, 0))}</p>
      </div>

      <div className="mt-8">
        <h2 className="font-heading text-lg font-bold text-ink">Before / During / After Photos</h2>
        <WorkOrderPhotoGallery workOrderId={workOrder.id} photos={photos} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
