import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentEventInput } from "@/lib/models/investment";

export const investmentEventService = {
  /** Best-effort tracking (section 35) — mirrors search_events'
   *  dedicated-table convention; never fabricates a count, never
   *  blocks the caller if the insert fails. */
  async track(input: InvestmentEventInput, customerId?: string): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("investment_events").insert({
        event_type: input.eventType,
        property_id: input.propertyId || null,
        project_id: input.projectId || null,
        session_id: input.sessionId || null,
        customer_id: customerId || null,
        utm_source: input.utmSource || null,
        utm_medium: input.utmMedium || null,
        utm_campaign: input.utmCampaign || null,
        utm_content: input.utmContent || null,
        utm_term: input.utmTerm || null,
        metadata: input.metadata ?? null,
      });
    } catch (e) {
      console.error("investmentEventService.track failed:", e);
    }
  },

  async countByType(sinceIso?: string): Promise<Record<string, number>> {
    const supabase = await createClient();
    let query = supabase.from("investment_events").select("event_type");
    if (sinceIso) query = query.gte("created_at", sinceIso);
    const { data, error } = await query;
    if (error) return {};
    const counts: Record<string, number> = {};
    for (const row of data ?? []) counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
    return counts;
  },
};
