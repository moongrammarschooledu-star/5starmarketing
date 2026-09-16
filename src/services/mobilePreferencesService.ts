import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { MobileActorType, MobileAppPreferences, MobileAppPreferencesInput, NotificationCategory } from "@/lib/models/mobile";

const CATEGORY_FIELD: Record<NotificationCategory, keyof MobileAppPreferences> = {
  property: "notifyProperty",
  lead: "notifyLead",
  appointment: "notifyAppointment",
  payment: "notifyPayment",
  rental: "notifyRental",
  maintenance: "notifyMaintenance",
  support: "notifySupport",
  legal: "notifyLegal",
  construction: "notifyConstruction",
  marketing: "notifyMarketing",
  system: "notifySystem",
};

const DEFAULTS: Omit<MobileAppPreferences, "actorType" | "actorId" | "updatedAt"> = {
  pushEnabled: true,
  notifyProperty: true,
  notifyLead: true,
  notifyAppointment: true,
  notifyPayment: true,
  notifyRental: true,
  notifyMaintenance: true,
  notifySupport: true,
  notifyLegal: true,
  notifyConstruction: true,
  notifyMarketing: true,
  notifySystem: true,
  theme: "system",
  language: "en",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): MobileAppPreferences {
  return {
    actorType: row.actor_type,
    actorId: row.actor_id,
    pushEnabled: row.push_enabled,
    notifyProperty: row.notify_property,
    notifyLead: row.notify_lead,
    notifyAppointment: row.notify_appointment,
    notifyPayment: row.notify_payment,
    notifyRental: row.notify_rental,
    notifyMaintenance: row.notify_maintenance,
    notifySupport: row.notify_support,
    notifyLegal: row.notify_legal,
    notifyConstruction: row.notify_construction,
    notifyMarketing: row.notify_marketing,
    notifySystem: row.notify_system,
    theme: row.theme,
    language: row.language,
    updatedAt: row.updated_at,
  };
}

export const mobilePreferencesService = {
  /** Never fails — an actor with no row yet just gets the defaults
   *  (matches how every other "settings" screen in this codebase treats
   *  a missing singleton row). */
  async get(actorType: MobileActorType, actorId: string): Promise<MobileAppPreferences> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mobile_app_preferences")
      .select("*")
      .eq("actor_type", actorType)
      .eq("actor_id", actorId)
      .maybeSingle();
    if (error || !data) return { actorType, actorId, updatedAt: new Date().toISOString(), ...DEFAULTS };
    return mapRow(data);
  },

  async update(actorType: MobileActorType, actorId: string, input: MobileAppPreferencesInput): Promise<MobileAppPreferences> {
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.pushEnabled !== undefined) patch.push_enabled = input.pushEnabled;
    if (input.notifyProperty !== undefined) patch.notify_property = input.notifyProperty;
    if (input.notifyLead !== undefined) patch.notify_lead = input.notifyLead;
    if (input.notifyAppointment !== undefined) patch.notify_appointment = input.notifyAppointment;
    if (input.notifyPayment !== undefined) patch.notify_payment = input.notifyPayment;
    if (input.notifyRental !== undefined) patch.notify_rental = input.notifyRental;
    if (input.notifyMaintenance !== undefined) patch.notify_maintenance = input.notifyMaintenance;
    if (input.notifySupport !== undefined) patch.notify_support = input.notifySupport;
    if (input.notifyLegal !== undefined) patch.notify_legal = input.notifyLegal;
    if (input.notifyConstruction !== undefined) patch.notify_construction = input.notifyConstruction;
    if (input.notifyMarketing !== undefined) patch.notify_marketing = input.notifyMarketing;
    if (input.notifySystem !== undefined) patch.notify_system = input.notifySystem;
    if (input.theme !== undefined) patch.theme = input.theme;
    if (input.language !== undefined) patch.language = input.language;

    const { data, error } = await supabase
      .from("mobile_app_preferences")
      .upsert({ actor_type: actorType, actor_id: actorId, ...patch }, { onConflict: "actor_type,actor_id" })
      .select("*")
      .single();
    if (error) {
      console.error("mobilePreferencesService.update failed:", error);
      throw new Error("Could not save your preferences.");
    }
    return mapRow(data);
  },

  /** Whether the given category should push-notify this actor right
   *  now — used by the push dispatcher before every send. Defaults to
   *  true (matches the table's own column defaults) if no row exists
   *  or the lookup fails, so a brand-new actor isn't silently muted. */
  async categoryEnabled(actorType: MobileActorType, actorId: string, category: NotificationCategory): Promise<boolean> {
    const prefs = await this.get(actorType, actorId);
    if (!prefs.pushEnabled) return false;
    return prefs[CATEGORY_FIELD[category]] as boolean;
  },
};
