import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { customerService } from "@/services/customerService";
import { communicationService } from "@/services/communicationService";
import { CustomerMessageThread } from "@/components/customer/CustomerMessageThread";
import { CustomerReplyBox } from "@/components/customer/CustomerReplyBox";

export const metadata = { title: "Conversation" };
export const dynamic = "force-dynamic";

export default async function CustomerMessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const { id } = await params;
  const conversation = await communicationService.getById(id);
  if (!conversation || conversation.customerId !== customer.id) notFound();

  const messages = await communicationService.listMessages(id);

  return (
    <div>
      <Link href="/customer/messages" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Messages
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{conversation.subject || conversation.propertyTitle || conversation.dealNumber || "Conversation"}</h1>
        {(conversation.propertyTitle || conversation.dealNumber) && (
          <p className="mt-1 text-sm text-muted">
            {conversation.propertyTitle}
            {conversation.propertyTitle && conversation.dealNumber ? " · " : ""}
            {conversation.dealNumber}
          </p>
        )}
      </div>

      <div className="mt-6 space-y-4">
        <CustomerMessageThread messages={messages} />
        <CustomerReplyBox conversationId={id} />
      </div>
    </div>
  );
}
