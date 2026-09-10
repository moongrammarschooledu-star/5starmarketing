import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, Building2, Info, MessageSquareText, AlertTriangle, Megaphone } from "lucide-react";
import { leadService } from "@/services/leadService";
import { whatsappService } from "@/services/whatsappService";
import { settingsService } from "@/services/settingsService";
import { profileService } from "@/services/profileService";
import { teamService } from "@/services/teamService";
import { followUpService } from "@/services/followUpService";
import { LeadActionsPanel } from "@/components/admin/LeadActionsPanel";
import { LeadNotes } from "@/components/admin/LeadNotes";
import { LeadFollowUps } from "@/components/admin/LeadFollowUps";
import { WhatsAppActivityLog } from "@/components/admin/WhatsAppActivityLog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatDateOnly } from "@/lib/date";
import { canAccess } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await leadService.getById(id);
  if (!lead) notFound();

  const [property, notes, duplicates, templates, settings, admin, activity, assignableAgents, followUps] = await Promise.all([
    lead.propertyId ? leadService.getLeadProperty(lead.propertyId) : Promise.resolve(undefined),
    leadService.listNotes(lead.id),
    leadService.findPossibleDuplicates(lead.id, lead.phone, lead.whatsapp),
    whatsappService.listTemplates(),
    settingsService.get(),
    profileService.getCurrentAdmin(),
    whatsappService.listActivity(lead.id),
    teamService.listAssignable(),
    followUpService.listByLead(lead.id),
  ]);

  const canManage = admin ? canAccess(admin.role, "team") : false;

  return (
    <div>
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{lead.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Lead received {new Date(lead.createdAt).toLocaleString("en-GB")}
          </p>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {duplicates.length > 0 && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
          <div>
            <span className="font-bold">Possible duplicate lead.</span> {duplicates.length}{" "}
            other lead{duplicates.length > 1 ? "s" : ""} {duplicates.length > 1 ? "share" : "shares"} this phone/WhatsApp number:{" "}
            {duplicates.map((d, i) => (
              <span key={d.id}>
                {i > 0 && ", "}
                <Link href={`/admin/leads/${d.id}`} className="font-semibold underline">
                  {d.name}
                </Link>
              </span>
            ))}
            . Review before contacting — nothing has been merged automatically.
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
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    This property has since been removed or edited.
                  </p>
                )}
              </div>
              {property && (
                <Link
                  href={`/properties/${property.slug}`}
                  target="_blank"
                  className="mt-3 inline-block text-xs font-bold text-primary hover:underline"
                >
                  View property on site →
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
              <Row label="Status" value={lead.status} />
              <Row label="Created" value={new Date(lead.createdAt).toLocaleString("en-GB")} />
              <Row label="Last Updated" value={new Date(lead.updatedAt).toLocaleString("en-GB")} />
              <Row label="Consent to Contact" value={lead.consent ? "Yes" : "Not confirmed"} />
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
            <p className="mt-3 whitespace-pre-line rounded-lg bg-surface-muted p-3.5 text-sm text-ink">
              {lead.message || "—"}
            </p>
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

          <LeadFollowUps leadId={lead.id} followUps={followUps} agentId={lead.assignedAgentId ?? ""} />

          <LeadNotes leadId={lead.id} notes={notes} />

          <WhatsAppActivityLog leadId={lead.id} activity={activity} />
        </div>

        <div>
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
