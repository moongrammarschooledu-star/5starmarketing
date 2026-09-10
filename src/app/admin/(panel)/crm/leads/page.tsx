import { AlertTriangle } from "lucide-react";
import { leadService } from "@/services/leadService";
import { teamService } from "@/services/teamService";
import { parseCrmSearchParams, type RawSearchParams } from "@/lib/crmSearchParams";
import { CrmLeadFilters } from "@/components/admin/crm/CrmLeadFilters";
import { CrmLeadsTable } from "@/components/admin/crm/CrmLeadsTable";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function CrmLeadsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("leads");
  const sp = await searchParams;
  const filters = parseCrmSearchParams(sp);

  let result: Awaited<ReturnType<typeof leadService.search>> = { leads: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  let agents: { id: string; name: string }[] = [];
  let loadError: string | null = null;

  try {
    const [r, a] = await Promise.all([leadService.search(filters), teamService.listAssignable()]);
    result = r;
    agents = a;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load leads.";
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-extrabold text-ink">Leads</h1>
      <p className="mt-1 text-sm text-muted">Search, filter and manage every lead — server-side, so this stays fast no matter how many leads come in.</p>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      <div className="mt-6">
        <CrmLeadFilters filters={filters} agents={agents} />
      </div>

      <div className="mt-4">
        <CrmLeadsTable leads={result.leads} total={result.total} page={result.page} totalPages={result.totalPages} filters={filters} />
      </div>
    </div>
  );
}
