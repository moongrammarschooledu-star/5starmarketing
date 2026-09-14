import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supportSettingsService } from "./supportSettingsService";
import type { SupportSlaRule, SupportSlaRuleInput, SupportTicketPriority, SupportSettings } from "@/lib/models/support";

const SELECT = "*, support_departments(name), support_categories(label)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): SupportSlaRule {
  return {
    id: row.id,
    departmentId: row.department_id ?? undefined,
    departmentName: row.support_departments?.name ?? undefined,
    categoryCode: row.category_code ?? undefined,
    categoryLabel: row.support_categories?.label ?? undefined,
    priority: row.priority,
    firstResponseMinutes: row.first_response_minutes,
    resolutionMinutes: row.resolution_minutes,
    businessHoursOnly: !!row.business_hours_only,
    active: !!row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isoDayOfWeek(d: Date): number {
  const day = d.getDay();
  return day === 0 ? 7 : day; // 1 = Monday .. 7 = Sunday
}

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function atTime(d: Date, hm: string): Date {
  const { h, m } = parseHm(hm);
  const result = new Date(d);
  result.setHours(h, m, 0, 0);
  return result;
}

function startOfNextDay(d: Date): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Walks forward, counting only configured business-hours minutes on
 *  configured business days — never a flat calendar-time add when a
 *  rule is marked business_hours_only. Guarded against a
 *  misconfiguration with zero business days. */
function addBusinessMinutes(start: Date, minutes: number, settings: SupportSettings): Date {
  let remaining = minutes;
  let cursor = new Date(start);
  if (settings.businessDays.length === 0) return new Date(start.getTime() + minutes * 60000);

  for (let guard = 0; guard < 3650; guard++) {
    const dow = isoDayOfWeek(cursor);
    if (!settings.businessDays.includes(dow)) {
      cursor = startOfNextDay(cursor);
      continue;
    }
    const dayEnd = atTime(cursor, settings.businessHoursEnd);
    const dayStart = atTime(cursor, settings.businessHoursStart);
    const windowStart = cursor < dayStart ? dayStart : cursor;
    if (windowStart >= dayEnd) {
      cursor = startOfNextDay(cursor);
      continue;
    }
    const availableMinutesToday = (dayEnd.getTime() - windowStart.getTime()) / 60000;
    if (remaining <= availableMinutesToday) {
      return new Date(windowStart.getTime() + remaining * 60000);
    }
    remaining -= availableMinutesToday;
    cursor = startOfNextDay(cursor);
  }
  return cursor;
}

export const supportSlaService = {
  async list(): Promise<SupportSlaRule[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("support_sla_rules").select(SELECT).order("priority", { ascending: true });
    if (error) {
      console.error("supportSlaService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: SupportSlaRuleInput): Promise<SupportSlaRule> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("support_sla_rules")
      .insert({
        department_id: input.departmentId || null,
        category_code: input.categoryCode || null,
        priority: input.priority,
        first_response_minutes: input.firstResponseMinutes,
        resolution_minutes: input.resolutionMinutes,
        business_hours_only: input.businessHoursOnly ?? true,
      })
      .select(SELECT)
      .single();
    if (error) {
      console.error("supportSlaService.create failed:", error);
      throw new Error("Could not create this SLA rule.");
    }
    return mapRow(data);
  },

  async update(id: string, input: Partial<SupportSlaRuleInput> & { active?: boolean }): Promise<void> {
    const supabase = await createClient();
    const row: Record<string, unknown> = {};
    if (input.firstResponseMinutes !== undefined) row.first_response_minutes = input.firstResponseMinutes;
    if (input.resolutionMinutes !== undefined) row.resolution_minutes = input.resolutionMinutes;
    if (input.businessHoursOnly !== undefined) row.business_hours_only = input.businessHoursOnly;
    if (input.active !== undefined) row.active = input.active;
    const { error } = await supabase.from("support_sla_rules").update(row).eq("id", id);
    if (error) throw new Error("Could not update this SLA rule.");
  },

  /** Resolves the most specific ACTIVE rule for a priority — a
   *  department+category match beats a department-only match beats
   *  the global default. Never a hard-coded promise. */
  async resolveRule(priority: SupportTicketPriority, departmentId?: string, categoryCode?: string): Promise<SupportSlaRule | undefined> {
    const rules = await this.list();
    const active = rules.filter((r) => r.active && r.priority === priority);
    const exact = active.find((r) => r.departmentId === departmentId && r.categoryCode === categoryCode && (departmentId || categoryCode));
    if (exact) return exact;
    const departmentOnly = active.find((r) => r.departmentId === departmentId && !r.categoryCode && departmentId);
    if (departmentOnly) return departmentOnly;
    return active.find((r) => !r.departmentId && !r.categoryCode);
  },

  async computeDueDates(priority: SupportTicketPriority, departmentId: string | undefined, categoryCode: string, from: Date): Promise<{ ruleId?: string; responseDueAt?: string; resolutionDueAt?: string }> {
    const rule = await this.resolveRule(priority, departmentId, categoryCode);
    if (!rule) return {};
    const settings = await supportSettingsService.get();
    const responseDueAt = rule.businessHoursOnly ? addBusinessMinutes(from, rule.firstResponseMinutes, settings) : new Date(from.getTime() + rule.firstResponseMinutes * 60000);
    const resolutionDueAt = rule.businessHoursOnly ? addBusinessMinutes(from, rule.resolutionMinutes, settings) : new Date(from.getTime() + rule.resolutionMinutes * 60000);
    return { ruleId: rule.id, responseDueAt: responseDueAt.toISOString(), resolutionDueAt: resolutionDueAt.toISOString() };
  },
};
