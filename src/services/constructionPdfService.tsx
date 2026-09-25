import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { constructionProjectService } from "./constructionProjectService";
import { constructionBoqService } from "./constructionBoqService";
import { constructionPhaseService } from "./constructionPhaseService";
import { constructionProgressService } from "./constructionProgressService";
import { documentService } from "./documentService";
import { DocumentPdf, type PdfTableSection } from "@/lib/pdf/DocumentPdf";
import { site } from "@/lib/site";
import { formatPKR } from "@/lib/calculator";
import type { DocumentRecord } from "@/lib/models/document";

const business = { businessName: site.fullName, businessAddress: site.address, businessPhone: site.phoneDisplay, businessEmail: site.displayEmail };

export const constructionPdfService = {
  /** BOQ PDF (section 36) — internal cost document, never customer-
   *  visible by default (estimated/approved/actual rates are internal
   *  pricing information per section 35). */
  async generateBoqPdf(projectId: string, actor: { adminId: string; name: string }): Promise<DocumentRecord> {
    const project = await constructionProjectService.getById(projectId);
    if (!project) throw new Error("Project not found.");
    const boq = await constructionBoqService.getForProject(projectId);
    if (!boq) throw new Error("This project has no Bill of Quantities yet.");
    const items = await constructionBoqService.listItems(boq.id);

    const totalEstimated = items.reduce((s, i) => s + i.estimatedAmount, 0);
    const totalApproved = items.reduce((s, i) => s + (i.approvedAmount ?? 0), 0);
    const totalActual = items.reduce((s, i) => s + (i.actualAmount ?? 0), 0);

    const categories = Array.from(new Set(items.map((i) => i.category)));
    const sections: PdfTableSection[] = [
      {
        heading: "Summary",
        rows: [
          { label: "BOQ Number", value: boq.boqNumber },
          { label: "Status", value: boq.status },
          { label: "Total Estimated", value: formatPKR(totalEstimated) },
          { label: "Total Approved", value: formatPKR(totalApproved) },
          { label: "Total Actual", value: formatPKR(totalActual) },
        ],
      },
      ...categories.map((cat) => ({
        heading: cat,
        rows: items
          .filter((i) => i.category === cat)
          .map((i) => ({ label: `${i.item} (${i.quantity} ${i.unit} @ ${formatPKR(i.estimatedRate)})`, value: formatPKR(i.estimatedAmount) })),
      })),
    ];

    const generatedDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const buffer = await renderToBuffer(<DocumentPdf documentTitle="Bill of Quantities" documentNumber={boq.boqNumber} generatedDate={generatedDate} sections={sections} {...business} />);

    return documentService.createGeneratedDocument(
      {
        title: `Bill of Quantities — ${project.projectName}`,
        documentType: "BOQ_DOCUMENT",
        constructionProjectId: projectId,
        visibility: "ADMIN_ONLY",
        fileName: `boq-${boq.boqNumber}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );
  },

  /** Customer progress report (sections 34/36) — progress and schedule
   *  only, NEVER internal costs/contractor pricing/private notes. */
  async generateProgressReportPdf(projectId: string, actor: { adminId: string; name: string }): Promise<DocumentRecord> {
    const project = await constructionProjectService.getById(projectId);
    if (!project) throw new Error("Project not found.");
    const [progress, phases, milestones] = await Promise.all([
      constructionProgressService.overallProgress(projectId),
      constructionPhaseService.list(projectId),
      constructionPhaseService.listMilestones(projectId),
    ]);

    const sections: PdfTableSection[] = [
      {
        heading: "Project Overview",
        rows: [
          { label: "Project", value: project.projectName },
          { label: "Location", value: project.location || "—" },
          { label: "Status", value: project.status },
          { label: "Start Date", value: project.startDate ? new Date(project.startDate).toLocaleDateString("en-GB") : "—" },
          { label: "Planned Completion", value: project.plannedCompletionDate ? new Date(project.plannedCompletionDate).toLocaleDateString("en-GB") : "—" },
        ],
      },
      {
        heading: "Progress",
        rows: [
          { label: "Actual Progress", value: `${progress.actualPercent.toFixed(0)}%` },
          { label: "Planned Progress", value: progress.plannedPercent != null ? `${progress.plannedPercent.toFixed(0)}%` : "Not available" },
          { label: "Calculation Basis", value: progress.usedWeighting ? "Weighted by phase" : "Simple average across phases" },
        ],
      },
      { heading: "Phases", rows: phases.map((p) => ({ label: p.name, value: `${p.progress}% (${p.status})` })) },
      { heading: "Milestones", rows: milestones.map((m) => ({ label: m.name, value: `${m.status}${m.plannedDate ? ` — ${new Date(m.plannedDate).toLocaleDateString("en-GB")}` : ""}` })) },
    ];

    const generatedDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const buffer = await renderToBuffer(<DocumentPdf documentTitle="Construction Progress Report" documentNumber={project.projectNumber} generatedDate={generatedDate} sections={sections} {...business} />);

    return documentService.createGeneratedDocument(
      {
        title: `Progress Report — ${project.projectName}`,
        documentType: "PROGRESS_REPORT_DOCUMENT",
        constructionProjectId: projectId,
        customerId: project.customerId,
        visibility: "ADMIN_CUSTOMER",
        fileName: `progress-report-${project.projectNumber}.pdf`,
        bytes: buffer,
        mimeType: "application/pdf",
      },
      actor
    );
  },
};
