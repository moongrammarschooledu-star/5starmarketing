import { AlertTriangle } from "lucide-react";
import { communicationService } from "@/services/communicationService";
import { teamService } from "@/services/teamService";
import { profileService } from "@/services/profileService";
import { parseConversationSearchParams, type RawSearchParams } from "@/lib/communicationSearchParams";
import { ConversationFilters } from "@/components/admin/communications/ConversationFilters";
import { ConversationList } from "@/components/admin/communications/ConversationList";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CommunicationsConversationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("communications");
  const sp = await searchParams;
  const filters = parseConversationSearchParams(sp);

  let result: Awaited<ReturnType<typeof communicationService.search>> = { conversations: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  let agents: { id: string; name: string }[] = [];
  let unreadCounts = new Map<string, number>();
  let loadError: string | null = null;

  try {
    const [r, a, admin] = await Promise.all([communicationService.search(filters), teamService.listAssignable(), profileService.getCurrentAdmin()]);
    result = r;
    agents = a.map((x) => ({ id: x.id, name: x.name }));
    if (admin) unreadCounts = await communicationService.unreadCountsFor(admin.id, result.conversations.map((c) => c.id));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load conversations.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">All Conversations</h1>
      <p className="mt-1 text-sm text-muted">The full searchable archive, including closed and archived threads. For the active working queue, see the Inbox.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <ConversationFilters filters={filters} agents={agents} />
      </div>
      <div className="mt-4">
        <ConversationList conversations={result.conversations} total={result.total} page={result.page} totalPages={result.totalPages} unreadCounts={unreadCounts} basePath="/admin/communications/conversations" />
      </div>
    </div>
  );
}
