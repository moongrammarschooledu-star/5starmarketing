import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import { ownershipService } from "./ownershipService";
import type { LegalRisk, LegalRiskInput, LegalRiskStatus, LegalRiskSeverity, PropertyRiskIndicator } from "@/lib/models/legal";

const SEVERITY_WEIGHT: Record<LegalRiskSeverity, number> = { LOW: 1, MEDIUM: 3, HIGH: 7, CRITICAL: 15 };

const SELECT = "*, properties(title), flagger:admin_profiles!legal_risks_flagged_by_fkey(name), resolver:admin_profiles!legal_risks_resolved_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalRisk {
  return {
    id: row.id,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    subjectType: row.subject_type ?? undefined,
    subjectId: row.subject_id ?? undefined,
    riskCategory: row.risk_category,
    description: row.description,
    severity: row.severity,
    status: row.status,
    flaggedBy: row.flagged_by ?? undefined,
    flaggedByName: row.flagger?.name ?? undefined,
    flaggedAt: row.flagged_at,
    resolvedBy: row.resolved_by ?? undefined,
    resolvedByName: row.resolver?.name ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNotes: row.resolution_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalRiskService = {
  async listForProperty(propertyId: string, openOnly = false): Promise<LegalRisk[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_risks").select(SELECT).eq("property_id", propertyId).order("severity", { ascending: false });
    if (openOnly) query = query.in("status", ["OPEN", "UNDER_REVIEW"]);
    const { data, error } = await query;
    if (error) {
      console.error("legalRiskService.listForProperty failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listOpen(): Promise<LegalRisk[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_risks").select(SELECT).in("status", ["OPEN", "UNDER_REVIEW"]).order("severity", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** "Risk / Requires Review" — never "illegal". */
  async flag(input: LegalRiskInput, actorId: string, actorName: string): Promise<LegalRisk> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_risks")
      .insert({
        property_id: input.propertyId || null,
        subject_type: input.subjectType || null,
        subject_id: input.subjectId || null,
        risk_category: input.riskCategory || "OTHER",
        description: input.description,
        severity: input.severity ?? "MEDIUM",
        flagged_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("legalRiskService.flag failed:", error);
      throw new Error("Could not flag this risk.");
    }
    const risk = mapRow(data);
    await legalAuditService.log({ entityType: "legal_risk", entityId: risk.id, action: "Flagged", actorId, actorName, newValue: { severity: risk.severity, description: risk.description } });
    return risk;
  },

  async updateStatus(id: string, status: LegalRiskStatus, actorId: string, actorName: string, resolutionNotes?: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { status };
    if (["MITIGATED", "ACCEPTED", "CLOSED"].includes(status)) {
      row.resolved_by = actorId;
      row.resolved_at = new Date().toISOString();
      if (resolutionNotes !== undefined) row.resolution_notes = resolutionNotes || null;
    }
    const { error } = await supabase.from("legal_risks").update(row).eq("id", id);
    if (error) throw new Error("Could not update this risk's status.");
    await legalAuditService.log({ entityType: "legal_risk", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  /** Internal risk indicator only — computed live from real recorded
   *  conditions, never stored, never presented as a legal opinion or
   *  government clearance. */
  async propertyRiskIndicator(propertyId: string): Promise<PropertyRiskIndicator> {
    const supabase = await createClient();
    const [{ data: risks }, { data: encumbrances }, { data: legalDocs }, { data: cases }, allocation] = await Promise.all([
      supabase.from("legal_risks").select("severity").eq("property_id", propertyId).in("status", ["OPEN", "UNDER_REVIEW"]),
      supabase.from("encumbrances").select("id").eq("property_id", propertyId).eq("status", "ACTIVE"),
      supabase.from("legal_documents").select("documents(status)").eq("property_id", propertyId),
      supabase.from("legal_cases").select("id").eq("property_id", propertyId).not("status", "in", "(RESOLVED,DISMISSED,CLOSED)"),
      ownershipService.allocationSummary(propertyId),
    ]);

    const openRisksBySeverity: Record<LegalRiskSeverity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    let riskIndicatorScore = 0;
    for (const r of risks ?? []) {
      const severity = r.severity as LegalRiskSeverity;
      openRisksBySeverity[severity] = (openRisksBySeverity[severity] ?? 0) + 1;
      riskIndicatorScore += SEVERITY_WEIGHT[severity] ?? 0;
    }
    const activeEncumbrancesCount = (encumbrances ?? []).length;
    riskIndicatorScore += activeEncumbrancesCount * 5;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unverifiedDocumentsCount = ((legalDocs ?? []) as any[]).filter((d) => !["VERIFIED", "APPROVED"].includes(d.documents?.status)).length;
    riskIndicatorScore += unverifiedDocumentsCount * 2;

    const openLegalCasesCount = (cases ?? []).length;
    riskIndicatorScore += openLegalCasesCount * 8;

    if (allocation.records.length > 0 && !allocation.allocationComplete) riskIndicatorScore += 10;

    return {
      propertyId,
      openRisksBySeverity,
      unverifiedDocumentsCount,
      activeEncumbrancesCount,
      ownershipAllocationComplete: allocation.records.length > 0 ? allocation.allocationComplete : null,
      openLegalCasesCount,
      riskIndicatorScore,
      disclaimer: "Internal risk indicator only — based solely on records entered in this system. Not a legal opinion, title report, or government clearance. Always seek professional/legal advice before relying on this for a transaction decision.",
    };
  },
};
