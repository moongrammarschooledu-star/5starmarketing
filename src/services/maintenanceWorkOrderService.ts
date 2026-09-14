import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { maintenanceAuditService } from "./maintenanceAuditService";
import { maintenanceRequestService } from "./maintenanceRequestService";
import { maintenanceAssetService } from "./maintenanceAssetService";
import { expenseService } from "./expenseService";
import { parseUploadDataUri, buildStoragePath, uploadDocumentFile, createSignedDocumentUrl } from "@/lib/documentStorage";
import { WORK_ORDER_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import type { MaintenanceWorkOrder, MaintenanceWorkOrderInput, WorkOrderStatus, MaintenanceWorkOrderItem, MaintenanceWorkOrderItemInput, MaintenancePhoto, PhotoType, CustomerWorkOrderView } from "@/lib/models/maintenance";

const SELECT = "*, properties(title), maintenance_assets(asset_number), maintenance_vendors(business_name), technician:admin_profiles!maintenance_work_orders_technician_id_fkey(name), maintenance_requests(request_number)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceWorkOrder {
  return {
    id: row.id,
    workOrderNumber: row.work_order_number,
    maintenanceRequestId: row.maintenance_request_id ?? undefined,
    requestNumber: row.maintenance_requests?.request_number ?? undefined,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    unitId: row.unit_id ?? undefined,
    assetId: row.asset_id ?? undefined,
    assetNumber: row.maintenance_assets?.asset_number ?? undefined,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.maintenance_vendors?.business_name ?? undefined,
    technicianId: row.technician_id ?? undefined,
    technicianName: row.technician?.name ?? undefined,
    priority: row.priority,
    description: row.description,
    scopeOfWork: row.scope_of_work ?? undefined,
    scheduledDate: row.scheduled_date ?? undefined,
    startedDate: row.started_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    estimatedCost: row.estimated_cost != null ? Number(row.estimated_cost) : undefined,
    approvedCost: row.approved_cost != null ? Number(row.approved_cost) : undefined,
    actualCost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    customerCharge: row.customer_charge != null ? Number(row.customer_charge) : undefined,
    internalCost: row.internal_cost != null ? Number(row.internal_cost) : undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    expenseId: row.expense_id ?? undefined,
    landlordApprovalStatus: row.landlord_approval_status ?? "NOT_REQUIRED",
    landlordApprovedBy: row.landlord_approved_by ?? undefined,
    landlordApprovedAt: row.landlord_approved_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** landlord_approved_by references auth.users, not customer_profiles
 *  directly (same reason STEP 24/26's customer_id fields need a
 *  separate lookup) — batch-resolve names in one extra query rather
 *  than an unreliable embedded-join. */
async function attachLandlordApproverNames(orders: MaintenanceWorkOrder[]): Promise<MaintenanceWorkOrder[]> {
  const ids = Array.from(new Set(orders.map((o) => o.landlordApprovedBy).filter((id): id is string => !!id)));
  if (ids.length === 0) return orders;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("id, full_name").in("id", ids);
  const names = new Map((data ?? []).map((c) => [c.id, c.full_name as string]));
  return orders.map((o) => (o.landlordApprovedBy ? { ...o, landlordApprovedByName: names.get(o.landlordApprovedBy) } : o));
}

function assertTransition(from: WorkOrderStatus, to: WorkOrderStatus) {
  if (!WORK_ORDER_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a work order from ${from} to ${to}.`);
  }
}

/** Best-effort mirror onto the parent request's own status/notifications
 *  — the request is the customer-facing entity, so its own workflow
 *  (and customer notifications) stays the single source of truth. */
async function mirrorToRequest(requestId: string | undefined, workOrderStatus: WorkOrderStatus, actor: { adminId?: string; name: string }) {
  if (!requestId) return;
  try {
    const request = await maintenanceRequestService.getById(requestId);
    if (!request) return;
    const map: Partial<Record<WorkOrderStatus, typeof request.status>> = {
      SCHEDULED: "SCHEDULED",
      IN_PROGRESS: "IN_PROGRESS",
      COMPLETED: "COMPLETED",
    };
    const nextRequestStatus = map[workOrderStatus];
    if (nextRequestStatus && request.status !== nextRequestStatus) {
      await maintenanceRequestService.updateStatus(requestId, nextRequestStatus, actor).catch(() => {});
    }
  } catch (e) {
    console.error("maintenanceWorkOrderService.mirrorToRequest failed:", e);
  }
}

export const maintenanceWorkOrderService = {
  async list(filters?: { propertyId?: string; vendorId?: string; technicianId?: string; status?: WorkOrderStatus }): Promise<MaintenanceWorkOrder[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_work_orders").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.vendorId) query = query.eq("vendor_id", filters.vendorId);
    if (filters?.technicianId) query = query.eq("technician_id", filters.technicianId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("maintenanceWorkOrderService.list failed:", error);
      return [];
    }
    return attachLandlordApproverNames((data ?? []).map(mapRow));
  },

  async getById(id: string): Promise<MaintenanceWorkOrder | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_work_orders").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    const [order] = await attachLandlordApproverNames([mapRow(data)]);
    return order;
  },

  async listByRequest(requestId: string): Promise<MaintenanceWorkOrder[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_work_orders").select(SELECT).eq("maintenance_request_id", requestId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  /** Customer-safe view (section 22) — never internal cost, vendor
   *  internal pricing, or private notes; only what the customer is
   *  entitled to see about their own request's work.
   *
   *  maintenance_work_orders has NO customer-facing RLS policy at all
   *  (it carries internal cost/vendor pricing) — the caller (the
   *  server action) must have ALREADY confirmed, under the customer's
   *  own session, that this request belongs to them (maintenance_
   *  requests DOES have that policy) before calling this. Only then do
   *  we use the service-role client to read the linked work orders,
   *  and only the whitelisted fields below ever leave this function. */
  async listCustomerViewByRequest(requestId: string): Promise<CustomerWorkOrderView[]> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from("maintenance_work_orders").select(SELECT).eq("maintenance_request_id", requestId).order("created_at", { ascending: false });
    if (error) return [];
    const orders = (data ?? []).map(mapRow);
    return orders.map((w) => ({
      id: w.id,
      workOrderNumber: w.workOrderNumber,
      status: w.status,
      scheduledDate: w.scheduledDate,
      startedDate: w.startedDate,
      completedDate: w.completedDate,
      technicianName: w.technicianName,
      vendorName: w.vendorName,
      customerCharge: w.customerCharge,
    }));
  },

  async create(input: MaintenanceWorkOrderInput, actorId: string, actorName: string): Promise<MaintenanceWorkOrder> {
    const supabase = await createClient();
    const status = input.vendorId || input.technicianId ? "ASSIGNED" : "NEW";
    const { data, error } = await supabase
      .from("maintenance_work_orders")
      .insert({
        maintenance_request_id: input.maintenanceRequestId || null,
        property_id: input.propertyId,
        unit_id: input.unitId || null,
        asset_id: input.assetId || null,
        vendor_id: input.vendorId || null,
        technician_id: input.technicianId || null,
        priority: input.priority ?? "NORMAL",
        description: input.description,
        scope_of_work: input.scopeOfWork || null,
        scheduled_date: input.scheduledDate || null,
        estimated_cost: input.estimatedCost ?? null,
        status,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("maintenanceWorkOrderService.create failed:", error);
      throw new Error("Could not create this work order.");
    }
    const workOrder = mapRow(data);
    await maintenanceAuditService.log({ entityType: "work_order", entityId: workOrder.id, action: "Created", actorId, actorName, newValue: { propertyId: workOrder.propertyId } });

    if (input.maintenanceRequestId) {
      const request = await maintenanceRequestService.getById(input.maintenanceRequestId);
      if (request && (request.status === "NEW" || request.status === "ACKNOWLEDGED")) {
        await maintenanceRequestService.updateStatus(input.maintenanceRequestId, "ASSIGNED", { adminId: actorId, name: actorName }).catch(() => {});
      }
    }
    if (input.assetId) {
      await maintenanceAssetService.logHistory(input.assetId, { eventType: "MAINTENANCE", eventDate: new Date().toISOString().slice(0, 10), description: `Work order ${workOrder.workOrderNumber} created.`, vendorId: input.vendorId, workOrderId: workOrder.id }, actorId);
    }
    return workOrder;
  },

  async updateStatus(id: string, newStatus: WorkOrderStatus, actor: { adminId: string; name: string }): Promise<MaintenanceWorkOrder> {
    const workOrder = await this.getById(id);
    if (!workOrder) throw new Error("Work order not found.");
    assertTransition(workOrder.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "IN_PROGRESS" && !workOrder.startedDate) extra.started_date = new Date().toISOString().slice(0, 10);
    if (newStatus === "COMPLETED") extra.completed_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.from("maintenance_work_orders").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this work order's status.");

    await supabase.from("maintenance_status_history").insert({ entity_type: "WORK_ORDER", entity_id: id, from_status: workOrder.status, to_status: newStatus, changed_by: actor.adminId });
    await maintenanceAuditService.log({ entityType: "work_order", entityId: id, action: `Status changed to ${newStatus}`, actorId: actor.adminId, actorName: actor.name, oldValue: { status: workOrder.status } });

    if (newStatus === "COMPLETED" && workOrder.assetId) {
      await maintenanceAssetService.logHistory(workOrder.assetId, { eventType: "REPAIR", eventDate: new Date().toISOString().slice(0, 10), description: `Work order ${workOrder.workOrderNumber} completed.`, cost: workOrder.actualCost, vendorId: workOrder.vendorId, workOrderId: id }, actor.adminId);
    }

    await mirrorToRequest(workOrder.maintenanceRequestId, newStatus, actor);
    return mapRow(data);
  },

  async updateCosts(id: string, input: { estimatedCost?: number; approvedCost?: number; actualCost?: number; customerCharge?: number; internalCost?: number }, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.estimatedCost !== undefined) row.estimated_cost = input.estimatedCost;
    if (input.approvedCost !== undefined) row.approved_cost = input.approvedCost;
    if (input.actualCost !== undefined) row.actual_cost = input.actualCost;
    if (input.customerCharge !== undefined) row.customer_charge = input.customerCharge;
    if (input.internalCost !== undefined) row.internal_cost = input.internalCost;
    const { error } = await supabase.from("maintenance_work_orders").update(row).eq("id", id);
    if (error) throw new Error("Could not update this work order's costs.");
    await maintenanceAuditService.log({ entityType: "work_order", entityId: id, action: "Costs updated", actorId, actorName, newValue: input });
  },

  async assign(id: string, input: { vendorId?: string; technicianId?: string }, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_work_orders").update({ vendor_id: input.vendorId || null, technician_id: input.technicianId || null }).eq("id", id);
    if (error) throw new Error("Could not assign this work order.");
    await maintenanceAuditService.log({ entityType: "work_order", entityId: id, action: "Assigned", actorId, actorName, newValue: input });
  },

  // ---- Parts/labor breakdown (section 40) ----
  async listItems(workOrderId: string): Promise<MaintenanceWorkOrderItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_work_order_items").select("*").eq("work_order_id", workOrderId).order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((row) => ({ id: row.id, workOrderId: row.work_order_id, itemType: row.item_type, description: row.description, quantity: Number(row.quantity), unitCost: Number(row.unit_cost), totalCost: Number(row.total_cost), createdAt: row.created_at }));
  },

  async addItem(workOrderId: string, input: MaintenanceWorkOrderItemInput): Promise<MaintenanceWorkOrderItem> {
    const totalCost = input.quantity * input.unitCost;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_work_order_items")
      .insert({ work_order_id: workOrderId, item_type: input.itemType, description: input.description, quantity: input.quantity, unit_cost: input.unitCost, total_cost: totalCost })
      .select("*")
      .single();
    if (error) throw new Error("Could not add this item.");
    await this.recomputeActualCost(workOrderId);
    return { id: data.id, workOrderId: data.work_order_id, itemType: data.item_type, description: data.description, quantity: Number(data.quantity), unitCost: Number(data.unit_cost), totalCost: Number(data.total_cost), createdAt: data.created_at };
  },

  async removeItem(itemId: string, workOrderId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_work_order_items").delete().eq("id", itemId);
    if (error) throw new Error("Could not remove this item.");
    await this.recomputeActualCost(workOrderId);
  },

  async recomputeActualCost(workOrderId: string): Promise<void> {
    const items = await this.listItems(workOrderId);
    const total = items.reduce((sum, i) => sum + i.totalCost, 0);
    const supabase = await createClient();
    await supabase.from("maintenance_work_orders").update({ actual_cost: total }).eq("id", workOrderId);
  },

  // ---- Accounting integration (section 15-16) — reuses the EXISTING
  // expense workflow against the '5090 Maintenance' account seeded in
  // STEP 23; never a parallel ledger. ----
  async logAsExpense(workOrderId: string, actorId: string, actorName: string): Promise<void> {
    const workOrder = await this.getById(workOrderId);
    if (!workOrder) throw new Error("Work order not found.");
    if (workOrder.expenseId) throw new Error("This work order has already been logged as an expense.");
    const amount = workOrder.actualCost ?? workOrder.approvedCost ?? workOrder.estimatedCost;
    if (amount == null || amount <= 0) throw new Error("Enter a cost before logging this work order as an expense.");

    const supabase = await createClient();
    const { data: account } = await supabase.from("accounts").select("id").eq("account_code", "5090").maybeSingle();
    if (!account) throw new Error("The Maintenance expense account could not be found.");

    const expense = await expenseService.create(
      { expenseDate: new Date().toISOString().slice(0, 10), accountId: account.id, description: `Work Order ${workOrder.workOrderNumber}: ${workOrder.description}`, amount, propertyId: workOrder.propertyId, vendor: workOrder.vendorName },
      actorId,
      actorName,
      true
    );
    const { error } = await supabase.from("maintenance_work_orders").update({ expense_id: expense.id }).eq("id", workOrderId);
    if (error) throw new Error("Could not link this expense to the work order.");
    await maintenanceAuditService.log({ entityType: "work_order", entityId: workOrderId, action: "Logged as expense", actorId, actorName, newValue: { expenseId: expense.id, amount } });
  },

  // ---- Before/During/After photos (section 8) ----
  async listPhotos(workOrderId: string): Promise<MaintenancePhoto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_photos").select("*, admin_profiles(name)").eq("entity_type", "WORK_ORDER").eq("entity_id", workOrderId).order("created_at", { ascending: true });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, photoType: row.photo_type, storagePath: row.storage_path, caption: row.caption ?? undefined, uploadedByName: row.admin_profiles?.name ?? undefined, uploadedByCustomer: false, createdAt: row.created_at }));
  },

  async uploadPhoto(workOrderId: string, photoType: PhotoType, dataUri: string, caption: string | undefined, actorId: string): Promise<MaintenancePhoto> {
    const parsed = parseUploadDataUri(dataUri);
    const path = buildStoragePath({ workOrderId }, randomUUID(), parsed.extension);
    await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_photos")
      .insert({ entity_type: "WORK_ORDER", entity_id: workOrderId, photo_type: photoType, storage_path: path, caption: caption || null, uploaded_by: actorId })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("maintenanceWorkOrderService.uploadPhoto failed:", error);
      throw new Error("Could not upload this photo.");
    }
    return { id: data.id, entityType: data.entity_type, entityId: data.entity_id, photoType: data.photo_type, storagePath: data.storage_path, caption: data.caption ?? undefined, uploadedByName: data.admin_profiles?.name ?? undefined, uploadedByCustomer: false, createdAt: data.created_at };
  },

  async getPhotoSignedUrl(photoId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_photos").select("storage_path").eq("id", photoId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this photo.");
    return createSignedDocumentUrl(data.storage_path);
  },

  // ---- Rental landlord approval (STEP 27, section 27) — admin decides
  // per work order whether landlord sign-off is required by moving this
  // gate to PENDING; the landlord may then only move PENDING ->
  // APPROVED/REJECTED (enforced again at the RLS layer). ----
  async requireLandlordApproval(workOrderId: string, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("maintenance_work_orders").update({ landlord_approval_status: "PENDING" }).eq("id", workOrderId);
    if (error) throw new Error("Could not request landlord approval for this work order.");
    await maintenanceAuditService.log({ entityType: "work_order", entityId: workOrderId, action: "Landlord approval requested", actorId, actorName });
  },

  async recordLandlordApproval(workOrderId: string, decision: "APPROVED" | "REJECTED", landlordCustomerId: string): Promise<void> {
    const supabase = await createClient();
    const { data: existing } = await supabase.from("maintenance_work_orders").select("landlord_approval_status").eq("id", workOrderId).maybeSingle();
    if (!existing || existing.landlord_approval_status !== "PENDING") throw new Error("This work order is not awaiting landlord approval.");
    const { error } = await supabase
      .from("maintenance_work_orders")
      .update({ landlord_approval_status: decision, landlord_approved_by: landlordCustomerId, landlord_approved_at: new Date().toISOString() })
      .eq("id", workOrderId);
    if (error) throw new Error("Could not record your decision.");
    await maintenanceAuditService.log({ entityType: "work_order", entityId: workOrderId, action: `Landlord ${decision === "APPROVED" ? "approved" : "rejected"}`, actorId: undefined });
  },
};
