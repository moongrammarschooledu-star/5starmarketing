import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import { LEGAL_CONTRACT_ALLOWED_TRANSITIONS } from "@/lib/models/legal";
import type { LegalContract, LegalContractInput, LegalContractStatus } from "@/lib/models/legal";

const SELECT = "*, properties(title), projects(name), deals(deal_number), documents(title), document_signatures(status)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): LegalContract {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    contractType: row.contract_type,
    documentId: row.document_id,
    documentTitle: row.documents?.title ?? undefined,
    signatureId: row.signature_id ?? undefined,
    signatureStatus: row.document_signatures?.status ?? undefined,
    status: row.status,
    effectiveDate: row.effective_date ?? undefined,
    expiryDate: row.expiry_date ?? undefined,
    executedAt: row.executed_at ?? undefined,
    supersedesContractId: row.supersedes_contract_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const legalContractService = {
  async list(filters?: { propertyId?: string; dealId?: string; status?: LegalContractStatus }): Promise<LegalContract[]> {
    const supabase = await createClient();
    let query = supabase.from("legal_contracts").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.dealId) query = query.eq("deal_id", filters.dealId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("legalContractService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<LegalContract | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("legal_contracts").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: LegalContractInput, actorId: string, actorName: string): Promise<LegalContract> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("legal_contracts")
      .insert({
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        deal_id: input.dealId || null,
        contract_type: input.contractType ?? "OTHER",
        document_id: input.documentId,
        signature_id: input.signatureId || null,
        effective_date: input.effectiveDate || null,
        expiry_date: input.expiryDate || null,
        supersedes_contract_id: input.supersedesContractId || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("legalContractService.create failed:", error);
      throw new Error("Could not create this contract.");
    }
    const contract = mapRow(data);
    await legalAuditService.log({ entityType: "legal_contract", entityId: contract.id, action: "Created", actorId, actorName, newValue: { contractNumber: contract.contractNumber } });
    return contract;
  },

  async updateStatus(id: string, nextStatus: LegalContractStatus, actorId: string, actorName: string): Promise<LegalContract> {
    const current = await this.getById(id);
    if (!current) throw new Error("Contract not found.");
    if (!LEGAL_CONTRACT_ALLOWED_TRANSITIONS[current.status]?.includes(nextStatus)) {
      throw new Error(`Cannot move a contract from "${current.status}" to "${nextStatus}".`);
    }
    // Never claim a legally-binding EXECUTED signature unless the
    // linked document_signatures row itself confirms completion.
    if (nextStatus === "EXECUTED" && current.signatureId && current.signatureStatus !== "Completed") {
      throw new Error("This contract's signature workflow is not yet completed — cannot mark it EXECUTED.");
    }
    const supabase = await createClient();
    const row: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "EXECUTED") row.executed_at = new Date().toISOString();
    const { data, error } = await supabase.from("legal_contracts").update(row).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this contract's status.");
    await legalAuditService.log({ entityType: "legal_contract", entityId: id, action: `Status changed to ${nextStatus}`, actorId, actorName });
    return mapRow(data);
  },

  /** An EXECUTED contract is never edited in place (enforced by the
   *  DB's own prevent_executed_contract_edit trigger too) — a change
   *  creates a new contract row referencing the old one, while the old
   *  row moves to SUPERSEDED. */
  async supersede(oldContractId: string, input: Omit<LegalContractInput, "supersedesContractId">, actorId: string, actorName: string): Promise<LegalContract> {
    const old = await this.getById(oldContractId);
    if (!old) throw new Error("Contract not found.");
    if (old.status !== "EXECUTED") throw new Error("Only an executed contract can be superseded.");
    const next = await this.create({ ...input, supersedesContractId: oldContractId }, actorId, actorName);
    await this.updateStatus(oldContractId, "SUPERSEDED", actorId, actorName);
    return next;
  },

  async listExpiringSoon(withinDays: number): Promise<LegalContract[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const until = new Date();
    until.setDate(until.getDate() + withinDays);
    const { data, error } = await supabase
      .from("legal_contracts")
      .select(SELECT)
      .eq("status", "EXECUTED")
      .not("expiry_date", "is", null)
      .gte("expiry_date", today)
      .lte("expiry_date", until.toISOString().slice(0, 10));
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
};
