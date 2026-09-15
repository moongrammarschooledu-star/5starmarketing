import "server-only";
import { createClient } from "@/lib/supabase/server";
import { aiActionRequestService } from "./aiActionRequestService";
import type { AiAutomationRule, AiAutomationRun, AutomationTrigger, AiActor } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRule(row: any): AiAutomationRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    triggerType: row.trigger_type,
    conditions: row.conditions ?? {},
    actionType: row.action_type,
    actionConfig: row.action_config ?? {},
    requiresApproval: !!row.requires_approval,
    isEnabled: !!row.is_enabled,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRun(row: any): AiAutomationRun {
  return {
    id: row.id,
    ruleId: row.rule_id,
    triggerContext: row.trigger_context ?? {},
    idempotencyKey: row.idempotency_key,
    status: row.status,
    aiAnalysis: row.ai_analysis ?? null,
    suggestedAction: row.suggested_action ?? null,
    actionRequestId: row.action_request_id ?? null,
    attemptCount: row.attempt_count,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
  };
}

/** AUTOMATION ENGINE (spec section). Since this deployment has no cron
 *  infrastructure wired up (a genuine Vercel/hosting decision the user
 *  must make — see STEP 30 report), rules are evaluated by calling
 *  evaluateTrigger() from the relevant existing mutation's own server
 *  action (e.g. after leadService.create() in leads.actions.ts) rather
 *  than on a schedule. Every run is idempotent via the unique
 *  (rule_id, idempotency_key) constraint — calling evaluateTrigger()
 *  twice for the same record+trigger is a safe no-op the second time. */
export const aiAutomationService = {
  async listRules(): Promise<AiAutomationRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_automation_rules").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRule);
  },

  async createRule(input: Omit<AiAutomationRule, "id" | "createdAt">, createdBy: string): Promise<AiAutomationRule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_automation_rules")
      .insert({
        name: input.name,
        description: input.description,
        trigger_type: input.triggerType,
        conditions: input.conditions,
        action_type: input.actionType,
        action_config: input.actionConfig,
        requires_approval: input.requiresApproval,
        is_enabled: input.isEnabled,
        created_by: createdBy,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRule(data);
  },

  async setEnabled(id: string, isEnabled: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_automation_rules").update({ is_enabled: isEnabled }).eq("id", id);
    if (error) throw error;
  },

  async listRuns(ruleId?: string): Promise<AiAutomationRun[]> {
    const supabase = await createClient();
    let query = supabase.from("ai_automation_runs").select("*").order("created_at", { ascending: false }).limit(100);
    if (ruleId) query = query.eq("rule_id", ruleId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRun);
  },

  /** Call this from an existing mutation point (e.g. right after a lead
   *  is created) with the trigger type + a stable idempotency key (e.g.
   *  the lead's id). Every matching, enabled rule gets ONE run row per
   *  key — retried calls simply find the existing row and stop, which
   *  is what makes this "retry-safe" without extra locking. The action
   *  itself is never auto-executed: it always lands in ai_action_requests
   *  as a SUGGESTED action for a human to review, exactly like a
   *  chat-originated write action would. */
  async evaluateTrigger(params: {
    triggerType: AutomationTrigger;
    idempotencyKey: string;
    context: Record<string, unknown>;
    systemActor: AiActor;
  }): Promise<{ triggeredRules: number }> {
    const supabase = await createClient();
    const { data: rules, error } = await supabase
      .from("ai_automation_rules")
      .select("*")
      .eq("trigger_type", params.triggerType)
      .eq("is_enabled", true);
    if (error) throw error;

    let triggered = 0;
    for (const ruleRow of rules ?? []) {
      const rule = mapRule(ruleRow);
      // Idempotency: the DB unique constraint on (rule_id, idempotency_key)
      // is the real guarantee; this insert either creates a fresh PENDING
      // run or fails harmlessly if one already exists for this key.
      const { data: run, error: insertErr } = await supabase
        .from("ai_automation_runs")
        .insert({ rule_id: rule.id, trigger_context: params.context, idempotency_key: params.idempotencyKey, status: "SUGGESTED" })
        .select("*")
        .maybeSingle();
      if (insertErr) {
        if (insertErr.code === "23505") continue; // already processed — retry-safe no-op
        console.error("aiAutomationService.evaluateTrigger insert failed:", insertErr);
        continue;
      }
      if (!run) continue;

      const summary = `Automation "${rule.name}" (${rule.triggerType}) suggests: ${rule.actionType.replace(/_/g, " ").toLowerCase()}.`;
      const actionRequest = await aiActionRequestService.create({
        actor: params.systemActor,
        assistantType: "ADMIN",
        actionType: rule.actionType,
        tier: "SUGGESTED",
        summary,
        payload: { ruleId: rule.id, ruleName: rule.name, context: params.context, actionConfig: rule.actionConfig },
      });

      await supabase
        .from("ai_automation_runs")
        .update({ status: "AWAITING_APPROVAL", ai_analysis: summary, suggested_action: rule.actionConfig, action_request_id: actionRequest.id })
        .eq("id", run.id);

      triggered += 1;
    }
    return { triggeredRules: triggered };
  },
};
