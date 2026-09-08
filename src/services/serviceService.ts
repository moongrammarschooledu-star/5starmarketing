import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Service, ServiceInput } from "@/lib/models/service";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToService(row: any): Service {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    icon: row.icon ?? "Home",
    enabled: row.enabled,
    order: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceToRow(input: Partial<ServiceInput>) {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.icon !== undefined) row.icon = input.icon;
  if (input.enabled !== undefined) row.enabled = input.enabled;
  if (input.order !== undefined) row.sort_order = input.order;
  return row;
}

export const serviceService = {
  async list(): Promise<Service[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("services").select("*").order("sort_order");
    if (error) {
      console.error("serviceService.list failed:", error);
      throw new Error("Could not load services.");
    }
    return (data ?? []).map(mapRowToService);
  },

  async listEnabled(): Promise<Service[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("enabled", true)
      .order("sort_order");
    if (error) {
      console.error("serviceService.listEnabled failed:", error);
      throw new Error("Could not load services.");
    }
    return (data ?? []).map(mapRowToService);
  },

  async getById(id: string): Promise<Service | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("services").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("serviceService.getById failed:", error);
      throw new Error("Could not load this service.");
    }
    return data ? mapRowToService(data) : undefined;
  },

  async create(input: ServiceInput): Promise<Service> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .insert(mapServiceToRow(input))
      .select("*")
      .single();
    if (error) {
      console.error("serviceService.create failed:", error);
      throw new Error("Could not create this service.");
    }
    return mapRowToService(data);
  },

  async update(id: string, input: Partial<ServiceInput>): Promise<Service | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .update(mapServiceToRow(input))
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("serviceService.update failed:", error);
      throw new Error("Could not update this service.");
    }
    return data ? mapRowToService(data) : undefined;
  },

  async remove(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) {
      console.error("serviceService.remove failed:", error);
      throw new Error("Could not delete this service.");
    }
    return true;
  },
};
