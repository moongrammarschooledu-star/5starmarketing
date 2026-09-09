import "server-only";
import { createClient } from "@/lib/supabase/server";
import { profileService } from "./profileService";
import { leadService } from "./leadService";
import type { ActivityLogEntry } from "@/lib/models/analytics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): ActivityLogEntry {
  return {
    id: row.id,
    adminName: row.admin_name ?? "Admin",
    action: row.action,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    description: row.description,
    createdAt: row.created_at,
  };
}

export const activityService = {
  /** Best-effort — called after a real admin mutation succeeds. A logging
   *  failure must never undo or block the action it's describing. */
  async log(action: string, description: string, entityType?: string, entityId?: string): Promise<void> {
    try {
      const supabase = await createClient();
      const admin = await profileService.getCurrentAdmin();
      await supabase.from("activity_logs").insert({
        admin_id: admin?.id ?? null,
        admin_name: admin?.name ?? "Admin",
        action,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        description,
      });
    } catch (e) {
      console.error("activityService.log failed:", e);
    }
  },

  async recent(limit = 10): Promise<ActivityLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("activityService.recent failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async list(limit = 100, offset = 0): Promise<ActivityLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.error("activityService.list failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Recent Activity feed (STEP 9, section 13) — merges real admin
   *  actions (activity_logs) with real newly-received leads. New leads
   *  are read live from `leads` rather than written into activity_logs,
   *  since a lead can be submitted by an anonymous visitor and
   *  activity_logs only accepts authenticated (admin) writes — this way
   *  the feed stays accurate without loosening that RLS boundary. */
  async recentFeed(limit = 10): Promise<ActivityLogEntry[]> {
    const [actions, leads] = await Promise.all([this.list(limit), leadService.listRecent(limit)]);
    const leadEntries: ActivityLogEntry[] = leads.map((l) => ({
      id: `lead-${l.id}`,
      adminName: "Website",
      action: "New Lead Received",
      entityType: "lead",
      entityId: l.id,
      description: l.propertyTitle ? `${l.name} — inquiry about ${l.propertyTitle}` : `${l.name} — general inquiry`,
      createdAt: l.createdAt,
    }));
    return [...actions, ...leadEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  },
};
