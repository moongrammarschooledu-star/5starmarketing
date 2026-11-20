import { NextResponse } from "next/server";
import { rentAgreementService } from "@/services/rentAgreementService";
import { profileService } from "@/services/profileService";
import { rentAgreementDocx } from "@/lib/rentAgreement/docx";
import { fetchLogoPng } from "@/lib/agreementLogo";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Downloads a saved rent agreement as an editable Word (.docx) file.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "rentals")) return new NextResponse("Not authorized.", { status: 403 });

  const { id } = await params;
  const record = await rentAgreementService.getById(id);
  if (!record) return new NextResponse("Agreement not found.", { status: 404 });

  const logo = record.data.paper === "stamp" ? undefined : await fetchLogoPng(request.url);
  const buffer = await rentAgreementDocx(record.data, record.agreementNo, logo);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="rent-agreement-${record.agreementNo}.docx"`,
      "Cache-Control": "no-store",
    },
  });
}
