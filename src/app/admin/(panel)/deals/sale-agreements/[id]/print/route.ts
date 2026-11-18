import { NextResponse } from "next/server";
import { saleAgreementService } from "@/services/saleAgreementService";
import { profileService } from "@/services/profileService";
import { renderSaleHtml } from "@/lib/saleAgreement/printHtml";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The sale agreement as a print page (Urdu in real Nastaleeq, or English), with the company
// letterhead or an empty space for stamp paper. The browser prints it or saves it as PDF.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "deals")) return new NextResponse("Not authorized.", { status: 403 });

  const { id } = await params;
  const record = await saleAgreementService.getById(id);
  if (!record) return new NextResponse("Agreement not found.", { status: 404 });

  return new NextResponse(renderSaleHtml(record.data, record.agreementNo), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
