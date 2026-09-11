import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CallLogEntry, CallLogInput } from "@/lib/models/communication";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CallLogEntry {
  return {
    id: row.id,
    conversationId: row.conversation_id ?? undefined,
    leadId: row.lead_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
    direction: row.direction,
    outcome: row.outcome,
    durationSeconds: row.duration_seconds ?? undefined,
    notes: row.notes ?? undefined,
    nextFollowUpAt: row.next_follow_up_at ?? undefined,
    source: "MANUAL_LOG",
    createdAt: row.created_at,
  };
}

/** MANUAL_LOG only (sections 37-38) — never presented as a telephony-
 *  provider-verified event; there is no telephony integration in this
 *  deployment. */
export const communicationCallLogService = {
  async listByLead(leadId: string): Promise<CallLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_call_logs").select("*, admin_profiles(name)").eq("lead_id", leadId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async listByConversation(conversationId: string): Promise<CallLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("communication_call_logs").select("*, admin_profiles(name)").eq("conversation_id", conversationId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async log(input: CallLogInput, agentId: string, agentName: string): Promise<CallLogEntry> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_call_logs")
      .insert({
        conversation_id: input.conversationId || null,
        lead_id: input.leadId || null,
        customer_id: input.customerId || null,
        agent_id: agentId,
        direction: input.direction,
        outcome: input.outcome,
        duration_seconds: input.durationSeconds ?? null,
        notes: input.notes || null,
        next_follow_up_at: input.nextFollowUpAt || null,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("communicationCallLogService.log failed:", error);
      throw new Error("Could not save this call log.");
    }

    if (input.leadId && input.direction === "Outgoing") {
      await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", input.leadId);
    }
    if (input.conversationId) {
      await supabase
        .from("communication_conversations")
        .update({ last_message_at: new Date().toISOString(), last_message_preview: `Call (${input.outcome}) logged by ${agentName}` })
        .eq("id", input.conversationId);
      await supabase.from("communication_audit_logs").insert({ conversation_id: input.conversationId, action: "Manual call logged", actor_id: agentId, actor_name: agentName, metadata: { outcome: input.outcome } });
    }
    return mapRow(data);
  },
};
