import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { LegalDashboardStats, LegalCalendarEntry } from "@/lib/models/legal";

export const legalReportService = {
  async dashboardStats(): Promise<LegalDashboardStats> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const in30 = in30Days.toISOString().slice(0, 10);

    const [
      { count: totalPropertiesWithLegalRecords },
      { count: openDueDiligenceCases },
      { count: dueDiligenceOverdue },
      { count: activeEncumbrances },
      { count: openLegalCases },
      { count: upcomingHearings },
      { count: openLegalRisks },
      { count: criticalLegalRisks },
      { count: pendingLegalApprovals },
      { count: nonCompliantProperties },
      { count: contractsExpiringSoon },
      { count: documentsExpiringSoon },
      { count: documentsExpired },
      { count: documentsUnverified },
    ] = await Promise.all([
      supabase.from("legal_property_records").select("id", { count: "exact", head: true }),
      supabase.from("due_diligence_cases").select("id", { count: "exact", head: true }).not("status", "in", "(COMPLETED,CLEARED_WITH_CONDITIONS,CANCELLED)"),
      supabase.from("due_diligence_cases").select("id", { count: "exact", head: true }).not("target_completion_date", "is", null).lt("target_completion_date", today).not("status", "in", "(COMPLETED,CLEARED_WITH_CONDITIONS,CANCELLED)"),
      supabase.from("encumbrances").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
      supabase.from("legal_cases").select("id", { count: "exact", head: true }).not("status", "in", "(RESOLVED,DISMISSED,CLOSED)"),
      supabase.from("legal_cases").select("id", { count: "exact", head: true }).not("next_hearing_date", "is", null).gte("next_hearing_date", today).lte("next_hearing_date", in30),
      supabase.from("legal_risks").select("id", { count: "exact", head: true }).in("status", ["OPEN", "UNDER_REVIEW"]),
      supabase.from("legal_risks").select("id", { count: "exact", head: true }).eq("severity", "CRITICAL").in("status", ["OPEN", "UNDER_REVIEW"]),
      supabase.from("legal_approvals").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
      supabase.from("property_compliance_records").select("id", { count: "exact", head: true }).in("status", ["NON_COMPLIANT", "REQUIRES_REVIEW"]),
      supabase.from("legal_contracts").select("id", { count: "exact", head: true }).eq("status", "EXECUTED").not("expiry_date", "is", null).gte("expiry_date", today).lte("expiry_date", in30),
      supabase.from("documents").select("id", { count: "exact", head: true }).not("expires_at", "is", null).gte("expires_at", today).lte("expires_at", in30).in("status", ["UPLOADED", "UNDER_REVIEW", "VERIFIED", "APPROVED"]),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "EXPIRED"),
      supabase.from("legal_documents").select("id, documents!inner(status)", { count: "exact", head: true }).in("documents.status", ["UPLOADED", "UNDER_REVIEW"]),
    ]);

    // Ownership allocation incompleteness has to be computed per-property
    // (no single aggregate query) — capped to a reasonable scan size.
    const { data: propertyIds } = await supabase.from("property_ownership_records").select("property_id");
    const uniquePropertyIds = Array.from(new Set((propertyIds ?? []).map((r) => r.property_id)));
    let ownershipAllocationsIncomplete = 0;
    if (uniquePropertyIds.length > 0) {
      const { data: shares } = await supabase.from("property_ownership_records").select("property_id, ownership_share_percent, status").in("property_id", uniquePropertyIds).eq("status", "ACTIVE");
      const totals = new Map<string, number>();
      for (const s of shares ?? []) totals.set(s.property_id, (totals.get(s.property_id) ?? 0) + Number(s.ownership_share_percent));
      for (const id of uniquePropertyIds) {
        const total = Math.round((totals.get(id) ?? 0) * 100) / 100;
        if (total !== 100) ownershipAllocationsIncomplete++;
      }
    }

    return {
      totalPropertiesWithLegalRecords: totalPropertiesWithLegalRecords ?? 0,
      ownershipAllocationsIncomplete,
      documentsExpiringSoon: documentsExpiringSoon ?? 0,
      documentsExpired: documentsExpired ?? 0,
      documentsUnverified: documentsUnverified ?? 0,
      openDueDiligenceCases: openDueDiligenceCases ?? 0,
      dueDiligenceOverdue: dueDiligenceOverdue ?? 0,
      activeEncumbrances: activeEncumbrances ?? 0,
      openLegalCases: openLegalCases ?? 0,
      upcomingHearings: upcomingHearings ?? 0,
      openLegalRisks: openLegalRisks ?? 0,
      criticalLegalRisks: criticalLegalRisks ?? 0,
      pendingLegalApprovals: pendingLegalApprovals ?? 0,
      nonCompliantProperties: nonCompliantProperties ?? 0,
      contractsExpiringSoon: contractsExpiringSoon ?? 0,
    };
  },

  /** No dedicated "legal_events" table — the calendar is assembled LIVE
   *  from every real date column that already exists. An entry can
   *  never appear here without a real underlying record. */
  async calendar(fromDate: string, toDate: string): Promise<LegalCalendarEntry[]> {
    const supabase = await createClient();
    const entries: LegalCalendarEntry[] = [];

    const [{ data: ddCases }, { data: hearings }, { data: docs }, { data: contracts }, { data: notices }, { data: compliance }] = await Promise.all([
      supabase.from("due_diligence_cases").select("id, case_number, property_id, target_completion_date").not("target_completion_date", "is", null).gte("target_completion_date", fromDate).lte("target_completion_date", toDate),
      supabase.from("legal_cases").select("id, case_number, property_id, next_hearing_date").not("next_hearing_date", "is", null).gte("next_hearing_date", fromDate).lte("next_hearing_date", toDate),
      supabase.from("legal_documents").select("id, document_id, property_id, documents(title, expires_at)").not("documents.expires_at", "is", null),
      supabase.from("legal_contracts").select("id, contract_number, property_id, expiry_date").eq("status", "EXECUTED").not("expiry_date", "is", null).gte("expiry_date", fromDate).lte("expiry_date", toDate),
      supabase.from("legal_notices").select("id, notice_number, property_id, response_due_date").not("response_due_date", "is", null).gte("response_due_date", fromDate).lte("response_due_date", toDate),
      supabase.from("property_compliance_records").select("id, property_id, next_review_date").not("next_review_date", "is", null).gte("next_review_date", fromDate).lte("next_review_date", toDate),
    ]);

    for (const c of ddCases ?? []) entries.push({ date: c.target_completion_date, type: "DUE_DILIGENCE_TARGET", label: `Due-diligence target — ${c.case_number}`, entityId: c.id, propertyId: c.property_id });
    for (const h of hearings ?? []) entries.push({ date: h.next_hearing_date, type: "CASE_HEARING", label: `Hearing — ${h.case_number}`, entityId: h.id, propertyId: h.property_id ?? undefined });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const d of (docs ?? []) as any[]) {
      const expiresAt = d.documents?.expires_at;
      if (expiresAt && expiresAt >= fromDate && expiresAt <= toDate) {
        entries.push({ date: expiresAt, type: "DOCUMENT_EXPIRY", label: `Document expiry — ${d.documents?.title ?? "Document"}`, entityId: d.document_id, propertyId: d.property_id ?? undefined });
      }
    }
    for (const c of contracts ?? []) entries.push({ date: c.expiry_date, type: "CONTRACT_EXPIRY", label: `Contract expiry — ${c.contract_number}`, entityId: c.id, propertyId: c.property_id ?? undefined });
    for (const n of notices ?? []) entries.push({ date: n.response_due_date, type: "NOTICE_RESPONSE_DUE", label: `Notice response due — ${n.notice_number}`, entityId: n.id, propertyId: n.property_id ?? undefined });
    for (const r of compliance ?? []) entries.push({ date: r.next_review_date, type: "COMPLIANCE_REVIEW", label: "Compliance review due", entityId: r.id, propertyId: r.property_id });

    return entries.sort((a, b) => a.date.localeCompare(b.date));
  },

  /** Section 36 — mirrors dealService.updateStatus()'s EXISTING
   *  documents-completion gate exactly. Based only on real recorded
   *  data, never a legal opinion. */
  async isPropertyClearForDealCompletion(propertyId: string): Promise<{ clear: boolean; reasons: string[] }> {
    const supabase = await createClient();
    const reasons: string[] = [];

    const [{ count: openDD }, { count: activeEncumbrances }, { count: nonCompliant }, { count: criticalRisks }] = await Promise.all([
      supabase.from("due_diligence_cases").select("id", { count: "exact", head: true }).eq("property_id", propertyId).not("status", "in", "(COMPLETED,CLEARED_WITH_CONDITIONS,CANCELLED)"),
      supabase.from("encumbrances").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("status", "ACTIVE"),
      supabase.from("property_compliance_records").select("id", { count: "exact", head: true }).eq("property_id", propertyId).in("status", ["NON_COMPLIANT", "REQUIRES_REVIEW"]),
      supabase.from("legal_risks").select("id", { count: "exact", head: true }).eq("property_id", propertyId).eq("severity", "CRITICAL").in("status", ["OPEN", "UNDER_REVIEW"]),
    ]);

    if ((openDD ?? 0) > 0) reasons.push("An open due-diligence case exists for this property.");
    if ((activeEncumbrances ?? 0) > 0) reasons.push("This property has an active, unresolved encumbrance.");
    if ((nonCompliant ?? 0) > 0) reasons.push("This property has a non-compliant or unreviewed compliance record.");
    if ((criticalRisks ?? 0) > 0) reasons.push("This property has an open critical legal risk flagged.");

    return { clear: reasons.length === 0, reasons };
  },
};
