import "server-only";
import { createClient } from "@/lib/supabase/server";
import { maintenanceAuditService } from "./maintenanceAuditService";
import type { MaintenanceAsset, MaintenanceAssetInput, AssetWarranty, AssetWarrantyInput, AssetServiceHistoryEntry, AssetStatus } from "@/lib/models/maintenance";

const SELECT = "*, properties(title), projects(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MaintenanceAsset {
  return {
    id: row.id,
    assetNumber: row.asset_number,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    location: row.location ?? undefined,
    category: row.category,
    manufacturer: row.manufacturer ?? undefined,
    model: row.model ?? undefined,
    serialNumber: row.serial_number ?? undefined,
    purchaseDate: row.purchase_date ?? undefined,
    warrantyExpiry: row.warranty_expiry ?? undefined,
    installationDate: row.installation_date ?? undefined,
    condition: row.condition,
    status: row.status,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWarrantyRow(row: any): AssetWarranty {
  return {
    id: row.id,
    assetId: row.asset_id,
    provider: row.provider ?? undefined,
    startDate: row.start_date ?? undefined,
    expiryDate: row.expiry_date,
    coverageDescription: row.coverage_description ?? undefined,
    documentId: row.document_id ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    active: !!row.active,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHistoryRow(row: any): AssetServiceHistoryEntry {
  return {
    id: row.id,
    assetId: row.asset_id,
    eventType: row.event_type,
    eventDate: row.event_date,
    description: row.description ?? undefined,
    cost: row.cost != null ? Number(row.cost) : undefined,
    vendorId: row.vendor_id ?? undefined,
    vendorName: row.maintenance_vendors?.business_name ?? undefined,
    workOrderId: row.work_order_id ?? undefined,
    workOrderNumber: row.maintenance_work_orders?.work_order_number ?? undefined,
    createdAt: row.created_at,
  };
}

export const maintenanceAssetService = {
  async list(filters?: { propertyId?: string; projectId?: string; status?: AssetStatus }): Promise<MaintenanceAsset[]> {
    const supabase = await createClient();
    let query = supabase.from("maintenance_assets").select(SELECT).order("created_at", { ascending: false });
    if (filters?.propertyId) query = query.eq("property_id", filters.propertyId);
    if (filters?.projectId) query = query.eq("project_id", filters.projectId);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.error("maintenanceAssetService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<MaintenanceAsset | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("maintenance_assets").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: MaintenanceAssetInput, actorId: string, actorName: string): Promise<MaintenanceAsset> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("maintenance_assets")
      .insert({
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        location: input.location || null,
        category: input.category,
        manufacturer: input.manufacturer || null,
        model: input.model || null,
        serial_number: input.serialNumber || null,
        purchase_date: input.purchaseDate || null,
        warranty_expiry: input.warrantyExpiry || null,
        installation_date: input.installationDate || null,
        condition: input.condition ?? "GOOD",
        status: input.status ?? "ACTIVE",
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("maintenanceAssetService.create failed:", error);
      throw new Error("Could not create this asset.");
    }
    const asset = mapRow(data);
    await maintenanceAuditService.log({ entityType: "asset", entityId: asset.id, action: "Created", actorId, actorName, newValue: { category: asset.category } });
    await this.logHistory(asset.id, { eventType: "INSTALLATION", eventDate: input.installationDate || new Date().toISOString().slice(0, 10), description: "Asset added to system." }, actorId);
    return asset;
  },

  async update(id: string, input: Partial<MaintenanceAssetInput>, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.propertyId !== undefined) row.property_id = input.propertyId || null;
    if (input.projectId !== undefined) row.project_id = input.projectId || null;
    if (input.location !== undefined) row.location = input.location || null;
    if (input.category !== undefined) row.category = input.category;
    if (input.manufacturer !== undefined) row.manufacturer = input.manufacturer || null;
    if (input.model !== undefined) row.model = input.model || null;
    if (input.serialNumber !== undefined) row.serial_number = input.serialNumber || null;
    if (input.purchaseDate !== undefined) row.purchase_date = input.purchaseDate || null;
    if (input.warrantyExpiry !== undefined) row.warranty_expiry = input.warrantyExpiry || null;
    if (input.installationDate !== undefined) row.installation_date = input.installationDate || null;
    if (input.condition !== undefined) row.condition = input.condition;
    if (input.status !== undefined) row.status = input.status;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("maintenance_assets").update(row).eq("id", id);
    if (error) throw new Error("Could not update this asset.");
    await maintenanceAuditService.log({ entityType: "asset", entityId: id, action: "Updated", actorId, actorName, newValue: input });
  },

  // ---- Warranties (section 21) ----
  async listWarranties(assetId: string): Promise<AssetWarranty[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("asset_warranties").select("*").eq("asset_id", assetId).order("expiry_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapWarrantyRow);
  },

  async addWarranty(assetId: string, input: AssetWarrantyInput, actorId: string): Promise<AssetWarranty> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("asset_warranties")
      .insert({
        asset_id: assetId,
        provider: input.provider || null,
        start_date: input.startDate || null,
        expiry_date: input.expiryDate,
        coverage_description: input.coverageDescription || null,
        contact_name: input.contactName || null,
        contact_phone: input.contactPhone || null,
        contact_email: input.contactEmail || null,
        created_by: actorId,
      })
      .select("*")
      .single();
    if (error) {
      console.error("maintenanceAssetService.addWarranty failed:", error);
      throw new Error("Could not add this warranty.");
    }
    await this.logHistory(assetId, { eventType: "WARRANTY_EVENT", eventDate: new Date().toISOString().slice(0, 10), description: `Warranty added (${input.provider ?? "provider not specified"}), expires ${input.expiryDate}.` }, actorId);
    return mapWarrantyRow(data);
  },

  /** Real, admin-configured lead time (never hardcoded) — used by the
   *  dashboard/notification sweep (section 21). */
  async listExpiringWarranties(daysAhead: number): Promise<(AssetWarranty & { assetNumber: string; assetCategory: string; propertyTitle?: string })[]> {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("asset_warranties")
      .select("*, maintenance_assets(asset_number, category, properties(title))")
      .eq("active", true)
      .gte("expiry_date", new Date().toISOString().slice(0, 10))
      .lte("expiry_date", cutoff)
      .order("expiry_date", { ascending: true });
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      ...mapWarrantyRow(row),
      assetNumber: row.maintenance_assets?.asset_number ?? "",
      assetCategory: row.maintenance_assets?.category ?? "",
      propertyTitle: row.maintenance_assets?.properties?.title ?? undefined,
    }));
  },

  // ---- Service history (section 20) — real events only ----
  async listHistory(assetId: string): Promise<AssetServiceHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("asset_service_history")
      .select("*, maintenance_vendors(business_name), maintenance_work_orders(work_order_number)")
      .eq("asset_id", assetId)
      .order("event_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapHistoryRow);
  },

  async logHistory(
    assetId: string,
    entry: { eventType: AssetServiceHistoryEntry["eventType"]; eventDate: string; description?: string; cost?: number; vendorId?: string; workOrderId?: string },
    actorId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("asset_service_history").insert({
        asset_id: assetId,
        event_type: entry.eventType,
        event_date: entry.eventDate,
        description: entry.description || null,
        cost: entry.cost ?? null,
        vendor_id: entry.vendorId || null,
        work_order_id: entry.workOrderId || null,
        created_by: actorId || null,
      });
    } catch (e) {
      console.error("maintenanceAssetService.logHistory failed:", e);
    }
  },
};
