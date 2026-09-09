import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CustomerNotification, NotificationType } from "@/lib/models/customer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CustomerNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: !!row.read,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    createdAt: row.created_at,
  };
}

export const notificationService = {
  async list(userId: string, limit = 20): Promise<CustomerNotification[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("notificationService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async unreadCount(userId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("customer_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) return 0;
    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("customer_notifications").update({ read: true }).eq("id", id);
  },

  /** Called from admin actions (e.g. a lead status change) to notify the
   *  customer who owns that lead, if any. Best-effort — never blocks the
   *  admin action it's attached to. No email/WhatsApp is sent; this only
   *  creates the in-portal notification row. */
  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("customer_notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
      });
    } catch (e) {
      console.error("notificationService.notify failed:", e);
    }
  },
};
