import { NextResponse } from "next/server";
import { inventoryService } from "@/services/inventoryService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { parseInventorySearchParams } from "@/lib/inventorySearchParams";
import { toCsv } from "@/lib/csv";

async function requireInventoryAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "inventory");
}

export async function GET(request: Request) {
  if (!(await requireInventoryAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseInventorySearchParams(sp);

  let csv = "";
  try {
    const units = await inventoryService.searchAll(filters);
    csv = toCsv(
      ["Unit Number", "Project", "Property", "Block", "Building", "Floor", "Type", "Area", "Area Unit", "Price", "Status", "Agent"],
      units.map((u) => [u.unitNumber, u.projectName ?? "", u.propertyTitle ?? "", u.block ?? "", u.building ?? "", u.floor ?? "", u.unitType, u.area ?? "", u.areaUnit ?? "", u.price ?? "", u.status, u.agentName ?? ""])
    );
  } catch (e) {
    console.error("inventory/export failed:", e);
    return NextResponse.json({ error: "Could not export inventory." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory.csv"`,
    },
  });
}
