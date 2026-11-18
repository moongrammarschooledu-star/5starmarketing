import { NextResponse } from "next/server";
import { rentAgreementService } from "@/services/rentAgreementService";
import { profileService } from "@/services/profileService";
import { renderRentAgreementPdf } from "@/lib/pdf/rentAgreementPdf";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Downloads a saved rent agreement as a PDF (Urdu / English / both, plain or stamp paper).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) return new NextResponse("Not authorized.", { status: 403 });

  const { id } = await params;
  const record = await rentAgreementService.getById(id);
  if (!record) return new NextResponse("Agreement not found.", { status: 404 });

  if (record.data.language !== "en") return NextResponse.redirect(new URL(`/admin/rentals/agreements/${id}/print`, _request.url));

  const buffer = await renderRentAgreementPdf(record.data, record.agreementNo);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rent-agreement-${record.agreementNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
