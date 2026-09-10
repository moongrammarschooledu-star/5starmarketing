import "server-only";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { activityService } from "./activityService";
import { leadService } from "./leadService";
import type { AdminUser, TeamMemberInput, TeamMemberUpdateInput } from "@/lib/models/user";
import type { AgentPerformance } from "@/lib/models/team";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): AdminUser {
  return {
    id: row.id,
    email: row.email ?? "",
    name: row.name,
    title: row.title,
    role: row.role,
    profileImage: row.profile_image ?? undefined,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    specialization: row.specialization ?? undefined,
    bio: row.bio ?? undefined,
    status: row.status ?? "Active",
    availability: row.availability ?? "Available",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateTempPassword(): string {
  // 16 random bytes, base64url — well above Supabase's minimum length,
  // no characters that break copy/paste over WhatsApp or email.
  return randomBytes(16).toString("base64url");
}

export interface TeamMemberSummary extends AdminUser {
  openLeads: number;
  closedLeads: number;
  assignedLeads: number;
}

export const teamService = {
  /** Full roster + per-agent open/closed/assigned lead counts for
   *  /admin/team — one query for profiles, one for the lead tally, joined
   *  in memory (avoids an N+1 query per agent card). */
  async list(): Promise<TeamMemberSummary[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("admin_profiles").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("teamService.list failed:", error);
      return [];
    }
    const counts = await leadService.countByAgent();
    return (data ?? []).map((row) => {
      const c = counts.get(row.id) ?? { total: 0, open: 0, closed: 0 };
      return { ...mapRow(row), openLeads: c.open, closedLeads: c.closed, assignedLeads: c.total };
    });
  },

  async search(query: string): Promise<TeamMemberSummary[]> {
    const all = await this.list();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
    );
  },

  async getById(id: string): Promise<AdminUser | undefined> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("admin_profiles").select("*").eq("id", id).maybeSingle();
    if (error || !data) return undefined;
    return mapRow(data);
  },

  /** Every admin_profiles row for populating "Assign Agent" dropdowns —
   *  active agents/managers only, name + id is all a dropdown needs. */
  async listAssignable(): Promise<{ id: string; name: string; role: string; availability: string }[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("admin_profiles")
      .select("id, name, role, availability")
      .eq("status", "Active")
      .in("role", ["sales_agent", "sales_manager", "admin", "super_admin"])
      .order("name", { ascending: true });
    if (error) return [];
    return data ?? [];
  },

  /** Creates a real Supabase Auth account (via the service-role admin
   *  API — never the public /register signup, so this never collides
   *  with the customer_profiles trigger branch) plus the matching
   *  admin_profiles row, and returns a one-time temporary password for
   *  the admin to hand to the new team member. Never creates a second
   *  auth account for an email that already has one — Supabase's own
   *  "email already registered" error surfaces as a thrown Error. */
  async create(input: TeamMemberInput): Promise<{ user: AdminUser; tempPassword: string }> {
    const admin = createServiceRoleClient();
    const tempPassword = generateTempPassword();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: input.fullName, account_type: "admin" },
    });
    if (createError || !created.user) {
      console.error("teamService.create (auth) failed:", createError);
      throw new Error(createError?.message || "Could not create this team member's account.");
    }

    // handle_new_admin_user already inserted a base admin_profiles row
    // (role "admin", title "Director") — fill in the real details rather
    // than inserting a second row.
    const { data: profile, error: profileError } = await admin
      .from("admin_profiles")
      .update({
        name: input.fullName,
        title: input.role === "sales_agent" ? "Sales Agent" : input.role === "sales_manager" ? "Sales Manager" : "Admin",
        role: input.role,
        status: input.status,
        phone: input.phone || null,
        whatsapp: input.whatsapp || null,
        profile_image: input.profileImage || null,
        specialization: input.specialization || null,
        bio: input.bio || null,
      })
      .eq("id", created.user.id)
      .select("*")
      .single();

    if (profileError || !profile) {
      console.error("teamService.create (profile) failed:", profileError);
      throw new Error("Account was created but the profile could not be saved. Please edit this team member to fill in their details.");
    }

    await activityService.log("Agent Created", `${input.fullName} (${input.role})`, "team", created.user.id);

    return { user: mapRow(profile), tempPassword };
  },

  async update(id: string, input: TeamMemberUpdateInput): Promise<AdminUser | undefined> {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {};
    if (input.fullName !== undefined) patch.name = input.fullName;
    if (input.phone !== undefined) patch.phone = input.phone || null;
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp || null;
    if (input.profileImage !== undefined) patch.profile_image = input.profileImage || null;
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;
    if (input.specialization !== undefined) patch.specialization = input.specialization || null;
    if (input.bio !== undefined) patch.bio = input.bio || null;

    const { data, error } = await supabase.from("admin_profiles").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) {
      console.error("teamService.update failed:", error);
      throw new Error("Could not update this team member.");
    }
    if (!data) return undefined;
    await activityService.log("Agent Updated", data.name, "team", id);
    return mapRow(data);
  },

  async setStatus(id: string, status: "Active" | "Inactive"): Promise<void> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("admin_profiles").update({ status }).eq("id", id).select("name").maybeSingle();
    if (error) throw new Error("Could not update this team member's status.");
    await activityService.log(status === "Active" ? "Agent Activated" : "Agent Deactivated", data?.name ?? "", "team", id);
  },

  async setAvailability(id: string, availability: "Available" | "Busy" | "On Leave" | "Inactive"): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("admin_profiles").update({ availability }).eq("id", id);
    if (error) throw new Error("Could not update availability.");
  },

  /** Real, from-data metrics for one agent — every number comes straight
   *  from `leads`/`follow_ups`; nothing is estimated when data is thin.
   *  conversionRate/avgFollowUpCompletionHours come back null (never 0
   *  or a guess) when there isn't enough data to mean anything. */
  async performanceFor(agentId: string, sinceISO?: string): Promise<AgentPerformance> {
    const supabase = await createClient();
    const agent = await this.getById(agentId);

    let leadsQuery = supabase.from("leads").select("status").eq("assigned_agent_id", agentId);
    if (sinceISO) leadsQuery = leadsQuery.gte("created_at", sinceISO);
    const { data: leadRows, error: leadsError } = await leadsQuery;
    if (leadsError) console.error("teamService.performanceFor (leads) failed:", leadsError);
    const leads = leadRows ?? [];
    const count = (s: string) => leads.filter((l) => l.status === s).length;

    let followUpsQuery = supabase
      .from("follow_ups")
      .select("created_at, updated_at")
      .eq("assigned_agent_id", agentId)
      .eq("status", "Completed");
    if (sinceISO) followUpsQuery = followUpsQuery.gte("created_at", sinceISO);
    const { data: followUpRows, error: followUpsError } = await followUpsQuery;
    if (followUpsError) console.error("teamService.performanceFor (follow_ups) failed:", followUpsError);
    const completedFollowUps = followUpRows ?? [];

    const closed = count("closed");
    const lost = count("lost");
    const assigned = leads.length;

    let avgFollowUpCompletionHours: number | null = null;
    if (completedFollowUps.length > 0) {
      const totalHours = completedFollowUps.reduce((sum, f) => {
        const created = new Date(f.created_at).getTime();
        const updated = new Date(f.updated_at).getTime();
        return sum + (updated - created) / 3_600_000;
      }, 0);
      avgFollowUpCompletionHours = totalHours / completedFollowUps.length;
    }

    return {
      agentId,
      agentName: agent?.name ?? "Unknown",
      assigned,
      contacted: count("contacted"),
      interested: count("interested"),
      siteVisits: count("site_visit"),
      closed,
      lost,
      conversionRate: assigned > 0 ? closed / assigned : null,
      avgFollowUpCompletionHours,
    };
  },

  async performanceAll(sinceISO?: string): Promise<AgentPerformance[]> {
    const roster = await this.list();
    const agents = roster.filter((m) => m.role === "sales_agent" || m.role === "sales_manager");
    return Promise.all(agents.map((a) => this.performanceFor(a.id, sinceISO)));
  },
};
