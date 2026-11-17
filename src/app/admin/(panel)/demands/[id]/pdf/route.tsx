import { NextResponse } from "next/server";
import { demandService } from "@/services/demandService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { demandSheet } from "@/lib/pdf/detailSheets";
import { sheetPdfResponse } from "@/lib/pdf/sheetResponse";

/** The client demand as a printable office-record PDF. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "demands")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const demand = await demandService.getById(id);
  if (!demand) return NextResponse.json({ error: "Demand not found." }, { status: 404 });

  const found = await demandService.matchesFor(demand).catch(() => []);
  const matches = found.slice(0, 8).map((m) => ({
    serialNo: m.property.serialNo,
    title: m.property.title,
    price: m.property.price,
    location: m.property.location,
    score: m.score,
    level: m.level,
  }));

  return sheetPdfResponse(demandSheet(demand, matches), admin.name ?? "Admin");
}
