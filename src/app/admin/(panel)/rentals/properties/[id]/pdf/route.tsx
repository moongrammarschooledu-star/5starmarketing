import { NextResponse } from "next/server";
import { rentalPropertyService } from "@/services/rentalPropertyService";
import { propertyService } from "@/services/propertyService";
import { ownerDetailsService } from "@/services/ownerDetailsService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { rentalSheet } from "@/lib/pdf/detailSheets";
import { sheetPdfResponse } from "@/lib/pdf/sheetResponse";

/** A rental property as a printable office-record PDF: the rental terms plus the property's own details. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const rental = await rentalPropertyService.getById(id);
  if (!rental) return NextResponse.json({ error: "Rental property not found." }, { status: 404 });

  const property = await propertyService.getById(rental.propertyId).catch(() => undefined);
  const owner = property ? await ownerDetailsService.getForProperty(property.id).catch(() => null) : null;
  return sheetPdfResponse(rentalSheet(rental, property, owner), admin.name ?? "Admin");
}
