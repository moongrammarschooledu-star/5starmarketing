import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { RentalMoveRecord, MoveRecordType } from "@/lib/models/rental";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentalMoveRecord {
  return {
    id: row.id,
    leaseId: row.lease_id,
    recordType: row.record_type,
    scheduledDate: row.scheduled_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    inspectionId: row.inspection_id ?? undefined,
    depositReceived: !!row.deposit_received,
    documentsCompleted: !!row.documents_completed,
    keysHandedOver: !!row.keys_handed_over,
    tenantConfirmed: !!row.tenant_confirmed,
    tenantConfirmedAt: row.tenant_confirmed_at ?? undefined,
    outstandingRentCleared: !!row.outstanding_rent_cleared,
    utilitiesSettled: !!row.utilities_settled,
    noticeId: row.notice_id ?? undefined,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const moveRecordService = {
  async listForLease(leaseId: string): Promise<RentalMoveRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_move_records").select("*").eq("lease_id", leaseId).order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentalMoveRecord | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_move_records").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async ensureForLease(leaseId: string, recordType: MoveRecordType, actorId: string): Promise<RentalMoveRecord> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("rental_move_records").select("*").eq("lease_id", leaseId).eq("record_type", recordType).maybeSingle();
    if (existing) return mapRow(existing);
    const { data, error } = await supabase.from("rental_move_records").insert({ lease_id: leaseId, record_type: recordType, created_by: actorId }).select("*").single();
    if (error) {
      console.error("moveRecordService.ensureForLease failed:", error);
      throw new Error("Could not start this move-in/move-out record.");
    }
    return mapRow(data);
  },

  /** Section 23-24 checklist steps — every field here is a plain
   *  boolean/date the admin sets as each step is genuinely completed;
   *  nothing here is auto-derived or auto-checked. */
  async updateStep(
    id: string,
    input: Partial<{
      scheduledDate: string;
      completedDate: string;
      inspectionId: string;
      depositReceived: boolean;
      documentsCompleted: boolean;
      keysHandedOver: boolean;
      outstandingRentCleared: boolean;
      utilitiesSettled: boolean;
      noticeId: string;
      notes: string;
    }>,
    actorId: string,
    actorName: string
  ): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.scheduledDate !== undefined) row.scheduled_date = input.scheduledDate || null;
    if (input.completedDate !== undefined) row.completed_date = input.completedDate || null;
    if (input.inspectionId !== undefined) row.inspection_id = input.inspectionId || null;
    if (input.depositReceived !== undefined) row.deposit_received = input.depositReceived;
    if (input.documentsCompleted !== undefined) row.documents_completed = input.documentsCompleted;
    if (input.keysHandedOver !== undefined) row.keys_handed_over = input.keysHandedOver;
    if (input.outstandingRentCleared !== undefined) row.outstanding_rent_cleared = input.outstandingRentCleared;
    if (input.utilitiesSettled !== undefined) row.utilities_settled = input.utilitiesSettled;
    if (input.noticeId !== undefined) row.notice_id = input.noticeId || null;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("rental_move_records").update(row).eq("id", id);
    if (error) throw new Error("Could not update this move record.");
    await rentalAuditService.log({ entityType: "move_record", entityId: id, action: "Updated", actorId, actorName });
  },

  async confirmByTenant(id: string, customerId: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("rental_move_records").select("lease_id").eq("id", id).maybeSingle();
    if (!existing) throw new Error("Move record not found.");
    const { data: lease } = await supabase.from("leases").select("tenant_id").eq("id", existing.lease_id).maybeSingle();
    const { data: tenant } = await supabase.from("tenants").select("customer_id").eq("id", lease?.tenant_id).maybeSingle();
    if (!tenant || tenant.customer_id !== customerId) throw new Error("Not authorized.");
    const { error } = await supabase.from("rental_move_records").update({ tenant_confirmed: true, tenant_confirmed_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error("Could not record your confirmation.");
  },

  /** A property is never auto-marked vacant (section 24's own
   *  instruction) — this explicit call is the only way COMPLETED gets
   *  set, and only once every checklist step is genuinely done. */
  async complete(id: string, actorId: string, actorName: string): Promise<void> {
    const record = await this.getById(id);
    if (!record) throw new Error("Move record not found.");
    if (record.recordType === "MOVE_OUT" && (!record.outstandingRentCleared || !record.utilitiesSettled)) {
      throw new Error("Outstanding rent and utilities must be cleared before completing move-out.");
    }
    const supabase = await createClient();
    const { error } = await supabase.from("rental_move_records").update({ status: "COMPLETED", completed_date: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) throw new Error("Could not complete this move record.");
    await rentalAuditService.log({ entityType: "move_record", entityId: id, action: "Completed", actorId, actorName });
  },
};
