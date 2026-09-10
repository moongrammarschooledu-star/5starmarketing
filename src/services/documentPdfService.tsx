import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { dealService } from "./dealService";
import { dealPaymentService } from "./dealPaymentService";
import { teamService } from "./teamService";
import { settingsService } from "./settingsService";
import { documentService } from "./documentService";
import { documentTemplateService } from "./documentTemplateService";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import { DocumentPdf, type PdfTableSection } from "@/lib/pdf/DocumentPdf";
import type { DocumentRecord } from "@/lib/models/document";

/** Real-data-only variable set for {{template}} interpolation (section
 *  23) — every value comes straight from the deal/customer/property/
 *  agent records; a variable with no real value resolves to an empty
 *  string, never a placeholder or invented figure. */
async function buildDealVariables(dealId: string): Promise<{ vars: Record<string, string>; deal: Awaited<ReturnType<typeof dealService.getById>> }> {
  const deal = await dealService.getById(dealId);
  if (!deal) throw new Error("Deal not found.");
  const agent = deal.agentId ? await teamService.getById(deal.agentId) : undefined;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  const vars: Record<string, string> = {
    customer_name: deal.customerName ?? "",
    customer_phone: deal.customerPhone ?? "",
    customer_email: deal.customerEmail ?? "",
    property_title: deal.propertyTitle ?? "",
    property_type: deal.propertyType ?? "",
    property_location: deal.propertyLocation ?? "",
    property_size: deal.propertySize ?? "",
    project_name: deal.projectName ?? "",
    deal_number: deal.dealNumber,
    deal_amount: formatPKR(deal.finalAmount),
    booking_amount: formatPKR(deal.bookingAmount),
    payment_received: formatPKR(deal.receivedAmount),
    outstanding_amount: formatPKR(deal.outstandingAmount),
    agent_name: deal.agentName ?? "",
    agent_phone: agent?.phone ?? "",
    date: today,
  };
  return { vars, deal };
}

/** Replaces every {{variable}} the template author used with the real
 *  value above — an unknown/misspelled variable is left as literal
 *  text (visible, not silently dropped) so a template author notices
 *  the typo rather than getting a blank. */
function interpolate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => (key in vars ? vars[key] : match));
}

async function businessInfo() {
  const settings = await settingsService.get().catch(() => null);
  return {
    businessName: settings?.businessName ?? site.fullName,
    businessAddress: settings?.address ?? site.address,
    businessPhone: settings?.phone ?? site.phoneDisplay,
    businessEmail: settings?.email ?? site.email,
  };
}

