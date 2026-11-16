import "server-only";
import { createClient } from "@/lib/supabase/server";
import { agentStatuses, type AgentContact, type AgentContactInput, type AgentStatus } from "@/lib/models/agentContact";

const MAX_ROWS = 5000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AgentContact {
  return {
    id: row.id,
    name: row.name,
    agency: row.agency ?? undefined,
    phone: row.phone,
    whatsapp: row.whatsapp ?? undefined,
    area: row.area ?? undefined,
    remarks: row.remarks ?? undefined,
    status: (agentStatuses as readonly string[]).includes(row.status) ? (row.status as AgentStatus) : "New",
    lastContactedAt: row.last_contacted_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: AgentContactInput) {
  return {
    name: input.name,
    agency: input.agency ?? null,
    phone: input.phone,
    whatsapp: input.whatsapp ?? null,
    area: input.area ?? null,
    remarks: input.remarks ?? null,
    status: input.status,
  };
}

export const agentContactService = {
  async list(): Promise<AgentContact[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("agent_contacts").select("*").order("created_at", { ascending: false }).limit(MAX_ROWS);
    if (error) {
      console.error("agentContactService.list failed:", error);
      throw new Error(
        error.code === "42P01" || /does not exist|schema cache/i.test(error.message)
          ? "The agent contacts table is not set up in the database yet."
          : "Could not load the agent contacts."
      );
    }
    return (data ?? []).map(mapRow);
  },

  async create(input: AgentContactInput, adminId?: string): Promise<AgentContact> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_contacts")
      .insert({ ...toRow(input), created_by: adminId ?? null })
      .select("*")
      .single();
    if (error) {
      console.error("agentContactService.create failed:", error);
      throw new Error("Could not save this agent.");
    }
    return mapRow(data);
  },

  /** Adds many agents in one go; returns how many were saved. */
  async createMany(inputs: AgentContactInput[], adminId?: string): Promise<number> {
    if (inputs.length === 0) return 0;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_contacts")
      .insert(inputs.map((i) => ({ ...toRow(i), created_by: adminId ?? null })))
      .select("id");
    if (error) {
      console.error("agentContactService.createMany failed:", error);
      throw new Error("Could not save these agents.");
    }
    return data?.length ?? 0;
  },

  async update(id: string, input: AgentContactInput): Promise<AgentContact | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_contacts")
      .update({ ...toRow(input), updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("agentContactService.update failed:", error);
      throw new Error("Could not update this agent.");
    }
    return data ? mapRow(data) : undefined;
  },

  async setStatus(id: string, status: AgentStatus): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("agent_contacts").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      console.error("agentContactService.setStatus failed:", error);
      throw new Error("Could not change the status.");
    }
  },

  /** Notes that the agent was messaged now; a brand-new agent becomes "Contacted". */
  async markContacted(id: string): Promise<void> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    await supabase.from("agent_contacts").update({ last_contacted_at: now, updated_at: now }).eq("id", id);
    await supabase.from("agent_contacts").update({ status: "Contacted" }).eq("id", id).eq("status", "New");
  },

  async getById(id: string): Promise<AgentContact | undefined> {
    const supabase = await createClient();
    const { data } = await supabase.from("agent_contacts").select("*").eq("id", id).maybeSingle();
    return data ? mapRow(data) : undefined;
  },

  async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("agent_contacts").delete().eq("id", id);
    if (error) {
      console.error("agentContactService.remove failed:", error);
      throw new Error("Could not delete this agent.");
    }
  },
};
