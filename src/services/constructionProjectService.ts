import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { CONSTRUCTION_PROJECT_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionProject, ConstructionProjectInput, ConstructionProjectStatus } from "@/lib/models/construction";

const SELECT =
  "*, projects(name), properties(title), deals(deal_number), pm:admin_profiles!construction_projects_project_manager_id_fkey(name), sm:admin_profiles!construction_projects_site_manager_id_fkey(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionProject {
  return {
    id: row.id,
    projectNumber: row.project_number,
    projectName: row.project_name,
    referenceProjectId: row.reference_project_id ?? undefined,
    referenceProjectName: row.projects?.name ?? undefined,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    customerId: row.customer_id ?? undefined,
    dealId: row.deal_id ?? undefined,
    dealNumber: row.deals?.deal_number ?? undefined,
    location: row.location ?? undefined,
    projectType: row.project_type,
    description: row.description ?? undefined,
    startDate: row.start_date ?? undefined,
    plannedCompletionDate: row.planned_completion_date ?? undefined,
    actualCompletionDate: row.actual_completion_date ?? undefined,
    status: row.status,
    projectManagerId: row.project_manager_id ?? undefined,
    projectManagerName: row.pm?.name ?? undefined,
    siteManagerId: row.site_manager_id ?? undefined,
    siteManagerName: row.sm?.name ?? undefined,
    approvedBudget: row.approved_budget != null ? Number(row.approved_budget) : undefined,
    contractValue: row.contract_value != null ? Number(row.contract_value) : undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function attachCustomerName(project: ConstructionProject): Promise<ConstructionProject> {
  if (!project.customerId) return project;
  const supabase = await createClient();
  const { data } = await supabase.from("customer_profiles").select("full_name").eq("id", project.customerId).maybeSingle();
  return data ? { ...project, customerName: data.full_name ?? undefined } : project;
}

function assertTransition(from: ConstructionProjectStatus, to: ConstructionProjectStatus) {
  if (!CONSTRUCTION_PROJECT_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a construction project from ${from} to ${to}.`);
  }
}

export const constructionProjectService = {
  async list(filters?: { status?: ConstructionProjectStatus; q?: string }): Promise<ConstructionProject[]> {
    const supabase = await createClient();
    let query = supabase.from("construction_projects").select(SELECT).order("created_at", { ascending: false });
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.q) {
      const q = filters.q.replace(/[%_]/g, "\\$&");
      query = query.or(`project_number.ilike.%${q}%,project_name.ilike.%${q}%`);
    }
    const { data, error } = await query;
    if (error) {
      console.error("constructionProjectService.list failed:", error);
      return [];
    }
    return Promise.all((data ?? []).map((row) => attachCustomerName(mapRow(row))));
  },

  async getById(id: string): Promise<ConstructionProject | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_projects").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return attachCustomerName(mapRow(data));
  },

  async listForCustomer(customerId: string): Promise<ConstructionProject[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_projects").select(SELECT).eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(input: ConstructionProjectInput, actorId: string, actorName: string): Promise<ConstructionProject> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_projects")
      .insert({
        project_name: input.projectName,
        reference_project_id: input.referenceProjectId || null,
        property_id: input.propertyId || null,
        customer_id: input.customerId || null,
        deal_id: input.dealId || null,
        location: input.location || null,
        project_type: input.projectType,
        description: input.description || null,
        start_date: input.startDate || null,
        planned_completion_date: input.plannedCompletionDate || null,
        project_manager_id: input.projectManagerId || null,
        site_manager_id: input.siteManagerId || null,
        approved_budget: input.approvedBudget ?? null,
        contract_value: input.contractValue ?? null,
        notes: input.notes || null,
        created_by: actorId,
        updated_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionProjectService.create failed:", error);
      throw new Error("Could not create this construction project.");
    }
    const project = mapRow(data);
    await constructionAuditService.log({ entityType: "project", entityId: project.id, action: "Created", actorId, actorName, newValue: { projectName: project.projectName, projectType: project.projectType } });
    return project;
  },

  async update(id: string, input: Partial<ConstructionProjectInput>, actorId: string, actorName: string): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = { updated_by: actorId };
    if (input.projectName !== undefined) row.project_name = input.projectName;
    if (input.referenceProjectId !== undefined) row.reference_project_id = input.referenceProjectId || null;
    if (input.propertyId !== undefined) row.property_id = input.propertyId || null;
    if (input.customerId !== undefined) row.customer_id = input.customerId || null;
    if (input.dealId !== undefined) row.deal_id = input.dealId || null;
    if (input.location !== undefined) row.location = input.location || null;
    if (input.projectType !== undefined) row.project_type = input.projectType;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.startDate !== undefined) row.start_date = input.startDate || null;
    if (input.plannedCompletionDate !== undefined) row.planned_completion_date = input.plannedCompletionDate || null;
    if (input.projectManagerId !== undefined) row.project_manager_id = input.projectManagerId || null;
    if (input.siteManagerId !== undefined) row.site_manager_id = input.siteManagerId || null;
    if (input.approvedBudget !== undefined) row.approved_budget = input.approvedBudget;
    if (input.contractValue !== undefined) row.contract_value = input.contractValue;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("construction_projects").update(row).eq("id", id);
    if (error) throw new Error("Could not update this construction project.");
    await constructionAuditService.log({ entityType: "project", entityId: id, action: "Updated", actorId, actorName, newValue: input });
  },

  async updateStatus(id: string, newStatus: ConstructionProjectStatus, actorId: string, actorName: string): Promise<ConstructionProject> {
    const project = await this.getById(id);
    if (!project) throw new Error("Construction project not found.");
    assertTransition(project.status, newStatus);

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus, updated_by: actorId };
    if (newStatus === "COMPLETED") extra.actual_completion_date = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.from("construction_projects").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this project's status.");
    await constructionAuditService.log({ entityType: "project", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: project.status } });
    return attachCustomerName(mapRow(data));
  },
};
