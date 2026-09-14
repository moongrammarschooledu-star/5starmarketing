import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupportCategory, SupportCategoryInput } from "@/lib/models/support";

const SELECT = "*, support_departments(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportCategory {
  return {
    code: row.code,
    label: row.label,
    defaultDepartmentId: row.default_department_id ?? undefined,
    defaultDepartmentName: row.support_departments?.name ?? undefined,
    active: !!row.active,
    sortOrder: row.sort_order,
  };
}

export const supportCategoryService = {
  async list(activeOnly = false): Promise<SupportCategory[]> {
    const supabase = await createClient();
    let query = supabase.from("support_categories").select(SELECT).order("sort_order", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("supportCategoryService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: SupportCategoryInput): Promise<SupportCategory> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_categories")
      .insert({
        code: input.code.toUpperCase().replace(/\s+/g, "_"),
        label: input.label,
        default_department_id: input.defaultDepartmentId || null,
        sort_order: input.sortOrder ?? 0,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("supportCategoryService.create failed:", error);
      if (error.code === "23505") throw new Error("A category with this code already exists.");
      throw new Error("Could not create this category.");
    }
    return mapRow(data);
  },

  async update(code: string, input: Partial<Omit<SupportCategoryInput, "code">>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.label !== undefined) row.label = input.label;
    if (input.defaultDepartmentId !== undefined) row.default_department_id = input.defaultDepartmentId || null;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("support_categories").update(row).eq("code", code);
    if (error) throw new Error("Could not update this category.");
  },
};
