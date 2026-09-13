import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { PURCHASE_ORDER_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionPurchaseOrder, ConstructionPurchaseOrderInput, ConstructionPurchaseOrderItem, PurchaseOrderStatus } from "@/lib/models/construction";

const SELECT = "*, maintenance_vendors(business_name), created:admin_profiles!construction_purchase_orders_created_by_fkey(name), approved:admin_profiles!construction_purchase_orders_approved_by_fkey(name)";
const SELECT_WITH_ITEMS = `${SELECT}, construction_purchase_order_items(*)`;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any, items?: ConstructionPurchaseOrderItem[]): ConstructionPurchaseOrder {
  return {
    id: row.id,
    poNumber: row.po_number,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    vendorName: row.maintenance_vendors?.business_name ?? undefined,
    status: row.status,
    expectedDelivery: row.expected_delivery ?? undefined,
    taxPercent: Number(row.tax_percent),
    discountAmount: Number(row.discount_amount),
    subtotal: Number(row.subtotal),
    taxAmount: Number(row.tax_amount),
    totalAmount: Number(row.total_amount),
    notes: row.notes ?? undefined,
    createdByName: row.created?.name ?? undefined,
    approvedByName: row.approved?.name ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    items,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapItemRow(row: any): ConstructionPurchaseOrderItem {
  return { id: row.id, poId: row.po_id, materialId: row.material_id ?? undefined, description: row.description, quantity: Number(row.quantity), rate: Number(row.rate), amount: Number(row.amount) };
}

function assertTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus) {
  if (!PURCHASE_ORDER_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a purchase order from ${from} to ${to}.`);
  }
}

export const constructionProcurementService = {
  async list(projectId: string): Promise<ConstructionPurchaseOrder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_purchase_orders").select(SELECT_WITH_ITEMS).eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => mapRow(row, (row.construction_purchase_order_items ?? []).map(mapItemRow)));
  },

  async getById(id: string): Promise<ConstructionPurchaseOrder | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_purchase_orders").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const { data: itemRows } = await supabase.from("construction_purchase_order_items").select("*").eq("po_id", id).order("created_at", { ascending: true });
    return mapRow(data, (itemRows ?? []).map(mapItemRow));
  },

  async create(projectId: string, input: ConstructionPurchaseOrderInput, actorId: string, actorName: string): Promise<ConstructionPurchaseOrder> {
    if (input.items.length === 0) throw new Error("A purchase order needs at least one item.");
    const subtotal = round2(input.items.reduce((sum, i) => sum + i.quantity * i.rate, 0));
    const taxPercent = input.taxPercent ?? 0;
    const discountAmount = input.discountAmount ?? 0;
    const taxAmount = round2((subtotal - discountAmount) * (taxPercent / 100));
    const totalAmount = round2(subtotal - discountAmount + taxAmount);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_purchase_orders")
      .insert({
        project_id: projectId,
        vendor_id: input.vendorId,
        expected_delivery: input.expectedDelivery || null,
        tax_percent: taxPercent,
        discount_amount: discountAmount,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionProcurementService.create failed:", error);
      throw new Error("Could not create this purchase order.");
    }

    await supabase.from("construction_purchase_order_items").insert(
      input.items.map((i) => ({ po_id: data.id, material_id: i.materialId || null, description: i.description, quantity: i.quantity, rate: i.rate, amount: round2(i.quantity * i.rate) }))
    );

    const po = mapRow(data);
    await constructionAuditService.log({ entityType: "purchase_order", entityId: po.id, action: "Created", actorId, actorName, newValue: { totalAmount } });
    return po;
  },

  async updateStatus(id: string, newStatus: PurchaseOrderStatus, actorId: string, actorName: string): Promise<ConstructionPurchaseOrder> {
    const po = await this.getById(id);
    if (!po) throw new Error("Purchase order not found.");
    assertTransition(po.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "APPROVED") {
      extra.approved_by = actorId;
      extra.approved_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from("construction_purchase_orders").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this purchase order's status.");
    await constructionAuditService.log({ entityType: "purchase_order", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: po.status } });
    return mapRow(data);
  },
};
