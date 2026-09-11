import { AlertTriangle } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { profileService } from "@/services/profileService";
import { parseConversationSearchParams, type RawSearchParams } from "@/lib/communicationSearchParams";
import { ConversationFilters } from "@/components/admin/communications/ConversationFilters";
import { ConversationList } from "@/components/admin/communications/ConversationList";

export const dynamic = "force-dynamic";

export default async function AgentCommunicationsInboxPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const admin = await profileService.getCurrentAdmin();
  if (!admin) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> You need to be signed in to view your messages.
      </div>
    );
  }

  const sp = await searchParams;
  const filters = parseConversationSearchParams(sp);
  // An agent's inbox is always scoped to their own assigned conversations —
  // RLS already enforces this server-side, but the filter is forced here too
  // so the agent/unmatched controls in the shared filter bar have no effect.
  filters.agentId = admin.id;
  filters.unassigned = false;
  if (!filters.status) filters.status = "OPEN";

  let result: Awaited<ReturnType<typeof communicationService.search>> = { conversations: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  let unreadCounts = new Map<string, number>();
  let loadError: string | null = null;

  try {
    result = await communicationService.search(filters);
    unreadCounts = await communicationService.unreadCountsFor(admin.id, result.conversations.map((c) => c.id));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load your messages.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">My Inbox</h1>
      <p className="mt-1 text-sm text-muted">Every conversation assigned to you.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <ConversationFilters filters={filters} agents={[]} />
      </div>
      <div className="mt-4">
        <ConversationList conversations={result.conversations} total={result.total} page={result.page} totalPages={result.totalPages} unreadCounts={unreadCounts} basePath="/agent/communications/conversations" />
      </div>
    </div>
  );
}