export const documentPdfService = {
  /** Generate Agreement (section 26) — admin picks a template + deal;
   *  the template's own {{variable}} content is interpolated from real
   *  data and rendered as the "Terms" body. Financial figures always
   *  come from the deal record itself — the generation process has no
   *  input that lets anyone type in a different amount. */
  async generateFromTemplate(templateId: string, dealId: string, actor: { adminId?: string; name: string }): Promise<DocumentRecord> {
    const template = await documentTemplateService.getById(templateId);
    if (!template) throw new Error("Template not found.");
    const { vars, deal } = await buildDealVariables(dealId);
    if (!deal) throw new Error("Deal not found.");
    const business = await businessInfo();

    const interpolatedBody = interpolate(template.content, vars)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    const sections: PdfTableSection[] = [
      { heading: "Parties", rows: [{ label: "Customer", value: vars.customer_name || "—" }, { label: "Phone", value: vars.customer_phone || "—" }] },
      {
        heading: "Property",
        rows: [
          { label: "Property", value: vars.property_title || vars.project_name || "—" },
          { label: "Location", value: vars.property_location || "—" },
          { label: "Size", value: vars.property_size || "—" },
        ],
      },
      {
        heading: "Deal Summary",
        rows: [
          { label: "Deal Number", value: vars.deal_number },
          { label: "Deal Amount", value: vars.deal_amount },
          { label: "Booking Amount", value: vars.booking_amount },
          { label: "Received", value: vars.payment_received },
          { label: "Outstanding", value: vars.outstanding_amount },
        ],
      },
    ];

    const buffer = await renderToBuffer(
      <DocumentPdf
        documentTitle={template.name}
        documentNumber="DRAFT"
        generatedDate={vars.date}
        sections={sections}
        bodyParagraphs={interpolatedBody}
        showSignatureBlock
        legalDisclaimer="This document is generated for internal transaction tracking and does not itself constitute a legally binding agreement unless separately executed and, where applicable, digitally or physically signed in accordance with applicable law."
        {...business}
      />
    );

    return documentService.createGeneratedDocument(
      {
        title: template.name,
        documentType: template.documentType,
        dealId,
        customerId: deal.customerId,
        propertyId: deal.propertyId,
        projectId: deal.projectId,
        templateId: template.id,
        fileName: `${template.documentType}-${deal.dealNumber}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );
  },

  /** Generate Booking Form (section 25) — a fixed system layout (no
   *  admin template needed), all fields pulled straight from the deal;
   *  nothing here is manually editable inside the generation process. */
  async generateBookingForm(dealId: string, actor: { adminId?: string; name: string }): Promise<DocumentRecord> {
    const { vars, deal } = await buildDealVariables(dealId);
    if (!deal) throw new Error("Deal not found.");
    const business = await businessInfo();

    const sections: PdfTableSection[] = [
      { heading: "Customer", rows: [{ label: "Name", value: vars.customer_name || "—" }, { label: "Phone", value: vars.customer_phone || "—" }, { label: "Email", value: vars.customer_email || "—" }] },
      {
        heading: "Property / Project",
        rows: [
          { label: "Property", value: vars.property_title || "—" },
          { label: "Project", value: vars.project_name || "—" },
          { label: "Type", value: vars.property_type || "—" },
          { label: "Location", value: vars.property_location || "—" },
        ],
      },
      {
        heading: "Booking Details",
        rows: [
          { label: "Deal Number", value: vars.deal_number },
          { label: "Agreed Price", value: vars.deal_amount },
          { label: "Booking Amount", value: vars.booking_amount },
          { label: "Agent", value: vars.agent_name || "—" },
          { label: "Date", value: vars.date },
        ],
      },
    ];

    const buffer = await renderToBuffer(
      <DocumentPdf documentTitle="Booking Form" documentNumber="DRAFT" generatedDate={vars.date} sections={sections} showSignatureBlock {...business} />
    );

    return documentService.createGeneratedDocument(
      { title: "Booking Form", documentType: "BOOKING_FORM", dealId, customerId: deal.customerId, propertyId: deal.propertyId, projectId: deal.projectId, fileName: `booking-form-${deal.dealNumber}.pdf`, bytes: buffer, mimeType: "application/pdf" },
      actor
    );
  },

  /** Generate Receipt (section 35) — only for a real, Verified payment;
   *  never for a pending/rejected one (section 35's own instruction). */
  async generatePaymentReceipt(paymentId: string, actor: { adminId?: string; name: string }): Promise<DocumentRecord> {
    const payment = await dealPaymentService.getById(paymentId);
    if (!payment) throw new Error("Payment not found.");
    if (payment.status !== "Verified") throw new Error("Only a verified payment can have a receipt generated.");
    const { vars, deal } = await buildDealVariables(payment.dealId);
    if (!deal) throw new Error("Deal not found.");
    const business = await businessInfo();

    const sections: PdfTableSection[] = [
      { heading: "Customer", rows: [{ label: "Name", value: vars.customer_name || "—" }] },
      { heading: "Deal / Property", rows: [{ label: "Deal Number", value: vars.deal_number }, { label: "Property", value: vars.property_title || vars.project_name || "—" }] },
      {
        heading: "Payment",
        rows: [
          { label: "Amount", value: formatPKR(payment.amount) },
          { label: "Payment Method", value: payment.paymentMethod },
          { label: "Payment Date", value: new Date(payment.paymentDate).toLocaleDateString("en-GB") },
          { label: "Reference", value: payment.reference || "—" },
          { label: "Outstanding Balance", value: vars.outstanding_amount },
          { label: "Agent", value: vars.agent_name || "—" },
        ],
      },
    ];

    const buffer = await renderToBuffer(<DocumentPdf documentTitle="Payment Receipt" documentNumber="DRAFT" generatedDate={vars.date} sections={sections} {...business} />);

    return documentService.createGeneratedDocument(
      {
        title: "Payment Receipt",
        documentType: "PAYMENT_RECEIPT",
        dealId: payment.dealId,
        paymentId,
        customerId: deal.customerId,
        propertyId: deal.propertyId,
        projectId: deal.projectId,
        fileName: `receipt-${deal.dealNumber}-${paymentId.slice(0, 8)}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );
  },
};
