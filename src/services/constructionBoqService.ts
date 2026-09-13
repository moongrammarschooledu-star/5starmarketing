import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import type { ConstructionBoq, ConstructionBoqItem, ConstructionBoqItemInput, BoqStatus } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBoqRow(row: any): ConstructionBoq {
  return {
    id: row.id,
    boqNumber: row.boq_number,
    projectId: row.project_id,
    status: row.status,
    createdByName: row.created?.name ?? undefined,
    approvedByName: row.approved?.name ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemRow(row: any): ConstructionBoqItem {
  return {
    id: row.id,
    boqId: row.boq_id,
    category: row.category,
    section: row.section ?? undefined,
    item: row.item,
    description: row.description ?? undefined,
    unit: row.unit,
    quantity: Number(row.quantity),
    estimatedRate: Number(row.estimated_rate),
    estimatedAmount: Number(row.estimated_amount),
    approvedRate: row.approved_rate != null ? Number(row.approved_rate) : undefined,
    approvedAmount: row.approved_amount != null ? Number(row.approved_amount) : undefined,
    actualQuantity: row.actual_quantity != null ? Number(row.actual_quantity) : undefined,
    actualRate: row.actual_rate != null ? Number(row.actual_rate) : undefined,
    actualAmount: row.actual_amount != null ? Number(row.actual_amount) : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Rounds to 2 decimals for money-adjacent figures — the same
 *  convention every prior financial module in this codebase uses. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const constructionBoqService = {
  async getForProject(projectId: string): Promise<ConstructionBoq | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_boq")
      .select("*, created:admin_profiles!construction_boq_created_by_fkey(name), approved:admin_profiles!construction_boq_approved_by_fkey(name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return undefined;
    return mapBoqRow(data);
  },

  async ensureForProject(projectId: string, actorId: string): Promise<ConstructionBoq> {
    const existing = await this.getForProject(projectId);
    if (existing) return existing;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_boq")
      .insert({ project_id: projectId, created_by: actorId })
      .select("*, created:admin_profiles!construction_boq_created_by_fkey(name), approved:admin_profiles!construction_boq_approved_by_fkey(name)")
      .single();
    if (error) {
      console.error("constructionBoqService.ensureForProject failed:", error);
      throw new Error("Could not create the BOQ for this project.");
    }
    return mapBoqRow(data);
  },

  async updateStatus(boqId: string, status: BoqStatus, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const extra: Record<string, unknown> = { status };
    if (status === "APPROVED") {
      extra.approved_by = actorId;
      extra.approved_at = new Date().toISOString();
    }
    const { error } = await supabase.from("construction_boq").update(extra).eq("id", boqId);
    if (error) throw new Error("Could not update this BOQ's status.");
    await constructionAuditService.log({ entityType: "boq", entityId: boqId, action: `Status changed to ${status}`, actorId, actorName });
  },

  async listItems(boqId: string): Promise<ConstructionBoqItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_boq_items").select("*").eq("boq_id", boqId).order("category", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapItemRow);
  },

  async addItem(boqId: string, input: ConstructionBoqItemInput): Promise<ConstructionBoqItem> {
    const estimatedAmount = round2(input.quantity * input.estimatedRate);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_boq_items")
      .insert({
        boq_id: boqId,
        category: input.category,
        section: input.section || null,
        item: input.item,
        description: input.description || null,
        unit: input.unit,
        quantity: input.quantity,
        estimated_rate: input.estimatedRate,
        estimated_amount: estimatedAmount,
        notes: input.notes || null,
      })
      .select("*")
      .single();
    if (error) {
      console.error("constructionBoqService.addItem failed:", error);
      throw new Error("Could not add this BOQ item.");
    }
    return mapItemRow(data);
  },

  async setApprovedRate(itemId: string, approvedRate: number): Promise<void> {
    const supabase = await createClient();
    const { data: item } = await supabase.from("construction_boq_items").select("quantity").eq("id", itemId).maybeSingle();
    if (!item) throw new Error("BOQ item not found.");
    const approvedAmount = round2(Number(item.quantity) * approvedRate);
    const { error } = await supabase.from("construction_boq_items").update({ approved_rate: approvedRate, approved_amount: approvedAmount }).eq("id", itemId);
    if (error) throw new Error("Could not update this item's approved rate.");
  },

  async setActuals(itemId: string, actualQuantity: number, actualRate: number): Promise<void> {
    const actualAmount = round2(actualQuantity * actualRate);
    const supabase = await createClient();
    const { error } = await supabase.from("construction_boq_items").update({ actual_quantity: actualQuantity, actual_rate: actualRate, actual_amount: actualAmount }).eq("id", itemId);
    if (error) throw new Error("Could not update this item's actuals.");
  },

  async removeItem(itemId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_boq_items").delete().eq("id", itemId);
    if (error) throw new Error("Could not remove this BOQ item.");
  },
};
