import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MobileActorType, PushSubscriptionRecord, WebPushSubscriptionInput } from "@/lib/models/mobile";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): PushSubscriptionRecord {
  return {
    id: row.id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    authKey: row.auth_key,
    deviceLabel: row.device_label ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

export const pushSubscriptionService = {
  /** Registers (or refreshes) a browser's Web Push subscription for the
   *  current actor. Upserts on endpoint — the same browser/device
   *  re-subscribing just touches last_seen_at rather than duplicating. */
  async register(
    actorType: MobileActorType,
    actorId: string,
    subscription: WebPushSubscriptionInput,
    deviceLabel?: string,
    userAgent?: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        actor_type: actorType,
        actor_id: actorId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        device_label: deviceLabel ?? null,
        user_agent: userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
    if (error) {
      console.error("pushSubscriptionService.register failed:", error);
      throw new Error("Could not register this device for notifications.");
    }
  },

  async unregister(endpoint: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  },

  async listForActor(actorId: string): Promise<PushSubscriptionRecord[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("push_subscriptions").select("*").eq("actor_id", actorId);
    if (error) {
      console.error("pushSubscriptionService.listForActor failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Called by the push provider after a delivery attempt comes back
   *  404/410 (gone) — the browser/device no longer holds that
   *  subscription, so it's pruned rather than retried forever. */
  async removeByEndpoint(endpoint: string): Promise<void> {
    const supabase = await createClient();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  },
};
