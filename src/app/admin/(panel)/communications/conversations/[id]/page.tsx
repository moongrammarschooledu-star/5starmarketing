import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { communicationCallLogService } from "@/services/communicationCallLogService";
import { marketingTemplateService } from "@/services/marketingTemplateService";
import { marketingTagService } from "@/services/marketingTagService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { MessageThread } from "@/components/admin/communications/MessageThread";
import { MessageComposer } from "@/components/admin/communications/MessageComposer";
import { ConversationSidebar } from "@/components/admin/communications/ConversationSidebar";
import { CallLogPanel } from "@/components/admin/communications/CallLogPanel";
import { canManageCommunicationSettings } from "@/lib/permissions";
import { requireSection } from "@/lib/guard";
import { buildDealContext } from "@/lib/communication/dealContext";

export const dynamic = "force-dynamic";

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("communications");
  const { id } = await params;
  const conversation = await communicationService.getById(id);
  if (!conversation) notFound();

  const [messages, templates, allTags, agents, admin, callLogs, auditLog, dealContext] = await Promise.all([
    communicationService.listMessages(id),
    marketingTemplateService.list(undefined, true),
    marketingTagService.list(),
    teamService.listAssignable(),
    profileService.getCurrentAdmin(),
    communicationCallLogService.listByConversation(id),
    communicationService.listAuditLog(id),
    buildDealContext(conversation.dealId),
  ]);

  if (admin) await communicationService.markRead(id, admin.id);
  const canManage = admin ? canManageCommunicationSettings(admin.role) : false;

  return (
    <div>
      <Link href="/admin/communications/inbox" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Inbox
      </Link>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{conversation.leadName || conversation.customerName || conversation.counterpartName || "Unknown Contact"}</h1>
        <p className="mt-1 text-sm text-muted">
          {conversation.channel} · {conversation.status}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <MessageThread messages={messages} conversationId={id} />
          <MessageComposer conversation={conversation} templates={templates} dealContext={dealContext} />

          <CallLogPanel conversationId={id} leadId={conversation.leadId} customerId={conversation.customerId} logs={callLogs} />

          {auditLog.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-heading text-sm font-bold text-ink">
                <ListChecks className="h-4 w-4 text-primary" /> Activity
              </h3>
              <ol className="mt-3 space-y-2 border-l-2 border-border pl-4">
                {auditLog.slice(0, 20).map((a) => (
                  <li key={a.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <span className="font-semibold text-ink">{a.action}</span>
                    <span className="text-muted-foreground"> — {a.actorName ?? "System"} · {new Date(a.createdAt).toLocaleString("en-GB")}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div>
          <ConversationSidebar conversation={conversation} agents={agents.map((a) => ({ id: a.id, name: a.name }))} allTags={allTags} canManage={canManage} />
        </div>
      </div>
    </div>
  );
}
