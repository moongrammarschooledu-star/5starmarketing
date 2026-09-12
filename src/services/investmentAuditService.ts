import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentAuditLogEntry } from "@/lib/models/investment";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InvestmentAuditLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name ?? undefined,
    oldValue: row.old_value ?? undefined,
    newValue: row.new_value ?? undefined,
    reason: row.reason ?? undefined,
    createdAt: row.created_at,
  };
}

export const investmentAuditService = {
  /** Best-effort — mirrors financialAuditService/communicationService's
   *  logAudit convention: never blocks or throws on the caller's
   *  behalf. */
  async log(entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId?: string;
    actorName?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldValue?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newValue?: any;
    reason?: string;
  }): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("investment_audit_logs").insert({
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        actor_id: entry.actorId || null,
        actor_name: entry.actorName || null,
        old_value: entry.oldValue ?? null,
        new_value: entry.newValue ?? null,
        reason: entry.reason || null,
      });
    } catch (e) {
      console.error("investmentAuditService.log failed:", e);
    }
  },

  async listForEntity(entityType: string, entityId: string): Promise<InvestmentAuditLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_audit_logs").select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async recent(limit = 50): Promise<InvestmentAuditLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return (data ?? []).map(mapRow);
  },
};
