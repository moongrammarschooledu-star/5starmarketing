import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiActor, AiToolLog, AssistantType } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLog(row: any): AiToolLog {
  return {
    id: row.id,
    conversationId: row.conversation_id ?? null,
    actorAdminId: row.actor_admin_id ?? null,
    actorCustomerId: row.actor_customer_id ?? null,
    assistantType: row.assistant_type,
    toolName: row.tool_name,
    input: row.input ?? {},
    recordIds: row.record_ids ?? [],
    status: row.status,
    errorMessage: row.error_message ?? null,
    durationMs: row.duration_ms ?? null,
    createdAt: row.created_at,
  };
}

/** Every AI tool call that touches business data MUST be logged here —
 *  this is the spec's "sensitive access log". Never log secrets,
 *  passwords, tokens or full payment details in `input`. */
export const aiAuditService = {
  async logToolCall(params: {
    conversationId?: string | null;
    messageId?: string | null;
    actor: AiActor;
    assistantType: AssistantType;
    toolName: string;
    input: Record<string, unknown>;
    recordIds?: string[];
    status: "SUCCESS" | "DENIED" | "ERROR";
    errorMessage?: string;
    durationMs?: number;
  }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_tool_logs").insert({
      conversation_id: params.conversationId ?? null,
      message_id: params.messageId ?? null,
      actor_admin_id: params.actor.kind === "admin" ? params.actor.id : null,
      actor_customer_id: params.actor.kind === "customer" ? params.actor.id : null,
      assistant_type: params.assistantType,
      tool_name: params.toolName,
      input: sanitize(params.input),
      record_ids: params.recordIds ?? [],
      status: params.status,
      error_message: params.errorMessage ?? null,
      duration_ms: params.durationMs ?? null,
    });
    // Audit logging must never crash the chat request itself, but it
    // also must never be silently skipped — surface to server logs.
    if (error) console.error("aiAuditService.logToolCall failed:", error);
  },

  async recordUsage(params: {
    assistantType: AssistantType;
    actor: AiActor;
    toolCallCount: number;
    errorCount: number;
    latencyMs?: number;
  }): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_usage_records").insert({
      assistant_type: params.assistantType,
      actor_admin_id: params.actor.kind === "admin" ? params.actor.id : null,
      actor_customer_id: params.actor.kind === "customer" ? params.actor.id : null,
      tool_call_count: params.toolCallCount,
      error_count: params.errorCount,
      latency_ms: params.latencyMs ?? null,
    });
    if (error) console.error("aiAuditService.recordUsage failed:", error);
  },

  async listToolLogs(filters?: { toolName?: string; status?: string; limit?: number }): Promise<AiToolLog[]> {
    const supabase = await createClient();
    let query = supabase.from("ai_tool_logs").select("*").order("created_at", { ascending: false }).limit(filters?.limit ?? 200);
    if (filters?.toolName) query = query.eq("tool_name", filters.toolName);
    if (filters?.status) query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapLog);
  },

  async usageSummary(days = 30): Promise<{ requests: number; toolCalls: number; errors: number; avgLatencyMs: number | null }> {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase.from("ai_usage_records").select("*").gte("created_at", since);
    if (error) throw error;
    const rows = data ?? [];
    const requests = rows.reduce((s, r) => s + (r.request_count ?? 1), 0);
    const toolCalls = rows.reduce((s, r) => s + (r.tool_call_count ?? 0), 0);
    const errors = rows.reduce((s, r) => s + (r.error_count ?? 0), 0);
    const latencies = rows.map((r) => r.latency_ms).filter((v): v is number => typeof v === "number");
    const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    return { requests, toolCalls, errors, avgLatencyMs };
  },
};

/** Strip anything that looks like a secret/credential before it is
 *  ever written to the audit log. */
function sanitize(input: Record<string, unknown>): Record<string, unknown> {
  const banned = /password|token|secret|api[_-]?key|card|cvv|ssn|ccnum/i;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[k] = banned.test(k) ? "[redacted]" : v;
  }
  return out;
}
