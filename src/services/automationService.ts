import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leadService } from "./leadService";
import { followUpService } from "./followUpService";
import { followUpRuleService } from "./followUpRuleService";
import { staffNotificationService } from "./staffNotificationService";
import { marketingTagService } from "./marketingTagService";
import { emailProvider, whatsappProvider, smsProvider } from "@/lib/marketing/providers";
import type { Lead } from "@/lib/models/lead";
import type {
  AutomationTriggerType,
  MarketingWorkflow,
  MarketingWorkflowInput,
  WorkflowAction,
  WorkflowActionInput,
  WorkflowCondition,
  AutomationLogEntry,
  FollowUpTriggerEvent,
} from "@/lib/models/automation";

export interface TriggerContext {
  leadId?: string;
  scoreLevel?: string;
  previousScoreLevel?: string;
  newStatus?: string;
  dealId?: string;
  dealNumber?: string;
  appointmentId?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapWorkflow(row: any): MarketingWorkflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    triggerType: row.trigger_type,
    conditions: row.conditions ?? [],
    active: !!row.active,
    createdBy: row.created_by ?? undefined,
    createdByName: row.admin_profiles?.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAction(row: any): WorkflowAction {
  return { id: row.id, workflowId: row.workflow_id, sortOrder: row.sort_order, actionType: row.action_type, actionConfig: row.action_config ?? {}, createdAt: row.created_at };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLog(row: any): AutomationLogEntry {
  return {
    id: row.id,
    workflowId: row.workflow_id ?? undefined,
    workflowName: row.workflow_name ?? undefined,
    triggerType: row.trigger_type,
    leadId: row.lead_id ?? undefined,
    leadName: row.leads?.name ?? undefined,
    actionType: row.action_type ?? undefined,
    status: row.status,
    error: row.error ?? undefined,
    executedAt: row.executed_at,
  };
}

function evaluateCondition(facts: Record<string, unknown>, condition: WorkflowCondition): boolean {
  const actual = facts[condition.field];
  if (actual === undefined || actual === null) return false;
  switch (condition.operator) {
    case "eq":
      return String(actual) === String(condition.value);
    case "neq":
      return String(actual) !== String(condition.value);
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "in":
      return Array.isArray(condition.value) && condition.value.map(String).includes(String(actual));
    case "contains":
      return String(actual).toLowerCase().includes(String(condition.value).toLowerCase());
    default:
      return false;
  }
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (m, key) => (key in vars ? vars[key] : m));
}

function buildFacts(lead: Lead, context: TriggerContext): Record<string, unknown> {
  return {
    score: lead.score,
    scoreLevel: context.scoreLevel ?? lead.scoreLevel,
    status: lead.status,
    source: lead.source,
    leadType: lead.leadType,
    priority: lead.priority,
    purpose: lead.purpose,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    preferredPropertyType: lead.preferredPropertyType,
    campaignId: lead.campaignId,
    newStatus: context.newStatus,
  };
}

function templateVars(lead: Lead, context: TriggerContext): Record<string, string> {
  return {
    customer_name: lead.name,
    customer_phone: lead.phone,
    property_title: lead.propertyTitle ?? "",
    score: String(lead.score),
    score_level: context.scoreLevel ?? lead.scoreLevel,
    source: lead.source,
    status: context.newStatus ?? lead.status,
    deal_number: context.dealNumber ?? "",
  };
}

async function pickLeastAssignedAgent(): Promise<string | undefined> {
  const supabase = await createClient();
  const { data: agents } = await supabase.from("admin_profiles").select("id").eq("status", "Active").in("role", ["sales_agent", "sales_manager"]);
  if (!agents || agents.length === 0) return undefined;
  const { data: leads } = await supabase.from("leads").select("assigned_agent_id").not("assigned_agent_id", "is", null).not("status", "in", "(closed,lost)");
  const counts = new Map<string, number>();
  for (const a of agents) counts.set(a.id, 0);
  for (const l of leads ?? []) {
    if (l.assigned_agent_id && counts.has(l.assigned_agent_id)) counts.set(l.assigned_agent_id, (counts.get(l.assigned_agent_id) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
}

async function notifyManagers(title: string, message: string, leadId: string) {
  const supabase = await createClient();
  const { data: managers } = await supabase.from("admin_profiles").select("id").in("role", ["super_admin", "admin", "sales_manager"]).eq("status", "Active");
  for (const m of managers ?? []) {
    await staffNotificationService.notify(m.id, "automation_alert", title, message, "lead", leadId);
  }
}

/** The actual idempotency guarantee (section 57): reserves the dedup
 *  slot with a RUNNING row BEFORE the action executes, relying on
 *  automation_logs' unique dedup_key index to reject a second, racing
 *  attempt at the exact same slot. Returns the reserved row's id, or
 *  undefined if this exact action already ran (or is running) — in
 *  which case the caller must NOT execute the action again. */
async function reserveAction(entry: { workflowId?: string; workflowName?: string; triggerType: string; leadId?: string; actionType?: string; dedupKey: string }): Promise<string | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_logs")
    .insert({
      workflow_id: entry.workflowId || null,
      workflow_name: entry.workflowName || null,
      trigger_type: entry.triggerType,
      lead_id: entry.leadId || null,
      action_type: entry.actionType || null,
      status: "RUNNING",
      dedup_key: entry.dedupKey,
    })
    .select("id")
    .single();
  if (error) return undefined; // Unique violation — already claimed.
  return data.id;
}

async function finishAction(logId: string, status: "SUCCESS" | "FAILED" | "SKIPPED", error?: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("automation_logs").update({ status, error: error || null }).eq("id", logId);
}

async function executeAction(action: WorkflowAction, lead: Lead, context: TriggerContext, workflow: MarketingWorkflow): Promise<void> {
  const config = action.actionConfig;
  switch (action.actionType) {
    case "CREATE_TASK":
    case "CREATE_FOLLOWUP": {
      const delayMinutes: number = config.delayMinutes ?? 0;
      const due = new Date(Date.now() + delayMinutes * 60000);
      await followUpService.create(
        {
          leadId: lead.id,
          assignedAgentId: lead.assignedAgentId,
          followUpDate: due.toISOString().slice(0, 10),
          followUpTime: due.toISOString().slice(11, 16),
          type: config.type ?? "Call",
          note: interpolate(config.note ?? "Automated follow-up.", templateVars(lead, context)),
          source: "automation",
          automationGroupKey: `${lead.id}:${workflow.triggerType}`,
        },
        "Automation"
      );
      return;
    }
    case "ASSIGN_AGENT": {
      const agentId: string | undefined = config.agentId ?? (config.strategy === "least_assigned" ? await pickLeastAssignedAgent() : undefined);
      if (!agentId) throw new Error("No agent available to assign.");
      const supabase = await createClient();
      const { data: agent } = await supabase.from("admin_profiles").select("name").eq("id", agentId).maybeSingle();
      await leadService.assignAgent(lead.id, agentId, agent?.name ?? null, undefined, `Automation: ${workflow.name}`);
      return;
    }
    case "CHANGE_PRIORITY": {
      await leadService.setPriority(lead.id, config.priority ?? "Medium");
      return;
    }
    case "ADD_TAG": {
      if (config.tagId) await marketingTagService.addToLead(lead.id, config.tagId);
      return;
    }
    case "REMOVE_TAG": {
      if (config.tagId) await marketingTagService.removeFromLead(lead.id, config.tagId);
      return;
    }
    case "CREATE_NOTIFICATION": {
      const vars = templateVars(lead, context);
      const title = interpolate(config.title ?? "Automation alert", vars);
      const message = interpolate(config.message ?? "", vars);
      if (lead.assignedAgentId) {
        await staffNotificationService.notify(lead.assignedAgentId, "automation_alert", title, message, "lead", lead.id);
      } else {
        await notifyManagers(title, message, lead.id);
      }
      return;
    }
    case "SEND_EMAIL": {
      if (!emailProvider().isConfigured) throw new Error("Email provider not configured.");
      throw new Error("Email sending is not implemented in this deployment.");
    }
    case "SEND_WHATSAPP": {
      if (!whatsappProvider().isConfigured) throw new Error("WhatsApp Business API not configured.");
      throw new Error("WhatsApp API sending is not implemented in this deployment.");
    }
    case "SEND_SMS": {
      if (!smsProvider().isConfigured) throw new Error("SMS provider not configured.");
      throw new Error("SMS sending is not implemented in this deployment.");
    }
    case "UPDATE_STATUS": {
      if (config.status) await leadService.updateStatus(lead.id, config.status);
      return;
    }
  }
}

export const automationService = {
  // ---- Workflows ----
  async listWorkflows(): Promise<MarketingWorkflow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_workflows").select("*, admin_profiles(name)").order("created_at", { ascending: false });
    if (error) {
      console.error("automationService.listWorkflows failed:", error);
      return [];
    }
    return (data ?? []).map(mapWorkflow);
  },

  async getWorkflow(id: string): Promise<MarketingWorkflow | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_workflows").select("*, admin_profiles(name)").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapWorkflow(data);
  },

  async createWorkflow(input: MarketingWorkflowInput, createdBy?: string): Promise<MarketingWorkflow> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("marketing_workflows")
      .insert({ name: input.name, description: input.description || null, trigger_type: input.triggerType, conditions: input.conditions, active: input.active, created_by: createdBy || null })
      .select("*, admin_profiles(name)")
      .single();
    if (error) throw new Error("Could not create this workflow.");
    return mapWorkflow(data);
  },

