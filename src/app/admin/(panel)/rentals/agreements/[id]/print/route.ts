import { NextResponse } from "next/server";
import { rentAgreementService } from "@/services/rentAgreementService";
import { profileService } from "@/services/profileService";
import { renderAgreementHtml } from "@/lib/rentAgreement/printHtml";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The agreement as a print page (Urdu in real Nastaleeq, or English), with the company
// letterhead or an empty space for stamp paper. The browser prints it or saves it as PDF.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) return new NextResponse("Not authorized.", { status: 403 });

  const { id } = await params;
  const record = await rentAgreementService.getById(id);
  if (!record) return new NextResponse("Agreement not found.", { status: 404 });

  return new NextResponse(renderAgreementHtml(record.data, record.agreementNo), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
