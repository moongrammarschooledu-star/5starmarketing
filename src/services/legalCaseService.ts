import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import type { LegalCase, LegalCaseInput, LegalCaseStatus, LegalCaseEvent, LegalCaseEventInput } from "@/lib/models/legal";

const SELECT = "*, properties(title), officer:admin_profiles!legal_cases_legal_officer_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    caseType: row.case_type,
    title: row.title,
    courtOrForum: row.court_or_forum ?? undefined,
    opposingParty: row.opposing_party ?? undefined,
    status: row.status,
    filedDate: row.filed_date ?? undefined,
    nextHearingDate: row.next_hearing_date ?? undefined,
    legalOfficerId: row.legal_officer_id ?? undefined,
    legalOfficerName: row.officer?.name ?? undefined,
    outcomeSummary: row.outcome_summary ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(row: any): LegalCaseEvent {
  return {
    id: row.id,
    caseId: row.case_id,
    eventType: row.event_type,
    eventDate: row.event_date,
    description: row.description,
    documentId: row.document_id ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    recordedByName: row.recorder?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const legalCaseService = {
  async list(filters?: { propertyId?: string; status?: LegalCaseStatus; legalOfficerId?: string }): Promise<LegalCase[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_cases").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.legalOfficerId) query = query.eq("legal_officer_id", filters.legalOfficerId);
    const { data, error } = await query;
    if (error) {
      console.error("legalCaseService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<LegalCase | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_cases").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: LegalCaseInput, actorId: string, actorName: string): Promise<LegalCase> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_cases")
      .insert({
        property_id: input.propertyId || null,
        case_type: input.caseType ?? "OTHER",
        title: input.title,
        court_or_forum: input.courtOrForum || null,
        opposing_party: input.opposingParty || null,
        filed_date: input.filedDate || null,
        next_hearing_date: input.nextHearingDate || null,
        legal_officer_id: input.legalOfficerId || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("legalCaseService.create failed:", error);
      throw new Error("Could not create this legal case.");
    }
    const legalCase = mapRow(data);
    await legalAuditService.log({ entityType: "legal_case", entityId: legalCase.id, action: "Opened", actorId, actorName, newValue: { title: legalCase.title } });
    return legalCase;
  },

  /** Status/outcome/hearing-date changes are never fabricated — only
   *  written when an authorized user actually enters them. */
  async update(id: string, input: { status?: LegalCaseStatus; nextHearingDate?: string; outcomeSummary?: string; notes?: string; legalOfficerId?: string | null }, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.status !== undefined) row.status = input.status;
    if (input.nextHearingDate !== undefined) row.next_hearing_date = input.nextHearingDate || null;
    if (input.outcomeSummary !== undefined) row.outcome_summary = input.outcomeSummary || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    if (input.legalOfficerId !== undefined) row.legal_officer_id = input.legalOfficerId;
    const { error } = await supabase.from("legal_cases").update(row).eq("id", id);
    if (error) throw new Error("Could not update this legal case.");
    await legalAuditService.log({ entityType: "legal_case", entityId: id, action: "Updated", actorId, actorName, newValue: input });
  },

  async listEvents(caseId: string): Promise<LegalCaseEvent[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_case_events")
      .select("*, recorder:admin_profiles!legal_case_events_recorded_by_fkey(name)")
      .eq("case_id", caseId)
      .order("event_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapEvent);
  },

  async addEvent(input: LegalCaseEventInput, actorId: string): Promise<LegalCaseEvent> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_case_events")
      .insert({
        case_id: input.caseId,
        event_type: input.eventType ?? "NOTE",
        event_date: input.eventDate,
        description: input.description,
        document_id: input.documentId || null,
        recorded_by: actorId,
      })
      .select("*, recorder:admin_profiles!legal_case_events_recorded_by_fkey(name)")
      .single();
    if (error) throw new Error("Could not add this case event.");
    return mapEvent(data);
  },

  async listUpcomingHearings(withinDays: number): Promise<LegalCase[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const until = new Date();
    until.setDate(until.getDate() + withinDays);
    const { data, error } = await supabase.from("legal_cases").select(SELECT).not("next_hearing_date", "is", null).gte("next_hearing_date", today).lte("next_hearing_date", until.toISOString().slice(0, 10));
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
};
