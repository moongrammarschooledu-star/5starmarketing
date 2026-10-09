import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DesignData, HouseDesign } from "@/lib/house/types";

const SELECT = "*, construction_projects(project_number, project_name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): HouseDesign {
  const project = row.construction_projects;
  return {
    id: row.id,
    name: row.name,
    clientName: row.client_name ?? undefined,
    notes: row.notes ?? undefined,
    constructionProjectId: row.construction_project_id ?? undefined,
    constructionProjectName: project ? `${project.project_number} - ${project.project_name}` : undefined,
    data: row.data as DesignData,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface HouseDesignMeta {
  name: string;
  clientName?: string;
  notes?: string;
  constructionProjectId?: string;
}

export const houseDesignService = {
  async list(): Promise<HouseDesign[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("house_designs").select(SELECT).order("updated_at", { ascending: false });
    if (error) {
      console.error("houseDesignService.list failed:", error);
      throw new Error("Could not load the designs.");
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<HouseDesign | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("house_designs").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(meta: HouseDesignMeta, data: DesignData, createdBy?: string): Promise<HouseDesign> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("house_designs")
      .insert({
        name: meta.name,
        client_name: meta.clientName || null,
        notes: meta.notes || null,
        construction_project_id: meta.constructionProjectId || null,
        plot_width: data.plot.width,
        plot_length: data.plot.length,
        floors_count: data.floors.length,
        data,
        created_by: createdBy ?? null,
      })
      .select(SELECT)
      .single();
    if (error || !row) {
      console.error("houseDesignService.create failed:", error);
      throw new Error("Could not save this design. Please try again.");
    }
    return mapRow(row);
  },

  async update(id: string, meta: HouseDesignMeta, data: DesignData): Promise<HouseDesign | undefined> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("house_designs")
      .update({
        name: meta.name,
        client_name: meta.clientName || null,
        notes: meta.notes || null,
        construction_project_id: meta.constructionProjectId || null,
        plot_width: data.plot.width,
        plot_length: data.plot.length,
        floors_count: data.floors.length,
        data,
      })
      .eq("id", id)
      .select(SELECT)
      .maybeSingle();
    if (error) {
      console.error("houseDesignService.update failed:", error);
      throw new Error("Could not save this design. Please try again.");
    }
    return row ? mapRow(row) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("house_designs").delete().eq("id", id);
    if (error) {
      console.error("houseDesignService.remove failed:", error);
      throw new Error("Could not delete this design.");
    }
  },

  /** Construction projects the drawing can be linked to. */
  async listProjectOptions(): Promise<{ id: string; label: string }[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("construction_projects").select("id, project_number, project_name").order("created_at", { ascending: false }).limit(200);
    return (data ?? []).map((p: { id: string; project_number: string; project_name: string }) => ({ id: p.id, label: `${p.project_number} - ${p.project_name}` }));
  },
};
