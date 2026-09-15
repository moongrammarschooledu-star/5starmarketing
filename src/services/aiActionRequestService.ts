import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiActionRequest, AiActor, ActionTier, AssistantType } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AiActionRequest {
  return {
    id: row.id,
    conversationId: row.conversation_id ?? null,
    requestedByAdminId: row.requested_by_admin_id ?? null,
    requestedByCustomerId: row.requested_by_customer_id ?? null,
    assistantType: row.assistant_type,
    actionType: row.action_type,
    tier: row.tier,
    targetTable: row.target_table ?? null,
    targetRecordId: row.target_record_id ?? null,
    summary: row.summary,
    payload: row.payload ?? {},
    status: row.status,
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    reviewNotes: row.review_notes ?? null,
    executedAt: row.executed_at ?? null,
    executionResult: row.execution_result ?? null,
    createdAt: row.created_at,
  };
}

/** The write-action safety layer. The AI may only ever create rows
 *  here — actual execution against business tables happens through
 *  the existing, already-authorized server actions/services, invoked
 *  ONLY after a human approves (or, for SUGGESTED-tier drafts, never
 *  automatically — they are shown to the user to copy/send/save
 *  themselves). This module never talks to business tables directly. */
export const aiActionRequestService = {
  async create(params: {
    conversationId?: string | null;
    actor: AiActor;
    assistantType: AssistantType;
    actionType: string;
    tier: ActionTier;
    targetTable?: string;
    targetRecordId?: string;
    summary: string;
    payload: Record<string, unknown>;
  }): Promise<AiActionRequest> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_action_requests")
      .insert({
        conversation_id: params.conversationId ?? null,
        requested_by_admin_id: params.actor.kind === "admin" ? params.actor.id : null,
        requested_by_customer_id: params.actor.kind === "customer" ? params.actor.id : null,
        assistant_type: params.assistantType,
        action_type: params.actionType,
        tier: params.tier,
        target_table: params.targetTable ?? null,
        target_record_id: params.targetRecordId ?? null,
        summary: params.summary,
        payload: params.payload,
        status: "PENDING",
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async list(filters?: { status?: string }): Promise<AiActionRequest[]> {
    const supabase = await createClient();
    let query = supabase.from("ai_action_requests").select("*").order("created_at", { ascending: false }).limit(200);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<AiActionRequest | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_action_requests").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  /** Reviewer approves/rejects — this does NOT execute the action. A
   *  separate, explicit execute() call (invoked by an admin action, not
   *  by the AI) performs the real mutation via the existing service for
   *  that domain, so every side effect still goes through this
   *  project's normal authorization/RLS path. */
  async review(id: string, decision: "APPROVED" | "REJECTED", reviewerId: string, notes?: string): Promise<AiActionRequest> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_action_requests")
      .update({ status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString(), review_notes: notes ?? null })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async markExecuted(id: string, result: unknown): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ai_action_requests")
      .update({ status: "EXECUTED", executed_at: new Date().toISOString(), execution_result: result })
      .eq("id", id);
    if (error) throw error;
  },

  async markFailed(id: string, result: unknown): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_action_requests").update({ status: "FAILED", execution_result: result }).eq("id", id);
    if (error) throw error;
  },

  async cancel(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_action_requests").update({ status: "CANCELLED" }).eq("id", id);
    if (error) throw error;
  },
};
