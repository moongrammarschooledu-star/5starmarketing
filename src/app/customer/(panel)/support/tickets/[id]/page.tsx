import { notFound } from "next/navigation";
import { customerService } from "@/services/customerService";
import { ticketService } from "@/services/ticketService";
import { communicationService } from "@/services/communicationService";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TicketConversation } from "@/components/support/TicketConversation";
import { TicketFeedbackForm } from "@/components/support/TicketFeedbackForm";
import { customerReplyAction } from "@/lib/actions/support.actions";

export const dynamic = "force-dynamic";

export default async function CustomerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;
  const { id } = await params;
  const ticket = await ticketService.getById(id);
  if (!ticket || ticket.customerId !== customer.id) notFound();

  const messages = await communicationService.listMessages(ticket.conversationId);

  async function reply(body: string) {
    "use server";
    await customerReplyAction(id, body);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{ticket.ticketNumber}</h1>
          <p className="mt-1 text-sm text-muted">{ticket.subject}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {(ticket.status === "RESOLVED" || ticket.status === "CLOSED") && ticket.satisfactionRating == null && (
        <div className="mt-4">
          <TicketFeedbackForm ticketId={ticket.id} canReopen />
        </div>
      )}

      <div className="mt-6">
        <h2 className="font-heading text-lg font-bold text-ink">Conversation</h2>
        <div className="mt-3">
          <TicketConversation conversationId={ticket.conversationId} messages={messages} isStaff={false} canReply={ticket.status !== "CLOSED" && ticket.status !== "CANCELLED"} onReply={reply} />
        </div>
      </div>
    </div>
  );
}
