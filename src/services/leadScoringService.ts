import "server-only";
import { createClient } from "@/lib/supabase/server";
import { staffNotificationService } from "./staffNotificationService";
import type { ScoreLevel, ScoringEventType, LeadScoringRule, LeadScoringRuleInput, LeadScoreHistoryEntry, LeadSlaRule, LeadSlaStatus } from "@/lib/models/leadScoring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRule(row: any): LeadScoringRule {
  return {
    id: row.id,
    eventType: row.event_type,
    label: row.label,
    points: row.points,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function levelFor(score: number, thresholds: { warm: number; hot: number; veryHot: number }): ScoreLevel {
  if (score >= thresholds.veryHot) return "VERY_HOT";
  if (score >= thresholds.hot) return "HOT";
  if (score >= thresholds.warm) return "WARM";
  return "COLD";
}

function priorityFor(level: ScoreLevel): "Low" | "Medium" | "High" | "Urgent" {
  return level === "VERY_HOT" ? "Urgent" : level === "HOT" ? "High" : level === "WARM" ? "Medium" : "Low";
}

export const leadScoringService = {
  async listRules(): Promise<LeadScoringRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lead_scoring_rules").select("*").order("points", { ascending: false });
    if (error) {
      console.error("leadScoringService.listRules failed:", error);
      return [];
    }
    return (data ?? []).map(mapRule);
  },

  async updateRule(id: string, input: Partial<LeadScoringRuleInput>): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.label !== undefined) row.label = input.label;
    if (input.points !== undefined) row.points = input.points;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("lead_scoring_rules").update(row).eq("id", id);
    if (error) throw new Error("Could not update this scoring rule.");
  },

  async listHistory(leadId: string): Promise<LeadScoreHistoryEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lead_score_history")
      .select("*, lead_scoring_rules(label)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("leadScoringService.listHistory failed:", error);
      return [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((row: any) => ({
      id: row.id,
      leadId: row.lead_id,
      ruleId: row.rule_id ?? undefined,
      ruleLabel: row.lead_scoring_rules?.label ?? undefined,
      points: row.points,
      reason: row.reason,
      createdAt: row.created_at,
    }));
  },

  /** Applies one scoring event to an EXISTING lead (section 10-12) — the
   *  baseline events at creation time are handled entirely by the
   *  apply_lead_signals DB trigger; this is for everything that happens
   *  later in the lead's lifecycle (deal created/completed, or an
   *  explicit manual negative action). Returns the lead's new score
   *  level so the caller can decide whether to fire a LEAD_SCORE_CHANGED
   *  automation trigger. */
  async applyEvent(leadId: string, eventType: ScoringEventType, reason?: string): Promise<{ previousLevel: ScoreLevel; newLevel: ScoreLevel; newScore: number } | undefined> {
    const supabase = await createClient();
    const { data: rule } = await supabase.from("lead_scoring_rules").select("*").eq("event_type", eventType).eq("active", true).maybeSingle();
    if (!rule) return undefined;

    const { data: lead } = await supabase.from("leads").select("score, score_level").eq("id", leadId).maybeSingle();
    if (!lead) return undefined;
    const previousLevel = (lead.score_level as ScoreLevel) ?? "COLD";

    await supabase.from("lead_score_history").insert({ lead_id: leadId, rule_id: rule.id, points: rule.points, reason: reason || rule.label });

    const newScore = (lead.score ?? 0) + rule.points;
    const { data: settings } = await supabase.from("website_settings").select("lead_score_threshold_warm, lead_score_threshold_hot, lead_score_threshold_very_hot").limit(1).maybeSingle();
    const newLevel = levelFor(newScore, {
      warm: settings?.lead_score_threshold_warm ?? 20,
      hot: settings?.lead_score_threshold_hot ?? 40,
      veryHot: settings?.lead_score_threshold_very_hot ?? 70,
    });

    await supabase.from("leads").update({ score: newScore, score_level: newLevel, auto_priority: priorityFor(newLevel) }).eq("id", leadId);

    return { previousLevel, newLevel, newScore };
  },

  async listSlaRules(): Promise<LeadSlaRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("lead_sla_rules").select("*");
    if (error) return [];
    return (data ?? []).map((r) => ({ scoreLevel: r.score_level, responseMinutes: r.response_minutes, active: !!r.active }));
  },

  async updateSlaRule(scoreLevel: ScoreLevel, responseMinutes: number, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("lead_sla_rules").update({ response_minutes: responseMinutes, active }).eq("score_level", scoreLevel);
    if (error) throw new Error("Could not update this SLA rule.");
  },

  /** Real, computed-at-read-time SLA status for one lead (section 42) —
   *  never stored. "Responded" means a real, logged Outgoing
   *  communication_log entry exists — never assumed from a status change. */
  async checkSla(leadId: string, createdAt: string, scoreLevel: ScoreLevel, status: string): Promise<LeadSlaStatus> {
    const supabase = await createClient();
    const { data: rule } = await supabase.from("lead_sla_rules").select("*").eq("score_level", scoreLevel).eq("active", true).maybeSingle();
    if (!rule || status === "closed" || status === "lost") {
      return { applicable: false, limitMinutes: rule?.response_minutes ?? 0, elapsedMinutes: 0, breached: false };
    }
    const { data: firstResponse } = await supabase
      .from("communication_log")
      .select("created_at")
      .eq("lead_id", leadId)
      .eq("direction", "Outgoing")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const elapsedMinutes = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (firstResponse) {
      const responseMinutes = Math.round((new Date(firstResponse.created_at).getTime() - new Date(createdAt).getTime()) / 60000);
      return { applicable: true, limitMinutes: rule.response_minutes, elapsedMinutes, breached: responseMinutes > rule.response_minutes, respondedAt: firstResponse.created_at };
    }
    return { applicable: true, limitMinutes: rule.response_minutes, elapsedMinutes, breached: elapsedMinutes > rule.response_minutes };
  },

  /** Opportunistic sweep (section 42) — same "no background job runner
   *  in this deployment" pattern as followUpService.markOverdue(),
   *  called from the CRM/Marketing dashboards. Alerts the assigned agent
   *  (or a manager if unassigned) exactly once per lead via
   *  leads.sla_alert_sent_at, never re-notifying on every page load. */
  async sweepSlaBreaches(): Promise<void> {
    const supabase = await createClient();
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, created_at, score_level, status, assigned_agent_id, property_title")
      .eq("archived", false)
      .is("sla_alert_sent_at", null)
      .not("status", "in", "(closed,lost)");
    if (!leads || leads.length === 0) return;

    const { data: rules } = await supabase.from("lead_sla_rules").select("*").eq("active", true);
    const ruleMap = new Map((rules ?? []).map((r) => [r.score_level, r.response_minutes]));

    const { data: managers } = await supabase.from("admin_profiles").select("id").in("role", ["super_admin", "admin", "sales_manager"]).eq("status", "Active");

    for (const lead of leads) {
      const limit = ruleMap.get(lead.score_level);
      if (!limit) continue;
      const { data: firstResponse } = await supabase
        .from("communication_log")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("direction", "Outgoing")
        .limit(1)
        .maybeSingle();
      if (firstResponse) continue;

      const elapsedMinutes = (Date.now() - new Date(lead.created_at).getTime()) / 60000;
      if (elapsedMinutes <= limit) continue;

      const recipients = lead.assigned_agent_id ? [lead.assigned_agent_id] : (managers ?? []).map((m) => m.id);
      for (const userId of recipients) {
        await staffNotificationService.notify(
          userId,
          "sla_breached",
          "Response SLA breached",
          `${lead.name}${lead.property_title ? ` (${lead.property_title})` : ""} has had no response for over ${limit} minutes.`,
          "lead",
          lead.id
        );
      }
      await supabase.from("leads").update({ sla_alert_sent_at: new Date().toISOString() }).eq("id", lead.id);
    }
  },

  /** Currently-breached leads, for display (distinct from sweepSlaBreaches
   *  which alerts and is idempotent) — always computed live, never
   *  stored. */
  async listCurrentBreaches(): Promise<{ id: string; name: string; scoreLevel: string; createdAt: string }[]> {
    const supabase = await createClient();
    const { data: leads } = await supabase
      .from("leads")
      .select("id, name, created_at, score_level, status")
      .eq("archived", false)
      .not("status", "in", "(closed,lost)");
    if (!leads || leads.length === 0) return [];

    const { data: rules } = await supabase.from("lead_sla_rules").select("*").eq("active", true);
    const ruleMap = new Map((rules ?? []).map((r) => [r.score_level, r.response_minutes]));

    const results: { id: string; name: string; scoreLevel: string; createdAt: string }[] = [];
    for (const lead of leads) {
      const limit = ruleMap.get(lead.score_level);
      if (!limit) continue;
      const elapsedMinutes = (Date.now() - new Date(lead.created_at).getTime()) / 60000;
      if (elapsedMinutes <= limit) continue;
      const { data: firstResponse } = await supabase.from("communication_log").select("id").eq("lead_id", lead.id).eq("direction", "Outgoing").limit(1).maybeSingle();
      if (firstResponse) continue;
      results.push({ id: lead.id, name: lead.name, scoreLevel: lead.score_level, createdAt: lead.created_at });
    }
    return results;
  },

  /** Re-engagement queue (section 31) — leads with no logged contact (or,
   *  if never contacted, no recent creation) for at least `days`. Never
   *  auto-messaged; this only surfaces the queue for a human decision. */
  async listReEngagementCandidates(days: number): Promise<{ id: string; name: string; phone: string; lastActivityAt: string; scoreLevel: string }[]> {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, phone, created_at, last_contacted_at, score_level")
      .eq("archived", false)
      .not("status", "in", "(closed,lost)");
    if (error || !leads) return [];
    return leads
      .filter((l) => {
        const lastActivity = l.last_contacted_at ?? l.created_at;
        return lastActivity < cutoff;
      })
      .map((l) => ({ id: l.id, name: l.name, phone: l.phone, lastActivityAt: l.last_contacted_at ?? l.created_at, scoreLevel: l.score_level }))
      .sort((a, b) => a.lastActivityAt.localeCompare(b.lastActivityAt));
  },
};
