import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MobileActorType, PwaInstallEventType, PwaInstallStats } from "@/lib/models/mobile";

export const pwaAnalyticsService = {
  /** Best-effort — a failed analytics write should never break the
   *  install flow it's describing. */
  async logEvent(
    eventType: PwaInstallEventType,
    actor?: { actorType: MobileActorType; actorId: string },
    platform?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("pwa_install_events").insert({
        actor_type: actor?.actorType ?? null,
        actor_id: actor?.actorId ?? null,
        event_type: eventType,
        platform: platform ?? null,
        user_agent: userAgent ?? null,
      });
    } catch (e) {
      console.error("pwaAnalyticsService.logEvent failed:", e);
    }
  },

  /** Real counts only, over a real window — never an estimated or
   *  extrapolated figure. */
  async stats(days = 30): Promise<PwaInstallStats> {
    const supabase = await createClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from("pwa_install_events").select("event_type").gte("created_at", since);
    if (error) {
      console.error("pwaAnalyticsService.stats failed:", error);
      return { promptShown: 0, installed: 0, dismissed: 0, sinceDays: days };
    }
    let promptShown = 0;
    let installed = 0;
    let dismissed = 0;
    for (const row of data ?? []) {
      if (row.event_type === "PROMPT_SHOWN") promptShown += 1;
      else if (row.event_type === "INSTALLED") installed += 1;
      else if (row.event_type === "DISMISSED") dismissed += 1;
    }
    return { promptShown, installed, dismissed, sinceDays: days };
  },
};
