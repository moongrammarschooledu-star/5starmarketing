import { notFound } from "next/navigation";
import Link from "next/link";
import { ticketService } from "@/services/ticketService";
import { complaintService } from "@/services/complaintService";
import { escalationService } from "@/services/escalationService";
import { communicationService } from "@/services/communicationService";
import { supportDepartmentService } from "@/services/supportDepartmentService";
import { teamService } from "@/services/teamService";
import { requireSection } from "@/lib/guard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TicketConversation } from "@/components/support/TicketConversation";
import { TicketAdminControls } from "@/components/support/TicketAdminControls";
import { staffReplyAction } from "@/lib/actions/support.actions";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("support");
  const { id } = await params;
  const ticket = await ticketService.getById(id);
  if (!ticket) notFound();

  const [messages, complaint, escalations, departments, team] = await Promise.all([
    communicationService.listMessages(ticket.conversationId),
    complaintService.getByTicketId(id),
    escalationService.listForTicket(id),
    supportDepartmentService.list(true),
    teamService.list(),
  ]);

  async function reply(body: string, isPrivateNote: boolean) {
    "use server";
    await staffReplyAction(id, body, isPrivateNote);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{ticket.ticketNumber}</h1>
          <p className="mt-1 text-sm text-muted">{ticket.subject}</p>
          {ticket.propertyId && (
            <Link href={`/admin/properties/${ticket.propertyId}/edit`} className="text-xs text-primary hover:underline">
              {ticket.propertyTitle}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Info label="Category" value={ticket.categoryLabel ?? ticket.categoryCode} />
        <Info label="Customer" value={ticket.customerName ?? "—"} />
        <Info label="Response Due" value={ticket.slaResponseDueAt ? new Date(ticket.slaResponseDueAt).toLocaleString("en-GB") : "—"} accent={ticket.slaResponseBreached} />
        <Info label="Resolution Due" value={ticket.slaResolutionDueAt ? new Date(ticket.slaResolutionDueAt).toLocaleString("en-GB") : "—"} accent={ticket.slaResolutionBreached} />
      </div>

      {complaint && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Complaint {complaint.complaintNumber} — <StatusBadge status={complaint.status} /> (severity {complaint.severity})
        </div>
      )}

      {ticket.satisfactionRating != null && (
        <div className="mt-4 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm text-success">
          Customer rated this ticket {ticket.satisfactionRating}/5{ticket.satisfactionComment ? ` — "${ticket.satisfactionComment}"` : ""}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="font-heading text-lg font-bold text-ink">Conversation</h2>
          <div className="mt-3">
            <TicketConversation conversationId={ticket.conversationId} messages={messages} isStaff canReply onReply={reply} />
          </div>
        </div>
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Controls</h2>
          <div className="mt-3">
            <TicketAdminControls ticket={ticket} departments={departments.map((d) => ({ id: d.id, name: d.name }))} staff={team.map((t) => ({ id: t.id, name: t.name }))} />
          </div>

          {escalations.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Escalation History</h3>
              <div className="mt-2 space-y-2">
                {escalations.map((e) => (
                  <div key={e.id} className="rounded-xl border border-border bg-surface p-3 text-xs">
                    <p className="font-bold text-ink">{e.reason.replace(/_/g, " ")}</p>
                    <p className="text-muted">
                      {e.previousAssigneeName ?? "Unassigned"} → {e.newAssigneeName ?? "Unassigned"} · {new Date(e.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${accent ? "text-primary" : "text-ink"}`}>{value}</p>
    </div>
  );
}
