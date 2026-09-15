import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiAssistantConfig, AssistantType } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AiAssistantConfig {
  return {
    id: row.id,
    assistantType: row.assistant_type,
    enabled: !!row.enabled,
    allowedTools: row.allowed_tools ?? [],
    allowWriteActions: !!row.allow_write_actions,
    requireApprovalForWrite: !!row.require_approval_for_write,
    conversationRetentionDays: row.conversation_retention_days,
    dailyRequestLimit: row.daily_request_limit ?? null,
    model: row.model,
    systemNotes: row.system_notes ?? null,
    updatedAt: row.updated_at,
  };
}

/** Config lookups + admin settings management. Everything here is
 *  server-only and the single source of truth for "is the AI feature
 *  even on" — the model/API layer must never be called without first
 *  passing through isAssistantAvailable(). */
export const aiConfigService = {
  async listAll(): Promise<AiAssistantConfig[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_assistant_configs").select("*").order("assistant_type");
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getGlobal(): Promise<AiAssistantConfig | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_assistant_configs")
      .select("*")
      .eq("assistant_type", "GLOBAL")
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  async getFor(assistantType: AssistantType): Promise<AiAssistantConfig | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_assistant_configs")
      .select("*")
      .eq("assistant_type", assistantType)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : undefined;
  },

  /** True only when the global switch AND the specific assistant are
   *  both enabled. This is the single gate every chat/tool entry point
   *  must check before doing anything else. */
  async isAssistantAvailable(assistantType: AssistantType): Promise<{ available: boolean; reason?: string; config?: AiAssistantConfig }> {
    const [global, specific] = await Promise.all([this.getGlobal(), this.getFor(assistantType)]);
    if (!global || !global.enabled) return { available: false, reason: "The AI assistant is currently disabled by an administrator." };
    if (!specific || !specific.enabled) return { available: false, reason: "This assistant is currently disabled." };
    return { available: true, config: specific };
  },

  async update(
    assistantType: AssistantType | "GLOBAL",
    input: Partial<{
      enabled: boolean;
      allowedTools: string[];
      allowWriteActions: boolean;
      requireApprovalForWrite: boolean;
      conversationRetentionDays: number;
      dailyRequestLimit: number | null;
      model: string;
      systemNotes: string | null;
    }>,
    updatedBy: string
  ): Promise<void> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: updatedBy };
    if (input.enabled !== undefined) patch.enabled = input.enabled;
    if (input.allowedTools !== undefined) patch.allowed_tools = input.allowedTools;
    if (input.allowWriteActions !== undefined) patch.allow_write_actions = input.allowWriteActions;
    if (input.requireApprovalForWrite !== undefined) patch.require_approval_for_write = input.requireApprovalForWrite;
    if (input.conversationRetentionDays !== undefined) patch.conversation_retention_days = input.conversationRetentionDays;
    if (input.dailyRequestLimit !== undefined) patch.daily_request_limit = input.dailyRequestLimit;
    if (input.model !== undefined) patch.model = input.model;
    if (input.systemNotes !== undefined) patch.system_notes = input.systemNotes;
    const { error } = await supabase.from("ai_assistant_configs").update(patch).eq("assistant_type", assistantType);
    if (error) throw error;
  },
};
