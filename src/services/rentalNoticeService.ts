import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rentalAuditService } from "./rentalAuditService";
import type { RentalNotice, RentalNoticeInput, NoticeStatus } from "@/lib/models/rental";

const SELECT = "*, leases(lease_number), rental_properties(properties(title))";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): RentalNotice {
  return {
    id: row.id,
    noticeNumber: row.notice_number,
    leaseId: row.lease_id ?? undefined,
    leaseNumber: row.leases?.lease_number ?? undefined,
    rentalPropertyId: row.rental_property_id ?? undefined,
    propertyTitle: row.rental_properties?.properties?.title ?? undefined,
    recipientCustomerId: row.recipient_customer_id ?? undefined,
    recipientType: row.recipient_type,
    noticeType: row.notice_type,
    issueDate: row.issue_date,
    effectiveDate: row.effective_date ?? undefined,
    content: row.content,
    documentId: row.document_id ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachRecipientNames(notices: RentalNotice[]): Promise<RentalNotice[]> {
  const ids = Array.from(new Set(notices.map((n) => n.recipientCustomerId).filter((id): id is string => !!id)));
  if (ids.length === 0) return notices;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("id, full_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, c.full_name as string]));
  return notices.map((n) => (n.recipientCustomerId ? { ...n, recipientName: names.get(n.recipientCustomerId) } : n));
}

export const rentalNoticeService = {
  async list(filters?: { leaseId?: string; rentalPropertyId?: string; status?: NoticeStatus }): Promise<RentalNotice[]> {
    const supabase = await createClient();
    let query = supabase.from("rental_notices").select(SELECT).order("created_at", { ascending: false });
    if (filters?.leaseId) query = query.eq("lease_id", filters.leaseId);
    if (filters?.rentalPropertyId) query = query.eq("rental_property_id", filters.rentalPropertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) return [];
    return attachRecipientNames((data ?? []).map(mapRow));
  },

  async listForRecipient(customerId: string): Promise<RentalNotice[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_notices").select(SELECT).eq("recipient_customer_id", customerId).order("issue_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<RentalNotice | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_notices").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [notice] = await attachRecipientNames([mapRow(data)]);
    return notice;
  },

  async create(input: RentalNoticeInput, actorId: string, actorName: string): Promise<RentalNotice> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rental_notices")
      .insert({
        lease_id: input.leaseId || null,
        rental_property_id: input.rentalPropertyId || null,
        recipient_customer_id: input.recipientCustomerId || null,
        recipient_type: input.recipientType,
        notice_type: input.noticeType,
        effective_date: input.effectiveDate || null,
        content: input.content,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("rentalNoticeService.create failed:", error);
      throw new Error("Could not create this notice.");
    }
    const notice = mapRow(data);
    await rentalAuditService.log({ entityType: "rental_notice", entityId: notice.id, action: "Issued", actorId, actorName, newValue: { noticeType: notice.noticeType } });
    return notice;
  },

  async setStatus(id: string, status: NoticeStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("rental_notices").update({ status }).eq("id", id);
    if (error) throw new Error("Could not update this notice's status.");
  },

  async acknowledge(id: string, customerId: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("rental_notices").select("recipient_customer_id").eq("id", id).maybeSingle();
    if (!existing || existing.recipient_customer_id !== customerId) throw new Error("Notice not found.");
    const { error } = await supabase.from("rental_notices").update({ status: "ACKNOWLEDGED" }).eq("id", id);
    if (error) throw new Error("Could not acknowledge this notice.");
  },
};
