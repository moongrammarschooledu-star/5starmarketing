import "server-only";
import { createClient } from "@/lib/supabase/server";
import { legalAuditService } from "./legalAuditService";
import type { PropertyOwnershipRecord, PropertyOwnershipRecordInput, OwnershipAllocationSummary, OwnershipTransfer, OwnershipTransferInput, VerificationStatus } from "@/lib/models/legal";

const SELECT = "*, properties(title), verifier:admin_profiles!property_ownership_records_verified_by_fkey(name)";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PropertyOwnershipRecord {
  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    ownerType: row.owner_type,
    ownerName: row.owner_name,
    ownerIdentityNumber: row.owner_identity_number ?? undefined,
    ownershipSharePercent: Number(row.ownership_share_percent),
    ownershipType: row.ownership_type,
    acquisitionMethod: row.acquisition_method ?? undefined,
    acquiredDate: row.acquired_date ?? undefined,
    sourceDocumentId: row.source_document_id ?? undefined,
    status: row.status,
    verificationStatus: row.verification_status,
    verifiedBy: row.verified_by ?? undefined,
    verifiedByName: row.verifier?.name ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTransferRow(row: any): OwnershipTransfer {
  return {
    id: row.id,
    propertyId: row.property_id,
    fromOwnerRecordId: row.from_owner_record_id ?? undefined,
    fromOwnerName: row.from_owner?.owner_name ?? undefined,
    toOwnerName: row.to_owner_name,
    toOwnerType: row.to_owner_type,
    transferType: row.transfer_type,
    sharePercentTransferred: Number(row.share_percent_transferred),
    transferDate: row.transfer_date,
    documentId: row.document_id ?? undefined,
    notes: row.notes ?? undefined,
    recordedBy: row.recorded_by ?? undefined,
    recordedByName: row.recorder?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const ownershipService = {
  /** One row per property that has at least one ownership record —
   *  batched, not N+1. Never guesses a missing remainder. */
  async listAllocationOverview(): Promise<{ propertyId: string; propertyTitle: string; totalActiveSharePercent: number; allocationComplete: boolean; ownerCount: number }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_ownership_records").select("property_id, ownership_share_percent, status, properties(title)");
    if (error) return [];
    const byProperty = new Map<string, { propertyTitle: string; totalActiveSharePercent: number; ownerCount: number }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const entry = byProperty.get(row.property_id) ?? { propertyTitle: row.properties?.title ?? "Untitled", totalActiveSharePercent: 0, ownerCount: 0 };
      entry.ownerCount += 1;
      if (row.status === "ACTIVE") entry.totalActiveSharePercent += Number(row.ownership_share_percent);
      byProperty.set(row.property_id, entry);
    }
    return Array.from(byProperty.entries()).map(([propertyId, v]) => ({
      propertyId,
      propertyTitle: v.propertyTitle,
      totalActiveSharePercent: round2(v.totalActiveSharePercent),
      allocationComplete: round2(v.totalActiveSharePercent) === 100,
      ownerCount: v.ownerCount,
    }));
  },

  async listForProperty(propertyId: string): Promise<PropertyOwnershipRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_ownership_records").select(SELECT).eq("property_id", propertyId).order("created_at", { ascending: true });
    if (error) {
      console.error("ownershipService.listForProperty failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<PropertyOwnershipRecord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("property_ownership_records").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Never guesses a missing remainder — surfaces exactly what's
   *  recorded and whether it adds up to 100%, nothing more. */
  async allocationSummary(propertyId: string): Promise<OwnershipAllocationSummary> {
    const records = await this.listForProperty(propertyId);
    const active = records.filter((r) => r.status === "ACTIVE");
    const totalActiveSharePercent = round2(active.reduce((sum, r) => sum + r.ownershipSharePercent, 0));
    return {
      propertyId,
      totalActiveSharePercent,
      allocationComplete: totalActiveSharePercent === 100,
      records,
    };
  },

  async create(input: PropertyOwnershipRecordInput, actorId: string, actorName: string): Promise<PropertyOwnershipRecord> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("property_ownership_records")
      .insert({
        property_id: input.propertyId,
        owner_type: input.ownerType ?? "INDIVIDUAL",
        owner_name: input.ownerName,
        owner_identity_number: input.ownerIdentityNumber || null,
        ownership_share_percent: input.ownershipSharePercent,
        ownership_type: input.ownershipType ?? "FREEHOLD",
        acquisition_method: input.acquisitionMethod || null,
        acquired_date: input.acquiredDate || null,
        source_document_id: input.sourceDocumentId || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("ownershipService.create failed:", error);
      throw new Error("Could not add this ownership record.");
    }
    const record = mapRow(data);
    await legalAuditService.log({ entityType: "property_ownership_record", entityId: record.id, action: "Created", actorId, actorName, newValue: { ownerName: record.ownerName, sharePercent: record.ownershipSharePercent } });
    return record;
  },

  async update(id: string, input: Partial<PropertyOwnershipRecordInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.ownerType !== undefined) row.owner_type = input.ownerType;
    if (input.ownerName !== undefined) row.owner_name = input.ownerName;
    if (input.ownerIdentityNumber !== undefined) row.owner_identity_number = input.ownerIdentityNumber || null;
    if (input.ownershipSharePercent !== undefined) row.ownership_share_percent = input.ownershipSharePercent;
    if (input.ownershipType !== undefined) row.ownership_type = input.ownershipType;
    if (input.acquisitionMethod !== undefined) row.acquisition_method = input.acquisitionMethod || null;
    if (input.acquiredDate !== undefined) row.acquired_date = input.acquiredDate || null;
    if (input.sourceDocumentId !== undefined) row.source_document_id = input.sourceDocumentId || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("property_ownership_records").update(row).eq("id", id);
    if (error) throw new Error("Could not update this ownership record.");
  },

  /** Never auto-verified — requires an explicit authorized action. */
  async setVerification(id: string, verificationStatus: VerificationStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { verification_status: verificationStatus };
    if (verificationStatus === "VERIFIED") {
      row.verified_by = actorId;
      row.verified_at = new Date().toISOString();
    } else {
      row.verified_by = null;
      row.verified_at = null;
    }
    const { error } = await supabase.from("property_ownership_records").update(row).eq("id", id);
    if (error) throw new Error("Could not update this record's verification status.");
    await legalAuditService.log({ entityType: "property_ownership_record", entityId: id, action: `Verification set to ${verificationStatus}`, actorId, actorName });
  },

  async setStatus(id: string, status: "ACTIVE" | "TRANSFERRED" | "DISPUTED" | "ARCHIVED", actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("property_ownership_records").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this record's status.");
    await legalAuditService.log({ entityType: "property_ownership_record", entityId: id, action: `Status changed to ${status}`, actorId, actorName });
  },

  async listTransfers(propertyId: string): Promise<OwnershipTransfer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ownership_transfers")
      .select("*, from_owner:property_ownership_records!ownership_transfers_from_owner_record_id_fkey(owner_name), recorder:admin_profiles!ownership_transfers_recorded_by_fkey(name)")
      .eq("property_id", propertyId)
      .order("transfer_date", { ascending: false });
    if (error) {
      console.error("ownershipService.listTransfers failed:", error);
      return [];
    }
    return (data ?? []).map((row) => mapTransferRow({ ...row, from_owner: row.from_owner, recorder: row.recorder }));
  },

  /** Records the transfer AND moves the source record to TRANSFERRED —
   *  never deletes it. The new owner is a fresh ACTIVE record, created
   *  by the caller separately via create() so partial/multi-owner
   *  transfers stay explicit rather than assumed. */
  async recordTransfer(input: OwnershipTransferInput, actorId: string, actorName: string): Promise<OwnershipTransfer> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ownership_transfers")
      .insert({
        property_id: input.propertyId,
        from_owner_record_id: input.fromOwnerRecordId || null,
        to_owner_name: input.toOwnerName,
        to_owner_type: input.toOwnerType ?? "INDIVIDUAL",
        transfer_type: input.transferType ?? "SALE",
        share_percent_transferred: input.sharePercentTransferred,
        transfer_date: input.transferDate,
        document_id: input.documentId || null,
        notes: input.notes || null,
        recorded_by: actorId,
      })
      .select("*, from_owner:property_ownership_records!ownership_transfers_from_owner_record_id_fkey(owner_name), recorder:admin_profiles!ownership_transfers_recorded_by_fkey(name)")
      .single();
    if (error) {
      console.error("ownershipService.recordTransfer failed:", error);
      throw new Error("Could not record this ownership transfer.");
    }
    if (input.fromOwnerRecordId) {
      await this.setStatus(input.fromOwnerRecordId, "TRANSFERRED", actorId, actorName);
    }
    const transfer = mapTransferRow(data);
    await legalAuditService.log({ entityType: "ownership_transfer", entityId: transfer.id, action: "Recorded", actorId, actorName, newValue: { toOwnerName: transfer.toOwnerName, sharePercentTransferred: transfer.sharePercentTransferred } });
    return transfer;
  },
};
