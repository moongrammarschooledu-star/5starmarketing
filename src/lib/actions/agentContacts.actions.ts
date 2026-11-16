"use server";

import { revalidatePath } from "next/cache";
import { agentContactService } from "@/services/agentContactService";
import { activityService } from "@/services/activityService";
import { profileService } from "@/services/profileService";
import { canAccess } from "@/lib/permissions";
import { toWhatsAppNumber } from "@/lib/site";
import { parseAgentList } from "@/lib/agentImport";
import { agentStatuses, type AgentContactInput, type AgentStatus } from "@/lib/models/agentContact";

export interface AgentFormState {
  error?: string;
  ok?: boolean;
  /** Result of "add many": how many were saved and what was left out. */
  added?: number;
  skipped?: string[];
}

const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

async function requireStaff() {
  const admin = await profileService.getCurrentAdmin();
  if (!admin || !canAccess(admin.role, "contacts")) return null;
  return admin;
}

function samePhone(a: string, b: string): boolean {
  return toWhatsAppNumber(a) === toWhatsAppNumber(b);
}

function readInput(formData: FormData): { input?: AgentContactInput; error?: string } {
  const name = text(formData, "name");
  const phone = text(formData, "phone");
  const whatsapp = text(formData, "whatsapp");
  if (!name) return { error: "The agent's name is required." };
  if (!PHONE_PATTERN.test(phone)) return { error: "Please enter a valid contact number." };
  if (whatsapp && !PHONE_PATTERN.test(whatsapp)) return { error: "The WhatsApp number does not look right." };
  const status = text(formData, "status");
  return {
    input: {
      name,
      agency: text(formData, "agency") || undefined,
      phone,
      whatsapp: whatsapp || undefined,
      area: text(formData, "area") || undefined,
      remarks: text(formData, "remarks") || undefined,
      status: (agentStatuses as readonly string[]).includes(status) ? (status as AgentStatus) : "New",
    },
  };
}

/** Adds an agent (id = null) or saves changes to one. */
export async function saveAgentContactAction(id: string | null, _prev: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const admin = await requireStaff();
  if (!admin) return { error: "You do not have access to Agent Contacts." };

  const { input, error } = readInput(formData);
  if (!input) return { error };

  try {
    const existing = await agentContactService.list();
    const clash = existing.find((a) => a.id !== id && (samePhone(a.phone, input.phone) || (a.whatsapp && samePhone(a.whatsapp, input.phone))));
    if (clash) return { error: `This number is already saved for ${clash.name}.` };

    if (id) {
      const updated = await agentContactService.update(id, input);
      if (!updated) return { error: "This agent no longer exists." };
      await activityService.log("Updated Agent Contact", updated.name, "agent_contact", id);
    } else {
      const created = await agentContactService.create(input, admin.id);
      await activityService.log("Added Agent Contact", created.name, "agent_contact", created.id);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save this agent." };
  }
  revalidatePath("/admin/agent-contacts");
  return { ok: true };
}

/** Adds many agents from a pasted list (one per line). Numbers that are already saved are skipped. */
export async function importAgentContactsAction(_prev: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const admin = await requireStaff();
  if (!admin) return { error: "You do not have access to Agent Contacts." };

  const raw = String(formData.get("list") ?? "");
  if (!raw.trim()) return { error: "Paste the list first - one agent per line." };
  const parsed = parseAgentList(raw);
  if (parsed.length > 1000) return { error: "Please add at most 1000 agents at a time." };

  const skipped: string[] = [];
  try {
    const existing = await agentContactService.list();
    const seen = new Set<string>();
    for (const a of existing) {
      seen.add(toWhatsAppNumber(a.phone));
      if (a.whatsapp) seen.add(toWhatsAppNumber(a.whatsapp));
    }
    const fresh: AgentContactInput[] = [];
    for (const p of parsed) {
      if (!p.agent) {
        skipped.push(`Line ${p.line}: ${p.error} ("${p.raw.slice(0, 40)}")`);
        continue;
      }
      const key = toWhatsAppNumber(p.agent.phone);
      if (seen.has(key)) {
        skipped.push(`Line ${p.line}: ${p.agent.name} - this number is already saved`);
        continue;
      }
      seen.add(key);
      fresh.push({ name: p.agent.name, phone: p.agent.phone, agency: p.agent.agency, area: p.agent.area, status: "New" });
    }
    const added = await agentContactService.createMany(fresh, admin.id);
    if (added > 0) await activityService.log("Added Agent Contacts", `${added} agents added from a list`, "agent_contact");
    revalidatePath("/admin/agent-contacts");
    return { ok: added > 0, added, skipped, error: added === 0 ? "No agent could be added from this list." : undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not save these agents." };
  }
}

export async function setAgentStatusAction(id: string, status: AgentStatus): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "You do not have access to Agent Contacts." };
  if (!(agentStatuses as readonly string[]).includes(status)) return { ok: false, error: "Unknown status." };
  try {
    await agentContactService.setStatus(id, status);
    revalidatePath("/admin/agent-contacts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not change the status." };
  }
}

export async function deleteAgentContactAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireStaff();
  if (!admin) return { ok: false, error: "You do not have access to Agent Contacts." };
  try {
    const existing = await agentContactService.getById(id);
    await agentContactService.remove(id);
    if (existing) await activityService.log("Deleted Agent Contact", existing.name, "agent_contact", id);
    revalidatePath("/admin/agent-contacts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not delete this agent." };
  }
}

/** Remembers that an agent was messaged (date + activity log). Never blocks opening WhatsApp or SMS. */
export async function logAgentMessagedAction(id: string, channel: "whatsapp" | "sms", propertyTitles?: string[]): Promise<void> {
  try {
    const admin = await requireStaff();
    if (!admin) return;
    const agent = await agentContactService.getById(id);
    if (!agent) return;
    await agentContactService.markContacted(id);
    const how = channel === "sms" ? "SMS" : "WhatsApp";
    const what = propertyTitles && propertyTitles.length ? ` - ${propertyTitles.slice(0, 3).join("; ")}${propertyTitles.length > 3 ? "..." : ""}` : "";
    await activityService.log("Messaged Agent", `${agent.name} by ${how}${what}`, "agent_contact", id);
    revalidatePath("/admin/agent-contacts");
  } catch (e) {
    console.error("logAgentMessagedAction failed:", e);
  }
}
