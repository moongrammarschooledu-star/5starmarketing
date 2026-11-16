import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireSection } from "@/lib/guard";
import { agentContactService } from "@/services/agentContactService";
import { propertyService } from "@/services/propertyService";
import { propertyAgentLines } from "@/lib/shareDetails";
import { formatDateOnlyShort } from "@/lib/date";
import type { AgentContact } from "@/lib/models/agentContact";
import { AgentContactsView, type AgentRow, type AgentShareProperty } from "@/components/admin/AgentContactsView";

export const metadata: Metadata = { title: "Real Estate Agents" };
export const dynamic = "force-dynamic";

export default async function AdminAgentContactsPage() {
  await requireSection("contacts");

  let agents: AgentContact[] = [];
  let loadError: string | null = null;
  try {
    agents = await agentContactService.list();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load the agent contacts.";
  }

  let properties: AgentShareProperty[] = [];
  try {
    const all = await propertyService.list();
    properties = all
      .filter((p) => p.status === "Available")
      .sort((a, b) => (b.serialNo ?? "").localeCompare(a.serialNo ?? ""))
      .map((p) => ({
        id: p.id,
        serialNo: p.serialNo ?? "",
        title: p.title,
        purpose: p.purpose,
        price: p.price,
        location: p.location,
        lines: propertyAgentLines(p),
      }));
  } catch {
    properties = [];
  }

  const rows: AgentRow[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    agency: a.agency ?? "",
    area: a.area ?? "",
    phone: a.phone,
    whatsapp: a.whatsapp || a.phone,
    whatsappRaw: a.whatsapp ?? "",
    remarks: a.remarks ?? "",
    status: a.status,
    lastContacted: a.lastContactedAt ? formatDateOnlyShort(a.lastContactedAt.slice(0, 10)) : "",
    added: formatDateOnlyShort(a.createdAt.slice(0, 10)),
  }));

  return (
    <div>
      <div>
        <h1 className="font-heading text-2xl font-extrabold text-ink">Real Estate Agents</h1>
        <p className="mt-1 text-sm text-muted">
          Other real estate agents and dealers. Save their real estate name, area and number, then tick them to introduce our website or send them the details of any
          property, so they can offer it to their own clients. Private - never shown on the website.
        </p>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <AgentContactsView rows={rows} properties={properties} />
    </div>
  );
}
