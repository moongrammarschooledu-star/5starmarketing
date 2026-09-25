import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { propertyService } from "./propertyService";
import { documentService } from "./documentService";
import { ownershipService } from "./ownershipService";
import { legalDocumentService } from "./legalDocumentService";
import { encumbranceService } from "./encumbranceService";
import { dueDiligenceService } from "./dueDiligenceService";
import { complianceService } from "./complianceService";
import { legalRiskService } from "./legalRiskService";
import { PropertyLegalFileDocument } from "@/lib/pdf/PropertyLegalFileDocument";
import { site } from "@/lib/site";
import type { DocumentRecord } from "@/lib/models/document";
import type { DueDiligenceCompletionScore } from "@/lib/models/legal";

/** Generates the "Property Legal File" PDF (section 33) from real,
 *  already-recorded data and stores it through the EXISTING secure
 *  document vault (STEP 20) — never a separate storage path or a
 *  parallel "reports" table. Never converts "pending" into "verified". */
export const legalFilePdfService = {
  async generate(propertyId: string, actor: { adminId: string; name: string }): Promise<DocumentRecord> {
    const property = await propertyService.getById(propertyId);
    if (!property) throw new Error("Property not found.");

    const [ownership, documents, encumbrances, dueDiligenceCases, compliance, riskIndicator] = await Promise.all([
      ownershipService.allocationSummary(propertyId),
      legalDocumentService.listForProperty(propertyId),
      encumbranceService.listForProperty(propertyId),
      dueDiligenceService.list({ propertyId }),
      complianceService.list({ propertyId }),
      legalRiskService.propertyRiskIndicator(propertyId),
    ]);

    const completionScores: Record<string, DueDiligenceCompletionScore> = {};
    await Promise.all(
      dueDiligenceCases.map(async (c) => {
        completionScores[c.id] = await dueDiligenceService.completionScore(c.id);
      })
    );

    const generatedAt = new Date().toLocaleString("en-GB");
    const buffer = await renderToBuffer(
      <PropertyLegalFileDocument
        propertyTitle={property.title}
        generatedAt={generatedAt}
        ownership={ownership}
        documents={documents}
        encumbrances={encumbrances}
        dueDiligenceCases={dueDiligenceCases}
        completionScores={completionScores}
        compliance={compliance}
        riskIndicator={riskIndicator}
        business={{ name: site.fullName, phone: site.phoneDisplay, email: site.displayEmail }}
      />
    );

    return documentService.createGeneratedDocument(
      {
        title: `Property Legal File — ${property.title}`,
        documentType: "PROPERTY_LEGAL_FILE",
        propertyId,
        visibility: "ADMIN_ONLY",
        fileName: `property-legal-file-${property.slug}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );
  },
};
