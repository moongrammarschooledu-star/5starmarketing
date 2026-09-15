import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AiConversation, AiMessage, AssistantType } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversation(row: any): AiConversation {
  return {
    id: row.id,
    assistantType: row.assistant_type,
    adminId: row.admin_id ?? null,
    customerId: row.customer_id ?? null,
    title: row.title,
    isArchived: !!row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any): AiMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    toolCalls: row.tool_calls ?? undefined,
    toolResults: row.tool_results ?? undefined,
    sourceReferences: row.source_references ?? [],
    feedback: row.feedback ?? null,
    createdAt: row.created_at,
  };
}

type Owner = { adminId: string } | { customerId: string };

export const aiConversationService = {
  async listForOwner(owner: Owner): Promise<AiConversation[]> {
    const supabase = await createClient();
    let query = supabase.from("ai_conversations").select("*").order("updated_at", { ascending: false }).limit(100);
    query = "adminId" in owner ? query.eq("admin_id", owner.adminId) : query.eq("customer_id", owner.customerId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapConversation);
  },

  async getById(id: string): Promise<AiConversation | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_conversations").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapConversation(data) : undefined;
  },

  async create(assistantType: AssistantType, owner: Owner, title = "New conversation"): Promise<AiConversation> {
    const supabase = await createClient();
    const row = "adminId" in owner ? { admin_id: owner.adminId } : { customer_id: owner.customerId };
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ assistant_type: assistantType, title, ...row })
      .select("*")
      .single();
    if (error) throw error;
    return mapConversation(data);
  },

  async rename(id: string, title: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_conversations").update({ title }).eq("id", id);
    if (error) throw error;
  },

  async archive(id: string, isArchived: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_conversations").update({ is_archived: isArchived }).eq("id", id);
    if (error) throw error;
  },

  async listMessages(conversationId: string): Promise<AiMessage[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapMessage);
  },

  async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system" | "tool",
    content: string,
    extra?: { toolCalls?: unknown; toolResults?: unknown; sourceReferences?: AiMessage["sourceReferences"] }
  ): Promise<AiMessage> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        tool_calls: extra?.toolCalls ?? null,
        tool_results: extra?.toolResults ?? null,
        source_references: extra?.sourceReferences ?? [],
      })
      .select("*")
      .single();
    if (error) throw error;
    await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
    return mapMessage(data);
  },

  async setFeedback(messageId: string, feedback: "up" | "down" | null): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("ai_messages").update({ feedback }).eq("id", messageId);
    if (error) throw error;
  },
};
