import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { SupportDashboardStats, SupportCountBreakdown, SupportStaffPerformance, SupportDepartmentPerformance } from "@/lib/models/support";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function avgMinutes(pairs: { start: string; end: string }[]): number | null {
  if (pairs.length === 0) return null;
  const total = pairs.reduce((sum, p) => sum + (new Date(p.end).getTime() - new Date(p.start).getTime()) / 60000, 0);
  return round2(total / pairs.length);
}

export const supportReportService = {
  /** Every figure here comes from a real query against support_tickets
   *  — never a fabricated or estimated statistic. */
  async dashboardStats(): Promise<SupportDashboardStats> {
    const supabase = await createClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { count: totalTickets },
      { count: newTicketsToday },
      { count: resolvedTickets },
      { count: closedTickets },
      { count: reopenedTickets },
      { count: escalatedTickets },
      { count: complaints },
      { count: highPriorityTickets },
      { data: openRows },
      { data: overdueRows },
      { data: responseTimes },
      { data: resolutionTimes },
      { data: csatRows },
    ] = await Promise.all([
      supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "RESOLVED"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "CLOSED"),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).gt("reopen_count", 0),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "ESCALATED"),
      supabase.from("support_complaints").select("id", { count: "exact", head: true }),
      supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("priority", ["HIGH", "URGENT", "CRITICAL"]).not("status", "in", "(RESOLVED,CLOSED,CANCELLED)"),
      supabase.from("support_tickets").select("status").not("status", "in", "(RESOLVED,CLOSED,CANCELLED)"),
      supabase.from("support_tickets").select("id").or("sla_response_breached.eq.true,sla_resolution_breached.eq.true").not("status", "in", "(RESOLVED,CLOSED,CANCELLED)"),
      supabase.from("support_tickets").select("created_at, first_response_at").not("first_response_at", "is", null),
      supabase.from("support_tickets").select("created_at, resolved_at").not("resolved_at", "is", null),
      supabase.from("support_tickets").select("satisfaction_rating").not("satisfaction_rating", "is", null),
    ]);

    const open = openRows ?? [];
    const openTickets = open.length;
    const pendingTickets = open.filter((r) => r.status === "NEW" || r.status === "OPEN").length;
    const inProgressTickets = open.filter((r) => r.status === "IN_PROGRESS" || r.status === "ASSIGNED").length;

    const csatValues = (csatRows ?? []).map((r) => Number(r.satisfaction_rating));

    return {
      totalTickets: totalTickets ?? 0,
      openTickets,
      newTicketsToday: newTicketsToday ?? 0,
      pendingTickets,
      inProgressTickets,
      resolvedTickets: resolvedTickets ?? 0,
      closedTickets: closedTickets ?? 0,
      reopenedTickets: reopenedTickets ?? 0,
      escalatedTickets: escalatedTickets ?? 0,
      complaints: complaints ?? 0,
      highPriorityTickets: highPriorityTickets ?? 0,
      overdueSlaTickets: overdueRows?.length ?? 0,
      averageFirstResponseMinutes: avgMinutes((responseTimes ?? []).map((r) => ({ start: r.created_at, end: r.first_response_at! }))),
      averageResolutionMinutes: avgMinutes((resolutionTimes ?? []).map((r) => ({ start: r.created_at, end: r.resolved_at! }))),
      averageCsat: csatValues.length > 0 ? round2(csatValues.reduce((s, v) => s + v, 0) / csatValues.length) : null,
    };
  },

  async byDepartment(): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("department_id, support_departments(name)");
    const counts = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const label = row.support_departments?.name ?? "Unassigned";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  },

  async byPriority(): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("priority");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.priority, (counts.get(row.priority) ?? 0) + 1);
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  },

  async byCategory(): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("category_code, support_categories(label)");
    const counts = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const label = row.support_categories?.label ?? row.category_code;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  },

  async bySource(): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("source");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.source, (counts.get(row.source) ?? 0) + 1);
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  },

  async byStatus(): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("status");
    const counts = new Map<string, number>();
    for (const row of data ?? []) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  },

  async staffPerformance(): Promise<SupportStaffPerformance[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("assigned_staff_id, status, created_at, resolved_at, satisfaction_rating, admin_profiles!support_tickets_assigned_staff_id_fkey(name)").not("assigned_staff_id", "is", null);
    const byStaff = new Map<string, { name: string; open: number; resolved: number; resolutionPairs: { start: string; end: string }[]; ratings: number[] }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const id = row.assigned_staff_id;
      const entry = byStaff.get(id) ?? { name: row.admin_profiles?.name ?? "Unknown", open: 0, resolved: 0, resolutionPairs: [] as { start: string; end: string }[], ratings: [] as number[] };
      if (!["RESOLVED", "CLOSED", "CANCELLED"].includes(row.status)) entry.open += 1;
      if (row.status === "RESOLVED" || row.status === "CLOSED") entry.resolved += 1;
      if (row.resolved_at) entry.resolutionPairs.push({ start: row.created_at, end: row.resolved_at });
      if (row.satisfaction_rating != null) entry.ratings.push(Number(row.satisfaction_rating));
      byStaff.set(id, entry);
    }
    return Array.from(byStaff.entries()).map(([staffId, v]) => ({
      staffId,
      staffName: v.name,
      openTickets: v.open,
      resolvedTickets: v.resolved,
      averageResolutionMinutes: avgMinutes(v.resolutionPairs),
      averageCsat: v.ratings.length > 0 ? round2(v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length) : null,
    }));
  },

  async departmentPerformance(): Promise<SupportDepartmentPerformance[]> {
    const supabase = await createClient();
    const { data } = await supabase.from("support_tickets").select("department_id, status, satisfaction_rating, sla_response_breached, sla_resolution_breached, support_departments(name)").not("department_id", "is", null);
    const byDept = new Map<string, { name: string; open: number; resolved: number; breaches: number; ratings: number[] }>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of (data ?? []) as any[]) {
      const id = row.department_id;
      const entry = byDept.get(id) ?? { name: row.support_departments?.name ?? "Unknown", open: 0, resolved: 0, breaches: 0, ratings: [] as number[] };
      if (!["RESOLVED", "CLOSED", "CANCELLED"].includes(row.status)) entry.open += 1;
      if (row.status === "RESOLVED" || row.status === "CLOSED") entry.resolved += 1;
      if (row.sla_response_breached || row.sla_resolution_breached) entry.breaches += 1;
      if (row.satisfaction_rating != null) entry.ratings.push(Number(row.satisfaction_rating));
      byDept.set(id, entry);
    }
    return Array.from(byDept.entries()).map(([departmentId, v]) => ({
      departmentId,
      departmentName: v.name,
      openTickets: v.open,
      resolvedTickets: v.resolved,
      slaBreaches: v.breaches,
      averageCsat: v.ratings.length > 0 ? round2(v.ratings.reduce((s, r) => s + r, 0) / v.ratings.length) : null,
    }));
  },

  /** Daily ticket-volume series for the last N days — real counts
   *  grouped client-side from real rows, never interpolated. */
  async volumeTrend(days = 30): Promise<SupportCountBreakdown[]> {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const { data } = await supabase.from("support_tickets").select("created_at").gte("created_at", since.toISOString());
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const day = row.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label, count }));
  },
};
