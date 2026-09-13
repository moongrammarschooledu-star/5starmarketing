import { NextResponse } from "next/server";
import { maintenanceRequestService } from "@/services/maintenanceRequestService";
import { maintenanceWorkOrderService } from "@/services/maintenanceWorkOrderService";
import { maintenanceAssetService } from "@/services/maintenanceAssetService";
import { profileService } from "@/services/profileService";
import { canAccess, canManageMaintenance } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "maintenance") && canManageMaintenance(admin.role);
}

export async function GET(request: Request) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "requests";

  let csv = "";
  try {
    if (type === "requests") {
      const requests = await maintenanceRequestService.list();
      csv = toCsv(
        ["Request #", "Property", "Category", "Priority", "Status", "SLA Response Breached", "SLA Resolution Breached", "Created"],
        requests.map((r) => [r.requestNumber, r.propertyTitle ?? "", r.category, r.priority, r.status, r.slaResponseBreached ? "Yes" : "No", r.slaResolutionBreached ? "Yes" : "No", r.createdAt])
      );
    } else if (type === "work-orders") {
      const workOrders = await maintenanceWorkOrderService.list();
      csv = toCsv(
        ["WO #", "Property", "Vendor", "Technician", "Priority", "Status", "Estimated Cost", "Actual Cost", "Customer Charge", "Scheduled", "Completed"],
        workOrders.map((w) => [w.workOrderNumber, w.propertyTitle ?? "", w.vendorName ?? "", w.technicianName ?? "", w.priority, w.status, w.estimatedCost ?? "", w.actualCost ?? "", w.customerCharge ?? "", w.scheduledDate ?? "", w.completedDate ?? ""])
      );
    } else if (type === "assets") {
      const assets = await maintenanceAssetService.list();
      csv = toCsv(
        ["Asset #", "Category", "Property", "Manufacturer", "Model", "Condition", "Status", "Warranty Expiry"],
        assets.map((a) => [a.assetNumber, a.category, a.propertyTitle ?? "", a.manufacturer ?? "", a.model ?? "", a.condition, a.status, a.warrantyExpiry ?? ""])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("maintenance/export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}.csv"`,
    },
  });
}
