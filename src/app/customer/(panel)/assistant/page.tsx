import type { Metadata } from "next";
import { customerService } from "@/services/customerService";
import { aiConversationService } from "@/services/aiConversationService";
import { aiConfigService } from "@/services/aiConfigService";
import { PortalChatWorkspace } from "./PortalChatWorkspace";

export const metadata: Metadata = { title: "AI Assistant" };
export const dynamic = "force-dynamic";

const SUGGESTED_PROMPTS = [
  "Show me 2-bedroom apartments for rent in Karachi",
  "What is your refund policy?",
  "What's the status of my support ticket?",
  "When is my next rent due?",
];

export default async function PortalAssistantPage() {
  const customer = await customerService.getCurrentCustomer();
  if (!customer) return null;

  const [conversations, availability] = await Promise.all([
    aiConversationService.listForOwner({ customerId: customer.id }),
    aiConfigService.isAssistantAvailable("CUSTOMER_PORTAL"),
  ]);

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Assistant</h1>
      <p className="mt-1 text-sm text-muted">
        Ask about properties, your own tickets, rentals or general questions. This assistant only ever shows your own
        account&apos;s data and answers from verified sources — never another customer&apos;s information.
      </p>
      {!availability.available && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{availability.reason}</p>
      )}
      <div className="mt-6">
        <PortalChatWorkspace initialConversations={conversations} suggestedPrompts={SUGGESTED_PROMPTS} disabled={!availability.available} />
      </div>
    </div>
  );
}
