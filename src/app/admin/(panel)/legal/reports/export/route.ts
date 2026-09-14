import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ownershipService } from "@/services/ownershipService";
import { legalDocumentService } from "@/services/legalDocumentService";
import { dueDiligenceService } from "@/services/dueDiligenceService";
import { complianceService } from "@/services/complianceService";
import { legalCaseService } from "@/services/legalCaseService";
import { legalNoticeService } from "@/services/legalNoticeService";
import { legalContractService } from "@/services/legalContractService";
import { legalApprovalService } from "@/services/legalApprovalService";
import { legalRiskService } from "@/services/legalRiskService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toCsv } from "@/lib/csv";

async function requireExportAccess() {
  const admin = await profileService.getCurrentAdmin();
  return !!admin && canAccess(admin.role, "legal");
}

export async function GET(request: Request) {
  if (!(await requireExportAccess())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "ownership";
  const supabase = await createClient();

  let csv = "";
  try {
    if (type === "ownership") {
      const overview = await ownershipService.listAllocationOverview();
      csv = toCsv(
        ["Property", "Owners on Record", "Active Share %", "Allocation Complete"],
        overview.map((o) => [o.propertyTitle, o.ownerCount, o.totalActiveSharePercent, o.allocationComplete ? "Yes" : "No"])
      );
    } else if (type === "ownership-transfers") {
      const { data } = await supabase.from("ownership_transfers").select("transfer_date, to_owner_name, transfer_type, share_percent_transferred, properties(title)").order("transfer_date", { ascending: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      csv = toCsv(["Date", "Property", "To Owner", "Type", "Share % Transferred"], ((data ?? []) as any[]).map((r) => [r.transfer_date, r.properties?.title ?? "", r.to_owner_name, r.transfer_type, Number(r.share_percent_transferred)]));
    } else if (type === "legal-documents") {
      const docs = await legalDocumentService.listAll();
      csv = toCsv(
        ["Title", "Property", "Copy Type", "Confidentiality", "Status", "Expires"],
        docs.map((d) => [d.documentTitle ?? "", d.propertyTitle ?? d.projectName ?? "", d.copyType, d.confidentialityLevel, d.documentStatus ?? "", d.documentExpiresAt ?? ""])
      );
    } else if (type === "document-expiry") {
      const docs = await legalDocumentService.listExpiringSoon();
      csv = toCsv(
        ["Document #", "Title", "Type", "Property", "Expires"],
        docs.map((d) => [d.documentNumber, d.title, d.documentType, d.propertyTitle ?? "", d.expiresAt ?? ""])
      );
    } else if (type === "document-verification") {
      const docs = await legalDocumentService.listAll();
      csv = toCsv(
        ["Title", "Property", "Status"],
        docs.filter((d) => d.documentStatus === "UPLOADED" || d.documentStatus === "UNDER_REVIEW").map((d) => [d.documentTitle ?? "", d.propertyTitle ?? "", d.documentStatus ?? ""])
      );
    } else if (type === "due-diligence") {
      const cases = await dueDiligenceService.list();
      csv = toCsv(
        ["Case #", "Property", "Transaction Type", "Officer", "Target Completion", "Status"],
        cases.map((c) => [c.caseNumber, c.propertyTitle ?? "", c.transactionType, c.legalOfficerName ?? "", c.targetCompletionDate ?? "", c.status])
      );
    } else if (type === "due-diligence-checklist") {
      const cases = await dueDiligenceService.list();
      const rows: (string | number)[][] = [];
      for (const c of cases) {
        const score = await dueDiligenceService.completionScore(c.id);
        rows.push([c.caseNumber, c.propertyTitle ?? "", score.checklistCompletionPercent ?? "N/A", score.passedItems, score.failedItems, score.requiresReviewItems, score.notCheckedItems]);
      }
      csv = toCsv(["Case #", "Property", "Checklist Completion %", "Passed", "Failed", "Requires Review", "Not Checked"], rows);
    } else if (type === "compliance") {
      const records = await complianceService.list();
      csv = toCsv(
        ["Property", "Status", "Reviewed By", "Reviewed At", "Next Review"],
        records.map((r) => [r.propertyTitle ?? "", r.status, r.reviewedByName ?? "", r.reviewedAt ?? "", r.nextReviewDate ?? ""])
      );
    } else if (type === "encumbrances") {
      const { data } = await supabase.from("encumbrances").select("encumbrance_type, status, verification_status, holder_name, amount, properties(title)").order("created_at", { ascending: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      csv = toCsv(["Property", "Type", "Status", "Verification", "Holder", "Amount"], ((data ?? []) as any[]).map((r) => [r.properties?.title ?? "", r.encumbrance_type, r.status, r.verification_status, r.holder_name ?? "", r.amount ?? ""]));
    } else if (type === "legal-cases") {
      const cases = await legalCaseService.list();
      csv = toCsv(
        ["Case #", "Title", "Property", "Type", "Status", "Next Hearing", "Officer"],
        cases.map((c) => [c.caseNumber, c.title, c.propertyTitle ?? "", c.caseType, c.status, c.nextHearingDate ?? "", c.legalOfficerName ?? ""])
      );
    } else if (type === "legal-notices") {
      const notices = await legalNoticeService.list();
      csv = toCsv(
        ["Notice #", "Recipient", "Type", "Property", "Sent Via", "Status"],
        notices.map((n) => [n.noticeNumber, n.recipientName, n.noticeType, n.propertyTitle ?? "", n.sentVia ?? "", n.status])
      );
    } else if (type === "contracts") {
      const contracts = await legalContractService.list();
      csv = toCsv(
        ["Contract #", "Type", "Property", "Status", "Effective", "Expiry"],
        contracts.map((c) => [c.contractNumber, c.contractType, c.propertyTitle ?? "", c.status, c.effectiveDate ?? "", c.expiryDate ?? ""])
      );
    } else if (type === "legal-approvals") {
      const approvals = await legalApprovalService.listPending();
      csv = toCsv(
        ["Subject Type", "Stage", "Requested By", "Status"],
        approvals.map((a) => [a.subjectType, a.approvalStage, a.requestedByName ?? "", a.status])
      );
    } else if (type === "legal-risks") {
      const risks = await legalRiskService.listOpen();
      csv = toCsv(
        ["Property", "Category", "Description", "Severity", "Status"],
        risks.map((r) => [r.propertyTitle ?? "", r.riskCategory, r.description, r.severity, r.status])
      );
    } else {
      return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
    }
  } catch (e) {
    console.error("legal report export failed:", e);
    return NextResponse.json({ error: "Could not export this report." }, { status: 500 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="legal-${type}.csv"`,
    },
  });
}
