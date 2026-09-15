import { requireSection } from "@/lib/guard";
import { profileService } from "@/services/profileService";
import { aiConversationService } from "@/services/aiConversationService";
import { aiConfigService } from "@/services/aiConfigService";
import { assistantSectionFor, canAccess } from "@/lib/permissions";
import { assistantLabels, assistantTypes } from "@/lib/models/ai";
import { ChatWorkspace } from "./ChatWorkspace";

export const dynamic = "force-dynamic";

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  ADMIN: ["Summarize today's business overview", "Which leads need follow-up this week?", "Any overdue rent payments?"],
  SALES: ["Find 3-bedroom villas under 5,000,000 for a client", "Summarize lead #... and suggest a follow-up"],
  SUPPORT: ["Search the knowledge base for refund policy", "Summarize ticket ..."],
  RENTAL: ["Which leases expire in the next 30 days?", "Show payment status for lease ..."],
  CONSTRUCTION: ["Summarize progress for project ...", "Any construction projects behind schedule?"],
  ACCOUNTING: ["Give me the accounting dashboard summary", "Any outstanding payments this month?"],
};

export default async function AiChatPage() {
  await requireSection("ai");
  const admin = await profileService.getCurrentAdmin();
  if (!admin) return null;

  const availableAssistants = assistantTypes.filter((t) => canAccess(admin.role, assistantSectionFor(t)));
  const [conversations, configs] = await Promise.all([
    aiConversationService.listForOwner({ adminId: admin.id }),
    aiConfigService.listAll(),
  ]);
  const global = configs.find((c) => c.assistantType === "GLOBAL");

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">AI Chat</h1>
      <p className="mt-1 text-sm text-muted">
        {assistantLabels.ADMIN} and role-specific assistants for your account. Every answer is limited to data you are
        authorized to see, and every tool call is logged.
      </p>
      {!global?.enabled && (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          The AI assistant is currently disabled platform-wide. An administrator can re-enable it under AI Settings.
        </p>
      )}
      <div className="mt-6">
        <ChatWorkspace
          assistants={availableAssistants}
          assistantLabels={assistantLabels}
          suggestedPrompts={SUGGESTED_PROMPTS}
          initialConversations={conversations}
        />
      </div>
    </div>
  );
}
