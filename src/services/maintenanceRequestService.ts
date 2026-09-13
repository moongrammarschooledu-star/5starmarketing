import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import { maintenanceSlaService } from "./maintenanceSlaService";
import { staffNotificationService } from "./staffNotificationService";
import { notificationService } from "./notificationService";
import { communicationService } from "./communicationService";
import { parseUploadDataUri, buildStoragePath, uploadDocumentFile, createSignedDocumentUrl } from "@/lib/documentStorage";
import { MAINTENANCE_REQUEST_ALLOWED_TRANSITIONS } from "@/lib/models/maintenance";
import type { MaintenanceRequest, MaintenanceRequestInput, MaintenanceRequestStatus, MaintenanceComment, MaintenancePhoto, MaintenanceStatusHistoryEntry } from "@/lib/models/maintenance";
import type { NotificationType } from "@/lib/models/customer";

const SELECT = "*, properties(title), property_inventory(unit_number), admin_profiles!maintenance_requests_created_by_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceRequest {
  return {
    id: row.id,
    requestNumber: row.request_number,
    propertyId: row.property_id,
    propertyTitle: row.properties?.title ?? undefined,
    unitId: row.unit_id ?? undefined,
    unitNumber: row.property_inventory?.unit_number ?? undefined,
    customerId: row.customer_id ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    category: row.category,
    description: row.description,
    priority: row.priority,
    preferredVisitTime: row.preferred_visit_time ?? undefined,
    status: row.status,
    slaResponseDueAt: row.sla_response_due_at ?? undefined,
    slaResolutionDueAt: row.sla_resolution_due_at ?? undefined,
    firstResponseAt: row.first_response_at ?? undefined,
    slaResponseBreached: !!row.sla_response_breached,
    slaResolutionBreached: !!row.sla_resolution_breached,
    closedAt: row.closed_at ?? undefined,
    customerConfirmed: !!row.customer_confirmed,
    customerConfirmedAt: row.customer_confirmed_at ?? undefined,
    customerFeedback: row.customer_feedback ?? undefined,
    customerRating: row.customer_rating ?? undefined,
    reportedUnresolved: !!row.reported_unresolved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachCustomerName(request: MaintenanceRequest): Promise<MaintenanceRequest> {
  if (!request.customerId) return request;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name").eq("id", request.customerId).maybeSingle();
  return data ? { ...request, customerName: data.full_name ?? undefined } : request;
}

function assertTransition(from: MaintenanceRequestStatus, to: MaintenanceRequestStatus) {
  if (!MAINTENANCE_REQUEST_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a maintenance request from ${from} to ${to}.`);
  }
}

/** Best-effort — notifies every active manager-tier admin, mirroring
 *  automationService.notifyManagers() exactly (same established pattern
 *  for "no single assignee yet" events). */
async function notifyManagementTeam(title: string, message: string, requestId: string) {
  try {
    const supabase = await createClient();
    const { data: managers } = await supabase.from("admin_profiles").select("id").in("role", ["super_admin", "admin", "sales_manager"]).eq("status", "Active");
    for (const m of managers ?? []) {
      await staffNotificationService.notify(m.id, "maintenance_request_new", title, message, "maintenance_request", requestId);
    }
  } catch (e) {
    console.error("maintenanceRequestService.notifyManagementTeam failed:", e);
  }
}

/** Best-effort — in-portal notification always; WhatsApp/email dispatch
 *  reuses the existing Communication Center (consent/business-hours/
 *  rate-limits already enforced inside composeAndSend), never a new
 *  provider integration. */
async function notifyCustomer(customerId: string, type: NotificationType, title: string, message: string, requestId: string) {
  try {
    await notificationService.notify(customerId, type, title, message, "maintenance_request", requestId);
    const conversation = await communicationService.findOrCreateForCustomer(customerId, "WHATSAPP");
    await communicationService.composeAndSend({ conversationId: conversation.id, channel: "WHATSAPP", direction: "OUTBOUND", body: message }, { name: "System" });
  } catch (e) {
    console.error("maintenanceRequestService.notifyCustomer failed:", e);
  }
}

async function logStatusChange(requestId: string, fromStatus: string | undefined, toStatus: string, changedBy?: string, changedByCustomer?: string, reason?: string) {
  try {
    const supabase = await createClient();
    await supabase.from("maintenance_status_history").insert({ entity_type: "REQUEST", entity_id: requestId, from_status: fromStatus || null, to_status: toStatus, changed_by: changedBy || null, changed_by_customer: changedByCustomer || null, reason: reason || null });
  } catch (e) {
    console.error("maintenanceRequestService.logStatusChange failed:", e);
  }
}

export const maintenanceRequestService = {
  async list(filters?: { propertyId?: string; status?: MaintenanceRequestStatus; priority?: string; q?: string }): Promise<MaintenanceRequest[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_requests").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priority) query = query.eq("priority", filters.priority);
    if (filters?.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`request_number.ilike.%${q}%,description.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("maintenanceRequestService.list failed:", error);
      return [];
    }
    return Promise.all((data ?? []).map((row) => attachCustomerName(mapRow(row))));
  },

  async getById(id: string): Promise<MaintenanceRequest | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_requests").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return attachCustomerName(mapRow(data));
  },

  async listForCustomer(customerId: string): Promise<MaintenanceRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_requests").select(SELECT).eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async listByProperty(propertyId: string): Promise<MaintenanceRequest[]> {
    return this.list({ propertyId });
  },

  /** Creates a request and computes real SLA due-by timestamps from the
   *  admin-configured maintenance_sla_settings (never a hardcoded
   *  promise — section 26). */
  async create(input: MaintenanceRequestInput, owner: { customerId?: string; adminId?: string }): Promise<MaintenanceRequest> {
    const priority = input.priority ?? "NORMAL";
    const sla = await maintenanceSlaService.getFor(priority);
    const now = Date.now();
    const slaResponseDueAt = sla ? new Date(now + sla.responseMinutes * 60000).toISOString() : null;
    const slaResolutionDueAt = sla ? new Date(now + sla.resolutionMinutes * 60000).toISOString() : null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_requests")
      .insert({
        property_id: input.propertyId,
        unit_id: input.unitId || null,
        customer_id: owner.customerId || null,
        created_by: owner.adminId || null,
        category: input.category,
        description: input.description,
        priority,
        preferred_visit_time: input.preferredVisitTime || null,
        sla_response_due_at: slaResponseDueAt,
        sla_resolution_due_at: slaResolutionDueAt,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("maintenanceRequestService.create failed:", error);
      throw new Error("Could not create this maintenance request.");
    }

    const request = mapRow(data);
    await logStatusChange(request.id, undefined, "NEW", owner.adminId, owner.customerId);
    await maintenanceAuditService.log({ entityType: "maintenance_request", entityId: request.id, action: "Created", actorId: owner.adminId, newValue: { category: request.category, priority: request.priority } });
    await notifyManagementTeam("New maintenance request", `${request.requestNumber} — ${request.category} (${request.priority})`, request.id);
    if (owner.customerId) {
      await notifyCustomer(owner.customerId, "maintenance_request_received", "Maintenance request received", `We've received your request ${request.requestNumber} and will be in touch shortly.`, request.id);
    }
    return request;
  },

  async updateStatus(id: string, newStatus: MaintenanceRequestStatus, actor: { adminId?: string; name: string }, reason?: string): Promise<MaintenanceRequest> {
    const request = await this.getById(id);
    if (!request) throw new Error("Maintenance request not found.");
    assertTransition(request.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "ACKNOWLEDGED" && !request.firstResponseAt) {
      extra.first_response_at = new Date().toISOString();
      if (request.slaResponseDueAt && new Date() > new Date(request.slaResponseDueAt)) extra.sla_response_breached = true;
    }
    if (newStatus === "CLOSED") extra.closed_at = new Date().toISOString();

    const { data, error } = await supabase.from("maintenance_requests").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this request's status.");
    const updated = mapRow(data);

    await logStatusChange(id, request.status, newStatus, actor.adminId, undefined, reason);
    await maintenanceAuditService.log({ entityType: "maintenance_request", entityId: id, action: `Status changed to ${newStatus}`, actorId: actor.adminId, actorName: actor.name, oldValue: { status: request.status } });

    if (request.customerId) {
      if (newStatus === "SCHEDULED") await notifyCustomer(request.customerId, "maintenance_visit_scheduled", "Visit scheduled", `A visit for your request ${request.requestNumber} has been scheduled.`, id);
      else if (newStatus === "IN_PROGRESS") await notifyCustomer(request.customerId, "maintenance_work_started", "Work started", `Work has started on your request ${request.requestNumber}.`, id);
      else if (newStatus === "COMPLETED") await notifyCustomer(request.customerId, "maintenance_work_completed", "Work completed", `Work on your request ${request.requestNumber} has been marked complete. Please confirm in your portal.`, id);
      else if (newStatus === "CLOSED") await notifyCustomer(request.customerId, "maintenance_request_closed", "Request closed", `Your request ${request.requestNumber} has been closed.`, id);
    }
    return updated;
  },

  /** Customer completion confirmation (section 25). Confirms OR reports
   *  unresolved (reopens to VERIFICATION_REQUIRED) — never both. */
  async customerRespond(id: string, customerId: string, input: { confirmed: boolean; feedback?: string; rating?: number }): Promise<MaintenanceRequest> {
    const request = await this.getById(id);
    if (!request || request.customerId !== customerId) throw new Error("Request not found.");
    if (request.status !== "COMPLETED" && request.status !== "CLOSED") throw new Error("This request has not been marked completed yet.");

    const supabase = await createClient();
    const row: Record<string, unknown> = { customer_feedback: input.feedback || null, customer_rating: input.rating ?? null };
    if (input.confirmed) {
      row.customer_confirmed = true;
      row.customer_confirmed_at = new Date().toISOString();
      row.reported_unresolved = false;
      row.status = "CLOSED";
      row.closed_at = new Date().toISOString();
    } else {
      row.reported_unresolved = true;
      row.status = "VERIFICATION_REQUIRED";
    }
    const { data, error } = await supabase.from("maintenance_requests").update(row).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not record your response.");
    await logStatusChange(id, request.status, row.status as string, undefined, customerId, input.confirmed ? "Customer confirmed completion" : "Customer reported unresolved");
    if (!input.confirmed) {
      await notifyManagementTeam("Maintenance request reopened", `${request.requestNumber} was reported unresolved by the customer.`, id);
    }
    return mapRow(data);
  },

  // ---- Comments (section 40) ----
  async listComments(requestId: string, includeInternal: boolean): Promise<MaintenanceComment[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_comments").select("*").eq("entity_type", "REQUEST").eq("entity_id", requestId).order("created_at", { ascending: true });
    if (!includeInternal) query = query.eq("internal_only", false);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map((row) => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, authorName: row.author_name, body: row.body, internalOnly: !!row.internal_only, createdAt: row.created_at }));
  },

  async addComment(requestId: string, body: string, author: { adminId?: string; customerId?: string; name: string }, internalOnly = false): Promise<MaintenanceComment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_comments")
      .insert({ entity_type: "REQUEST", entity_id: requestId, author_id: author.adminId || null, author_customer_id: author.customerId || null, author_name: author.name, body, internal_only: internalOnly })
      .select("*")
      .single();
    if (error) throw new Error("Could not add this comment.");
    return { id: data.id, entityType: data.entity_type, entityId: data.entity_id, authorName: data.author_name, body: data.body, internalOnly: !!data.internal_only, createdAt: data.created_at };
  },

  // ---- Photos (section 9) ----
  async listPhotos(requestId: string): Promise<MaintenancePhoto[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_photos").select("*, admin_profiles(name)").eq("entity_type", "REQUEST").eq("entity_id", requestId).order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      photoType: row.photo_type,
      storagePath: row.storage_path,
      caption: row.caption ?? undefined,
      uploadedByName: row.admin_profiles?.name ?? undefined,
      uploadedByCustomer: !!row.uploaded_by_customer,
      createdAt: row.created_at,
    }));
  },

  async uploadPhoto(requestId: string, dataUri: string, caption: string | undefined, uploader: { adminId?: string; customerId?: string }): Promise<MaintenancePhoto> {
    const parsed = parseUploadDataUri(dataUri);
    const path = buildStoragePath({ customerId: uploader.customerId, maintenanceRequestId: requestId }, randomUUID(), parsed.extension);
    await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_photos")
      .insert({ entity_type: "REQUEST", entity_id: requestId, photo_type: "GENERAL", storage_path: path, caption: caption || null, uploaded_by: uploader.adminId || null, uploaded_by_customer: !!uploader.customerId })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("maintenanceRequestService.uploadPhoto failed:", error);
      throw new Error("Could not upload this photo.");
    }
    return {
      id: data.id,
      entityType: data.entity_type,
      entityId: data.entity_id,
      photoType: data.photo_type,
      storagePath: data.storage_path,
      caption: data.caption ?? undefined,
      uploadedByName: data.admin_profiles?.name ?? undefined,
      uploadedByCustomer: !!data.uploaded_by_customer,
      createdAt: data.created_at,
    };
  },

  async getPhotoSignedUrl(photoId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_photos").select("storage_path").eq("id", photoId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this photo.");
    return createSignedDocumentUrl(data.storage_path);
  },

  async listStatusHistory(requestId: string): Promise<MaintenanceStatusHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_status_history").select("*, admin_profiles(name)").eq("entity_type", "REQUEST").eq("entity_id", requestId).order("created_at", { ascending: false });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({ id: row.id, entityType: row.entity_type, entityId: row.entity_id, fromStatus: row.from_status ?? undefined, toStatus: row.to_status, changedByName: row.admin_profiles?.name ?? undefined, reason: row.reason ?? undefined, createdAt: row.created_at }));
  },

  /** Opportunistic SLA sweep (section 26) — same "no background job
   *  runner" pattern as followUpService.markOverdue/investmentAlertService.
   *  Flags (never silently hides) a breach; never auto-escalates further. */
  async checkSlaBreaches(): Promise<number> {
    const supabase = await createClient();
    const nowIso = new Date().toISOString();
    const { data: responseBreaches } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("sla_response_breached", false)
      .is("first_response_at", null)
      .not("sla_response_due_at", "is", null)
      .lt("sla_response_due_at", nowIso)
      .in("status", ["NEW"]);
    const { data: resolutionBreaches } = await supabase
      .from("maintenance_requests")
      .select("id")
      .eq("sla_resolution_breached", false)
      .not("sla_resolution_due_at", "is", null)
      .lt("sla_resolution_due_at", nowIso)
      .not("status", "in", "(COMPLETED,CLOSED,REJECTED,CANCELLED)");

    const ids = [...(responseBreaches ?? []).map((r) => r.id), ...(resolutionBreaches ?? []).map((r) => r.id)];
    if ((responseBreaches?.length ?? 0) > 0) await supabase.from("maintenance_requests").update({ sla_response_breached: true }).in("id", (responseBreaches ?? []).map((r) => r.id));
    if ((resolutionBreaches?.length ?? 0) > 0) await supabase.from("maintenance_requests").update({ sla_resolution_breached: true }).in("id", (resolutionBreaches ?? []).map((r) => r.id));
    return new Set(ids).size;
  },
};
