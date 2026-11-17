import { NextResponse } from "next/server";
import { propertyService } from "@/services/propertyService";
import { ownerDetailsService } from "@/services/ownerDetailsService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { propertySheet } from "@/lib/pdf/detailSheets";
import { sheetPdfResponse } from "@/lib/pdf/sheetResponse";

/** A property (for sale or rent) as a printable office-record PDF, with the private owner details. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "properties")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const property = await propertyService.getById(id);
  if (!property) return NextResponse.json({ error: "Property not found." }, { status: 404 });

  const owner = await ownerDetailsService.getForProperty(id).catch(() => null);
  return sheetPdfResponse(propertySheet(property, owner), admin.name ?? "Admin");
}
