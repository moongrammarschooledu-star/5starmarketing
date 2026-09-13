import "server-only";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { parseUploadDataUri, buildStoragePath, uploadDocumentFile, createSignedDocumentUrl } from "@/lib/documentStorage";
import type { ConstructionSiteReport, ConstructionSiteReportInput, ConstructionSiteMedia, SiteMediaType } from "@/lib/models/construction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReportRow(row: any): ConstructionSiteReport {
  return {
    id: row.id,
    reportNumber: row.report_number,
    projectId: row.project_id,
    reportDate: row.report_date,
    siteManagerName: row.admin_profiles?.name ?? undefined,
    weather: row.weather ?? undefined,
    workersPresent: row.workers_present ?? undefined,
    contractorsPresent: row.contractors_present ?? undefined,
    workCompleted: row.work_completed ?? undefined,
    workPlanned: row.work_planned ?? undefined,
    materialsReceived: row.materials_received ?? undefined,
    equipmentUsed: row.equipment_used ?? undefined,
    issues: row.issues ?? undefined,
    safetyIncidents: row.safety_incidents ?? undefined,
    delays: row.delays ?? undefined,
    visitors: row.visitors ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMediaRow(row: any): ConstructionSiteMedia {
  return {
    id: row.id,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    taskId: row.task_id ?? undefined,
    reportId: row.report_id ?? undefined,
    inspectionId: row.inspection_id ?? undefined,
    mediaType: row.media_type,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    customerVisible: !!row.customer_visible,
    uploadedByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
  };
}

export const constructionSiteReportService = {
  async list(projectId: string): Promise<ConstructionSiteReport[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_site_reports").select("*, admin_profiles(name)").eq("project_id", projectId).order("report_date", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapReportRow);
  },

  async getById(id: string): Promise<ConstructionSiteReport | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_site_reports").select("*, admin_profiles(name)").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapReportRow(data);
  },

  async create(projectId: string, input: ConstructionSiteReportInput, actorId: string): Promise<ConstructionSiteReport> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_site_reports")
      .insert({
        project_id: projectId,
        report_date: input.reportDate || new Date().toISOString().slice(0, 10),
        site_manager_id: actorId,
        weather: input.weather || null,
        workers_present: input.workersPresent ?? null,
        contractors_present: input.contractorsPresent || null,
        work_completed: input.workCompleted || null,
        work_planned: input.workPlanned || null,
        materials_received: input.materialsReceived || null,
        equipment_used: input.equipmentUsed || null,
        issues: input.issues || null,
        safety_incidents: input.safetyIncidents || null,
        delays: input.delays || null,
        visitors: input.visitors || null,
        notes: input.notes || null,
        created_by: actorId,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionSiteReportService.create failed:", error);
      throw new Error("Could not create this site report.");
    }
    return mapReportRow(data);
  },

  // ---- Media (section 29) — private storage, signed-URL access only ----
  async listMedia(projectId: string): Promise<ConstructionSiteMedia[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_site_media").select("*, admin_profiles(name)").eq("project_id", projectId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapMediaRow);
  },

  async uploadMedia(
    input: { projectId: string; phaseId?: string; taskId?: string; reportId?: string; inspectionId?: string; mediaType: SiteMediaType; dataUri: string; caption?: string; customerVisible?: boolean },
    actorId: string
  ): Promise<ConstructionSiteMedia> {
    const parsed = parseUploadDataUri(input.dataUri);
    const path = buildStoragePath({ constructionProjectId: input.projectId }, randomUUID(), parsed.extension);
    await uploadDocumentFile(path, parsed.bytes, parsed.mimeType);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_site_media")
      .insert({
        project_id: input.projectId,
        phase_id: input.phaseId || null,
        task_id: input.taskId || null,
        report_id: input.reportId || null,
        inspection_id: input.inspectionId || null,
        media_type: input.mediaType,
        storage_path: path,
        caption: input.caption || null,
        customer_visible: input.customerVisible ?? false,
        uploaded_by: actorId,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("constructionSiteReportService.uploadMedia failed:", error);
      throw new Error("Could not upload this file.");
    }
    return mapMediaRow(data);
  },

  async setCustomerVisible(mediaId: string, visible: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_site_media").update({ customer_visible: visible }).eq("id", mediaId);
    if (error) throw new Error("Could not update this media's visibility.");
  },

  async getMediaSignedUrl(mediaId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_site_media").select("storage_path").eq("id", mediaId).maybeSingle();
    if (error || !data) throw new Error("You are not authorized to view this file.");
    return createSignedDocumentUrl(data.storage_path);
  },

  async removeMedia(mediaId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_site_media").delete().eq("id", mediaId);
    if (error) throw new Error("Could not delete this file.");
  },
};