  async updateWorkflow(id: string, input: Partial<MarketingWorkflowInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.name !== undefined) row.name = input.name;
    if (input.description !== undefined) row.description = input.description || null;
    if (input.triggerType !== undefined) row.trigger_type = input.triggerType;
    if (input.conditions !== undefined) row.conditions = input.conditions;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("marketing_workflows").update(row).eq("id", id);
    if (error) throw new Error("Could not update this workflow.");
  },

  async removeWorkflow(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_workflows").delete().eq("id", id);
    if (error) throw new Error("Could not delete this workflow.");
  },

  async listActions(workflowId: string): Promise<WorkflowAction[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("marketing_workflow_actions").select("*").eq("workflow_id", workflowId).order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapAction);
  },

  async addAction(workflowId: string, input: WorkflowActionInput): Promise<WorkflowAction> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("marketing_workflow_actions")
      .insert({ workflow_id: workflowId, sort_order: input.sortOrder, action_type: input.actionType, action_config: input.actionConfig })
      .select("*")
      .single();
    if (error) throw new Error("Could not add this action.");
    return mapAction(data);
  },

  async removeAction(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("marketing_workflow_actions").delete().eq("id", id);
    if (error) throw new Error("Could not remove this action.");
  },

  // ---- Logs ----
  async listLogs(filters?: { leadId?: string; workflowId?: string }, limit = 100): Promise<AutomationLogEntry[]> {
    const supabase = await createClient();
    let query = supabase.from("automation_logs").select("*, leads(name)").order("executed_at", { ascending: false }).limit(limit);
    if (filters?.leadId) query = query.eq("lead_id", filters.leadId);
    if (filters?.workflowId) query = query.eq("workflow_id", filters.workflowId);
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapLog);
  },

  // ---- Follow-up rule scheduling (sections 18-19) ----
  async scheduleFollowUpsFor(triggerEvent: FollowUpTriggerEvent, leadId: string): Promise<void> {
    const lead = await leadService.getById(leadId);
    if (!lead) return;
    const rules = await followUpRuleService.listActiveFor(triggerEvent);
    for (const rule of rules) {
      const due = new Date(Date.now() + rule.delayMinutes * 60000);
      try {
        await followUpService.create(
          {
            leadId,
            assignedAgentId: lead.assignedAgentId,
            followUpDate: due.toISOString().slice(0, 10),
            followUpTime: due.toISOString().slice(11, 16),
            type: rule.followUpType,
            note: rule.noteTemplate,
            source: "automation",
            automationGroupKey: `${leadId}:${triggerEvent}`,
          },
          "Automation"
        );
      } catch (e) {
        console.error("automationService.scheduleFollowUpsFor failed:", e);
      }
    }
  },

  // ---- Execution ----
  /** Runs every active workflow matching this trigger against the given
   *  lead, synchronously (section 57 — idempotent via automation_logs'
   *  dedup_key unique index, so calling this twice for the same event is
   *  always safe). Suppresses ALL further nurturing for a Closed/Lost
   *  lead (section 68) except the conversion trigger itself. */
  async executeTrigger(triggerType: AutomationTriggerType, context: TriggerContext): Promise<void> {
    if (!context.leadId) return;
    const lead = await leadService.getById(context.leadId);
    if (!lead || lead.archived) return;
    if (triggerType !== "LEAD_CONVERTED" && (lead.status === "Closed" || lead.status === "Lost")) return;

    const supabase = await createClient();
    const { data: workflows } = await supabase.from("marketing_workflows").select("*").eq("trigger_type", triggerType).eq("active", true);
    if (!workflows || workflows.length === 0) return;

    const facts = buildFacts(lead, context);

    for (const wRow of workflows) {
      const workflow = mapWorkflow(wRow);
      const passes = workflow.conditions.every((c) => evaluateCondition(facts, c));
      if (!passes) continue;

      const actions = await this.listActions(workflow.id);
      for (const action of actions) {
        const dedupSuffix = context.scoreLevel ?? context.newStatus ?? context.dealId ?? "";
        const dedupKey = `${workflow.id}:${lead.id}:${triggerType}:${action.id}:${dedupSuffix}`;
        const logId = await reserveAction({ workflowId: workflow.id, workflowName: workflow.name, triggerType, leadId: lead.id, actionType: action.actionType, dedupKey });
        if (!logId) continue; // Already executed for this exact event — skip, never re-run.
        try {
          await executeAction(action, lead, context, workflow);
          await finishAction(logId, "SUCCESS");
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unknown error.";
          const status = message.includes("not configured") || message.includes("not implemented") ? "SKIPPED" : "FAILED";
          await finishAction(logId, status, message);
        }
      }
    }
  },

  /** Drains automation_queue (section 57) — the only trigger types ever
   *  queued are NEW_LEAD and the lead-type-derived ones enqueued by the
   *  apply_lead_signals DB trigger (see that trigger's own comment for
   *  why an anonymous visitor's insert can't reach app code directly).
   *  Called opportunistically from the CRM/Marketing dashboards — same
   *  "no background job runner" pattern as followUpService.markOverdue. */
  async processQueuedEvents(limit = 50): Promise<number> {
    const supabase = await createClient();
    const { data: events, error } = await supabase.from("automation_queue").select("*").eq("processed", false).order("created_at", { ascending: true }).limit(limit);
    if (error || !events || events.length === 0) return 0;

    for (const event of events) {
      try {
        await this.executeTrigger(event.trigger_type as AutomationTriggerType, { leadId: event.lead_id });
        if (event.trigger_type === "NEW_LEAD") {
          await this.scheduleFollowUpsFor("LEAD_CREATED", event.lead_id);
        }
      } catch (e) {
        console.error("automationService.processQueuedEvents: event failed:", e);
      } finally {
        await supabase.from("automation_queue").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", event.id);
      }
    }
    return events.length;
  },
};
