import Link from "next/link";
import { AlertTriangle, FileStack, Clock, CheckCircle2, XCircle, AlertCircle, ListChecks, CalendarClock, LayoutTemplate, ClipboardList, BarChart3 } from "lucide-react";
import { documentService } from "@/services/documentService";
import { StatCard } from "@/components/admin/StatCard";
import { DocumentFilters } from "@/components/admin/documents/DocumentFilters";
import { DocumentsTable } from "@/components/admin/documents/DocumentsTable";
import { parseDocumentSearchParams, type RawSearchParams } from "@/lib/documentSearchParams";
import { requireSection } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function DocumentsDashboardPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  await requireSection("documents");
  const sp = await searchParams;
  const filters = parseDocumentSearchParams(sp);

  let stats: Awaited<ReturnType<typeof documentService.dashboardStats>> = { total: 0, pendingReview: 0, approved: 0, rejected: 0, expired: 0, uploadedThisMonth: 0 };
  let result: Awaited<ReturnType<typeof documentService.search>> = { documents: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  let types: Awaited<ReturnType<typeof documentService.listTypes>> = [];
  let loadError: string | null = null;

  try {
    const [s, r, t] = await Promise.all([documentService.dashboardStats(), documentService.search(filters), documentService.listTypes()]);
    stats = s;
    result = r;
    types = t;
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load documents.";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">Documents</h1>
          <p className="mt-1 text-sm text-muted">Every booking form, agreement, receipt and customer document — secure, versioned, auditable.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/documents/checklists" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <ClipboardList className="h-3.5 w-3.5" /> Checklists
          </Link>
          <Link href="/admin/documents/templates" className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-4 py-2 text-xs font-bold text-ink hover:border-primary hover:text-primary">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
          </Link>
          <Link href="/admin/documents/reports" className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-hover">
            <BarChart3 className="h-3.5 w-3.5" /> Reports
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> {loadError}
        </div>
      )}

      {!loadError && stats.total === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <FileStack className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-heading text-base font-bold text-ink">No documents uploaded yet.</p>
          <Link href="/admin/documents/upload" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover">
            Upload Document
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total Documents" value={stats.total} icon={FileStack} />
            <Link href="/admin/documents?status=UNDER_REVIEW">
              <StatCard label="Pending Review" value={stats.pendingReview} icon={Clock} tone="primary" />
            </Link>
            <Link href="/admin/documents?status=APPROVED">
              <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} tone="success" />
            </Link>
            <Link href="/admin/documents?status=REJECTED">
              <StatCard label="Rejected" value={stats.rejected} icon={XCircle} />
            </Link>
            <Link href="/admin/documents?status=EXPIRED">
              <StatCard label="Expired" value={stats.expired} icon={AlertCircle} />
            </Link>
            <StatCard label="Uploaded This Month" value={stats.uploadedThisMonth} icon={CalendarClock} tone="primary" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/documents?expiring=1" className="flex items-center gap-1.5 rounded-full border-2 border-amber-500/30 px-3.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-500/5">
              <ListChecks className="h-3.5 w-3.5" /> Expiring Soon
            </Link>
          </div>

          <div className="mt-8">
            <DocumentFilters filters={filters} types={types} />
          </div>
          <div className="mt-4">
            <DocumentsTable documents={result.documents} total={result.total} page={result.page} totalPages={result.totalPages} pageSize={result.pageSize} />
          </div>
        </>
      )}
    </div>
  );
}
