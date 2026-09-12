import "server-only";
import { createClient } from "@/lib/supabase/server";
import { notificationService } from "./notificationService";
import type { InvestmentAlert, InvestmentAlertInput } from "@/lib/models/investment";

const SELECT = "*, properties(title), projects(name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): InvestmentAlert {
  return {
    id: row.id,
    customerId: row.customer_id,
    propertyId: row.property_id ?? undefined,
    propertyTitle: row.properties?.title ?? undefined,
    projectId: row.project_id ?? undefined,
    projectName: row.projects?.name ?? undefined,
    alertType: row.alert_type,
    thresholdValue: row.threshold_value != null ? Number(row.threshold_value) : undefined,
    active: !!row.active,
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const investmentAlertService = {
  async listForCustomer(customerId: string): Promise<InvestmentAlert[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("investment_alerts").select(SELECT).eq("customer_id", customerId).order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map(mapRow);
  },

  async create(customerId: string, input: InvestmentAlertInput): Promise<InvestmentAlert> {
    if (input.alertType === "PRICE_BELOW" || input.alertType === "YIELD_ABOVE" || input.alertType === "ROI_ABOVE") {
      if (input.thresholdValue == null || !Number.isFinite(input.thresholdValue)) throw new Error("Please enter a valid threshold value.");
    }
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_alerts")
      .insert({ customer_id: customerId, property_id: input.propertyId || null, project_id: input.projectId || null, alert_type: input.alertType, threshold_value: input.thresholdValue ?? null })
      .select(SELECT)
      .single();
    if (error) {
      console.error("investmentAlertService.create failed:", error);
      throw new Error("Could not create this alert.");
    }
    return mapRow(data);
  },

  async setActive(id: string, active: boolean): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("investment_alerts").update({ active }).eq("id", id);
    if (error) throw new Error("Could not update this alert.");
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("investment_alerts").delete().eq("id", id);
    if (error) throw new Error("Could not delete this alert.");
  },

  /** Opportunistic check (no background job runner in this deployment
   *  — same established pattern as followUpService.markOverdue/
   *  payableService.markOverdue): call this from a real page load
   *  (e.g. the customer's investments dashboard) to evaluate active
   *  PRICE_BELOW/AVAILABILITY alerts against real, current property
   *  data and notify only on a genuine match. */
  async checkPriceAndAvailabilityAlerts(): Promise<number> {
    const supabase = await createClient();
    const { data: alerts } = await supabase
      .from("investment_alerts")
      .select("*, properties(title, price_value, status)")
      .eq("active", true)
      .in("alert_type", ["PRICE_BELOW", "AVAILABILITY"])
      .not("property_id", "is", null);
    if (!alerts || alerts.length === 0) return 0;

    let triggered = 0;
    for (const alert of alerts) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const property = (alert as any).properties;
      if (!property) continue;
      let matched = false;
      let message = "";

      if (alert.alert_type === "PRICE_BELOW" && alert.threshold_value != null && property.price_value != null && Number(property.price_value) < Number(alert.threshold_value)) {
        matched = true;
        message = `${property.title} is now priced below your threshold.`;
      } else if (alert.alert_type === "AVAILABILITY" && property.status === "Available") {
        matched = true;
        message = `${property.title} is now available.`;
      }

      if (matched) {
        const alreadyToday = alert.last_triggered_at && new Date(alert.last_triggered_at).toDateString() === new Date().toDateString();
        if (!alreadyToday) {
          await supabase.from("investment_alerts").update({ last_triggered_at: new Date().toISOString() }).eq("id", alert.id);
          await notificationService.notify(alert.customer_id, "investment_alert_triggered", "Investment alert triggered", message, "property", alert.property_id ?? undefined);
          triggered += 1;
        }
      }
    }
    return triggered;
  },
};
