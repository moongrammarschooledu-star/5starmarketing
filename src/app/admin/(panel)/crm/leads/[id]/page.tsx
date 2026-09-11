import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Building2, Info, MessageSquareText, AlertTriangle, Megaphone, Archive, Handshake } from "lucide-react";
import { leadService } from "@/services/leadService";
import { dealService } from "@/services/dealService";
import { communicationLogService } from "@/services/communicationLogService";
import { whatsappService } from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { profileService } from "@/services/profileService";
import { teamService } from "@/services/teamService";
import { followUpService } from "@/services/followUpService";
import { leadScoringService } from "@/services/leadScoringService";
import { marketingTagService } from "@/services/marketingTagService";
import { LeadScorePanel } from "@/components/admin/marketing/LeadScorePanel";
import { LeadActionsPanel } from "@/components/admin/LeadActionsPanel";
import { LeadNotes } from "@/components/admin/LeadNotes";
import { LeadFollowUps } from "@/components/admin/LeadFollowUps";
import { WhatsAppActivityLog } from "@/components/admin/WhatsAppActivityLog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { crmStatusLabel } from "@/lib/models/crm";
import { PriorityBadge } from "@/components/admin/crm/PriorityBadge";
import { LeadCrmDetailsPanel } from "@/components/admin/crm/LeadCrmDetailsPanel";
import { CommunicationLogPanel } from "@/components/admin/crm/CommunicationLogPanel";
import { LeadAssignmentHistoryPanel } from "@/components/admin/crm/LeadAssignmentHistoryPanel";
import { LeadStatusActionsPanel } from "@/components/admin/crm/LeadStatusActionsPanel";
import { formatDateOnly } from "@/lib/date";
import { canAccess } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CrmLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("leads");
  const { id } = await params;
  const lead = await leadService.getById(id);
  if (!lead) notFound();

  const [property, project, notes, duplicates, templates, settings, admin, activity, assignableAgents, followUps, communications, assignmentHistory, existingDeal, scoreHistory, allTags, leadTags] =
    await Promise.all([
      lead.propertyId ? leadService.getLeadProperty(lead.propertyId) : Promise.resolve(undefined),
      lead.projectId ? leadService.getLeadProject(lead.projectId) : Promise.resolve(undefined),
      leadService.listNotes(lead.id),
      leadService.findPossibleDuplicates(lead.id, lead.phone, lead.whatsapp),
      whatsappService.listTemplates(),
      settingsService.get(),
      profileService.getCurrentAdmin(),
      whatsappService.listActivity(lead.id),
      teamService.listAssignable(),
      followUpService.listByLead(lead.id),
      communicationLogService.listByLead(lead.id),
      leadService.listAssignmentHistory(lead.id),
      dealService.getByLeadId(lead.id),
      leadScoringService.listHistory(lead.id),
      marketingTagService.list(),
      marketingTagService.listForLead(lead.id),
    ]);

  const canManage = admin ? canAccess(admin.role, "team") : false;
  const canCreateDeal = admin ? canAccess(admin.role, "deals") : false;

  return (
    <div>
      <Link href="/admin/crm/leads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{lead.name}</h1>
          <p className="mt-1 text-sm text-muted">Lead received {new Date(lead.createdAt).toLocaleString("en-GB")}</p>
        </div>
        <div className="flex items-center gap-2">
          {lead.archived && (
            <span className="flex items-center gap-1.5 rounded-full bg-muted/20 px-3 py-1 text-xs font-bold text-muted">
              <Archive className="h-3.5 w-3.5" /> Archived
            </span>
          )}
          <PriorityBadge priority={lead.priority} />
          <StatusBadge status={crmStatusLabel(lead.status)} />
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <div>
            <span className="font-bold">Possible duplicate lead.</span> {duplicates.length} other lead{duplicates.length > 1 ? "s" : ""}{" "}
            {duplicates.length > 1 ? "share" : "shares"} this phone/WhatsApp number:{" "}
            {duplicates.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link href={`/admin/crm/leads/${d.id}`} className="font-semibold underline">
                  {d.name}
                </Link>
              </span>
            ))}
            . Review before contacting, or use Merge Duplicate below — nothing has been merged automatically.
          </div>
        </div>
      )}

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
              {lead.lastContactedAt && <Row label="Last Contacted" value={new Date(lead.lastContactedAt).toLocaleString("en-GB")} />}
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
                {!property && lead.propertyId && (
                  <p className="text-xs text-muted-foreground sm:col-span-2">This property has since been removed or edited.</p>
                )}
              </div>
              {property && (
                <Link href={`/properties/${property.slug}`} target="_blank" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
                  View property on site →
                </Link>
              )}
            </div>
          )}

          {(project || lead.projectTitle) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Building2 className="h-4.5 w-4.5 text-primary" /> Project Information
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Project" value={project?.name ?? lead.projectTitle ?? "—"} />
                {project && <Row label="Location" value={project.location} />}
              </div>
              {project && (
                <Link href={`/projects/${project.slug}`} target="_blank" className="mt-3 inline-block text-xs font-bold text-primary hover:underline">
                  View project on site →
                </Link>
              )}
              {lead.projectId && canCreateDeal && (
                <Link href={`/admin/inventory/projects/${lead.projectId}`} className="mt-3 ml-4 inline-block text-xs font-bold text-primary hover:underline">
                  Check unit availability →
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <Info className="h-4.5 w-4.5 text-primary" /> Lead Information
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Row label="Source" value={lead.source} />
              <Row label="Status" value={crmStatusLabel(lead.status)} />
              <Row label="Created" value={new Date(lead.createdAt).toLocaleString("en-GB")} />
              <Row label="Last Updated" value={new Date(lead.updatedAt).toLocaleString("en-GB")} />
              <Row label="Consent to Contact" value={lead.consent ? "Yes" : "Not confirmed"} />
              <Row
                label="Next Follow-Up"
                value={lead.nextFollowUpDate ? `${formatDateOnly(lead.nextFollowUpDate)}${lead.nextFollowUpTime ? " " + lead.nextFollowUpTime.slice(0, 5) : ""}` : "Not scheduled"}
              />
              {lead.status === "Lost" && lead.lostReason && <Row label="Lost Reason" value={lead.lostReason} />}
              {lead.status === "Closed" && lead.convertedAt && <Row label="Converted" value={new Date(lead.convertedAt).toLocaleString("en-GB")} />}
              {lead.convertedByName && <Row label="Converted By" value={lead.convertedByName} />}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
              <MessageSquareText className="h-4.5 w-4.5 text-primary" /> Message
            </h2>
            <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-muted p-3.5 text-sm text-ink">{lead.message || "—"}</p>
          </div>

          {(lead.campaignName || lead.firstTouchSource || lead.lastTouchSource) && (
            <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-heading text-base font-bold text-ink">
                <Megaphone className="h-4.5 w-4.5 text-primary" /> Marketing Attribution
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {lead.campaignName && <Row label="Campaign" value={lead.campaignName} />}
                <Row label="First Source" value={lead.firstTouchSource ?? "—"} />
                <Row label="First Medium" value={lead.firstTouchMedium ?? "—"} />
                <Row label="First Campaign" value={lead.firstTouchCampaign ?? "—"} />
                <Row label="First Landing Page" value={lead.firstTouchLandingPage ?? "—"} />
                <Row label="Last Source" value={lead.lastTouchSource ?? "—"} />
                <Row label="Last Medium" value={lead.lastTouchMedium ?? "—"} />
                <Row label="Last Campaign" value={lead.lastTouchCampaign ?? "—"} />
                <Row label="Last Landing Page" value={lead.lastTouchLandingPage ?? "—"} />
              </div>
            </div>
          )}

          <LeadCrmDetailsPanel lead={lead} />

          <LeadFollowUps leadId={lead.id} followUps={followUps} agentId={lead.assignedAgentId ?? ""} />

          <LeadNotes leadId={lead.id} notes={notes} />

          <CommunicationLogPanel leadId={lead.id} entries={communications} />

          <LeadAssignmentHistoryPanel entries={assignmentHistory} />

          <WhatsAppActivityLog leadId={lead.id} activity={activity} />
        </div>

        <div className="space-y-6">
          {canCreateDeal && (
            <Link
              href={existingDeal ? `/admin/deals/${existingDeal.id}` : `/admin/deals/new?lead=${lead.id}`}
              className="flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-bold text-white hover:bg-ink/90"
            >
              <Handshake className="h-4 w-4" /> {existingDeal ? `View Deal ${existingDeal.dealNumber}` : "Create Deal"}
            </Link>
          )}
          <LeadScorePanel lead={lead} history={scoreHistory} allTags={allTags} leadTags={leadTags} />
          <LeadStatusActionsPanel lead={lead} duplicates={duplicates} />
          <LeadActionsPanel
            lead={lead}
            property={property}
            templates={templates}
            whatsappNumber={settings.whatsapp}
            agentName={admin?.name ?? "5STAR.M Team"}
            assignableAgents={assignableAgents}
            canAssign={canManage}
            canDelete={canManage}
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
