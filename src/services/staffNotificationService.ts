import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StaffNotification, StaffNotificationType } from "@/lib/models/team";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): StaffNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    read: !!row.read,
    createdAt: row.created_at,
  };
}

export const staffNotificationService = {
  async list(userId: string, limit = 20): Promise<StaffNotification[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("staffNotificationService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async unreadCount(userId: string): Promise<number> {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);
    if (error) return 0;
    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  },

  async markAllRead(userId: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
  },

  /** Best-effort — never blocks the admin/agent action it's attached to.
   *  entityType/entityId let the notification center link straight to the
   *  lead/appointment/follow-up it's about. */
  async notify(
    userId: string,
    type: StaffNotificationType,
    title: string,
    message: string,
    entityType?: string,
    entityId?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title,
        message,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
      });
    } catch (e) {
      console.error("staffNotificationService.notify failed:", e);
    }
  },
};
