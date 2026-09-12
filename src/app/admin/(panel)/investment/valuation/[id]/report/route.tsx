import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { propertyValuationService } from "@/services/propertyValuationService";
import { valuationSettingsService } from "@/services/valuationSettingsService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { site } from "@/lib/site";
import { ValuationReportDocument } from "@/lib/pdf/ValuationReportDocument";
import { investmentEventService } from "@/services/investmentEventService";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "investment")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { id } = await params;
  const [valuation, settings] = await Promise.all([propertyValuationService.getById(id), valuationSettingsService.get()]);
  if (!valuation) return NextResponse.json({ error: "Valuation not found." }, { status: 404 });

  const comparables = await propertyValuationService.listComparables(id, true);

  const buffer = await renderToBuffer(
    <ValuationReportDocument valuation={valuation} comparables={comparables} settings={settings} business={{ name: site.fullName, phone: site.phoneDisplay, email: site.email }} />
  );

  await investmentEventService.track({ eventType: "report_downloaded", propertyId: valuation.propertyId }, undefined);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="valuation-report-${valuation.propertyId}-v${valuation.version}.pdf"`,
    },
  });
}
