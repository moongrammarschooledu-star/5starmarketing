import { NextResponse } from "next/server";
import { tokenReceiptService } from "@/services/tokenReceiptService";
import { profileService } from "@/services/profileService";
import { renderTokenHtml } from "@/lib/tokenReceipt/printHtml";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The token receipt as a print page (Urdu in real Nastaleeq, or English) with the company letterhead.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) return new NextResponse("Not authorized.", { status: 403 });

  const { id } = await params;
  const record = await tokenReceiptService.getById(id);
  if (!record) return new NextResponse("Token receipt not found.", { status: 404 });

  return new NextResponse(renderTokenHtml(record.data, record.receiptNo), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
