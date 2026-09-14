import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supportAuditService } from "./supportAuditService";
import type { SupportDepartment, SupportDepartmentInput, SupportDepartmentStaffMember } from "@/lib/models/support";

const SELECT = "*, manager:admin_profiles!support_departments_manager_id_fkey(name), support_department_staff(count)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportDepartment {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    managerId: row.manager_id ?? undefined,
    managerName: row.manager?.name ?? undefined,
    active: !!row.active,
    staffCount: row.support_department_staff?.[0]?.count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supportDepartmentService = {
  async list(activeOnly = false): Promise<SupportDepartment[]> {
    const supabase = await createClient();
    let query = supabase.from("support_departments").select(SELECT).order("name", { ascending: true });
    if (activeOnly) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) {
      console.error("supportDepartmentService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<SupportDepartment | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_departments").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(input: SupportDepartmentInput, actorId: string): Promise<SupportDepartment> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_departments")
      .insert({ code: input.code.toUpperCase().replace(/\s+/g, "_"), name: input.name, description: input.description || null, manager_id: input.managerId || null })
      .select(SELECT)
      .single();
    if (error) {
      console.error("supportDepartmentService.create failed:", error);
      if (error.code === "23505") throw new Error("A department with this code already exists.");
      throw new Error("Could not create this department.");
    }
    const department = mapRow(data);
    await supportAuditService.log({ entityType: "support_department", entityId: department.id, action: "Created", actorId, newValue: { name: department.name } });
    return department;
  },

  async update(id: string, input: Partial<Omit<SupportDepartmentInput, "code">>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.managerId !== undefined) row.manager_id = input.managerId || null;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("support_departments").update(row).eq("id", id);
    if (error) throw new Error("Could not update this department.");
  },

  async listStaff(departmentId: string): Promise<SupportDepartmentStaffMember[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_department_staff").select("department_id, admin_id, admin_profiles(name)").eq("department_id", departmentId);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((row) => ({ departmentId: row.department_id, adminId: row.admin_id, adminName: row.admin_profiles?.name ?? undefined }));
  },

  async addStaff(departmentId: string, adminId: string, actorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("support_department_staff").insert({ department_id: departmentId, admin_id: adminId });
    if (error && error.code !== "23505") throw new Error("Could not add this staff member.");
    await supportAuditService.log({ entityType: "support_department", entityId: departmentId, action: "Staff added", actorId, newValue: { adminId } });
  },

  async removeStaff(departmentId: string, adminId: string, actorId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("support_department_staff").delete().eq("department_id", departmentId).eq("admin_id", adminId);
    if (error) throw new Error("Could not remove this staff member.");
    await supportAuditService.log({ entityType: "support_department", entityId: departmentId, action: "Staff removed", actorId, newValue: { adminId } });
  },

  /** Every department an admin belongs to — used to scope a staff
   *  member's own ticket queue in the UI. */
  async listForAdmin(adminId: string): Promise<SupportDepartment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_department_staff").select("support_departments(*)").eq("admin_id", adminId);
    if (error) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).filter((row) => row.support_departments).map((row) => mapRow(row.support_departments));
  },
};
