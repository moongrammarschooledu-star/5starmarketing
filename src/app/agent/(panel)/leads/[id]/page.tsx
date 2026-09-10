import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Building2, Info, MessageSquareText } from "lucide-react";
import { leadService } from "@/services/leadService";
import { whatsappService } from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { profileService } from "@/services/profileService";
import { followUpService } from "@/services/followUpService";
import { LeadActionsPanel } from "@/components/admin/LeadActionsPanel";
import { LeadFollowUps } from "@/components/admin/LeadFollowUps";
import { LeadNotes } from "@/components/admin/LeadNotes";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateOnly } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AgentLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // RLS (leads_agent_read) already scopes this to leads assigned to the
  // signed-in agent — a lead that isn't theirs simply doesn't come back.
  const lead = await leadService.getById(id);
  if (!lead) notFound();

  const [property, notes, templates, settings, admin, followUps] = await Promise.all([
    lead.propertyId ? leadService.getLeadProperty(lead.propertyId) : Promise.resolve(undefined),
    leadService.listNotes(lead.id),
    whatsappService.listTemplates(),
    settingsService.get(),
    profileService.getCurrentAdmin(),
    followUpService.listByLead(lead.id),
  ]);

  return (
    <div>
      <Link href="/agent/leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to My Leads
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{lead.name}</h1>
          <p className="mt-1 text-sm text-muted">Lead received {new Date(lead.createdAt).toLocaleString("en-GB")}</p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <User className="h-4.5 w-4.5 text-primary" /> Customer Information
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Name" value={lead.name} />
              <Row label="Phone" value={lead.phone} />
              {lead.whatsapp && <Row label="WhatsApp" value={lead.whatsapp} />}
              {lead.email && <Row label="Email" value={lead.email} />}
            </div>
          </div>

          {(property || lead.propertyTitle) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Building2 className="h-4.5 w-4.5 text-primary" /> Property Information
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Property" value={property?.title ?? lead.propertyTitle ?? "—"} />
                {property && (
                  <>
                    <Row label="Type" value={property.type} />
                    <Row label="Location" value={property.location} />
                    <Row label="Size" value={property.size} />
                    <Row label="Price" value={property.price} />
                  </>
                )}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Info className="h-4.5 w-4.5 text-primary" /> Lead Information
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Source" value={lead.source} />
              <Row label="Status" value={lead.status} />
              <Row label="Created" value={new Date(lead.createdAt).toLocaleString("en-GB")} />
              <Row
                label="Next Follow-Up"
                value={
                  lead.nextFollowUpDate
                    ? `${formatDateOnly(lead.nextFollowUpDate)}${lead.nextFollowUpTime ? " " + lead.nextFollowUpTime.slice(0, 5) : ""}`
                    : "Not scheduled"
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <MessageSquareText className="h-4.5 w-4.5 text-primary" /> Message
            </h2>
            <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-muted p-3.5 text-sm text-ink">{lead.message || "—"}</p>
          </div>

          <LeadFollowUps leadId={lead.id} followUps={followUps} agentId={lead.assignedAgentId ?? ""} />

          <LeadNotes leadId={lead.id} notes={notes} />
        </div>

        <div>
          <LeadActionsPanel
            lead={lead}
            property={property}
            templates={templates}
            whatsappNumber={settings.whatsapp}
            agentName={admin?.name ?? "5STAR.M Team"}
            assignableAgents={[]}
            canAssign={false}
            canDelete={false}
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
