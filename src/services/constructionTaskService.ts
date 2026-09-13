import "server-only";
import { createClient } from "@/lib/supabase/server";
import { constructionAuditService } from "./constructionAuditService";
import { TASK_ALLOWED_TRANSITIONS } from "@/lib/models/construction";
import type { ConstructionTask, ConstructionTaskInput, TaskStatus } from "@/lib/models/construction";

const SELECT = "*, construction_phases(name), admin_profiles(name), construction_contractors(vendor_id, maintenance_vendors(business_name)), construction_task_dependencies!construction_task_dependencies_task_id_fkey(depends_on_task_id)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ConstructionTask {
  return {
    id: row.id,
    taskNumber: row.task_number,
    projectId: row.project_id,
    phaseId: row.phase_id ?? undefined,
    phaseName: row.construction_phases?.name ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    assignedUserId: row.assigned_user_id ?? undefined,
    assignedUserName: row.admin_profiles?.name ?? undefined,
    contractorId: row.contractor_id ?? undefined,
    contractorName: row.construction_contractors?.maintenance_vendors?.business_name ?? undefined,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    completionDate: row.completion_date ?? undefined,
    priority: row.priority,
    status: row.status,
    progress: Number(row.progress),
    notes: row.notes ?? undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dependsOnTaskIds: Array.isArray(row.construction_task_dependencies) ? row.construction_task_dependencies.map((d: any) => d.depends_on_task_id) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertTransition(from: TaskStatus, to: TaskStatus) {
  if (!TASK_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Cannot move a task from ${from} to ${to}.`);
  }
}

/** Section 10 — prevents a new dependency edge from creating a cycle,
 *  via reachability search over the existing edges. */
async function wouldCreateCycle(taskId: string, dependsOnTaskId: string): Promise<boolean> {
  if (taskId === dependsOnTaskId) return true;
  const supabase = await createClient();
  const { data } = await supabase.from("construction_task_dependencies").select("task_id, depends_on_task_id");
  const edges = data ?? [];
  // Walking forward from dependsOnTaskId: if we ever reach taskId, adding
  // (taskId -> dependsOnTaskId) would close a cycle.
  const visited = new Set<string>();
  const stack = [dependsOnTaskId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.task_id === current) stack.push(edge.depends_on_task_id);
    }
  }
  return false;
}

export const constructionTaskService = {
  async list(projectId: string, filters?: { phaseId?: string; status?: TaskStatus; assignedUserId?: string }): Promise<ConstructionTask[]> {
    const supabase = await createClient();
    let query = supabase.from("construction_tasks").select(SELECT).eq("project_id", projectId).order("created_at", { ascending: false });
    if (filters?.phaseId) query = query.eq("phase_id", filters.phaseId);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.assignedUserId) query = query.eq("assigned_user_id", filters.assignedUserId);
    const { data, error } = await query;
    if (error) {
      console.error("constructionTaskService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<ConstructionTask | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("construction_tasks").select(SELECT).eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  async create(projectId: string, input: ConstructionTaskInput, actorId: string): Promise<ConstructionTask> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("construction_tasks")
      .insert({
        project_id: projectId,
        phase_id: input.phaseId || null,
        title: input.title,
        description: input.description || null,
        assigned_user_id: input.assignedUserId || null,
        contractor_id: input.contractorId || null,
        start_date: input.startDate || null,
        due_date: input.dueDate || null,
        priority: input.priority ?? "NORMAL",
        notes: input.notes || null,
        created_by: actorId,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("constructionTaskService.create failed:", error);
      throw new Error("Could not create this task.");
    }
    const task = mapRow(data);

    if (input.dependsOnTaskIds && input.dependsOnTaskIds.length > 0) {
      for (const dependsOnId of input.dependsOnTaskIds) {
        if (await wouldCreateCycle(task.id, dependsOnId)) {
          throw new Error("This dependency would create a circular reference and was not added.");
        }
      }
      await supabase.from("construction_task_dependencies").insert(input.dependsOnTaskIds.map((dependsOnId) => ({ task_id: task.id, depends_on_task_id: dependsOnId })));
    }
    await constructionAuditService.log({ entityType: "task", entityId: task.id, action: "Created", actorId, newValue: { title: task.title } });
    return task;
  },

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    if (await wouldCreateCycle(taskId, dependsOnTaskId)) {
      throw new Error("This dependency would create a circular reference.");
    }
    const supabase = await createClient();
    const { error } = await supabase.from("construction_task_dependencies").insert({ task_id: taskId, depends_on_task_id: dependsOnTaskId });
    if (error) {
      if (error.code === "23505") throw new Error("This dependency already exists.");
      throw new Error("Could not add this dependency.");
    }
  },

  async removeDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_task_dependencies").delete().eq("task_id", taskId).eq("depends_on_task_id", dependsOnTaskId);
    if (error) throw new Error("Could not remove this dependency.");
  },

  /** A task with an incomplete dependency is BLOCKED — never allowed to
   *  progress past TODO/BLOCKED (section 10's "display blocked tasks"). */
  async isBlocked(taskId: string): Promise<boolean> {
    const supabase = await createClient();
    const { data: deps } = await supabase.from("construction_task_dependencies").select("depends_on_task_id").eq("task_id", taskId);
    if (!deps || deps.length === 0) return false;
    const { data: blockingTasks } = await supabase
      .from("construction_tasks")
      .select("id, status")
      .in(
        "id",
        deps.map((d) => d.depends_on_task_id)
      );
    return (blockingTasks ?? []).some((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
  },

  async updateStatus(id: string, newStatus: TaskStatus, actorId: string, actorName: string): Promise<ConstructionTask> {
    const task = await this.getById(id);
    if (!task) throw new Error("Task not found.");
    assertTransition(task.status, newStatus);
    if (newStatus === "IN_PROGRESS" && (await this.isBlocked(id))) {
      throw new Error("This task is blocked by an incomplete dependency.");
    }

    const supabase = await createClient();
    const extra: Record<string, unknown> = { status: newStatus };
    if (newStatus === "COMPLETED") {
      extra.completion_date = new Date().toISOString().slice(0, 10);
      extra.progress = 100;
    }
    const { data, error } = await supabase.from("construction_tasks").update(extra).eq("id", id).select(SELECT).maybeSingle();
    if (error || !data) throw new Error("Could not update this task's status.");
    await constructionAuditService.log({ entityType: "task", entityId: id, action: `Status changed to ${newStatus}`, actorId, actorName, oldValue: { status: task.status } });
    return mapRow(data);
  },

  async updateProgress(id: string, progress: number): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("construction_tasks").update({ progress: Math.max(0, Math.min(100, progress)) }).eq("id", id);
    if (error) throw new Error("Could not update this task's progress.");
  },

  async update(id: string, input: Partial<ConstructionTaskInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.phaseId !== undefined) row.phase_id = input.phaseId || null;
    if (input.title !== undefined) row.title = input.title;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.assignedUserId !== undefined) row.assigned_user_id = input.assignedUserId || null;
    if (input.contractorId !== undefined) row.contractor_id = input.contractorId || null;
    if (input.startDate !== undefined) row.start_date = input.startDate || null;
    if (input.dueDate !== undefined) row.due_date = input.dueDate || null;
    if (input.priority !== undefined) row.priority = input.priority;
    if (input.notes !== undefined) row.notes = input.notes || null;
    const { error } = await supabase.from("construction_tasks").update(row).eq("id", id);
    if (error) throw new Error("Could not update this task.");
  },
};
