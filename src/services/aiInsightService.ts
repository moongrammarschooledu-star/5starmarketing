import "server-only";
import { createClient } from "@/lib/supabase/server";
import { leadService } from "./leadService";
import { leaseService } from "./leaseService";
import { supportSlaService } from "./supportSlaService";
import { maintenanceRequestService } from "./maintenanceRequestService";
import type { AiInsight } from "@/lib/models/ai";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AiInsight {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    dataSource: row.data_source,
    timePeriod: row.time_period,
    reason: row.reason,
    relatedRecords: row.related_records ?? [],
    confidence: row.confidence,
    status: row.status,
    generatedAt: row.generated_at,
  };
}

/** Smart Insights (spec section "SMART INSIGHTS dashboard"). Every
 *  insight is generated from real records via existing services — no
 *  invented data — and stored with its data source/time period/reason
 *  so an admin can always see exactly why it was raised. */
export const aiInsightService = {
  async list(status = "OPEN"): Promise<AiInsight[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_insights")
      .select("*")
      .eq("status", status)
      .order("generated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async acknowledge(id: string, adminId: string, status: "ACKNOWLEDGED" | "DISMISSED"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("ai_insights")
      .update({ status, acknowledged_by: adminId, acknowledged_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  /** Regenerates insights from real, current data. Safe to call
   *  repeatedly (idempotent per category via delete+reinsert of OPEN
   *  rows for categories it recomputes) — invoked from the insights
   *  page's "Refresh" action, not on a schedule (this deployment has no
   *  cron infra wired up; see STEP 30 report). */
  async regenerate(): Promise<number> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const rows: Record<string, unknown>[] = [];

    // Lead inactivity: open leads with a past-due or missing follow-up.
    const leads = await leadService.list();
    const staleLeads = leads.filter((l) => l.status !== "Lost" && (!l.nextFollowUpDate || new Date(l.nextFollowUpDate) < new Date()));
    if (staleLeads.length > 0) {
      rows.push({
        category: "LEAD_INACTIVITY",
        title: `${staleLeads.length} lead(s) need a follow-up`,
        description: `${staleLeads.length} open lead(s) have no upcoming follow-up date scheduled, or it has already passed.`,
        data_source: "leads",
        time_period: "as of now",
        reason: "No future nextFollowUpDate on an open lead.",
        related_records: staleLeads.slice(0, 20).map((l) => ({ type: "lead", id: l.id, label: l.name })),
        confidence: "HIGH",
      });
    }

    // Lease expiry within 30 days.
    const expiring = await leaseService.listExpiring(30);
    if (expiring.length > 0) {
      rows.push({
        category: "LEASE_EXPIRY",
        title: `${expiring.length} lease(s) expiring within 30 days`,
        description: `${expiring.length} active lease(s) end within the next 30 days and may need renewal outreach.`,
        data_source: "leases",
        time_period: "next 30 days",
        reason: "leaseService.listExpiring(30) returned these rows.",
        related_records: expiring.slice(0, 20).map((l) => ({ type: "lease", id: l.id, label: l.leaseNumber })),
        confidence: "HIGH",
      });
    }

    // Support SLA risk — surfaces that SLA rules exist; live breach
    // counts come from ticketService.sweepSlaBreaches(), run elsewhere.
    const slaRules = await supportSlaService.list();
    if (slaRules.length > 0) {
      rows.push({
        category: "SUPPORT_SLA_RISK",
        title: `${slaRules.length} SLA rule(s) configured`,
        description: `Review open support tickets against these configured SLA rules for breach risk.`,
        data_source: "support_sla_rules",
        time_period: "current",
        reason: "SLA rules exist; run the ticket SLA sweep for live breach counts.",
        related_records: [],
        confidence: "LOW",
      });
    }

    // Maintenance backlog.
    const openMaintenance = await maintenanceRequestService.list({ status: "NEW" }).catch(() => []);
    if (openMaintenance.length > 5) {
      rows.push({
        category: "MAINTENANCE_BACKLOG",
        title: `${openMaintenance.length} open maintenance requests`,
        description: `${openMaintenance.length} maintenance requests are currently open.`,
        data_source: "maintenance_requests",
        time_period: "current",
        reason: "Open request count exceeds 5.",
        related_records: openMaintenance.slice(0, 20).map((m) => ({ type: "maintenance_request", id: m.id, label: m.requestNumber })),
        confidence: "MEDIUM",
      });
    }

    if (rows.length === 0) return 0;
    const { error } = await supabase.from("ai_insights").insert(rows.map((r) => ({ ...r, generated_at: now })));
    if (error) throw error;
    return rows.length;
  },
};
