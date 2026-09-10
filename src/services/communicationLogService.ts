import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CommunicationLogEntry, CommunicationLogInput } from "@/lib/models/crm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): CommunicationLogEntry {
  return {
    id: row.id,
    leadId: row.lead_id,
    agentId: row.agent_id ?? undefined,
    agentName: row.admin_profiles?.name ?? undefined,
    communicationType: row.communication_type,
    direction: row.direction,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

/** A MANUAL record an agent/admin adds after actually contacting a
 *  customer (section 24) — nothing here is auto-generated, since no
 *  telephony/WhatsApp Business API is wired up in this deployment. */
export const communicationLogService = {
  async listByLead(leadId: string): Promise<CommunicationLogEntry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_log")
      .select("*, admin_profiles(name)")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("communicationLogService.listByLead failed:", error);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  /** Logging an Outgoing entry also stamps `leads.last_contacted_at` —
   *  the one place in the CRM that field is ever updated, since it's
   *  meant to reflect a real, logged contact attempt, never a status
   *  change or note. */
  async log(input: CommunicationLogInput, agentId?: string): Promise<CommunicationLogEntry> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("communication_log")
      .insert({
        lead_id: input.leadId,
        agent_id: agentId || null,
        communication_type: input.communicationType,
        direction: input.direction,
        summary: input.summary,
      })
      .select("*, admin_profiles(name)")
      .single();
    if (error) {
      console.error("communicationLogService.log failed:", error);
      throw new Error("Could not save this communication log entry.");
    }
    if (input.direction === "Outgoing") {
      await supabase.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", input.leadId);
    }
    return mapRow(data);
  },
};
