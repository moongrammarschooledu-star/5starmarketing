import "server-only";
import { createClient } from "@/lib/supabase/server";
import { activityService } from "./activityService";
import type { FollowUp, FollowUpInput, FollowUpStatus } from "@/lib/models/team";

const KARACHI_TZ = "Asia/Karachi";

function todayISO(): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: KARACHI_TZ }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): FollowUp {
  const lead = row.leads;
  return {
    id: row.id,
    leadId: row.lead_id,
    assignedAgentId: row.assigned_agent_id ?? undefined,
    followUpDate: row.follow_up_date,
    followUpTime: row.follow_up_time ? String(row.follow_up_time).slice(0, 5) : undefined,
    type: row.type,
    note: row.note ?? "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    source: row.source === "automation" ? "automation" : "manual",
    automationGroupKey: row.automation_group_key ?? undefined,
    leadName: lead?.name ?? undefined,
    leadPhone: lead?.phone ?? undefined,
    propertyTitle: lead?.property_title ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
  };
}

const SELECT_WITH_CONTEXT = "*, leads(name, phone, property_title), admin_profiles(name)";

export const followUpService = {
  async create(input: FollowUpInput, createdBy: string): Promise<FollowUp> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        lead_id: input.leadId,
        assigned_agent_id: input.assignedAgentId || null,
        follow_up_date: input.followUpDate,
        follow_up_time: input.followUpTime || null,
        type: input.type,
        note: input.note || "",
        source: input.source ?? "manual",
        automation_group_key: input.automationGroupKey || null,
      })
      .select(SELECT_WITH_CONTEXT)
      .single();
    if (error) {
      console.error("followUpService.create failed:", error);
      throw new Error("Could not schedule this follow-up.");
    }
    await activityService.log("Follow-Up Created", `${createdBy} scheduled a ${input.type} follow-up for ${input.followUpDate}`, "follow_up", data.id);
    return mapRow(data);
  },

  async listByLead(leadId: string): Promise<FollowUp[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("follow_ups")
      .select(SELECT_WITH_CONTEXT)
      .eq("lead_id", leadId)
      .order("follow_up_date", { ascending: false });
    if (error) {
      console.error("followUpService.listByLead failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async listByAgent(agentId: string, filter?: "today" | "upcoming" | "overdue"): Promise<FollowUp[]> {
    const supabase = await createClient();
    let query = supabase
      .from("follow_ups")
      .select(SELECT_WITH_CONTEXT)
      .eq("assigned_agent_id", agentId)
      .order("follow_up_date", { ascending: true });

    const today = todayISO();
    if (filter === "today") query = query.eq("follow_up_date", today).eq("status", "Pending");
    else if (filter === "upcoming") query = query.gt("follow_up_date", today).eq("status", "Pending");
    else if (filter === "overdue") query = query.lt("follow_up_date", today).eq("status", "Pending");

    const { data, error } = await query;
    if (error) {
      console.error("followUpService.listByAgent failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Admin Follow-Up Center — every filter combination the spec asks for
   *  (Today/Tomorrow/This Week/Overdue/Agent/Status), all AND-combined. */
  async listAll(filters?: {
    range?: "today" | "tomorrow" | "week" | "overdue";
    agentId?: string;
    status?: FollowUpStatus;
  }): Promise<FollowUp[]> {
    const supabase = await createClient();
    let query = supabase.from("follow_ups").select(SELECT_WITH_CONTEXT).order("follow_up_date", { ascending: true });

    if (filters?.agentId) query = query.eq("assigned_agent_id", filters.agentId);
    if (filters?.status) query = query.eq("status", filters.status);

    if (filters?.range === "today") {
      query = query.eq("follow_up_date", todayISO());
    } else if (filters?.range === "tomorrow") {
      const d = new Date(`${todayISO()}T00:00:00`);
      d.setDate(d.getDate() + 1);
      query = query.eq("follow_up_date", d.toISOString().slice(0, 10));
    } else if (filters?.range === "week") {
      const start = todayISO();
      const d = new Date(`${start}T00:00:00`);
      d.setDate(d.getDate() + 7);
      query = query.gte("follow_up_date", start).lte("follow_up_date", d.toISOString().slice(0, 10));
    } else if (filters?.range === "overdue") {
      query = query.lt("follow_up_date", todayISO()).eq("status", "Pending");
    }

    const { data, error } = await query;
    if (error) {
      console.error("followUpService.listAll failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Completing one follow-up in an automation cascade (section 18-19)
   *  auto-cancels the other pending, not-yet-due tasks in the same
   *  cascade (same lead + trigger event) — the closest safe equivalent
   *  to "stop escalating once contact is made" without a background
   *  scheduler in this deployment to check that partway through. */
  async complete(id: string): Promise<void> {
    const supabase = await createClient();
    const { data: current } = await supabase.from("follow_ups").select("automation_group_key").eq("id", id).maybeSingle();
    const { error } = await supabase.from("follow_ups").update({ status: "Completed" }).eq("id", id);
    if (error) throw new Error("Could not complete this follow-up.");
    await activityService.log("Follow-Up Completed", "Marked as completed", "follow_up", id);

    if (current?.automation_group_key) {
      await supabase
        .from("follow_ups")
        .update({ status: "Cancelled" })
        .eq("automation_group_key", current.automation_group_key)
        .eq("status", "Pending")
        .neq("id", id);
    }
  },

  async reschedule(id: string, date: string, time?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("follow_ups")
      .update({ follow_up_date: date, follow_up_time: time || null, status: "Pending" })
      .eq("id", id);
    if (error) throw new Error("Could not reschedule this follow-up.");
    await activityService.log("Follow-Up Rescheduled", `Moved to ${date}`, "follow_up", id);
  },

  async cancel(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("follow_ups").update({ status: "Cancelled" }).eq("id", id);
    if (error) throw new Error("Could not cancel this follow-up.");
    await activityService.log("Follow-Up Cancelled", "Cancelled", "follow_up", id);
  },

  /** Sweeps Pending follow-ups whose date has passed into Overdue — called
   *  opportunistically from the dashboards that display follow-up lists,
   *  since there's no background job runner in this deployment. */
  async markOverdue(): Promise<void> {
    const supabase = await createClient();
    await supabase.from("follow_ups").update({ status: "Overdue" }).eq("status", "Pending").lt("follow_up_date", todayISO());
  },
};
