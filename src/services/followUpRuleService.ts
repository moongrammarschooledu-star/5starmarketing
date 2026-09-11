import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FollowUpRule, FollowUpRuleInput, FollowUpTriggerEvent } from "@/lib/models/automation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FollowUpRule {
  return {
    id: row.id,
    triggerEvent: row.trigger_event,
    delayMinutes: row.delay_minutes,
    followUpType: row.follow_up_type,
    noteTemplate: row.note_template,
    active: !!row.active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const followUpRuleService = {
  async list(): Promise<FollowUpRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("follow_up_rules").select("*").order("trigger_event", { ascending: true }).order("sort_order", { ascending: true });
    if (error) {
      console.error("followUpRuleService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listActiveFor(triggerEvent: FollowUpTriggerEvent): Promise<FollowUpRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("follow_up_rules").select("*").eq("trigger_event", triggerEvent).eq("active", true).order("sort_order", { ascending: true });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(input: FollowUpRuleInput): Promise<FollowUpRule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("follow_up_rules")
      .insert({
        trigger_event: input.triggerEvent,
        delay_minutes: input.delayMinutes,
        follow_up_type: input.followUpType,
        note_template: input.noteTemplate,
        active: input.active,
        sort_order: input.sortOrder,
      })
      .select("*")
      .single();
    if (error) throw new Error("Could not create this follow-up rule.");
    return mapRow(data);
  },

  async update(id: string, input: Partial<FollowUpRuleInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.triggerEvent !== undefined) row.trigger_event = input.triggerEvent;
    if (input.delayMinutes !== undefined) row.delay_minutes = input.delayMinutes;
    if (input.followUpType !== undefined) row.follow_up_type = input.followUpType;
    if (input.noteTemplate !== undefined) row.note_template = input.noteTemplate;
    if (input.active !== undefined) row.active = input.active;
    if (input.sortOrder !== undefined) row.sort_order = input.sortOrder;
    const { error } = await supabase.from("follow_up_rules").update(row).eq("id", id);
    if (error) throw new Error("Could not update this follow-up rule.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("follow_up_rules").delete().eq("id", id);
    if (error) throw new Error("Could not delete this follow-up rule.");
  },
};
