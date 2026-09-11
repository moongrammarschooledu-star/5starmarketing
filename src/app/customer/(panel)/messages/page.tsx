import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { customerService } from "@/services/customerService";
import { communicationService } from "@/services/communicationService";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const conversations = await communicationService.listForCustomer(customer.id);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Messages</h1>
      <p className="mt-1 text-sm text-muted">Conversations with your 5STAR.M consultant.</p>

      {conversations.length === 0 && (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-10 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-heading text-lg font-bold text-ink">No messages yet.</h2>
          <p className="mt-1 text-sm text-muted">Messages from your consultant about your properties, deals and documents will appear here.</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {conversations.map((c) => (
          <Link key={c.id} href={`/customer/messages/${c.id}`} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-ink">{c.subject || c.propertyTitle || c.dealNumber || "Conversation"}</p>
                <p className="mt-1 text-sm text-muted">{c.lastMessagePreview || "No messages yet."}</p>
              </div>
              {c.lastMessageAt && <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(c.lastMessageAt).toLocaleDateString("en-GB")}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
