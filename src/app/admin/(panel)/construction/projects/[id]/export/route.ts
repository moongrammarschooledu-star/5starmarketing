import { NextResponse } from "next/server";
import { constructionBoqService } from "@/services/constructionBoqService";
import { constructionMaterialService } from "@/services/constructionMaterialService";
import { constructionExpenseService } from "@/services/constructionExpenseService";
import { constructionTaskService } from "@/services/constructionTaskService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "construction");
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "boq";

  let csv = "";
  try {
    if (type === "boq") {
      const boq = await constructionBoqService.getForProject(id);
      const items = boq ? await constructionBoqService.listItems(boq.id) : [];
      csv = toCsv(
        ["Category", "Item", "Unit", "Quantity", "Estimated Rate", "Estimated Amount", "Approved Rate", "Actual Quantity", "Actual Rate", "Actual Amount"],
        items.map((i) => [i.category, i.item, i.unit, i.quantity, i.estimatedRate, i.estimatedAmount, i.approvedRate ?? "", i.actualQuantity ?? "", i.actualRate ?? "", i.actualAmount ?? ""])
      );
    } else if (type === "materials") {
      const materials = await constructionMaterialService.list(id);
      csv = toCsv(
        ["Code", "Name", "Category", "Unit", "Required", "Ordered", "Received", "Used", "Remaining", "Estimated Rate"],
        materials.map((m) => [m.materialCode, m.name, m.category, m.unit, m.requiredQuantity, m.orderedQuantity, m.receivedQuantity, m.usedQuantity, m.remainingQuantity, m.estimatedRate ?? ""])
      );
    } else if (type === "expenses") {
      const expenses = await constructionExpenseService.list(id);
      csv = toCsv(
        ["Category", "Description", "Vendor", "Contractor", "Amount", "Status", "Created"],
        expenses.map((e) => [e.category, e.description, e.vendorName ?? "", e.contractorName ?? "", e.amount, e.status, e.createdAt])
      );
    } else if (type === "tasks") {
      const tasks = await constructionTaskService.list(id);
      csv = toCsv(
        ["Task #", "Title", "Phase", "Priority", "Status", "Progress", "Assigned To", "Start", "Due"],
        tasks.map((t) => [t.taskNumber, t.title, t.phaseName ?? "", t.priority, t.status, t.progress, t.assignedUserName ?? t.contractorName ?? "", t.startDate ?? "", t.dueDate ?? ""])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("construction project export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="construction-${type}.csv"`,
    },
  });
}
