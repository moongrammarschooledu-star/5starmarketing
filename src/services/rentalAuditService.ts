import "server-only";
import { createClient } from "@/lib/supabase/server";

export const rentalAuditService = {
  /** Best-effort — mirrors constructionAuditService/maintenanceAuditService's
   *  logAudit convention: never blocks or throws on the caller's behalf. */
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
      await supabase.from("rental_audit_logs").insert({
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
      console.error("rentalAuditService.log failed:", e);
    }
  },

  async listForEntity(entityType: string, entityId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_audit_logs").select("*").eq("entity_type", entityType).eq("entity_id", entityId).order("created_at", { ascending: false });
    if (error) return [];
    return data ?? [];
  },

  async recent(limit = 50) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("rental_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (error) return [];
    return data ?? [];
  },
};
