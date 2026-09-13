import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { propertyInspectionService } from "./propertyInspectionService";
import { propertyDefectService } from "./propertyDefectService";
import { maintenanceSettingsService } from "./maintenanceSettingsService";
import { documentService } from "./documentService";
import { InspectionReportDocument } from "@/lib/pdf/InspectionReportDocument";
import { site } from "@/lib/site";
import type { DocumentRecord } from "@/lib/models/document";

/** Generates the inspection report PDF from real, already-recorded data
 *  and stores it through the EXISTING secure document vault (STEP 20) —
 *  never a separate storage path or a parallel "reports" table. */
export const inspectionReportPdfService = {
  async generate(inspectionId: string, actor: { adminId: string; name: string }): Promise<DocumentRecord> {
    const inspection = await propertyInspectionService.getById(inspectionId);
    if (!inspection) throw new Error("Inspection not found.");

    const [results, defects, settings] = await Promise.all([
      propertyInspectionService.listResults(inspectionId),
      propertyDefectService.list({ inspectionId }),
      maintenanceSettingsService.get(),
    ]);

    const buffer = await renderToBuffer(
      <InspectionReportDocument inspection={inspection} results={results} defects={defects} disclaimerText={settings.disclaimerText} business={{ name: site.fullName, phone: site.phoneDisplay, email: site.email }} />
    );

    const document = await documentService.createGeneratedDocument(
      {
        title: `Inspection Report — ${inspection.inspectionNumber}`,
        documentType: "INSPECTION_REPORT",
        propertyId: inspection.propertyId,
        projectId: inspection.projectId,
        customerId: inspection.customerId,
        dealId: inspection.dealId,
        visibility: inspection.customerId ? "ADMIN_CUSTOMER" : "ADMIN_ONLY",
        fileName: `inspection-report-${inspection.inspectionNumber}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );

    await propertyInspectionService.attachDocument(inspectionId, document.id);
    return document;
  },
};
